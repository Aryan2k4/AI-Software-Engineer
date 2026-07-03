"""TokenService — generate share tokens and build share URLs."""
from __future__ import annotations

import secrets


def generate_share_token() -> str:
    return secrets.token_urlsafe(24)


def build_share_url(base_url: str, token: str) -> str:
    return f"{base_url.rstrip('/')}/share/{token}"
