"""
Central registry for all ML models. Loads lazily and keeps them in memory
so each request uses the same warm model instance.

Translation: Helsinki-NLP/opus-mt-{src}-{tgt} — MarianMT models
Embeddings:  sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
"""
import asyncio
import logging
import os
from typing import Optional

import torch
from transformers import MarianMTModel, MarianTokenizer
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

DEVICE = "cpu"  # Keep CPU for portability; swap to "cuda" if GPU available

# Language pairs we eagerly load at startup (most common combos)
EAGER_PAIRS = [
    ("en", "de"), ("en", "fr"), ("en", "es"), ("en", "zh"),
    ("de", "en"), ("fr", "en"), ("es", "en"), ("zh", "en"),
]

LANG_CODE_MAP = {
    "EN": "en", "DE": "de", "FR": "fr", "ES": "es",
    "IT": "it", "PT": "pt", "RU": "ru", "ZH": "zh",
    "JA": "ja", "KO": "ko", "TR": "tr", "PL": "pl",
    "NL": "nl", "UK": "uk", "AR": "ar",
}


class ModelRegistry:
    _translation_models: dict = {}
    _translation_tokenizers: dict = {}
    _embedder: Optional[SentenceTransformer] = None
    _ready: bool = False

    @classmethod
    async def initialize(cls):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, cls._load_all)
        cls._ready = True

    @classmethod
    def _load_all(cls):
        # Load embedding model first (small, ~90MB)
        logger.info("Loading sentence-transformer embedding model...")
        cls._embedder = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            device=DEVICE,
        )
        logger.info("Embedding model loaded")

        # Load eager translation pairs
        for src, tgt in EAGER_PAIRS:
            cls._load_translation_model(src, tgt)

    @classmethod
    def _load_translation_model(cls, src: str, tgt: str):
        key = f"{src}-{tgt}"
        if key in cls._translation_models:
            return
        model_name = f"Helsinki-NLP/opus-mt-{src}-{tgt}"
        try:
            logger.info(f"Loading translation model {model_name}...")
            tokenizer = MarianTokenizer.from_pretrained(model_name)
            model = MarianMTModel.from_pretrained(model_name).to(DEVICE)
            model.eval()
            cls._translation_tokenizers[key] = tokenizer
            cls._translation_models[key] = model
            logger.info(f"Loaded {model_name}")
        except Exception as e:
            logger.warning(f"Could not load {model_name}: {e}")

    @classmethod
    def get_translation_model(cls, src: str, tgt: str):
        key = f"{src}-{tgt}"
        if key not in cls._translation_models:
            cls._load_translation_model(src, tgt)
        model = cls._translation_models.get(key)
        tokenizer = cls._translation_tokenizers.get(key)
        return model, tokenizer

    @classmethod
    def get_embedder(cls) -> SentenceTransformer:
        return cls._embedder

    @classmethod
    def is_ready(cls) -> bool:
        return cls._ready

    @classmethod
    def normalize_lang(cls, lang_code: str) -> str:
        return LANG_CODE_MAP.get(lang_code.upper(), lang_code.lower())

    @classmethod
    def list_loaded_models(cls) -> list:
        return list(cls._translation_models.keys())
