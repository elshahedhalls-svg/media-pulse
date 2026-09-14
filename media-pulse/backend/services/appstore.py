"""
Apple App Store Scraper — بيانات مجانية 100% (بدون iTunes API)
searb: httpx + retry policy (429 → 5s wait + UA change → Playwright)
"""
import asyncio
import httpx
import re
import json
from datetime import datetime
from typing import Optional

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
ALT_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15"


def _format_downloads(count: int) -> str:
    """تنسيق عدد التحميلات"""
    if count >= 1_000_000_000:
        return f"{count / 1_000_000_000:.1f}B"
    elif count >= 1_000_000:
        return f"{count / 1_000_000:.1f}M"
    elif count >= 1_000:
        return f"{count / 1_000:.0f}K"
    return str(count)


def _parse_count(text: str) -> int:
    text = text.strip().replace(",", "").replace(" ", "")
    match = re.match(r"([\d,.]+)\s*([KMB])?", text, re.IGNORECASE)
    if not match:
        return 0
    num = float(match.group(1))
    suffix = (match.group(2) or "").upper()
    multiplier = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}.get(suffix, 1)
    return int(num * multiplier)

async def _fetch_with_retry(url: str, retries: int = 2) -> Optional[str]:
    """جلب مع إعادة محاولة: httpx → انتظار + تغيير UA → Playwright fallback"""
    for attempt in range(retries + 1):
        headers = HEADERS if attempt == 0 else {**HEADERS, "User-Agent": ALT_UA}
        try:
            async with httpx.AsyncClient(timeout=20, headers=headers, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code == 429:
                    wait = 5 + attempt * 3
                    retry_after = resp.headers.get("Retry-After")
                    if retry_after:
                        try: wait = int(retry_after)
                        except: pass
                    print(f"[Apple] Rate limit {url} (attempt {attempt+1}), waiting {wait}s")
                    await asyncio.sleep(wait)
                    continue
                if resp.status_code == 200:
                    return resp.text
                print(f"[Apple] HTTP {resp.status_code} for {url} (attempt {attempt+1})")
                if attempt < retries:
                    await asyncio.sleep(3)
        except Exception as e:
            print(f"[Apple] httpx attempt {attempt+1} failed: {e}")
            if attempt < retries:
                await asyncio.sleep(3)
    # Playwright fallback
    try:
        from playwright.async_api import async_playwright
        print(f"[Apple] Falling back to Playwright for {url}")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"])
            page = await browser.new_page(user_agent=ALT_UA)
            await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(4000)
            content = await page.content()
            await browser.close()
            return content
    except Exception as e:
        print(f"[Apple] Playwright fallback failed: {e}")
        return None


async def search_apps(query: str, country: str = "EG", limit: int = 10) -> list[dict]:
    """البحث في Apple App Store — iTunes Search API (مجاني بدون مفتاح)"""
    try:
        url = f"https://itunes.apple.com/search?term={query}&country={country.lower()}&media=software&limit={limit}"
        text = await _fetch_with_retry(url, retries=1)
        if not text:
            return []
        data = json.loads(text)
        results = []
        for r in data.get("results", []):
            results.append({
                "app_id": str(r.get("trackId", "")),
                "name": r.get("trackName", ""),
                "developer": r.get("artistName", ""),
                "store": "appstore",
                "icon_url": r.get("artworkUrl100", ""),
                "url": r.get("trackViewUrl", f"https://apps.apple.com/app/id{r.get('trackId')}"),
                "category": r.get("primaryGenreName", ""),
            })
        print(f"[AppStore Search] {query} {country}: {len(results)} results")
        return results[:limit]
    except Exception as e:
        print(f"[AppStore Search] failed: {e}")
        return []


async def get_app_details(app_id: str, country: str = "EG") -> Optional[dict]:
    """جلب تفاصيل التطبيق — iTunes Lookup API (مجاني)"""
    try:
        url = f"https://itunes.apple.com/lookup?id={app_id}&country={country.lower()}"
        text = await _fetch_with_retry(url, retries=1)
        if not text:
            return None
        data = json.loads(text)
        results = data.get("results", [])
        if not results:
            print(f"[AppStore] {app_id}: not found")
            return None
        r = results[0]
        rating_avg = r.get("averageUserRating")
        rating_count = r.get("userRatingCount", 0)

        installs = {
            "min": rating_count,
            "max": rating_count,
            "label": f"{_format_downloads(rating_count)} ratings",
        }

        return {
            "app_id": str(app_id),
            "name": r.get("trackName", ""),
            "developer": r.get("artistName", ""),
            "store": "appstore",
            "category": r.get("primaryGenreName", ""),
            "rating_avg": round(rating_avg, 1) if rating_avg else None,
            "rating_count": rating_count,
            "installs": installs,
            "installs_exact": rating_count,
            "installs_display": f"{_format_downloads(rating_count)} ratings",
            "installs_bucket_min": rating_count,
            "version": r.get("version", ""),
            "last_updated": r.get("currentVersionReleaseDate", ""),
            "icon_url": r.get("artworkUrl100", ""),
            "url": r.get("trackViewUrl", ""),
            "description": r.get("description", "")[:500],
            "price": r.get("formattedPrice", "Free"),
            "size": r.get("fileSizeBytes", ""),
            "reviews": [],
            "star_distribution": [0, 0, 0, 0, 0],
            "country": country,
            "fetched_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        print(f"[AppStore] {app_id} failed: {e}")
        import traceback; traceback.print_exc()
        return None


async def get_app_reviews(app_id: str, country: str = "EG", count: int = 20) -> list[dict]:
    """جلب مراجعات التطبيق — Playwright + see-all=reviews URL"""
    try:
        from playwright.async_api import async_playwright
        url = f"https://apps.apple.com/{country.lower()}/app/{app_id}?see-all=reviews&platform=iphone"
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"])
            page = await browser.new_page(user_agent=HEADERS["User-Agent"])
            await page.goto(url, wait_until="domcontentloaded", timeout=25000)
            await page.wait_for_timeout(5000)

            # scroll لأسفل لتحميل المزيد من الريفيوز
            for i in range(6):
                await page.evaluate(f"window.scrollTo(0, document.body.scrollHeight * {(i+1)/6})")
                await page.wait_for_timeout(1500)

            # استخرج الريفيوز من DOM
            js_code = """
            () => {
                const results = [];
                const all = document.querySelectorAll('div, li, article, section');
                const seen = new Set();
                const dateOnlyRe = /^\\d{2}\\/\\d{2}\\/\\d{4}$/;
                for (const el of all) {
                    const text = (el.innerText || '').trim();
                    if (text.length < 50 || text.length > 3000) continue;
                    const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
                    if (lines.length < 4) continue;

                    let dateIdx = -1;
                    let date = '';
                    for (let i = 1; i < lines.length; i++) {
                        if (dateOnlyRe.test(lines[i])) {
                            dateIdx = i;
                            date = lines[i];
                            break;
                        }
                    }
                    if (dateIdx < 1) continue;

                    let title = lines[dateIdx - 1] || '';
                    if (dateOnlyRe.test(title) || title.length < 3) continue;

                    let author = (dateIdx + 1 < lines.length) ? lines[dateIdx + 1] : '';
                    if (dateOnlyRe.test(author) || author.length < 2) author = '';

                    let body = '';
                    for (let i = dateIdx + 2; i < lines.length; i++) {
                        if (lines[i].length > 10) {
                            body = lines.slice(i).join(' ').replace(/^more$/i, '').trim();
                            break;
                        }
                    }
                    if (body.length < 10) continue;

                    let stars = null;
                    // Apple uses <ol> with aria-label like "3 Stars"
                    const starEl = el.querySelector('ol[aria-label*="Stars"], ol[aria-label*="stars"]');
                    if (starEl) {
                        const m = (starEl.getAttribute('aria-label') || '').match(/(\\d)/);
                        if (m) stars = parseInt(m[1]);
                    }
                    // fallback: أي عنصر فيه "Stars" في aria-label
                    if (!stars) {
                        const anyStar = el.querySelector('[aria-label*="Stars"], [aria-label*="stars"]');
                        if (anyStar) {
                            const m = (anyStar.getAttribute('aria-label') || '').match(/(\\d)/);
                            if (m) stars = parseInt(m[1]);
                        }
                    }

                    const key = date + '|' + (author || '').substring(0, 20) + '|' + body.substring(0, 30);
                    if (seen.has(key)) continue;
                    seen.add(key);

                    results.push({
                        author: (author || '').substring(0, 50),
                        stars: stars,
                        date: date,
                        text: (title + ' — ' + body).substring(0, 400).replace(/^\\s*—\\s*/, '').trim()
                    });
                    if (results.length >= """ + str(count) + """) break;
                }
                return results;
            }
            """
            reviews = await page.evaluate(js_code)

            await browser.close()

        print(f"[AppStore Reviews] {app_id}: {len(reviews)} reviews")
        return reviews[:count]
    except Exception as e:
        print(f"[AppStore Reviews] {app_id} failed: {e}")
        import traceback; traceback.print_exc()
        return []
