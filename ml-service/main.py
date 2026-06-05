import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import translate, detect, search, metrics
from services.model_registry import ModelRegistry

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading ML models...")
    t0 = time.time()
    await ModelRegistry.initialize()
    logger.info(f"Models loaded in {time.time() - t0:.2f}s")
    yield
    logger.info("Shutting down ML service")


app = FastAPI(
    title="ChatGlobe ML Service",
    description="Hugging Face translation, language detection, semantic search, and observability",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(translate.router, prefix="/translate", tags=["Translation"])
app.include_router(detect.router, prefix="/detect", tags=["Language Detection"])
app.include_router(search.router, prefix="/search", tags=["Semantic Search"])
app.include_router(metrics.router, prefix="/metrics", tags=["Observability"])


@app.get("/health")
async def health():
    return {"status": "ok", "models_loaded": ModelRegistry.is_ready()}
