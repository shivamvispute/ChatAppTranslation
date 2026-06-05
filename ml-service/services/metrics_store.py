"""
In-process metrics store. Records translation latency, model source
distribution, and cache hit rate for the /metrics observability endpoint.
"""
import time
from collections import defaultdict, deque
from threading import Lock


class MetricsStore:
    _lock = Lock()
    _translation_count: int = 0
    _cache_hits: int = 0
    _total_latency_ms: float = 0.0
    _source_counts: dict = defaultdict(int)
    # Rolling window: last 100 latency samples
    _latency_window: deque = deque(maxlen=100)
    _start_time: float = time.time()

    @classmethod
    def record_translation(cls, latency_ms: float, source: str, cache_hit: bool):
        with cls._lock:
            cls._translation_count += 1
            cls._total_latency_ms += latency_ms
            cls._source_counts[source] += 1
            if cache_hit:
                cls._cache_hits += 1
            else:
                cls._latency_window.append(latency_ms)

    @classmethod
    def snapshot(cls) -> dict:
        with cls._lock:
            count = cls._translation_count
            window = list(cls._latency_window)
            avg_latency = (sum(window) / len(window)) if window else 0
            p95 = _percentile(window, 95) if window else 0
            return {
                "uptimeSeconds": round(time.time() - cls._start_time),
                "totalTranslations": count,
                "cacheHits": cls._cache_hits,
                "cacheHitRate": round(cls._cache_hits / count, 3) if count else 0,
                "avgLatencyMs": round(avg_latency, 1),
                "p95LatencyMs": round(p95, 1),
                "sourceDistribution": dict(cls._source_counts),
            }


def _percentile(data: list, pct: int) -> float:
    if not data:
        return 0.0
    sorted_data = sorted(data)
    idx = int(len(sorted_data) * pct / 100)
    return sorted_data[min(idx, len(sorted_data) - 1)]
