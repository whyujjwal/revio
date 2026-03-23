from fastapi import APIRouter, HTTPException, status

from app.core.auth import create_access_token
from app.core.config import settings
from app.schemas.auth import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    if (
        request.email != settings.ADMIN_EMAIL
        or request.password != settings.ADMIN_PASSWORD
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": request.email})
    return LoginResponse(access_token=token)
