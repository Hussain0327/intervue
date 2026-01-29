"""FastAPI dependency injection providers for database sessions, auth, and shared services."""

import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import AuthenticatedUser, verify_token

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> AuthenticatedUser:
    """Extract and verify the Bearer token from the Authorization header.

    Use as a FastAPI dependency on REST endpoints:
        @router.post("/endpoint")
        async def handler(user: AuthenticatedUser = Depends(get_current_user)):
            ...
    """
    try:
        return verify_token(credentials.credentials)
    except Exception as exc:
        logger.debug("REST auth failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
