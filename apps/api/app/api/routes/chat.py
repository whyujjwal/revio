import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.chat_session import ChatMessage, ChatSession
from app.schemas.chat import CandidateSnippet, ChatRequest, ChatResponse
from app.services.gemini import GeminiQuotaError, GeminiService, GeminiUnavailableError
from app.services.openai_service import OpenAIService
from app.services.resume_search import ResumeSearchService

logger = get_logger(__name__)
router = APIRouter(prefix="/chat")


def _build_candidate_snippets(results: list[dict]) -> tuple[list[CandidateSnippet], str]:
    candidates: list[CandidateSnippet] = []
    context_parts: list[str] = []

    for r in results:
        meta = r.get("metadata", {})
        resume_id = int(meta.get("resume_id", 0))
        skills_str = meta.get("skills", "")
        skills = [s.strip() for s in skills_str.split(",") if s.strip()]
        exp_years = float(meta.get("experience_years", 0)) or None
        name = meta.get("candidate_name", "Unknown")

        candidates.append(CandidateSnippet(
            resume_id=resume_id,
            name=name,
            skills=skills,
            experience_years=exp_years,
            summary=r.get("content", "")[:300],
            relevance_score=r.get("score", 0),
        ))

        context_parts.append(
            f"- {name} | Skills: {skills_str} | "
            f"Experience: {exp_years or 'N/A'} years | "
            f"Score: {r.get('score', 0):.2f}"
        )

    return candidates, "\n".join(context_parts)


def _build_fallback_message(
    *,
    candidates: list[CandidateSnippet] | None,
    quota_limited: bool,
) -> str:
    prefix = (
        "AI free-tier quota is currently exhausted."
        if quota_limited
        else "AI is unavailable right now."
    )
    if candidates:
        return (
            f"{prefix} I cannot generate a full AI response at the moment, "
            "but I found matching candidates below based on your query."
        )
    return (
        f"{prefix} I cannot generate a full AI response right now. "
        "Try again later or upload more resumes for search."
    )


def _get_ai_service() -> tuple[object | None, bool]:
    openai_service = OpenAIService()
    if openai_service.available:
        return openai_service, False

    try:
        return GeminiService(), False
    except GeminiQuotaError:
        return None, True
    except GeminiUnavailableError:
        return None, False


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    session_id = request.session_id or str(uuid.uuid4())
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        session = ChatSession(id=session_id)
        db.add(session)
        db.commit()

    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    session.last_active_at = datetime.now(timezone.utc)
    db.commit()

    history_rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    messages = [{"role": m.role, "content": m.content} for m in history_rows]

    candidates: list[CandidateSnippet] | None = None
    resume_context = ""
    ai_service, quota_limited = _get_ai_service()

    search_query = request.message
    if ai_service is not None:
        try:
            generated_query = ai_service.generate_search_query(messages)
            if generated_query:
                search_query = generated_query
        except GeminiQuotaError:
            quota_limited = True
        except GeminiUnavailableError:
            ai_service = None

    if search_query:
        try:
            search_service = ResumeSearchService()
            results = search_service.search_resumes(search_query, limit=5)
        except Exception as exc:
            logger.warning("resume search unavailable, continuing without matches", error=str(exc))
            results = []

        if results:
            candidates, resume_context = _build_candidate_snippets(results)

    if ai_service is None:
        ai_response = _build_fallback_message(
            candidates=candidates,
            quota_limited=quota_limited,
        )
    else:
        try:
            ai_response = ai_service.generate_chat_response(messages, resume_context)
        except GeminiQuotaError:
            ai_response = _build_fallback_message(
                candidates=candidates,
                quota_limited=True,
            )
        except GeminiUnavailableError:
            ai_response = _build_fallback_message(
                candidates=candidates,
                quota_limited=False,
            )

    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=ai_response,
    )
    db.add(assistant_msg)
    db.commit()

    return ChatResponse(
        session_id=session_id,
        message=ai_response,
        candidates=candidates,
    )
