from fastapi import Request
from redis.asyncio import Redis
from redis.exceptions import RedisError
from app.config import settings
LIMITS = {"/api/auth/register": (5, 3600), "/api/auth/login": (10, 900), "/api/auth/verify": (10, 3600), "/api/apps/": (60, 60), "/api/reviews/": (10, 3600)}
def limit_for_path(path: str):
    for prefix, limit in LIMITS.items():
        if path == prefix or path.startswith(prefix): return limit
    return None
class RateLimiter:
    def __init__(self):
        self.redis = Redis.from_url(settings.redis_url, decode_responses=True) if settings.redis_url else None
    async def allow(self, request: Request) -> bool:
        rule = limit_for_path(request.url.path)
        if not rule: return True
        if self.redis is None: return settings.environment != "production"
        limit, window = rule
        client = request.client.host if request.client else "unknown"
        key = f"arox:rl:{client}:{request.method}:{request.url.path}"
        try:
            count = await self.redis.incr(key)
            if count == 1: await self.redis.expire(key, window)
            return count <= limit
        except RedisError:
            return settings.environment != "production"
    async def close(self):
        if self.redis is not None: await self.redis.aclose()
