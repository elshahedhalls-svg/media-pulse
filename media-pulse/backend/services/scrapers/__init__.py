"""Scraper factory — switch providers via SCRAPER_PROVIDER env var"""
import os
from .base import BaseScraper


def get_scraper(provider: str = None) -> BaseScraper:
    provider = provider or os.getenv("SCRAPER_PROVIDER", "firecrawl")
    provider = provider.lower().strip()

    if provider == "firecrawl":
        from .firecrawl import FirecrawlScraper
        return FirecrawlScraper()
    elif provider == "scrapegraph":
        from .scrapegraph import ScrapeGraphScraper
        return ScrapeGraphScraper()
    elif provider == "rss":
        from .rss import RSSScraper
        return RSSScraper()
    elif provider == "google":
        from .google import GoogleSearchScraper
        return GoogleSearchScraper()
    else:
        raise ValueError(f"Unknown scraper provider: '{provider}'. Valid: firecrawl, scrapegraph, rss, google")


def list_providers() -> list[dict]:
    providers = []
    has_firecrawl = bool(os.getenv("FIRECRAWL_API_KEY"))
    providers.append({
        "id": "firecrawl",
        "name": "Firecrawl",
        "name_ar": "فايركراول",
        "type": "API",
        "free_tier": "1,000 credits/month",
        "requires_key": True,
        "has_key": has_firecrawl,
        "enabled": has_firecrawl,
        "supports": ["twitter", "reddit", "news"],
    })
    has_groq = bool(os.getenv("GROQ_API_KEY"))
    providers.append({
        "id": "scrapegraph",
        "name": "ScrapeGraphAI",
        "name_ar": "سكرييب جراف",
        "type": "LLM (Groq)",
        "free_tier": "Unlimited (Groq free tier)",
        "requires_key": True,
        "has_key": has_groq,
        "enabled": has_groq,
        "supports": ["twitter", "reddit", "news"],
    })
    providers.append({
        "id": "rss",
        "name": "RSS Feeds",
        "name_ar": "خلاصات RSS",
        "type": "Free",
        "free_tier": "Unlimited",
        "requires_key": False,
        "has_key": True,
        "enabled": True,
        "supports": ["reddit", "news"],
    })
    providers.append({
        "id": "google",
        "name": "Google Search",
        "name_ar": "بحث جوجل",
        "type": "Free",
        "free_tier": "Unlimited (may be blocked)",
        "requires_key": False,
        "has_key": True,
        "enabled": True,
        "supports": ["twitter", "reddit", "news"],
    })
    return providers
