"""Resume processing pipeline: file -> parse -> extract -> store -> index."""

from __future__ import annotations

import json
import re
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import get_logger
from app.models.resume import Resume
from app.services.file_parser import parse_resume_file
from app.services.gemini import GeminiService, GeminiUnavailableError
from app.services.openai_service import OpenAIService
from app.services.resume_search import ResumeSearchService

logger = get_logger(__name__)

COMMON_SKILLS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "next.js",
    "node.js",
    "sql",
    "postgresql",
    "mongodb",
    "aws",
    "docker",
    "kubernetes",
    "fastapi",
    "django",
    "flask",
    "excel",
    "power bi",
]


def _save_upload(file: UploadFile) -> tuple[str, str]:
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


def _fallback_extract_resume_data(raw_text: str) -> dict:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    lower_text = raw_text.lower()

    email_match = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", raw_text, re.I)
    phone_match = re.search(r"(\+?\d[\d\s().-]{7,}\d)", raw_text)
    years = [int(match) for match in re.findall(r"(\d+)\+?\s+years?", lower_text)]

    skills = [
        skill
        for skill in COMMON_SKILLS
        if re.search(rf"\b{re.escape(skill)}\b", lower_text, re.I)
    ]

    summary = " ".join(lines[:5])[:500] if lines else ""
    candidate_name = lines[0][:120] if lines else None

    return {
        "candidate_name": candidate_name,
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0).strip() if phone_match else None,
        "location": None,
        "summary": summary or None,
        "experience_years": max(years) if years else None,
        "skills": skills,
        "experience": [],
        "education": [],
    }


def _extract_resume_data(raw_text: str) -> dict:
    openai_service = OpenAIService()
    if openai_service.available:
        try:
            return openai_service.extract_resume_data(raw_text)
        except Exception as exc:
            logger.warning("openai extraction failed, using fallback extraction", error=str(exc))
            return _fallback_extract_resume_data(raw_text)

    try:
        gemini_service = GeminiService()
        return gemini_service.extract_resume_data(raw_text)
    except GeminiUnavailableError as exc:
        logger.warning("gemini unavailable, using fallback extraction", error=str(exc))
        return _fallback_extract_resume_data(raw_text)
    except Exception as exc:
        logger.warning("gemini extraction failed, using fallback extraction", error=str(exc))
        return _fallback_extract_resume_data(raw_text)


def process_resume(db: Session, file: UploadFile) -> Resume:
    file_path, file_type = _save_upload(file)

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
        raw_text = parse_resume_file(file_path)
        if not raw_text.strip():
            raise ValueError("No text could be extracted from the file")

        resume.raw_text = raw_text
        extracted = _extract_resume_data(raw_text)

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

        search_service = ResumeSearchService()
        search_text = _build_search_text(resume, raw_text)
        metadata = {
            "candidate_name": resume.candidate_name or "",
            "skills": ",".join(skills) if skills else "",
            "experience_years": str(resume.experience_years or 0),
            "location": resume.location or "",
        }
        try:
            chromadb_id = search_service.add_resume(resume.id, search_text, metadata)
            resume.chromadb_id = chromadb_id
        except Exception as exc:
            logger.warning("resume indexing unavailable, continuing without semantic search", error=str(exc))
            resume.chromadb_id = None

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

    parts.append(raw_text[:2000])
    return "\n".join(parts)
