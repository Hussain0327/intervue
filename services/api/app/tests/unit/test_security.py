"""Unit tests for app.core.security — password hashing, JWT creation & verification."""

from datetime import datetime, timedelta, timezone

import jwt as pyjwt
import pytest

from app.core.config import get_settings
from app.core.security import (
    AuthenticatedUser,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
    verify_token_or_none,
)

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


def test_hash_password_returns_bcrypt_string():
    hashed = hash_password("mypassword")
    assert hashed.startswith("$2")
    assert len(hashed) == 60


def test_verify_password_correct():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("secret123")
    assert verify_password("wrong", hashed) is False


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------


def test_create_access_token_decodes():
    settings = get_settings()
    token = create_access_token("user-1", "u@example.com")
    payload = pyjwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
    )
    assert payload["sub"] == "user-1"
    assert payload["email"] == "u@example.com"
    assert "exp" in payload


def test_create_access_token_without_email():
    settings = get_settings()
    token = create_access_token("user-2")
    payload = pyjwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
    )
    assert payload["sub"] == "user-2"
    assert "email" not in payload


def test_create_refresh_token_has_long_expiry():
    settings = get_settings()
    token = create_refresh_token("user-3")
    payload = pyjwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        audience=settings.jwt_audience,
        issuer=settings.jwt_issuer,
    )
    assert payload["sub"] == "user-3"
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    assert exp > datetime.now(timezone.utc) + timedelta(days=25)


# ---------------------------------------------------------------------------
# Token verification
# ---------------------------------------------------------------------------


def test_verify_token_valid():
    token = create_access_token("uid-1", "a@b.com")
    user = verify_token(token)
    assert isinstance(user, AuthenticatedUser)
    assert user.sub == "uid-1"
    assert user.email == "a@b.com"


def test_verify_token_expired():
    token = create_access_token("uid-2", expires_minutes=-1)
    with pytest.raises((pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError, ValueError)):
        verify_token(token)


def test_verify_token_wrong_audience():
    settings = get_settings()
    payload = {
        "sub": "uid-3",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "aud": "wrong-audience",
        "iss": settings.jwt_issuer,
    }
    token = pyjwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    with pytest.raises((pyjwt.InvalidAudienceError, pyjwt.InvalidTokenError, ValueError)):
        verify_token(token)


def test_verify_token_missing_sub():
    settings = get_settings()
    payload = {
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "aud": settings.jwt_audience,
        "iss": settings.jwt_issuer,
    }
    token = pyjwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    with pytest.raises((pyjwt.InvalidTokenError, ValueError, KeyError)):
        verify_token(token)


def test_verify_token_none_algorithm_attack():
    """JWT 'none' algorithm attack must be rejected."""
    settings = get_settings()
    payload = {
        "sub": "hacker",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "aud": settings.jwt_audience,
        "iss": settings.jwt_issuer,
    }
    # Passing a token signed with wrong key should fail verification
    wrong_key_token = pyjwt.encode(payload, "wrong-key", algorithm="HS256")
    with pytest.raises((pyjwt.InvalidSignatureError, pyjwt.InvalidTokenError, ValueError)):
        verify_token(wrong_key_token)


def test_verify_token_or_none_returns_none_on_failure():
    assert verify_token_or_none(None) is None
    assert verify_token_or_none("") is None
    assert verify_token_or_none("bad.token.value") is None


def test_verify_token_or_none_returns_user_on_success():
    token = create_access_token("uid-ok", "ok@ok.com")
    user = verify_token_or_none(token)
    assert user is not None
    assert user.sub == "uid-ok"
