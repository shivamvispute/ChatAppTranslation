from fastapi import APIRouter
from pydantic import BaseModel
from services.detector import detect_language

router = APIRouter()


class DetectRequest(BaseModel):
    text: str


@router.post("/")
async def detect(req: DetectRequest):
    return await detect_language(req.text)
