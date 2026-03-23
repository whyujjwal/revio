from pydantic import BaseModel


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str


class CandidateSnippet(BaseModel):
    resume_id: int
    name: str | None = None
    skills: list[str] = []
    experience_years: float | None = None
    summary: str | None = None
    relevance_score: float = 0.0


class ChatResponse(BaseModel):
    session_id: str
    message: str
    candidates: list[CandidateSnippet] | None = None
