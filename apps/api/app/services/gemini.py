"""Gemini AI service for resume extraction and chat responses."""

from __future__ import annotations

import json

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.logging import get_logger
from app.services.prompts import (
    CHAT_SYSTEM_PROMPT,
    RESUME_EXTRACTION_PROMPT,
    SEARCH_QUERY_PROMPT,
)

logger = get_logger(__name__)

_client: genai.Client | None = None


class GeminiUnavailableError(RuntimeError):
    pass


class GeminiQuotaError(GeminiUnavailableError):
    pass


def _normalize_gemini_error(exc: Exception) -> GeminiUnavailableError:
    message = str(exc).lower()
    if (
        "resource_exhausted" in message
        or "quota" in message
        or "rate limit" in message
        or "429" in message
    ):
        return GeminiQuotaError("Gemini free-tier quota reached. Try again later.")

    return GeminiUnavailableError(
        "Gemini is unavailable right now. Free-tier keys are often rate-limited."
    )


def _get_client() -> genai.Client:
    global _client
    if _client is not None:
        return _client
    if not settings.GEMINI_API_KEY:
        raise GeminiUnavailableError("GEMINI_API_KEY is not set")
    _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


class GeminiService:
    def __init__(self) -> None:
        self.client = _get_client()

    def _generate_content(
        self,
        *,
        contents,
        config: types.GenerateContentConfig,
    ):
        try:
            return self.client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=config,
            )
        except GeminiUnavailableError:
            raise
        except Exception as exc:
            logger.warning("gemini request failed", error=str(exc))
            raise _normalize_gemini_error(exc) from exc

    def extract_resume_data(self, raw_text: str) -> dict:
        prompt = RESUME_EXTRACTION_PROMPT + raw_text

        response = self._generate_content(
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )

        try:
            data = json.loads(response.text)
            logger.info(
                "resume data extracted",
                name=data.get("candidate_name"),
                skills_count=len(data.get("skills", [])),
            )
            return data
        except json.JSONDecodeError:
            logger.error("failed to parse gemini response", response=response.text[:200])
            raise ValueError("Gemini returned invalid JSON for resume extraction")

    def generate_search_query(self, messages: list[dict]) -> str | None:
        conversation_text = "\n".join(
            f"{m['role']}: {m['content']}" for m in messages
        )
        prompt = SEARCH_QUERY_PROMPT + conversation_text

        response = self._generate_content(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1),
        )

        query = response.text.strip()
        if query == "NOT_READY":
            return None
        logger.info("search query generated", query=query)
        return query

    def generate_chat_response(
        self,
        messages: list[dict],
        resume_context: str = "",
    ) -> str:
        system_parts = [CHAT_SYSTEM_PROMPT]
        if resume_context:
            system_parts.append(
                f"\n\nHere are the matching candidates from the database:\n{resume_context}"
            )

        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))

        response = self._generate_content(
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction="\n".join(system_parts),
                temperature=0.7,
            ),
        )

        logger.info("chat response generated", length=len(response.text))
        return response.text
