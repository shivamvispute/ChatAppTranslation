"""
Language detection using langdetect (ML-based statistical model).
"""
import asyncio
import logging

from langdetect import detect, detect_langs, LangDetectException

logger = logging.getLogger(__name__)

# Map langdetect codes to DeepL/Helsinki uppercase codes
LANG_MAP = {
    "zh-cn": "ZH", "zh-tw": "ZH", "zh": "ZH",
    "pt": "PT", "nb": "NB", "nn": "NB",
}


def _normalize(code: str) -> str:
    lower = code.lower()
    return LANG_MAP.get(lower, code.upper())


async def detect_language(text: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _detect_sync, text)


def _detect_sync(text: str) -> dict:
    try:
        probabilities = detect_langs(text)
        top = probabilities[0]
        return {
            "language": _normalize(top.lang),
            "confidence": round(top.prob, 3),
            "alternatives": [
                {"language": _normalize(p.lang), "confidence": round(p.prob, 3)}
                for p in probabilities[:3]
            ],
        }
    except LangDetectException:
        return {"language": "EN", "confidence": 0.0, "alternatives": []}
