"""Resume processing pipeline: file → parse → extract → store → index."""

from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.models.resume import Resume
from app.services.file_parser import parse_resume_file
from app.services.gemini import GeminiService
from app.services.resume_search import ResumeSearchService

logger = get_logger(__name__)


def _save_upload(file: UploadFile) -> tuple[str, str]:
    """Save uploaded file to disk. Returns (file_path, file_type)."""
    storage_dir = Path(settings.RESUME_STORAGE_PATH)
    storage_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "unknown").suffix.lower()
    file_type = ext.lstrip(".")
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = storage_dir / unique_name

    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    logger.info("file saved", path=str(file_path), size=len(content))
    return str(file_path), file_type


def process_resume(db: Session, file: UploadFile) -> Resume:
    """Process a single resume file through the full pipeline."""
    # Save file
    file_path, file_type = _save_upload(file)

    # Create DB record
    resume = Resume(
        original_filename=file.filename or "unknown",
        file_path=file_path,
        file_type=file_type,
        status="processing",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    try:
        # Parse text
        raw_text = parse_resume_file(file_path)
        if not raw_text.strip():
            raise ValueError("No text could be extracted from the file")

        resume.raw_text = raw_text

        # Extract structured data via Gemini
        gemini = GeminiService()
        extracted = gemini.extract_resume_data(raw_text)

        resume.candidate_name = extracted.get("candidate_name")
        resume.email = extracted.get("email")
        resume.phone = extracted.get("phone")
        resume.location = extracted.get("location")
        resume.summary = extracted.get("summary")
        resume.experience_years = extracted.get("experience_years")

        skills = extracted.get("skills", [])
        resume.skills = json.dumps(skills) if skills else None

        experience = extracted.get("experience", [])
        resume.experience_json = json.dumps(experience) if experience else None

        education = extracted.get("education", [])
        resume.education_json = json.dumps(education) if education else None

        # Index in ChromaDB
        search_service = ResumeSearchService()
        search_text = _build_search_text(resume, raw_text)
        metadata = {
            "candidate_name": resume.candidate_name or "",
            "skills": ",".join(skills) if skills else "",
            "experience_years": str(resume.experience_years or 0),
            "location": resume.location or "",
        }
        chromadb_id = search_service.add_resume(resume.id, search_text, metadata)
        resume.chromadb_id = chromadb_id

        resume.status = "completed"
        resume.error_message = None
        logger.info("resume processed", id=resume.id, name=resume.candidate_name)

    except Exception as e:
        resume.status = "failed"
        resume.error_message = str(e)
        logger.error("resume processing failed", id=resume.id, error=str(e))

    db.commit()
    db.refresh(resume)
    return resume


def _build_search_text(resume: Resume, raw_text: str) -> str:
    """Build optimized text for vector search."""
    parts = []
    if resume.candidate_name:
        parts.append(f"Name: {resume.candidate_name}")
    if resume.summary:
        parts.append(f"Summary: {resume.summary}")
    if resume.skills:
        skills = json.loads(resume.skills)
        parts.append(f"Skills: {', '.join(skills)}")
    if resume.location:
        parts.append(f"Location: {resume.location}")
    if resume.experience_years:
        parts.append(f"Experience: {resume.experience_years} years")

    # Add a truncated version of raw text for additional context
    parts.append(raw_text[:2000])
    return "\n".join(parts)
