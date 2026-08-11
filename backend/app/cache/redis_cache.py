import json
import os
from typing import Any

import redis.asyncio as redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://localhost:6379/0",
)


class RedisCache:
    def __init__(self):
        self.client = redis.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )

    async def get(self, key: str) -> Any | None:
        value = await self.client.get(key)

        if value is None:
            return None

        return json.loads(value)

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int,
    ) -> None:
        await self.client.set(
            key,
            json.dumps(value),
            ex=ttl,
        )

    async def ping(self) -> bool:
        return bool(await self.client.ping())


redis_cache = RedisCache()