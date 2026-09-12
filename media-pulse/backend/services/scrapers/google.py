"""DuckDuckGo Search provider — Free search using ddgs library"""
from ddgs import DDGS
from .base import BaseScraper


class GoogleSearchScraper(BaseScraper):
    """DuckDuckGo search scraping. Free, no API key needed.
    
    Uses DuckDuckGo instead of Google to avoid blocking.
    Returns web search results with title, url, description.
    """

    def _do_search(self, query: str, source: str, limit: int) -> list[dict]:
        try:
            results = list(DDGS().text(query, max_results=min(limit, 20)))
            mentions = []
            for r in results:
                mentions.append(self.format_mention(
                    text=r.get("body", r.get("description", "")),
                    source=source,
                    url=r.get("href", r.get("url", "")),
                    title=r.get("title", ""),
                ))
            print(f"[DuckDuckGo] {source}: {len(mentions)} results")
            return mentions
        except Exception as e:
            print(f"[DuckDuckGo] {source} error: {e}")
            return []

    async def search_twitter(self, query: str, limit: int = 50) -> list[dict]:
        return self._do_search(f"site:twitter.com OR site:x.com {query}", "twitter", limit)

    async def search_reddit(self, query: str, limit: int = 50) -> list[dict]:
        return self._do_search(f"site:reddit.com {query}", "reddit", limit)

    async def search_news(self, query: str, limit: int = 50) -> list[dict]:
        return self._do_search(f"{query} news", "news", limit)

    async def search_youtube(self, query: str, limit: int = 50) -> list[dict]:
        return self._do_search(f"site:youtube.com {query}", "youtube", limit)

    async def search_google(self, query: str, limit: int = 50) -> list[dict]:
        return self._do_search(f"{query}", "google", limit)

    async def search_instagram(self, query: str, limit: int = 50) -> list[dict]:
        return self._do_search(f"site:instagram.com {query}", "instagram", limit)

    async def search_tiktok(self, query: str, limit: int = 50) -> list[dict]:
        return self._do_search(f"site:tiktok.com {query}", "tiktok", limit)
