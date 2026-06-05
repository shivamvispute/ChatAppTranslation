"""
In-memory vector store for semantic search.
Uses sentence-transformers embeddings + cosine similarity.
Simulates a lightweight RAG retrieval layer over chat messages.
"""
import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from services.model_registry import ModelRegistry

logger = logging.getLogger(__name__)


@dataclass
class IndexedMessage:
    message_id: str
    room_id: str
    text: str
    sender_username: str
    timestamp: str
    embedding: np.ndarray = field(repr=False)


class VectorStore:
    _store: dict[str, list[IndexedMessage]] = {}  # room_id -> [IndexedMessage]

    @classmethod
    async def index_message(cls, message_id: str, room_id: str, text: str,
                             sender_username: str, timestamp: str):
        embedding = await cls._embed(text)
        msg = IndexedMessage(
            message_id=message_id,
            room_id=room_id,
            text=text,
            sender_username=sender_username,
            timestamp=timestamp,
            embedding=embedding,
        )
        if room_id not in cls._store:
            cls._store[room_id] = []
        cls._store[room_id].append(msg)

    @classmethod
    async def search(cls, query: str, room_id: str, top_k: int = 5) -> list[dict]:
        messages = cls._store.get(room_id, [])
        if not messages:
            return []

        query_embedding = await cls._embed(query)

        # Cosine similarity against all indexed messages
        scores = []
        for msg in messages:
            sim = _cosine_similarity(query_embedding, msg.embedding)
            scores.append((sim, msg))

        scores.sort(key=lambda x: x[0], reverse=True)

        return [
            {
                "messageId": m.message_id,
                "text": m.text,
                "senderUsername": m.sender_username,
                "timestamp": m.timestamp,
                "similarity": round(float(score), 4),
            }
            for score, m in scores[:top_k]
            if score > 0.3  # filter low-relevance results
        ]

    @classmethod
    async def _embed(cls, text: str) -> np.ndarray:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, cls._embed_sync, text)

    @classmethod
    def _embed_sync(cls, text: str) -> np.ndarray:
        embedder = ModelRegistry.get_embedder()
        if embedder is None:
            return np.zeros(384)
        vec = embedder.encode(text, normalize_embeddings=True)
        return vec

    @classmethod
    def stats(cls) -> dict:
        return {
            room: len(msgs)
            for room, msgs in cls._store.items()
        }


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))
