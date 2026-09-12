"""Test fixtures for media-pulse backend"""
import pytest
import os
from dotenv import load_dotenv

# Load test environment variables
load_dotenv()

@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    """Set up test environment variables"""
    os.environ["SUPABASE_URL"] = os.getenv("SUPABASE_URL", "https://test.supabase.co")
    os.environ["SUPABASE_KEY"] = os.getenv("SUPABASE_KEY", "test-key")
    os.environ["SUPABASE_DB_PASSWORD"] = os.getenv("SUPABASE_DB_PASSWORD", "test-password")
    os.environ["META_APP_ID"] = os.getenv("META_APP_ID", "test-app-id")
    os.environ["META_ACCESS_TOKEN"] = os.getenv("META_ACCESS_TOKEN", "test-token")
    os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY", "test-groq-key")
    os.environ["FIRECRAWL_API_KEY"] = os.getenv("FIRECRAWL_API_KEY", "test-firecrawl-key")
    os.environ["SCRAPER_PROVIDER"] = "rss"  # Use free provider for tests

@pytest.fixture
def mock_env(monkeypatch):
    """Mock environment variables for testing"""
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "test-key")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("FIRECRAWL_API_KEY", "test-firecrawl-key")
