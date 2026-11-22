from dataclasses import dataclass
import re
import httpx
from app.config import settings

@dataclass(frozen=True)
class ModerationDecision:
    status: str
    reason: str

def moderate_review(title: str, body: str, ai_result: str | None) -> ModerationDecision:
    links = re.findall(r"https?://|www\.", title + "\n" + body, flags=re.IGNORECASE)
    if len(links) > 1:
        return ModerationDecision("rejected", "excessive_links")
    if len(body.strip()) < 8:
        return ModerationDecision("pending", "insufficient_content")
    if ai_result == "unsafe":
        return ModerationDecision("rejected", "automated_safety_flag")
    if ai_result != "safe":
        reason = "ai_moderation_unavailable" if ai_result is None else "moderation_uncertain"
        return ModerationDecision("pending", reason)
    return ModerationDecision("approved", "automated_checks_passed")

def ai_moderation_result(title: str, body: str) -> str | None:
    if not settings.openai_api_key:
        return None
    try:
        response = httpx.post(
            "https://api.openai.com/v1/moderations",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={"model": settings.openai_moderation_model, "input": title + "\n" + body},
            timeout=8.0,
        )
        response.raise_for_status()
        return "unsafe" if response.json()["results"][0]["flagged"] else "safe"
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        return None
