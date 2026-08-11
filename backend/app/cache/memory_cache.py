from typing import Any

from cachetools import TTLCache


class MemoryTTLCache:
    def __init__(self, maxsize: int, ttl: int):
        self._cache: TTLCache[str, Any] = TTLCache(
            maxsize=maxsize,
            ttl=ttl,
        )

    def get(self, key: str) -> Any | None:
        return self._cache.get(key)

    def set(self, key: str, value: Any) -> None:
        self._cache[key] = value

    def delete(self, key: str) -> None:
        self._cache.pop(key, None)

    def clear(self) -> None:
        self._cache.clear()


# Search results remain cached for one hour.
company_search_cache = MemoryTTLCache(
    maxsize=500,
    ttl=60 * 60,
)

# Complete company pages remain cached for 30 minutes.
company_overview_cache = MemoryTTLCache(
    maxsize=500,
    ttl=30 * 60,
)