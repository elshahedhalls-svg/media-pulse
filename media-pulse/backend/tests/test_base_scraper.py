"""Tests for base scraper interface"""
import pytest
from services.scrapers.base import BaseScraper


class TestFormatMention:
    """Test format_mention static method"""

    def test_mention_creation(self):
        """Test creating a mention with required fields"""
        mention = BaseScraper.format_mention(
            text="Test mention",
            source="twitter",
            url="https://example.com"
        )
        assert mention["text"] == "Test mention"
        assert mention["source"] == "twitter"
        assert mention["url"] == "https://example.com"
        assert mention["author"] == ""
        assert mention["date"] is not None
        assert mention["score"] == 0

    def test_mention_with_optional_fields(self):
        """Test creating a mention with all fields"""
        mention = BaseScraper.format_mention(
            text="Test mention",
            source="reddit",
            url="https://reddit.com/r/test",
            author="test_user",
            date="2024-01-01",
            score=0.75
        )
        assert mention["author"] == "test_user"
        assert mention["date"] == "2024-01-01"
        assert mention["score"] == 0.75


class TestBaseScraper:
    """Test BaseScraper abstract interface"""

    def test_cannot_instantiate_base_scraper(self):
        """Test that BaseScraper cannot be instantiated directly"""
        with pytest.raises(TypeError):
            BaseScraper()

    def test_subclass_must_implement_methods(self):
        """Test that subclasses must implement abstract methods"""
        class IncompleteScraper(BaseScraper):
            pass

        with pytest.raises(TypeError):
            IncompleteScraper()

    def test_subclass_with_all_methods(self):
        """Test that subclass with all methods can be instantiated"""
        class CompleteScraper(BaseScraper):
            async def search_twitter(self, query, limit=10):
                return []

            async def search_reddit(self, query, limit=10):
                return []

            async def search_news(self, query, limit=10):
                return []

        scraper = CompleteScraper()
        assert scraper is not None
