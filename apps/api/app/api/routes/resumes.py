import json
import os
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_admin
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.resume import Resume
from app.schemas.resume import (
    ResumeDetailResponse,
    ResumeListResponse,
    ResumeResponse,
    ResumeStatsResponse,
    ResumeUploadResponse,
)
from app.services.resume_processor import process_resume
from app.services.resume_search import ResumeSearchService

logger = get_logger(__name__)
router = APIRouter(prefix="/resumes")

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}


def _resume_to_response(resume: Resume) -> ResumeResponse:
    skills = None
    if resume.skills:
        try:
            skills = json.loads(resume.skills)
        except json.JSONDecodeError:
            skills = None

    return ResumeResponse(
        id=resume.id,
        original_filename=resume.original_filename,
        candidate_name=resume.candidate_name,
        email=resume.email,
        phone=resume.phone,
        location=resume.location,
        summary=resume.summary,
        skills=skills,
        experience_years=resume.experience_years,
        status=resume.status,
        created_at=resume.created_at,
    )


@router.post("/upload", response_model=ResumeUploadResponse)
def upload_resumes(
    files: list[UploadFile],
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    resume_ids: list[int] = []
    errors: list[str] = []

    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            errors.append(f"{file.filename}: unsupported format ({ext})")
            continue

        try:
            resume = process_resume(db, file)
            resume_ids.append(resume.id)
            if resume.status == "failed":
                errors.append(f"{file.filename}: {resume.error_message}")
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
            logger.error("upload failed", filename=file.filename, error=str(e))

    return ResumeUploadResponse(
        uploaded=len(resume_ids),
        failed=len(errors),
        resume_ids=resume_ids,
        errors=errors,
    )


@router.get("", response_model=ResumeListResponse)
def list_resumes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    skill: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    query = db.query(Resume)

    if search:
        query = query.filter(
            Resume.candidate_name.ilike(f"%{search}%")
            | Resume.email.ilike(f"%{search}%")
            | Resume.summary.ilike(f"%{search}%")
        )

    if skill:
        query = query.filter(Resume.skills.ilike(f"%{skill}%"))

    if status_filter:
        query = query.filter(Resume.status == status_filter)

    total = query.count()
    resumes = (
        query.order_by(Resume.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return ResumeListResponse(
        resumes=[_resume_to_response(r) for r in resumes],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=ResumeStatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    total = db.query(func.count(Resume.id)).scalar() or 0
    completed = (
        db.query(func.count(Resume.id)).filter(Resume.status == "completed").scalar()
        or 0
    )
    failed = (
        db.query(func.count(Resume.id)).filter(Resume.status == "failed").scalar() or 0
    )
    processing = (
        db.query(func.count(Resume.id))
        .filter(Resume.status == "processing")
        .scalar()
        or 0
    )

    # Skills breakdown
    skill_counter: Counter = Counter()
    skill_rows = (
        db.query(Resume.skills)
        .filter(Resume.skills.isnot(None), Resume.status == "completed")
        .all()
    )
    for (skills_json,) in skill_rows:
        try:
            skills = json.loads(skills_json)
            skill_counter.update(skills)
        except (json.JSONDecodeError, TypeError):
            pass

    return ResumeStatsResponse(
        total_resumes=total,
        completed_resumes=completed,
        failed_resumes=failed,
        processing_resumes=processing,
        skills_breakdown=dict(skill_counter.most_common(30)),
    )


@router.get("/{resume_id}", response_model=ResumeDetailResponse)
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    skills = None
    if resume.skills:
        try:
            skills = json.loads(resume.skills)
        except json.JSONDecodeError:
            skills = None

    return ResumeDetailResponse(
        id=resume.id,
        original_filename=resume.original_filename,
        candidate_name=resume.candidate_name,
        email=resume.email,
        phone=resume.phone,
        location=resume.location,
        summary=resume.summary,
        skills=skills,
        experience_years=resume.experience_years,
        experience_json=resume.experience_json,
        education_json=resume.education_json,
        raw_text=resume.raw_text,
        status=resume.status,
        error_message=resume.error_message,
        created_at=resume.created_at,
    )


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    # Remove from ChromaDB
    if resume.chromadb_id:
        try:
            search_service = ResumeSearchService()
            search_service.delete_resume(resume.chromadb_id)
        except Exception as e:
            logger.warning("chromadb delete failed", error=str(e))

    # Remove file from disk
    if resume.file_path and os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except OSError as e:
            logger.warning("file delete failed", path=resume.file_path, error=str(e))

    db.delete(resume)
    db.commit()
