"""Authentication, authorization, and security utilities (JWT, API keys, RBAC)."""

import logging
from dataclasses import dataclass

import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AuthenticatedUser:
    """Represents a verified user extracted from a JWT."""

    sub: str  # Subject (user ID)
    email: str | None = None


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
