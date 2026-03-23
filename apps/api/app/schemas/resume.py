from datetime import datetime

from pydantic import BaseModel


class ResumeResponse(BaseModel):
    id: int
    original_filename: str
    candidate_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    summary: str | None = None
    skills: list[str] | None = None
    experience_years: float | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ResumeDetailResponse(ResumeResponse):
    experience_json: str | None = None
    education_json: str | None = None
    raw_text: str | None = None
    error_message: str | None = None


class ResumeListResponse(BaseModel):
    resumes: list[ResumeResponse]
    total: int
    page: int
    page_size: int


class ResumeStatsResponse(BaseModel):
    total_resumes: int
    completed_resumes: int
    failed_resumes: int
    processing_resumes: int
    skills_breakdown: dict[str, int]


class ResumeUploadResponse(BaseModel):
    uploaded: int
    failed: int
    resume_ids: list[int]
    errors: list[str]
