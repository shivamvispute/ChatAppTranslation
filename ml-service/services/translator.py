"""
Translation service: Hugging Face MarianMT with DeepL as fallback.
Records latency and cache hit metrics for observability.
"""
import asyncio
import hashlib
import logging
import os
import time
from typing import Optional

import httpx
import torch

from services.model_registry import ModelRegistry
from services.metrics_store import MetricsStore

logger = logging.getLogger(__name__)

# In-memory translation cache: hash(text+src+tgt) -> translated_text
_cache: dict[str, str] = {}
MAX_CACHE_SIZE = 1000


def _cache_key(text: str, src: str, tgt: str) -> str:
    return hashlib.md5(f"{text}|{src}|{tgt}".encode()).hexdigest()


async def translate(text: str, target_lang: str, source_lang: Optional[str] = None) -> dict:
    """
    Translate text using HuggingFace MarianMT.
    Falls back to DeepL if no HF model exists for the language pair.
    Returns: {translatedText, detectedLanguage, source, latencyMs, cacheHit}
    """
    t0 = time.time()
    tgt = ModelRegistry.normalize_lang(target_lang)
    src = ModelRegistry.normalize_lang(source_lang) if source_lang else None

    # If source unknown, detect first
    if not src:
        from services.detector import detect_language
        detected = await detect_language(text)
        src = detected.get("language", "en")

    # Same language — no-op
    if src == tgt:
        return {
            "translatedText": text,
            "detectedLanguage": src.upper(),
            "source": "passthrough",
            "latencyMs": round((time.time() - t0) * 1000),
            "cacheHit": False,
        }

    key = _cache_key(text, src, tgt)
    if key in _cache:
        MetricsStore.record_translation(latency_ms=0, source="hf_cache", cache_hit=True)
        return {
            "translatedText": _cache[key],
            "detectedLanguage": src.upper(),
            "source": "hf_cache",
            "latencyMs": 0,
            "cacheHit": True,
        }

    # Try HuggingFace MarianMT
    result = await _try_hf_translate(text, src, tgt)
    if result:
        _store_cache(key, result)
        latency = round((time.time() - t0) * 1000)
        MetricsStore.record_translation(latency_ms=latency, source="huggingface", cache_hit=False)
        return {
            "translatedText": result,
            "detectedLanguage": src.upper(),
            "source": "huggingface",
            "latencyMs": latency,
            "cacheHit": False,
        }

    # Fallback: DeepL
    result = await _try_deepl_translate(text, tgt, src)
    latency = round((time.time() - t0) * 1000)
    MetricsStore.record_translation(latency_ms=latency, source="deepl_fallback", cache_hit=False)
    _store_cache(key, result)
    return {
        "translatedText": result,
        "detectedLanguage": src.upper(),
        "source": "deepl_fallback",
        "latencyMs": latency,
        "cacheHit": False,
    }


async def _try_hf_translate(text: str, src: str, tgt: str) -> Optional[str]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _hf_translate_sync, text, src, tgt)


def _hf_translate_sync(text: str, src: str, tgt: str) -> Optional[str]:
    model, tokenizer = ModelRegistry.get_translation_model(src, tgt)
    if model is None or tokenizer is None:
        return None
    try:
        inputs = tokenizer([text], return_tensors="pt", padding=True, truncation=True, max_length=512)
        inputs = {k: v.to("cpu") for k, v in inputs.items()}
        with torch.no_grad():
            translated = model.generate(**inputs, num_beams=4, max_length=512)
        return tokenizer.decode(translated[0], skip_special_tokens=True)
    except Exception as e:
        logger.error(f"HF translation error ({src}->{tgt}): {e}")
        return None


async def _try_deepl_translate(text: str, tgt: str, src: str) -> str:
    api_key = os.getenv("DEEPL_API_KEY", "")
    if not api_key:
        return text
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api-free.deepl.com/v2/translate",
                params={"auth_key": api_key, "text": text, "target_lang": tgt.upper(),
                        "source_lang": src.upper() if src else None},
                timeout=10,
            )
            data = resp.json()
            return data["translations"][0]["text"]
    except Exception as e:
        logger.error(f"DeepL fallback error: {e}")
        return text


def _store_cache(key: str, value: str):
    if len(_cache) >= MAX_CACHE_SIZE:
        oldest = next(iter(_cache))
        del _cache[oldest]
    _cache[key] = value
