import httpx
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import create_access_token, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse

router = APIRouter()

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="github",
    client_id=settings.GITHUB_CLIENT_ID,
    client_secret=settings.GITHUB_CLIENT_SECRET,
    authorize_url="https://github.com/login/oauth/authorize",
    access_token_url="https://github.com/login/oauth/access_token",
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "user:email"},
)


def _set_session_cookie(response: Response, user: User) -> None:
    token = create_access_token(str(user.id))
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="strict",
        secure=settings.ENVIRONMENT == "production",
        max_age=7 * 24 * 3600,
        path="/",
    )


async def _upsert_user(
    db: AsyncSession,
    *,
    email: str,
    name: str | None,
    avatar_url: str | None,
    provider: str,
    provider_id: str,
) -> User:
    result = await db.execute(
        select(User).where(User.provider == provider, User.provider_id == provider_id)
    )
    user = result.scalar_one_or_none()

    if user:
        user.email = email
        user.name = name
        user.avatar_url = avatar_url
    else:
        user = User(
            email=email,
            name=name,
            avatar_url=avatar_url,
            provider=provider,
            provider_id=provider_id,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)
    return user


# --- Google OAuth ---

@router.get("/google")
async def google_login(request: Request):
    redirect_uri = f"{settings.BACKEND_URL}/api/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")
    if not userinfo:
        userinfo = await oauth.google.userinfo(token=token)

    user = await _upsert_user(
        db,
        email=userinfo["email"],
        name=userinfo.get("name"),
        avatar_url=userinfo.get("picture"),
        provider="google",
        provider_id=str(userinfo["sub"]),
    )

    response = RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard")
    _set_session_cookie(response, user)
    return response


# --- GitHub OAuth ---

@router.get("/github")
async def github_login(request: Request):
    redirect_uri = f"{settings.BACKEND_URL}/api/auth/github/callback"
    return await oauth.github.authorize_redirect(request, redirect_uri)


@router.get("/github/callback")
async def github_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await oauth.github.authorize_access_token(request)
    access_token = token["access_token"]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            profile = resp.json()

            if not profile.get("id"):
                raise HTTPException(status_code=502, detail="GitHub returned invalid profile")

            # Get primary email if not public
            email = profile.get("email")
            if not email:
                email_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                email_resp.raise_for_status()
                emails = email_resp.json()
                if not emails:
                    raise HTTPException(status_code=502, detail="No email found on GitHub account")
                primary = next((e for e in emails if e.get("primary")), emails[0])
                email = primary["email"]
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API error: {e.response.status_code}",
        )

    user = await _upsert_user(
        db,
        email=email,
        name=profile.get("name") or profile.get("login"),
        avatar_url=profile.get("avatar_url"),
        provider="github",
        provider_id=str(profile["id"]),
    )

    response = RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard")
    _set_session_cookie(response, user)
    return response


# --- Current user ---

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse.from_user(user)


# --- Logout ---

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("session_token", path="/")
    return {"ok": True}
