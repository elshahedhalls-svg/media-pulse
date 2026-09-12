"""Tests for brand sentiment orchestrator"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.brand_sentiment import (
    analyze_sentiment_textblob,
    get_brand_sentiment,
    get_available_sources,
)


class TestAnalyzeSentimentTextblob:
    """Test TextBlob sentiment analysis"""

    def test_positive_text(self):
        """Test sentiment analysis on positive text"""
        result = analyze_sentiment_textblob("I love this product, it's amazing!")
        assert result["label"] == "positive"
        assert result["score"] > 0

    def test_negative_text(self):
        """Test sentiment analysis on negative text"""
        result = analyze_sentiment_textblob("This is terrible, I hate it.")
        assert result["label"] == "negative"
        assert result["score"] < 0

    def test_neutral_text(self):
        """Test sentiment analysis on neutral text"""
        result = analyze_sentiment_textblob("The weather is cloudy today.")
        assert result["label"] == "neutral"
        assert -0.1 <= result["score"] <= 0.1

    def test_empty_text(self):
        """Test sentiment analysis on empty text"""
        result = analyze_sentiment_textblob("")
        assert result["label"] == "neutral"
        assert result["score"] == 0


class TestGetBrandSentiment:
    """Test brand sentiment orchestrator"""

    @pytest.mark.asyncio
    async def test_returns_correct_structure(self):
        """Test that get_brand_sentiment returns correct structure"""
        with patch("services.brand_sentiment.get_scraper") as mock_get_scraper:
            mock_scraper = AsyncMock()
            mock_scraper.search_twitter.return_value = []
            mock_scraper.search_reddit.return_value = []
            mock_scraper.search_news.return_value = []
            mock_scraper.__class__.__name__ = "MockScraper"
            mock_get_scraper.return_value = mock_scraper

            result = await get_brand_sentiment("TestBrand", use_groq=False)

            assert "brand" in result
            assert "provider" in result
            assert "overall_score" in result
            assert "total_mentions" in result
            assert "positive_count" in result
            assert "negative_count" in result
            assert "neutral_count" in result
            assert result["brand"] == "TestBrand"

    @pytest.mark.asyncio
    async def test_with_mock_mentions(self):
        """Test sentiment analysis with mock mentions"""
        with patch("services.brand_sentiment.get_scraper") as mock_get_scraper:
            mock_scraper = AsyncMock()
            mock_scraper.search_twitter.return_value = []
            mock_scraper.search_reddit.return_value = []
            mock_scraper.search_news.return_value = [
                {"text": "Great service!", "source": "news", "url": "https://example.com"},
                {"text": "Terrible experience.", "source": "news", "url": "https://example.com"},
            ]
            mock_scraper.__class__.__name__ = "MockScraper"
            mock_get_scraper.return_value = mock_scraper

            result = await get_brand_sentiment("TestBrand", sources=["news"], use_groq=False)

            assert result["total_mentions"] == 2
            assert result["positive_count"] + result["negative_count"] + result["neutral_count"] == 2

    @pytest.mark.asyncio
    async def test_provider_passed_to_get_scraper(self):
        """Test that provider parameter is passed to get_scraper"""
        with patch("services.brand_sentiment.get_scraper") as mock_get_scraper:
            mock_scraper = AsyncMock()
            mock_scraper.search_twitter.return_value = []
            mock_scraper.search_reddit.return_value = []
            mock_scraper.search_news.return_value = []
            mock_scraper.__class__.__name__ = "MockScraper"
            mock_get_scraper.return_value = mock_scraper

            await get_brand_sentiment("TestBrand", provider="google")

            mock_get_scraper.assert_called_once_with("google")


class TestGetAvailableSources:
    """Test get_available_sources function"""

    def test_returns_list(self):
        """Test that get_available_sources returns a list"""
        sources = get_available_sources()
        assert isinstance(sources, list)
        assert len(sources) >= 2
