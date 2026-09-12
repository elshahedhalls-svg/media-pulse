"""
TikTok Creative Center Scraper — بيانات مجانية
يستخدم Backend APIs مباشرة من TikTok Creative Center
- Top Ads Dashboard: إعلانات trending حسب البراند/الكلمة
- Trending Hashtags: الهاشتاجات الرائجة حسب الدولة
- Trending Videos: الفيديوهات الرائجة
"""
import asyncio
import httpx
import json
from datetime import datetime
from typing import Optional

# TikTok Creative Center Backend API endpoints
BASE_URL = "https://ads.tiktok.com/creative/creativeCenter/api/v1"

# MENA country mapping to TikTok regions
MENA_REGIONS = {
    "EG": "EG",
    "SA": "SA",
    "AE": "AE",
    "QA": "QA",
    "KW": "KW",
    "BH": "BH",
    "OM": "OM",
}

# TikTok Industries relevant for MENA
INDUSTRIES = [
    {"key": "all", "label": "All Industries"},
    {"key": "label_14100000000", "label": "Apparel & Accessories"},
    {"key": "label_14200000000", "label": "Beauty & Personal Care"},
    {"key": "label_14300000000", "label": "Computers & Electronics"},
    {"key": "label_14400000000", "label": "Education & Training"},
    {"key": "label_14500000000", "label": "Finance & Insurance"},
    {"key": "label_14600000000", "label": "Food & Beverage"},
    {"key": "label_14700000000", "label": "Health"},
    {"key": "label_14800000000", "label": "Home Improvement"},
    {"key": "label_14900000000", "label": "Retail & Shopping"},
    {"key": "label_15000000000", "label": "Travel & Transportation"},
]

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    "Referer": "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en",
    "Origin": "https://ads.tiktok.com",
}


async def search_tiktok_ads(
    keyword: str,
    country: str = "EG",
    industry: str = "all",
    period: str = "7",
    limit: int = 20,
    cookies: str = None,
) -> dict:
    """
    البحث عن إعلانات TikTok حسب الكلمة المفتاحية
    Top Ads Dashboard API
    """
    try:
        url = f"{BASE_URL}/topads/material/list"

        params = {
            "keyword": keyword,
            "region": country,
            "industry": industry if industry != "all" else "",
            "period": period,
            "page": 1,
            "size": min(limit, 20),
            "sort_by": "like",  # like, ctr, cost, share
        }

        headers = {**BROWSER_HEADERS}
        if cookies:
            headers["Cookie"] = cookies

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers=headers, params=params)

            if r.status_code != 200:
                print(f"[TikTok Ads] HTTP {r.status_code}: {r.text[:200]}")
                return {"ads": [], "count": 0, "error": f"HTTP {r.status_code}", "needs_cookies": True}

            # Check if response is valid JSON (TikTok may return HTML without cookies)
            content_type = r.headers.get("content-type", "")
            if "json" not in content_type and not r.text.strip().startswith("{"):
                print(f"[TikTok Ads] Non-JSON response (needs cookies)")
                return {"ads": [], "count": 0, "error": "TikTok Creative Center requires login cookies. Please paste cookies from your browser.", "needs_cookies": True}

            data = r.json()

            if data.get("code") != 0:
                error_msg = data.get("msg", "Unknown error")
                print(f"[TikTok Ads] API error: {error_msg}")
                # Check if it's a cookie/auth issue
                if "login" in error_msg.lower() or "cookie" in error_msg.lower() or "unauthorized" in error_msg.lower():
                    return {"ads": [], "count": 0, "error": "TikTok Creative Center requires login cookies", "needs_cookies": True}
                return {"ads": [], "count": 0, "error": error_msg}

            materials = data.get("data", {}).get("materials", [])
            pagination = data.get("data", {}).get("pagination", {})

            ads = []
            for mat in materials:
                video_info = mat.get("video_info", {})
                ads.append({
                    "ad_id": mat.get("id"),
                    "title": mat.get("ad_title", ""),
                    "brand": mat.get("brand_name", ""),
                    "likes": mat.get("like", 0),
                    "ctr": mat.get("ctr", 0),
                    "cost": mat.get("cost", 0),
                    "industry": mat.get("industry_key", ""),
                    "objective": mat.get("objective_key", ""),
                    "video_url": video_info.get("video_url", {}).get("720p", ""),
                    "cover_url": video_info.get("cover", ""),
                    "duration": video_info.get("duration", 0),
                    "width": video_info.get("width", 0),
                    "height": video_info.get("height", 0),
                    "is_search": mat.get("is_search", False),
                    "source": "tiktok_creative_center",
                })

            return {
                "ads": ads,
                "count": len(ads),
                "total": pagination.get("total_count", len(ads)),
                "page": pagination.get("page", 1),
                "has_more": pagination.get("has_more", False),
                "country": country,
                "keyword": keyword,
            }

    except Exception as e:
        print(f"[TikTok Ads] failed: {e}")
        import traceback; traceback.print_exc()
        return {"ads": [], "count": 0, "error": str(e)}


async def get_trending_hashtags(
    country: str = "EG",
    period: str = "7",
    industry: str = "all",
    limit: int = 20,
    cookies: str = None,
) -> dict:
    """
    الهاشتاجات الرائجة على TikTok حسب الدولة
    """
    try:
        url = f"{BASE_URL}/trending/hashtag/list"

        params = {
            "country": country,
            "period": period,
            "industry": industry if industry != "all" else "",
            "page": 1,
            "size": min(limit, 20),
        }

        headers = {**BROWSER_HEADERS}
        if cookies:
            headers["Cookie"] = cookies

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers=headers, params=params)

            if r.status_code != 200:
                print(f"[TikTok Hashtags] HTTP {r.status_code}: {r.text[:200]}")
                return {"hashtags": [], "count": 0, "error": f"HTTP {r.status_code}"}

            # Check if response is valid JSON (TikTok may return HTML without cookies)
            content_type = r.headers.get("content-type", "")
            if "json" not in content_type and not r.text.strip().startswith("{"):
                print(f"[TikTok Hashtags] Non-JSON response (needs cookies)")
                return {"hashtags": [], "count": 0, "error": "TikTok Creative Center requires login cookies. Please paste cookies from your browser.", "needs_cookies": True}

            data = r.json()

            if data.get("code") != 0:
                print(f"[TikTok Hashtags] API error: {data.get('msg', 'Unknown')}")
                return {"hashtags": [], "count": 0, "error": data.get("msg", "API error")}

            items = data.get("data", {}).get("items", [])

            hashtags = []
            for item in items:
                hashtags.append({
                    "hashtag_id": item.get("hashtagID", ""),
                    "name": item.get("hashtagName", ""),
                    "rank": item.get("rank", 0),
                    "video_count": item.get("publishedVideoCount", 0),
                    "view_count": item.get("videoViewCount", 0),
                    "popularity_curve": item.get("popularityCurve", []),
                    "country": country,
                    "period": period,
                    "source": "tiktok_creative_center",
                })

            return {
                "hashtags": hashtags,
                "count": len(hashtags),
                "country": country,
                "period": period,
            }

    except Exception as e:
        print(f"[TikTok Hashtags] failed: {e}")
        import traceback; traceback.print_exc()
        return {"hashtags": [], "count": 0, "error": str(e)}


async def get_trending_videos(
    country: str = "EG",
    period: str = "7",
    content_tags: list = None,
    sort_by: str = "vv",
    limit: int = 20,
    cookies: str = None,
) -> dict:
    """
    الفيديوهات الرائجة على TikTok
    """
    try:
        url = f"{BASE_URL}/trending/video/list"

        params = {
            "country": country,
            "period": period,
            "sort_by": sort_by,
            "page": 1,
            "size": min(limit, 100),
        }

        if content_tags:
            params["content_tags"] = ",".join(content_tags)

        headers = {**BROWSER_HEADERS}
        if cookies:
            headers["Cookie"] = cookies

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers=headers, params=params)

            if r.status_code != 200:
                print(f"[TikTok Videos] HTTP {r.status_code}: {r.text[:200]}")
                return {"videos": [], "count": 0, "error": f"HTTP {r.status_code}"}

            # Check if response is valid JSON (TikTok may return HTML without cookies)
            content_type = r.headers.get("content-type", "")
            if "json" not in content_type and not r.text.strip().startswith("{"):
                print(f"[TikTok Videos] Non-JSON response (needs cookies)")
                return {"videos": [], "count": 0, "error": "TikTok Creative Center requires login cookies. Please paste cookies from your browser.", "needs_cookies": True}

            data = r.json()

            if data.get("code") != 0:
                print(f"[TikTok Videos] API error: {data.get('msg', 'Unknown')}")
                return {"videos": [], "count": 0, "error": data.get("msg", "API error")}

            items = data.get("data", {}).get("items", [])

            videos = []
            for item in items:
                videos.append({
                    "video_id": item.get("videoID", ""),
                    "title": item.get("title", ""),
                    "author": item.get("author", {}).get("name", ""),
                    "author_handle": item.get("author", {}).get("handle", ""),
                    "views": item.get("vv", 0),
                    "likes": item.get("like", 0),
                    "comments": item.get("comment", 0),
                    "shares": item.get("share", 0),
                    "duration": item.get("duration", 0),
                    "cover_url": item.get("cover", ""),
                    "video_url": item.get("video_url", ""),
                    "hashtags": item.get("hashtags", []),
                    "country": country,
                    "period": period,
                    "source": "tiktok_creative_center",
                })

            return {
                "videos": videos,
                "count": len(videos),
                "country": country,
                "period": period,
                "sort_by": sort_by,
            }

    except Exception as e:
        print(f"[TikTok Videos] failed: {e}")
        import traceback; traceback.print_exc()
        return {"videos": [], "count": 0, "error": str(e)}


async def get_ad_analytics(
    material_id: str,
    cookies: str = None,
) -> dict:
    """
    تحليلات إعلان محدد — Ad Analytics
    """
    try:
        url = f"{BASE_URL}/topads/material/detail"

        params = {"id": material_id}

        headers = {**BROWSER_HEADERS}
        if cookies:
            headers["Cookie"] = cookies

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            r = await client.get(url, headers=headers, params=params)

            if r.status_code != 200:
                return {"error": f"HTTP {r.status_code}"}

            # Check if response is valid JSON (TikTok may return HTML without cookies)
            content_type = r.headers.get("content-type", "")
            if "json" not in content_type and not r.text.strip().startswith("{"):
                print(f"[TikTok Ad Analytics] Non-JSON response (needs cookies)")
                return {"error": "TikTok Creative Center requires login cookies. Please paste cookies from your browser.", "needs_cookies": True}

            data = r.json()

            if data.get("code") != 0:
                return {"error": data.get("msg", "API error")}

            ad_data = data.get("data", {})

            return {
                "ad_id": ad_data.get("id"),
                "title": ad_data.get("ad_title"),
                "brand": ad_data.get("brand_name"),
                "likes": ad_data.get("like", 0),
                "shares": ad_data.get("share", 0),
                "comments": ad_data.get("comment", 0),
                "ctr": ad_data.get("ctr", 0),
                "cost": ad_data.get("cost", 0),
                "country_codes": ad_data.get("country_code", []),
                "industry": ad_data.get("industry_key"),
                "objective": ad_data.get("objective_key"),
                "landing_page": ad_data.get("landing_page"),
                "source": "tiktok_creative_center",
            }

    except Exception as e:
        print(f"[TikTok Ad Analytics] failed: {e}")
        return {"error": str(e)}


def get_industries() -> list[dict]:
    """قائمة الصناعات المتاحة"""
    return INDUSTRIES


def get_supported_countries() -> list[dict]:
    """الدول المدعومة"""
    return [
        {"code": "EG", "name": "Egypt", "name_ar": "مصر"},
        {"code": "SA", "name": "Saudi Arabia", "name_ar": "السعودية"},
        {"code": "AE", "name": "UAE", "name_ar": "الإمارات"},
        {"code": "QA", "name": "Qatar", "name_ar": "قطر"},
        {"code": "KW", "name": "Kuwait", "name_ar": "الكويت"},
        {"code": "BH", "name": "Bahrain", "name_ar": "البحرين"},
        {"code": "OM", "name": "Oman", "name_ar": "عمان"},
    ]
