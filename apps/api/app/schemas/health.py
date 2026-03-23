from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    openai: bool = False
    livekit: bool = False
