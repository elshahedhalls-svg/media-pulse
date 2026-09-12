"""Tests for scraper factory"""
import pytest
from services.scrapers import get_scraper, list_providers
from services.scrapers.base import BaseScraper
from services.scrapers.rss import RSSScraper
from services.scrapers.google import GoogleSearchScraper


class TestScraperFactory:
    """Test scraper factory functions"""

    def test_list_providers_returns_list(self):
        """Test that list_providers returns a list of providers"""
        providers = list_providers()
        assert isinstance(providers, list)
        assert len(providers) >= 2  # At least rss and google

    def test_list_providers_structure(self):
        """Test that each provider has required fields"""
        providers = list_providers()
        for provider in providers:
            assert "id" in provider
            assert "name" in provider

    def test_get_scraper_rss(self):
        """Test getting RSS scraper"""
        scraper = get_scraper("rss")
        assert isinstance(scraper, RSSScraper)

    def test_get_scraper_google(self):
        """Test getting Google scraper"""
        scraper = get_scraper("google")
        assert isinstance(scraper, GoogleSearchScraper)

    def test_get_scraper_invalid_raises(self):
        """Test that invalid provider raises ValueError"""
        with pytest.raises(ValueError, match="Unknown scraper provider"):
            get_scraper("invalid_provider")

    def test_get_scraper_default_is_rss(self):
        """Test that default provider is used when None"""
        scraper = get_scraper(None)
        assert isinstance(scraper, BaseScraper)
