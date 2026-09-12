"""Firecrawl provider — API-based scraping with search + content extraction"""
import os
from .base import BaseScraper


class FirecrawlScraper(BaseScraper):
    def __init__(self):
        api_key = os.getenv("FIRECRAWL_API_KEY", "")
        if not api_key:
            raise ValueError("FIRECRAWL_API_KEY not set in .env")
        from firecrawl import Firecrawl
        self.app = Firecrawl(api_key=api_key)
        print("[Firecrawl] Initialized")

    def _extract_results(self, result, source: str, limit: int) -> list[dict]:
        """Extract results from Firecrawl SearchData object."""
        mentions = []
        # Firecrawl returns SearchData with .web, .news, .images attributes
        items = []
        if hasattr(result, 'web') and result.web:
            items.extend(result.web)
        if hasattr(result, 'news') and result.news:
            items.extend(result.news)

        for item in items[:limit]:
            text = getattr(item, 'description', '') or ''
            if not text and hasattr(item, 'markdown'):
                text = item.markdown or ''
            mentions.append(self.format_mention(
                text=text,
                source=source,
                url=getattr(item, 'url', ''),
                title=getattr(item, 'title', ''),
            ))
        return mentions

    async def search_twitter(self, query: str, limit: int = 50) -> list[dict]:
        try:
            results = self.app.search(
                f"site:twitter.com OR site:x.com {query}",
                limit=min(limit, 20),
            )
            mentions = self._extract_results(results, "twitter", limit)
            print(f"[Firecrawl] Twitter: {len(mentions)} results")
            return mentions
        except Exception as e:
            print(f"[Firecrawl] Twitter error: {e}")
            return []

    async def search_reddit(self, query: str, limit: int = 50) -> list[dict]:
        try:
            results = self.app.search(
                f"site:reddit.com {query}",
                limit=min(limit, 20),
            )
            mentions = self._extract_results(results, "reddit", limit)
            print(f"[Firecrawl] Reddit: {len(mentions)} results")
            return mentions
        except Exception as e:
            print(f"[Firecrawl] Reddit error: {e}")
            return []

    async def search_news(self, query: str, limit: int = 50) -> list[dict]:
        try:
            results = self.app.search(
                f"{query} news",
                limit=min(limit, 20),
            )
            mentions = self._extract_results(results, "news", limit)
            print(f"[Firecrawl] News: {len(mentions)} results")
            return mentions
        except Exception as e:
            print(f"[Firecrawl] News error: {e}")
            return []
