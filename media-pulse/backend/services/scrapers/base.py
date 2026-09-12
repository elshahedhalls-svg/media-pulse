"""Base scraper interface for all providers"""
from abc import ABC, abstractmethod
from datetime import datetime


class BaseScraper(ABC):
    @abstractmethod
    async def search_twitter(self, query: str, limit: int = 50) -> list[dict]:
        pass

    @abstractmethod
    async def search_reddit(self, query: str, limit: int = 50) -> list[dict]:
        pass

    @abstractmethod
    async def search_news(self, query: str, limit: int = 50) -> list[dict]:
        pass

    async def search_youtube(self, query: str, limit: int = 50) -> list[dict]:
        return []

    async def search_google(self, query: str, limit: int = 50) -> list[dict]:
        return []

    async def search_instagram(self, query: str, limit: int = 50) -> list[dict]:
        return []

    async def search_tiktok(self, query: str, limit: int = 50) -> list[dict]:
        return []

    @staticmethod
    def format_mention(text: str, source: str, **kwargs) -> dict:
        return {
            "text": text[:1000] if text else "",
            "source": source,
            "author": kwargs.get("author", ""),
            "date": kwargs.get("date", datetime.utcnow().isoformat()),
            "url": kwargs.get("url", ""),
            "score": kwargs.get("score", 0),
            "title": kwargs.get("title", ""),
            "comments_count": kwargs.get("comments_count", 0),
        }
