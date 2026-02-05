"""Authentication, authorization, and security utilities (JWT, API keys, RBAC)."""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AuthenticatedUser:
    """Represents a verified user extracted from a JWT."""

    sub: str  # Subject (user ID)
    email: str | None = None


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(
    sub: str, email: str | None = None, expires_minutes: int = 60
) -> str:
    """Create a signed JWT access token."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload: dict = {
        "sub": sub,
        "exp": now + timedelta(minutes=expires_minutes),
        "aud": settings.jwt_audience,
        "iss": settings.jwt_issuer,
    }
    if email:
        payload["email"] = email
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(sub: str, expires_days: int = 30) -> str:
    """Create a signed JWT refresh token with a longer expiry."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "exp": now + timedelta(days=expires_days),
        "aud": settings.jwt_audience,
        "iss": settings.jwt_issuer,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> AuthenticatedUser:
    """Verify a JWT and return the authenticated user.

    Args:
        token: Raw JWT string (without "Bearer " prefix).

    Returns:
        AuthenticatedUser with claims extracted from the token.

    Raises:
        InvalidTokenError: If the token is invalid, expired, or missing required claims.
    """
    settings = get_settings()

    if not settings.jwt_secret:
        raise InvalidTokenError("JWT_SECRET is not configured on the server")

    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
        options={"require": ["sub", "exp"]},
    )

    sub: str | None = payload.get("sub")
    if not sub:
        raise InvalidTokenError("Token missing 'sub' claim")

    return AuthenticatedUser(
        sub=sub,
        email=payload.get("email"),
    )


def verify_token_or_none(token: str | None) -> AuthenticatedUser | None:
    """Verify a token, returning None instead of raising on failure.

    Useful for optional auth contexts where you want to log the failure
    but not crash.
    """
    if not token:
        return None
    try:
        return verify_token(token)
    except (ExpiredSignatureError, InvalidTokenError) as exc:
        logger.debug("Token verification failed: %s", exc)
        return None
