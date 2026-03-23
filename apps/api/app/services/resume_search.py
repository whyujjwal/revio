"""ChromaDB-based resume search service for semantic similarity matching."""

from __future__ import annotations

import uuid

from app.core.logging import get_logger
from app.services.memory import _get_client

logger = get_logger(__name__)


class ResumeSearchService:
    def __init__(self) -> None:
        self.client = _get_client()
        self.collection = self.client.get_or_create_collection(
            name="resumes",
            metadata={"hnsw:space": "cosine"},
        )

    def add_resume(
        self,
        resume_id: int,
        text: str,
        metadata: dict | None = None,
    ) -> str:
        chromadb_id = str(uuid.uuid4())
        meta = metadata or {}
        meta["resume_id"] = str(resume_id)

        self.collection.add(
            ids=[chromadb_id],
            documents=[text],
            metadatas=[meta],
        )

        logger.info("resume indexed", resume_id=resume_id, chromadb_id=chromadb_id)
        return chromadb_id

    def search_resumes(
        self,
        query: str,
        limit: int = 10,
    ) -> list[dict]:
        results_obj = self.collection.query(
            query_texts=[query],
            n_results=limit,
        )

        results = []
        if results_obj["ids"] and results_obj["ids"][0]:
            for i, doc_id in enumerate(results_obj["ids"][0]):
                results.append({
                    "chromadb_id": doc_id,
                    "content": results_obj["documents"][0][i],
                    "score": 1.0 - results_obj["distances"][0][i],
                    "metadata": results_obj["metadatas"][0][i],
                })

        logger.info("resume search", query=query[:80], results_count=len(results))
        return results

    def delete_resume(self, chromadb_id: str) -> bool:
        try:
            self.collection.delete(ids=[chromadb_id])
            logger.info("resume removed from index", chromadb_id=chromadb_id)
            return True
        except Exception as e:
            logger.warning("resume delete failed", chromadb_id=chromadb_id, error=str(e))
            return False
