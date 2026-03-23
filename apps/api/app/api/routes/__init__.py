from fastapi import APIRouter

from app.api.routes import auth, chat, health, livekit, memory, resumes

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(memory.router, tags=["memory"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(resumes.router, tags=["resumes"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(livekit.router, tags=["livekit"])
