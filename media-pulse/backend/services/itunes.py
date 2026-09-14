"""
iTunes Search API — بيانات مجانية 100% (بدون مفاتيح)
https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
"""
import httpx
from typing import Optional


async def search_itunes(query: str, country: str = "EG", limit: int = 10) -> list[dict]:
    """بحث في iTunes Search API"""
    url = "https://itunes.apple.com/search"
    params = {
        "term": query,
        "country": country,
        "media": "software",
        "entity": "software",
        "limit": min(limit, 25),
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        print(f"[iTunes] Search error: {e}")
        return []

    results = []
    for item in data.get("results", []):
        results.append({
            "app_id": str(item.get("trackId", "")),
            "name": item.get("trackName", ""),
            "store": "appstore",
            "icon_url": item.get("artworkUrl100", ""),
            "url": item.get("trackViewUrl", ""),
            "category": item.get("primaryGenreName", ""),
            "developer": item.get("artistName", ""),
            "rating_avg": item.get("averageUserRating"),
            "rating_count": item.get("userRatingCount"),
            "version": item.get("version", ""),
            "price": item.get("formattedPrice", "Free"),
            "description": (item.get("description") or "")[:200],
        })
    return results


async def get_itunes_details(app_id: str, country: str = "EG") -> Optional[dict]:
    """جلب تفاصيل تطبيق من iTunes Lookup API"""
    url = f"https://itunes.apple.com/lookup"
    params = {"id": app_id, "country": country}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        print(f"[iTunes] Details error: {e}")
        return None

    results = data.get("results", [])
    if not results:
        return None

    item = results[0]
    rating_count = item.get("userRatingCount", 0)
    return {
        "app_id": str(item.get("trackId", "")),
        "name": item.get("trackName", ""),
        "store": "appstore",
        "icon_url": item.get("artworkUrl100", ""),
        "url": item.get("trackViewUrl", ""),
        "category": item.get("primaryGenreName", ""),
        "developer": item.get("artistName", ""),
        "rating_avg": item.get("averageUserRating"),
        "rating_count": rating_count,
        "version": item.get("version", ""),
        "size_bytes": item.get("fileSizeBytes"),
        "price": item.get("formattedPrice", "Free"),
        "description": (item.get("description") or "")[:1500],
        "release_date": item.get("releaseDate"),
        "current_version_release_date": item.get("currentVersionReleaseDate"),
        "installs": {
            "min": rating_count,
            "max": rating_count,
            "label": f"{rating_count} ratings",
        },
        "installs_exact": rating_count,
        "installs_display": f"{rating_count} ratings",
        "installs_bucket_min": rating_count,
        "star_distribution": [0, 0, 0, 0, 0],
        "last_updated": item.get("currentVersionReleaseDate", ""),
    }
