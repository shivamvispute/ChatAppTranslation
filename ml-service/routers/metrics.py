from fastapi import APIRouter
from services.metrics_store import MetricsStore
from services.model_registry import ModelRegistry
from services.vector_store import VectorStore

router = APIRouter()


@router.get("/")
async def get_metrics():
    return {
        **MetricsStore.snapshot(),
        "loadedTranslationModels": ModelRegistry.list_loaded_models(),
        "vectorStoreStats": VectorStore.stats(),
    }
