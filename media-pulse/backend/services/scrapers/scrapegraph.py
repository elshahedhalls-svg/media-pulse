"""ScrapeGraphAI provider — LLM-powered scraping using Groq"""
import os
from .base import BaseScraper


class ScrapeGraphScraper(BaseScraper):
    def __init__(self):
        self.groq_key = os.getenv("GROQ_API_KEY", "")
        self.config = {
            "llm": {
                "model": "groq/openai/gpt-oss-20b",
                "api_key": self.groq_key,
            },
            "verbose": False,
            "headless": True,
        }
        print("[ScrapeGraph] Initialized with Groq backend")

    async def search_twitter(self, query: str, limit: int = 50) -> list[dict]:
        try:
            from scrapegraphai.graphs import SearchGraph
            graph = SearchGraph(
                prompt=f"Find recent tweets about {query}. Extract tweet text, author username, and date posted. Return as JSON array.",
                source="google",
                config=self.config,
            )
            result = graph.run()
            return self._parse_results(result, "twitter", limit)
        except Exception as e:
            print(f"[ScrapeGraph] Twitter error: {e}")
            return []

    async def search_reddit(self, query: str, limit: int = 50) -> list[dict]:
        try:
            from scrapegraphai.graphs import SearchGraph
            graph = SearchGraph(
                prompt=f"Find Reddit posts about {query}. Extract post title, content, author, and subreddit. Return as JSON array.",
                source="google",
                config=self.config,
            )
            result = graph.run()
            return self._parse_results(result, "reddit", limit)
        except Exception as e:
            print(f"[ScrapeGraph] Reddit error: {e}")
            return []

    async def search_news(self, query: str, limit: int = 50) -> list[dict]:
        try:
            from scrapegraphai.graphs import SearchGraph
            graph = SearchGraph(
                prompt=f"Find recent news articles about {query}. Extract headline, summary, source name, and date. Return as JSON array.",
                source="google",
                config=self.config,
            )
            result = graph.run()
            return self._parse_results(result, "news", limit)
        except Exception as e:
            print(f"[ScrapeGraph] News error: {e}")
            return []

    def _parse_results(self, result, source: str, limit: int) -> list[dict]:
        import json
        mentions = []
        if isinstance(result, str):
            try:
                result = json.loads(result.replace("```json", "").replace("```", "").strip())
            except Exception:
                return [self.format_mention(text=result[:500], source=source)]

        if isinstance(result, list):
            for item in result[:limit]:
                if isinstance(item, dict):
                    mentions.append(self.format_mention(
                        text=item.get("content", item.get("text", item.get("summary", str(item)))),
                        source=source,
                        author=item.get("author", item.get("username", "")),
                        date=item.get("date", item.get("created_at", "")),
                        url=item.get("url", item.get("link", "")),
                        title=item.get("title", item.get("headline", "")),
                    ))
                else:
                    mentions.append(self.format_mention(text=str(item), source=source))
        elif isinstance(result, dict):
            mentions.append(self.format_mention(
                text=str(result.get("content", result.get("results", result))),
                source=source,
            ))
        else:
            mentions.append(self.format_mention(text=str(result)[:500], source=source))

        print(f"[ScrapeGraph] {source}: {len(mentions)} results")
        return mentions
