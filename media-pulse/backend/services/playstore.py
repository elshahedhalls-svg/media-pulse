"""
Google Play Store Scraper — بيانات مجانية 100%
Endpoints: بحث + تفاصيل التطبيق + مراجعات
ال البيانات من scraping الصفحة مباشرة (httpx → Playwright fallback)
"""
import asyncio
import httpx
import re
import json
from datetime import datetime
from typing import Optional

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def _parse_bucket(buckets: str) -> dict:
    """تحويل '1M+' إلى {'min': 1000000, 'max': 5000000, 'label': '1M+'}"""
    buckets = buckets.strip().replace("\u200f", "").replace("\u200e", "")
    match = re.match(r"([\d,.]+)\+?\s*([KMB])?", buckets, re.IGNORECASE)
    if not match:
        return {"min": 0, "max": 0, "label": buckets}
    num = float(match.group(1).replace(",", ""))
    suffix = (match.group(2) or "").upper()
    multiplier = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}.get(suffix, 1)
    val = int(num * multiplier)
    return {"min": val, "max": val * 5, "label": buckets}

def _parse_count(text: str) -> int:
    """تحويل '23.8K' إلى 23800"""
    text = text.strip().replace(",", "").replace(" ", "")
    match = re.match(r"([\d,.]+)\s*([KMB])?", text, re.IGNORECASE)
    if not match:
        return 0
    num = float(match.group(1))
    suffix = (match.group(2) or "").upper()
    multiplier = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}.get(suffix, 1)
    return int(num * multiplier)


async def search_apps(query: str, country: str = "EG", limit: int = 10) -> list[dict]:
    """البحث في Google Play Store — httpx"""
    try:
        import httpx
        url = f"https://play.google.com/store/search?q={query}&c=apps&hl=en&gl={country}"
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers=BROWSER_HEADERS)
            content = r.text

        # استخراج من HTML — لكل package، ابحث عن اسمه في الـ span اللي جوه الـ href
        results = []
        seen = set()
        # استخراج الأزواج: (package_id, name) من النمط: href="...id=PKG...">...<span>NAME</span>
        pairs = re.findall(r'/store/apps/details\?id=([a-zA-Z0-9._]+)[^>]*>.*?<span[^>]*>([^<]+)</span>', content, re.DOTALL)
        for pkg, name in pairs:
            if not pkg.startswith(("com.", "net.", "org.", "io.", "app.")):
                continue
            if pkg in seen:
                continue
            seen.add(pkg)
            # تنظيف HTML entities
            clean_name = name.replace('&amp;', '&').replace('&#39;', "'").replace('&lt;', '<').replace('&gt;', '>').strip()
            if len(clean_name) < 2:
                clean_name = pkg.split(".")[-1].replace(".", " ").title()
            results.append({
                "app_id": pkg,
                "name": clean_name,
                "developer": "",
                "store": "play",
                "icon_url": None,
                "url": f"https://play.google.com/store/apps/details?id={pkg}&gl={country}",
            })
            if len(results) >= limit:
                break
        # Fallback: لو مفيش نتائج، استخرج من URLs بس
        if not results:
            packages = list(dict.fromkeys(re.findall(r'/store/apps/details\?id=([a-zA-Z0-9._]+)', content)))
            for pkg in packages[:limit]:
                if pkg.startswith(("com.", "net.", "org.", "io.", "app.")) and pkg not in seen:
                    seen.add(pkg)
                    results.append({
                        "app_id": pkg,
                        "name": pkg.split(".")[-1].replace(".", " ").title(),
                        "developer": "",
                        "store": "play",
                        "icon_url": None,
                        "url": f"https://play.google.com/store/apps/details?id={pkg}&gl={country}",
                    })
                    if len(results) >= limit:
                        break
        print(f"[PlayStore Search] {query}: {len(results)} results")
        return results
    except Exception as e:
        print(f"[PlayStore Search] failed: {e}")
        import traceback; traceback.print_exc()
        return []


async def get_app_details(package_id: str, country: str = "EG") -> Optional[dict]:
    """جلب تفاصيل التطبيق من Google Play Store باستخدام google-play-scraper
    
    Returns exact install count (realInstalls), not just bucket ranges.
    Example: realInstalls=651285 instead of just "500,000+"
    """
    try:
        from google_play_scraper import app as gp_app
        lang = 'ar' if country in ('EG', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM') else 'en'
        r = gp_app(package_id, lang=lang, country=country)
        
        # استخراج التقييمات من histogram
        histogram = r.get("histogram", {})
        if isinstance(histogram, dict):
            star_dist = [
                histogram.get("1", 0),
                histogram.get("2", 0),
                histogram.get("3", 0),
                histogram.get("4", 0),
                histogram.get("5", 0),
            ]
        elif isinstance(histogram, list) and len(histogram) == 5:
            star_dist = histogram
        else:
            star_dist = [0, 0, 0, 0, 0]
        
        # عدد التحميلات
        real_installs = r.get("realInstalls", 0)
        min_installs = r.get("minInstalls", 0)
        installs_label = r.get("installs", "N/A")
        
        print(f"[PlayStore] {package_id}: realInstalls={real_installs}, bucket={installs_label}")
        
        return {
            "app_id": package_id,
            "name": r.get("title", package_id.split(".")[-1]),
            "developer": r.get("developer", ""),
            "store": "play",
            "category": r.get("genre", ""),
            "rating_avg": r.get("score"),
            "rating_count": r.get("ratings", 0),
            "installs": {
                "min": real_installs or min_installs,
                "max": 0,
                "label": installs_label,
                "estimated_exact": real_installs,
            },
            "installs_exact": real_installs,
            "installs_display": installs_label,
            "installs_bucket_min": min_installs,
            "version": r.get("version", ""),
            "last_updated": r.get("lastUpdatedOn", ""),
            "released": r.get("released", ""),
            "icon_url": r.get("icon"),
            "url": f"https://play.google.com/store/apps/details?id={package_id}&gl={country}",
            "description": (r.get("summary") or r.get("description") or "")[:1500],
            "reviews": [],
            "star_distribution": star_dist,
            "is_free": r.get("free"),
            "currency": r.get("currency"),
            "offers_iap": r.get("offersIAP"),
            "ad_supported": r.get("adSupported"),
            "contains_ads": r.get("containsAds"),
            "country": country,
            "fetched_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        print(f"[PlayStore] {package_id} failed: {e}")
        import traceback; traceback.print_exc()
        return None


async def get_app_reviews(package_id: str, country: str = "EG", count: int = 20) -> list[dict]:
    """جلب مراجعات التطبيق — google-play-scraper"""
    try:
        from google_play_scraper import reviews as gp_reviews, Sort
        lang = 'ar' if country in ('EG', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM') else 'en'
        result, _ = gp_reviews(
            package_id,
            lang=lang,
            country=country,
            sort=Sort.NEWEST,
            count=min(count, 40)
        )
        out = []
        for r in result:
            out.append({
                "author": (r.get("userName") or "")[:50],
                "stars": r.get("score"),
                "date": r.get("at", "").strftime("%Y-%m-%d") if r.get("at") else "",
                "text": (r.get("content") or "")[:400],
            })
        print(f"[PlayStore Reviews] {package_id}: {len(out)} reviews")
        return out[:count]
    except Exception as e:
        print(f"[PlayStore Reviews] {package_id} failed: {e}")
        import traceback; traceback.print_exc()
        return []


async def get_trending_apps(country: str = "EG", category: str = None, limit: int = 20) -> list[dict]:
    """جلب التطبيقات الرائجة — Top Charts"""
    try:
        url = f"https://play.google.com/store/apps/top?hl=en&gl={country}"
        if category:
            url += f"&category={category}"
        async with httpx.AsyncClient(timeout=15, headers=BROWSER_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            text = resp.text
        # استخراج التطبيقات من Top Charts
        results = []
        seen = set()
        # نمط بسيط: استخراج package IDs من URLs
        packages = list(dict.fromkeys(re.findall(r'/store/apps/details\?id=([a-zA-Z0-9._]+)', text)))
        for pkg in packages[:limit]:
            if pkg in seen:
                continue
            seen.add(pkg)
            # استخراج الاسم من حول الـ URL
            name_pattern = re.compile(rf'{re.escape(pkg)}.*?<span[^>]*>([^<]+)</span>', re.DOTALL)
            name_match = name_pattern.search(text)
            name = name_match.group(1).strip() if name_match else pkg.split(".")[-1].replace(".", " ").title()
            # استخراج التقييم
            rating_pattern = re.compile(rf'{re.escape(pkg)}.*?(\d+\.?\d*)\s*star', re.DOTALL)
            rating_match = rating_pattern.search(text)
            rating = float(rating_match.group(1)) if rating_match else None
            results.append({
                "app_id": pkg,
                "name": name,
                "store": "play",
                "rating_avg": rating,
                "url": f"https://play.google.com/store/apps/details?id={pkg}&gl={country}",
            })
            if len(results) >= limit:
                break
        print(f"[PlayStore Trending] {country}: {len(results)} apps")
        return results
    except Exception as e:
        print(f"[PlayStore Trending] failed: {e}")
        return []


async def get_category_apps(category: str, country: str = "EG", limit: int = 20) -> list[dict]:
    """جلب التطبيقات حسب التصنيف"""
    try:
        url = f"https://play.google.com/store/apps/category/{category}?hl=en&gl={country}"
        async with httpx.AsyncClient(timeout=15, headers=BROWSER_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            text = resp.text
        results = []
        seen = set()
        pairs = re.findall(r'/store/apps/details\?id=([a-zA-Z0-9._]+)[^>]*>.*?<span[^>]*>([^<]+)</span>', text, re.DOTALL)
        for pkg, name in pairs:
            if pkg in seen:
                continue
            seen.add(pkg)
            clean_name = name.replace('&amp;', '&').strip()
            results.append({
                "app_id": pkg,
                "name": clean_name,
                "store": "play",
                "url": f"https://play.google.com/store/apps/details?id={pkg}&gl={country}",
            })
            if len(results) >= limit:
                break
        print(f"[PlayStore Category] {category}: {len(results)} apps")
        return results
    except Exception as e:
        print(f"[PlayStore Category] failed: {e}")
        return []


def get_categories() -> list[dict]:
    """قائمة التصنيفات المتاحة"""
    return [
        {"id": "GAME", "name": "Games", "name_ar": "الألعاب"},
        {"id": "FAMILY", "name": "Family", "name_ar": "العائلة"},
        {"id": "SOCIAL", "name": "Social", "name_ar": "الاجتماعي"},
        {"id": "FINANCE", "name": "Finance", "name_ar": "المالية"},
        {"id": "SHOPPING", "name": "Shopping", "name_ar": "التسوق"},
        {"id": "TOOLS", "name": "Tools", "name_ar": "الأدوات"},
        {"id": "NEWS_AND_MAGAZINES", "name": "News", "name_ar": "الأخبار"},
        {"id": "HEALTH_AND_FITNESS", "name": "Health", "name_ar": "الصحة"},
        {"id": "EDUCATION", "name": "Education", "name_ar": "التعليم"},
        {"id": "ENTERTAINMENT", "name": "Entertainment", "name_ar": "الترفيه"},
        {"id": "PRODUCTIVITY", "name": "Productivity", "name_ar": "الإنتاجية"},
        {"id": "BUSINESS", "name": "Business", "name_ar": "الأعمال"},
        {"id": "TRAVEL_AND_LOCAL", "name": "Travel", "name_ar": "السفر"},
        {"id": "FOOD_AND_DRINK", "name": "Food & Drink", "name_ar": "الطعام والشراب"},
    ]


async def compare_apps(app_ids: list[str], country: str = "EG") -> list[dict]:
    """مقارنة عدة تطبيقات"""
    results = []
    for app_id in app_ids[:3]:  # حد أقصى 3 تطبيقات
        details = await get_app_details(app_id, country)
        if details:
            results.append({
                "app_id": details["app_id"],
                "name": details["name"],
                "rating_avg": details.get("rating_avg"),
                "rating_count": details.get("rating_count"),
                "installs": details.get("installs"),
                "category": details.get("category"),
                "developer": details.get("developer"),
                "version": details.get("version"),
                "last_updated": details.get("last_updated"),
            })
    return results
