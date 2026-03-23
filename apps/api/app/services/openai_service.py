"""OpenAI GPT-4o service for resume extraction and chat responses."""

from __future__ import annotations

import json

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from app.core.config import settings
from app.core.logging import get_logger
from app.services.prompts import (
    CHAT_SYSTEM_PROMPT,
    RESUME_EXTRACTION_PROMPT,
    SEARCH_QUERY_PROMPT,
)

logger = get_logger(__name__)

MODEL = "gpt-4o"


class OpenAIService:
    def __init__(self) -> None:
        if OpenAI is None:
            self.client = None
            logger.warning("openai package is not installed - OpenAI features disabled")
        elif not settings.OPENAI_API_KEY:
            self.client = None
            logger.warning("OPENAI_API_KEY is not set - AI features disabled")
        else:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    @property
    def available(self) -> bool:
        return self.client is not None

    def extract_resume_data(self, raw_text: str) -> dict:
        if not self.client:
            raise ValueError(
                "Resume parsing requires an OpenAI API key. "
                "Please set OPENAI_API_KEY in your environment."
            )

        response = self.client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": RESUME_EXTRACTION_PROMPT},
                {"role": "user", "content": raw_text},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        text = response.choices[0].message.content or ""
        try:
            data = json.loads(text)
            logger.info(
                "resume data extracted",
                name=data.get("candidate_name"),
                skills_count=len(data.get("skills", [])),
            )
            return data
        except json.JSONDecodeError as exc:
            logger.error("failed to parse openai response", response=text[:200])
            raise ValueError("OpenAI returned invalid JSON for resume extraction") from exc

    def generate_search_query(self, messages: list[dict]) -> str | None:
        if not self.client:
            return None

        conversation_text = "\n".join(
            f"{m['role']}: {m['content']}" for m in messages
        )

        try:
            response = self.client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SEARCH_QUERY_PROMPT},
                    {"role": "user", "content": conversation_text},
                ],
                temperature=0.1,
            )

            query = (response.choices[0].message.content or "").strip()
            if query == "NOT_READY":
                return None
            logger.info("search query generated", query=query)
            return query
        except Exception as e:
            logger.error("openai search query failed", error=str(e))
            return None

    def generate_chat_response(
        self,
        messages: list[dict],
        resume_context: str = "",
    ) -> str:
        if not self.client:
            return (
                "I'm sorry, the AI service is not configured yet. "
                "Please ask an administrator to set the OPENAI_API_KEY."
            )

        system_parts = [CHAT_SYSTEM_PROMPT]
        if resume_context:
            system_parts.append(
                f"\n\nHere are the matching candidates from the database:\n{resume_context}"
            )

        openai_messages = [
            {"role": "system", "content": "\n".join(system_parts)}
        ]
        for msg in messages:
            role = "user" if msg["role"] == "user" else "assistant"
            openai_messages.append({"role": role, "content": msg["content"]})

        try:
            response = self.client.chat.completions.create(
                model=MODEL,
                messages=openai_messages,
                temperature=0.7,
            )
            text = response.choices[0].message.content or ""
            logger.info("chat response generated", length=len(text))
            return text
        except Exception as e:
            logger.error("openai chat failed", error=str(e))
            if "insufficient_quota" in str(e) or "429" in str(e):
                return (
                    "I'm having trouble connecting right now - the AI service quota "
                    "has been exceeded. Please check your OpenAI billing or try again later."
                )
            return f"Sorry, I encountered an error: {e}"
