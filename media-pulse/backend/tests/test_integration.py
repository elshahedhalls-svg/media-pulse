"""Integration tests for full API flows"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from services.auth import create_token, hash_password


client = TestClient(app)


@pytest.fixture
def admin_token():
    """Create an admin token for testing"""
    return create_token({"sub": "admin1", "role": "admin"})


@pytest.fixture
def viewer_token():
    """Create a viewer token for testing"""
    return create_token({"sub": "viewer1", "role": "viewer"})


class TestAuthFlow:
    """Test complete authentication flow"""

    def test_login_success(self):
        """Test successful login"""
        response = client.post("/api/auth/login", json={
            "username": "admin1",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "admin1"

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = client.post("/api/auth/login", json={
            "username": "admin1",
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self):
        """Test login with nonexistent user"""
        response = client.post("/api/auth/login", json={
            "username": "nonexistent",
            "password": "password"
        })
        assert response.status_code == 401

    def test_me_with_valid_token(self, admin_token):
        """Test /api/auth/me with valid token"""
        response = client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin1"

    def test_me_without_token(self):
        """Test /api/auth/me without token"""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_me_with_invalid_token(self):
        """Test /api/auth/me with invalid token"""
        response = client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid.token.here"
        })
        assert response.status_code == 401


class TestUserManagementFlow:
    """Test user management flow"""

    def test_list_users_as_admin(self, admin_token):
        """Test listing users as admin"""
        response = client.get("/api/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_users_as_viewer(self, viewer_token):
        """Test listing users as viewer (should be denied)"""
        response = client.get("/api/users", headers={
            "Authorization": f"Bearer {viewer_token}"
        })
        assert response.status_code == 403

    def test_create_user_as_admin(self, admin_token):
        """Test creating user as admin"""
        import time
        unique_username = f"testuser_{int(time.time())}"
        response = client.post("/api/users", json={
            "username": unique_username,
            "password": "TestPass123!",
            "role": "viewer"
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == unique_username

    def test_create_duplicate_user(self, admin_token):
        """Test creating duplicate user"""
        response = client.post("/api/users", json={
            "username": "admin1",
            "password": "TestPass123!",
            "role": "viewer"
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 400


class TestBrandSentimentFlow:
    """Test brand sentiment API flow"""

    def test_get_sources_then_sentiment(self):
        """Test getting sources then fetching sentiment"""
        # Step 1: Get available sources
        sources_response = client.get("/api/brand/sources")
        assert sources_response.status_code == 200
        sources = sources_response.json()
        assert len(sources) >= 2

        # Step 2: Get sentiment with mock
        with patch("services.brand_sentiment.get_scraper") as mock_get_scraper:
            mock_scraper = AsyncMock()
            mock_scraper.search_twitter.return_value = []
            mock_scraper.search_reddit.return_value = []
            mock_scraper.search_news.return_value = []
            mock_scraper.__class__.__name__ = "MockScraper"
            mock_get_scraper.return_value = mock_scraper

            sentiment_response = client.get(
                "/api/brand/TestBrand/sentiment?use_groq=false"
            )
            assert sentiment_response.status_code == 200
            data = sentiment_response.json()
            assert data["brand"] == "TestBrand"


class TestTikTokFlow:
    """Test TikTok API flow"""

    def test_get_industries(self):
        """Test getting TikTok industries"""
        response = client.get("/api/tiktok/industries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_get_countries(self):
        """Test getting TikTok countries"""
        response = client.get("/api/tiktok/countries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_search_ads_requires_auth(self):
        """Test that TikTok search requires authentication"""
        response = client.get("/api/tiktok/ads/search?keyword=test")
        assert response.status_code == 401

    def test_search_ads_with_auth(self, admin_token):
        """Test TikTok search with authentication"""
        with patch("services.tiktok.search_tiktok_ads") as mock_search:
            mock_search.return_value = {"ads": [], "count": 0}
            response = client.get(
                "/api/tiktok/ads/search?keyword=test",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200


class TestCorrelationFlow:
    """Test correlation API flow"""

    def test_correlation_requires_auth(self):
        """Test that correlation endpoint requires authentication"""
        response = client.get("/api/correlation/1")
        assert response.status_code == 401

    def test_correlation_with_auth(self, admin_token):
        """Test correlation with authentication"""
        with patch("crud.get_app_by_tracked_id") as mock_get_app:
            mock_get_app.return_value = None
            response = client.get(
                "/api/correlation/999",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 404
