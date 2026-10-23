"""``/api/keys`` — Sync runtime API keys and provider selections into agent-api."""

from __future__ import annotations

import os
from fastapi import APIRouter
from pydantic import BaseModel

from ..core import deps as deps_module

router = APIRouter()


class KeysUpdateRequest(BaseModel):
    LLM_PROVIDER: str | None = None
    GEMINI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    STT_PROVIDER: str | None = None
    DEEPGRAM_API_KEY: str | None = None
    TTS_PROVIDER: str | None = None
    CARTESIA_API_KEY: str | None = None
    ELEVENLABS_API_KEY: str | None = None
    LIVEKIT_URL: str | None = None
    LIVEKIT_API_KEY: str | None = None
    LIVEKIT_API_SECRET: str | None = None


@router.post("/api/keys")
async def update_keys(body: dict[str, str | None]) -> dict[str, bool]:
    for key, val in body.items():
        if val is not None:
            if val == "":
                os.environ.pop(key, None)
            else:
                os.environ[key] = str(val)

    # Invalidate cached deps bundle so fresh settings and adapters are used
    deps_module._default_deps = None
    return {"ok": True}
