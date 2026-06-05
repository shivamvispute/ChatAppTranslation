from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.translator import translate

router = APIRouter()


class TranslateRequest(BaseModel):
    text: str
    targetLang: str
    sourceLang: Optional[str] = None


@router.post("/")
async def translate_text(req: TranslateRequest):
    if not req.text.strip():
        return {"translatedText": req.text, "detectedLanguage": None, "source": "passthrough", "latencyMs": 0, "cacheHit": False}
    result = await translate(req.text, req.targetLang, req.sourceLang)
    return result
