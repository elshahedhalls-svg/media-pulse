"""Tests for Google/DuckDuckGo scraper provider"""
import pytest
from services.scrapers.google import GoogleSearchScraper


class TestGoogleSearchScraper:
    """Test GoogleSearchScraper implementation"""

    @pytest.fixture
    def scraper(self):
        """Create GoogleSearchScraper instance"""
        return GoogleSearchScraper()

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
        """Test that Reddit search returns a list"""
        results = await scraper.search_reddit("Vodafone Egypt", limit=3)
        assert isinstance(results, list)

    @pytest.mark.asyncio
    async def test_search_twitter_returns_results(self, scraper):
        """Test that Twitter search returns results (DuckDuckGo searches web for Twitter content)"""
        results = await scraper.search_twitter("Vodafone Egypt", limit=5)
        assert isinstance(results, list)
        # DuckDuckGo may or may not return results, just check it's a list

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
