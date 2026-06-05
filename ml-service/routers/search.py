from fastapi import APIRouter
from pydantic import BaseModel
from services.vector_store import VectorStore

router = APIRouter()


class IndexRequest(BaseModel):
    messageId: str
    roomId: str
    text: str
    senderUsername: str
    timestamp: str


class SearchRequest(BaseModel):
    query: str
    roomId: str
    topK: int = 5


@router.post("/index")
async def index_message(req: IndexRequest):
    await VectorStore.index_message(
        message_id=req.messageId,
        room_id=req.roomId,
        text=req.text,
        sender_username=req.senderUsername,
        timestamp=req.timestamp,
    )
    return {"indexed": True, "stats": VectorStore.stats()}


@router.post("/query")
async def semantic_search(req: SearchRequest):
    results = await VectorStore.search(req.query, req.roomId, req.topK)
    return {"results": results, "count": len(results)}
