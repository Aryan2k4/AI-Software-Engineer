"""Unit tests for token_service."""
from app.services.token_service import build_share_url, generate_share_token


def test_generate_share_token_returns_url_safe_string():
    token = generate_share_token()
    assert isinstance(token, str)
    assert len(token) > 0
    # URL-safe: no '/', '+', or padding chars that would break a URL path segment
    assert "/" not in token
    assert "+" not in token


def test_generate_share_token_is_unique_across_calls():
    tokens = {generate_share_token() for _ in range(50)}
    assert len(tokens) == 50


def test_build_share_url_joins_base_and_token():
    url = build_share_url("http://localhost:5173", "abc123")
    assert url == "http://localhost:5173/share/abc123"


def test_build_share_url_strips_trailing_slash_on_base():
    url = build_share_url("http://localhost:5173/", "abc123")
    assert url == "http://localhost:5173/share/abc123"


def test_build_share_url_with_production_domain():
    url = build_share_url("https://ag-ase.app", "xyz789")
    assert url == "https://ag-ase.app/share/xyz789"
