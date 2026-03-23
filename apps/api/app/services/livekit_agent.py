"""LiveKit voice agent for Revio recruitment assistant.

This runs as a separate worker process, not inside the FastAPI server.
Start with: python -m app.scripts.run_livekit_agent
"""

from __future__ import annotations

import json

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import google as google_plugin

from app.core.config import settings
from app.core.logging import get_logger, setup_logging
from app.services.prompts import CHAT_SYSTEM_PROMPT
from app.services.resume_search import ResumeSearchService

setup_logging()
logger = get_logger(__name__)


async def entrypoint(ctx: JobContext):
    logger.info("livekit agent starting", room=ctx.room.name)

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    search_service = ResumeSearchService()

    # Build initial instructions
    initial_ctx = llm.ChatContext()
    initial_ctx.append(role="system", text=CHAT_SYSTEM_PROMPT)

    # Use Gemini for LLM
    gemini_llm = google_plugin.LLM(
        model="gemini-2.0-flash",
        api_key=settings.GEMINI_API_KEY,
    )

    # Use Google TTS and STT
    google_tts = google_plugin.TTS(api_key=settings.GEMINI_API_KEY)
    google_stt = google_plugin.STT(api_key=settings.GEMINI_API_KEY)

    assistant = VoiceAssistant(
        vad=None,  # Use default VAD
        stt=google_stt,
        llm=gemini_llm,
        tts=google_tts,
        chat_ctx=initial_ctx,
    )

    @assistant.on("user_speech_committed")
    def on_user_speech(msg: llm.ChatMessage):
        # Search for relevant resumes when user speaks
        if msg.content:
            try:
                results = search_service.search_resumes(msg.content, limit=3)
                if results:
                    context_parts = []
                    for r in results:
                        meta = r.get("metadata", {})
                        name = meta.get("candidate_name", "Unknown")
                        skills = meta.get("skills", "")
                        exp = meta.get("experience_years", "N/A")
                        context_parts.append(
                            f"- {name}: Skills: {skills}, Experience: {exp} years"
                        )

                    context_msg = (
                        "Relevant candidates found:\n"
                        + "\n".join(context_parts)
                        + "\nUse this information to help the user."
                    )
                    assistant.chat_ctx.append(role="system", text=context_msg)
                    logger.info("injected resume context", count=len(results))
            except Exception as e:
                logger.error("resume search failed in voice", error=str(e))

    assistant.start(ctx.room)
    await assistant.say(
        "Hi! I'm Revio, your recruitment assistant. "
        "Tell me about the role you're hiring for, and I'll help you find great candidates.",
        allow_interruptions=True,
    )


def run_agent():
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=settings.LIVEKIT_API_KEY,
            api_secret=settings.LIVEKIT_API_SECRET,
            ws_url=settings.LIVEKIT_URL,
        )
    )
