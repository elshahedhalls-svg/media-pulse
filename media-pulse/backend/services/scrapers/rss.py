"""RSS provider — Free fallback using RSS feeds for News and Reddit"""
import re
import xml.etree.ElementTree as ET
import requests
from .base import BaseScraper


class RSSScraper(BaseScraper):
    async def search_twitter(self, query: str, limit: int = 50) -> list[dict]:
        print("[RSS] Twitter not supported via RSS")
        return []

    async def search_reddit(self, query: str, limit: int = 50) -> list[dict]:
        try:
            import asyncio
            await asyncio.sleep(2)
            url = f"https://www.reddit.com/search.rss?q={query}&sort=new&limit={min(limit, 100)}"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code != 200:
                print(f"[RSS] Reddit returned {response.status_code}")
                return []
            root = ET.fromstring(response.text)
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            entries = root.findall(".//atom:entry", ns)
            posts = []
            for entry in entries[:limit]:
                title = entry.find("atom:title", ns)
                author = entry.find("atom:author/atom:name", ns)
                link = entry.find("atom:link", ns)
                content = entry.find("atom:content", ns)
                title_text = title.text if title is not None else ""
                author_text = author.text.replace("/u/", "") if author is not None else ""
                link_text = link.get("href", "") if link is not None else ""
                content_text = re.sub(r"<[^>]+>", "", content.text if content is not None else "").strip()
                if title_text:
                    posts.append(self.format_mention(
                        text=content_text[:500] if content_text else title_text,
                        source="reddit",
                        author=author_text,
                        url=link_text,
                        title=title_text,
                    ))
            print(f"[RSS] Reddit: {len(posts)} posts")
            return posts
        except Exception as e:
            print(f"[RSS] Reddit error: {e}")
            return []

    async def search_news(self, query: str, limit: int = 50) -> list[dict]:
        try:
            url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
            headers = {"User-Agent": "Mozilla/5.0"}
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code != 200:
                print(f"[RSS] News returned {response.status_code}")
                return []
            root = ET.fromstring(response.text)
            items = root.findall(".//item")
            news = []
            for item in items[:limit]:
                title_el = item.find("title")
                link_el = item.find("link")
                pub_date_el = item.find("pubDate")
                source_el = item.find("source")
                title = title_el.text if title_el is not None else ""
                link = link_el.text if link_el is not None else ""
                pub_date = pub_date_el.text if pub_date_el is not None else ""
                source_name = source_el.text if source_el is not None else ""
                if title:
                    news.append(self.format_mention(
                        text=title,
                        source="news",
                        author=source_name,
                        url=link,
                        date=pub_date,
                        title=title,
                    ))
            print(f"[RSS] News: {len(news)} articles")
            return news
        except Exception as e:
            print(f"[RSS] News error: {e}")
            return []
