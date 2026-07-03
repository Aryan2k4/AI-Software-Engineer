"""Pytest configuration — all tests use mock AI provider and mock Supabase."""
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Set env vars BEFORE any app imports
os.environ["AI_PROVIDER"] = "mock"
os.environ["SUPABASE_URL"] = "https://mock.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mock-service-key"
os.environ["SUPABASE_ANON_KEY"] = "mock-anon-key"
os.environ["SUPABASE_JWT_SECRET"] = "mock-jwt-secret-32-chars-minimum!!"
os.environ["SECRET_KEY"] = "test-secret-key-32-chars-minimum!!"
os.environ["SENTRY_DSN"] = ""


def _make_mock_supabase():
    """Return a complete Supabase client mock."""
    mock = MagicMock()
    # Chain: .table().select().eq().single().execute() → returns empty result
    chain = MagicMock()
    chain.execute.return_value = MagicMock(data=None)
    mock.table.return_value = chain
    chain.select.return_value = chain
    chain.insert.return_value = chain
    chain.update.return_value = chain
    chain.delete.return_value = chain
    chain.eq.return_value = chain
    chain.single.return_value = chain
    chain.order.return_value = chain
    mock.storage = MagicMock()
    mock.rpc = MagicMock(return_value=MagicMock(execute=MagicMock()))
    return mock


@pytest.fixture(autouse=True)
def mock_supabase():
    """Automatically mock Supabase for all tests."""
    mock_client = _make_mock_supabase()
    with patch("app.utils.supabase_client.get_supabase_client", return_value=mock_client):
        yield mock_client


@pytest.fixture
def mock_provider():
    from app.providers.mock.provider import MockProvider
    return MockProvider()


@pytest.fixture
def client(mock_supabase):
    from app.core.config import get_settings
    from app.providers.factory import get_ai_provider
    get_settings.cache_clear()
    get_ai_provider.cache_clear()

    from app.main import app
    return TestClient(app)
