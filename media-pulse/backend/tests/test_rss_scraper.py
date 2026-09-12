"""Tests for RSS scraper provider"""
import pytest
from services.scrapers.rss import RSSScraper


class TestRSSScraper:
    """Test RSSScraper implementation"""

    @pytest.fixture
    def scraper(self):
        """Create RSSScraper instance"""
        return RSSScraper()

    @pytest.mark.asyncio
    async def test_search_news_returns_list(self, scraper):
        """Test that search_news returns a list of mentions"""
        results = await scraper.search_news("Vodafone Egypt", limit=3)
        assert isinstance(results, list)
        assert len(results) <= 3

    @pytest.mark.asyncio
    async def test_search_news_mention_structure(self, scraper):
        """Test that news mentions have correct structure"""
        results = await scraper.search_news("Vodafone Egypt", limit=2)
        for mention in results:
            assert "text" in mention
            assert "source" in mention
            assert "url" in mention
            assert mention["source"] == "news"

    @pytest.mark.asyncio
    async def test_search_reddit_returns_list(self, scraper):
        """Test that search_reddit returns a list"""
        results = await scraper.search_reddit("Vodafone Egypt", limit=3)
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_search_twitter_returns_empty(self, scraper):
        """Test that Twitter search returns empty (RSS doesn't support Twitter)"""
        results = await scraper.search_twitter("Vodafone Egypt", limit=5)
        assert results == []

    @pytest.mark.asyncio
    async def test_format_mention(self, scraper):
        """Test format_mention helper"""
        mention = scraper.format_mention(
            text="Test text",
            source="news",
            url="https://example.com",
            title="Test Title"
        )
        assert mention["text"] == "Test text"
        assert mention["source"] == "news"
        assert mention["url"] == "https://example.com"
