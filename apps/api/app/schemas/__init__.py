"""Pydantic request/response schemas.

These are the source of truth for the OpenAPI spec and shared-types generation.
"""

from app.schemas.auth import LoginRequest, LoginResponse
from app.schemas.chat import CandidateSnippet, ChatRequest, ChatResponse
from app.schemas.health import HealthResponse
from app.schemas.memory import (
    MemoryAddRequest,
    MemoryAddResponse,
    MemorySearchRequest,
    MemorySearchResponse,
    MemorySearchResult,
)
from app.schemas.resume import (
    ResumeDetailResponse,
    ResumeListResponse,
    ResumeResponse,
    ResumeStatsResponse,
    ResumeUploadResponse,
)

__all__ = [
    "CandidateSnippet",
    "ChatRequest",
    "ChatResponse",
    "HealthResponse",
    "LoginRequest",
    "LoginResponse",
    "MemoryAddRequest",
    "MemoryAddResponse",
    "MemorySearchRequest",
    "MemorySearchResponse",
    "MemorySearchResult",
    "ResumeDetailResponse",
    "ResumeListResponse",
    "ResumeResponse",
    "ResumeStatsResponse",
    "ResumeUploadResponse",
]
