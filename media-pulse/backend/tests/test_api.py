"""Tests for API endpoints"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


class TestBrandEndpoints:
    """Test brand sentiment API endpoints"""

    def test_get_brand_sources(self):
        """Test GET /api/brand/sources"""
        response = client.get("/api/brand/sources")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_get_brand_sources_structure(self):
        """Test that each source has required fields"""
        response = client.get("/api/brand/sources")
        data = response.json()
        for source in data:
            assert "id" in source
            assert "name" in source

    def test_get_brand_sentiment_missing_brand(self):
        """Test GET /api/brand/{brand_name}/sentiment with missing brand"""
        response = client.get("/api/brand//sentiment")
        assert response.status_code == 404

    def test_get_brand_sentiment_default_params(self):
        """Test GET /api/brand/{brand_name}/sentiment with default params"""
        with patch("services.brand_sentiment.get_scraper") as mock_get_scraper:
            mock_scraper = AsyncMock()
            mock_scraper.search_twitter.return_value = []
            mock_scraper.search_reddit.return_value = []
            mock_scraper.search_news.return_value = []
            mock_scraper.__class__.__name__ = "MockScraper"
            mock_get_scraper.return_value = mock_scraper

            response = client.get("/api/brand/TestBrand/sentiment?use_groq=false")
            assert response.status_code == 200
            data = response.json()
            assert data["brand"] == "TestBrand"

    def test_get_brand_sentiment_with_provider(self):
        """Test GET /api/brand/{brand_name}/sentiment with provider param"""
        with patch("services.brand_sentiment.get_scraper") as mock_get_scraper:
            mock_scraper = AsyncMock()
            mock_scraper.search_twitter.return_value = []
            mock_scraper.search_reddit.return_value = []
            mock_scraper.search_news.return_value = []
            mock_scraper.__class__.__name__ = "MockScraper"
            mock_get_scraper.return_value = mock_scraper

            response = client.get("/api/brand/TestBrand/sentiment?provider=google&use_groq=false")
            assert response.status_code == 200
            mock_get_scraper.assert_called_with("google")


class TestHealthCheck:
    """Test basic health check"""

    def test_root_endpoint(self):
        """Test GET / returns something"""
        response = client.get("/")
        # Root might not exist, that's okay
        assert response.status_code in [200, 404]
