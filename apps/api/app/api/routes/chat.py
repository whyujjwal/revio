import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.chat_session import ChatMessage, ChatSession
from app.schemas.chat import CandidateSnippet, ChatRequest, ChatResponse
from app.services.gemini import GeminiService
from app.services.resume_search import ResumeSearchService

logger = get_logger(__name__)
router = APIRouter(prefix="/chat")


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    # Get or create session
    session_id = request.session_id or str(uuid.uuid4())
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        session = ChatSession(id=session_id)
        db.add(session)
        db.commit()

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    session.last_active_at = datetime.now(timezone.utc)
    db.commit()

    # Load conversation history
    history_rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    messages = [{"role": m.role, "content": m.content} for m in history_rows]

    # Generate search query from conversation
    gemini = GeminiService()
    candidates: list[CandidateSnippet] | None = None
    resume_context = ""

    search_query = gemini.generate_search_query(messages)
    if search_query:
        # Search resumes
        search_service = ResumeSearchService()
        results = search_service.search_resumes(search_query, limit=5)

        if results:
            candidates = []
            context_parts = []
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

            resume_context = "\n".join(context_parts)

    # Generate AI response
    ai_response = gemini.generate_chat_response(messages, resume_context)

    # Save assistant message
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
