import uuid

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/livekit")


class TokenRequest(BaseModel):
    session_id: str | None = None


class TokenResponse(BaseModel):
    token: str
    url: str
    room_name: str
    session_id: str


@router.post("/token", response_model=TokenResponse)
def get_livekit_token(request: TokenRequest):
    from livekit.api import AccessToken, VideoGrants

    session_id = request.session_id or str(uuid.uuid4())
    room_name = f"revio-{session_id}"

    token = AccessToken(
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    ).with_identity(
        f"user-{session_id[:8]}"
    ).with_grants(
        VideoGrants(
            room_join=True,
            room=room_name,
        )
    )

    jwt_token = token.to_jwt()
    logger.info("livekit token generated", room=room_name, session_id=session_id)

    return TokenResponse(
        token=jwt_token,
        url=settings.LIVEKIT_URL,
        room_name=room_name,
        session_id=session_id,
    )
