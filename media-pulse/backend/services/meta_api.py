"""
Meta Ads Library API Adapter
Graph API: /ads_archive
Docs: https://developers.facebook.com/docs/reference/ads-api/get-ads-archive/
"""
import os
import httpx
from datetime import datetime
from dotenv import load_dotenv
from services.estimation import estimate_budget_and_impressions, calculate_duration_days

load_dotenv()

META_TOKEN = os.getenv("META_ACCESS_TOKEN")
META_APP_ID = os.getenv("META_APP_ID")
META_VERSION = os.getenv("META_API_VERSION", "v20.0")
GRAPH_BASE = f"https://graph.facebook.com/{META_VERSION}"

# Fields we request
FIELDS = "id,page_name,page_id,ad_creative_body,ad_creative_link_title,ad_creative_link_caption,ad_snapshot_url,ad_delivery_start_time,ad_delivery_stop_time,ad_reached_countries,ad_active_status"

async def search_meta_ads_api(brand: str, countries: list[str]):
    """
    Calls Meta Graph API ads_archive for each country separately
    Returns list of normalized ads
    """
    if not META_TOKEN:
        raise Exception("META_ACCESS_TOKEN not configured")

    all_ads = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for country in countries:
            params = {
                "search_terms": brand,
                "ad_reached_countries": f"['{country}']",
                "ad_active_status": "ALL",
                "fields": FIELDS,
                "limit": 25,
                "access_token": META_TOKEN,
            }
            try:
                resp = await client.get(f"{GRAPH_BASE}/ads_archive", params=params)
                data = resp.json()
                if "error" in data:
                    print(f"[Meta API] Error for {country}: {data['error']}")
                    continue
                for item in data.get("data", []):
                    normalized = normalize_meta_item(item, brand)
                    # Add country context if API didn't return it
                    if not normalized.get("countries"):
                        normalized["countries"] = [country]
                    all_ads.append(normalized)
            except Exception as e:
                print(f"[Meta API] Exception for {country}: {e}")
                continue
    # Deduplicate by id
    seen = set()
    unique = []
    for ad in all_ads:
        if ad["ad_archive_id"] not in seen:
            seen.add(ad["ad_archive_id"])
            unique.append(ad)
    return unique

def normalize_meta_item(item: dict, brand: str):
    ad_id = item.get("id")
    start = item.get("ad_delivery_start_time")
    stop = item.get("ad_delivery_stop_time")
    countries = item.get("ad_reached_countries", [])
    # Real spend/impressions if available (often not for free tier)
    real_spend = item.get("spend")
    real_impressions = item.get("impressions")

    # Parse dates
    start_dt = None
    end_dt = None
    try:
        if start:
            start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
    except: pass
    try:
        if stop:
            end_dt = datetime.fromisoformat(stop.replace("Z", "+00:00"))
    except: pass

    duration = calculate_duration_days(start_dt, end_dt) if start_dt else 7
    # Estimation fallback if no real data
    est = estimate_budget_and_impressions(start_dt, end_dt, countries or ["EG"], platform="meta")
    is_estimated = not (real_spend and real_impressions)

    return {
        "ad_archive_id": str(ad_id),
        "brand_query": brand,
        "page_name": item.get("page_name"),
        "page_id": item.get("page_id"),
        "creative_body": item.get("ad_creative_body"),
        "creative_link_title": item.get("ad_creative_link_title"),
        "creative_link_caption": item.get("ad_creative_link_caption"),
        "snapshot_url": item.get("ad_snapshot_url"),
        "start_date": start_dt.isoformat() if start_dt else None,
        "end_date": end_dt.isoformat() if end_dt else None,
        "duration_days": duration,
        "countries": countries,
        "platform": "meta",
        "status": item.get("ad_active_status", "active").lower(),
        "spend_low": est["spend_low"],
        "spend_high": est["spend_high"],
        "impressions_low": est["impressions_low"],
        "impressions_high": est["impressions_high"],
        "is_estimated": is_estimated,
        "real_spend": str(real_spend) if real_spend else None,
        "real_impressions": str(real_impressions) if real_impressions else None,
        "disclaimer": est["disclaimer"],
        "raw_data": item,
    }

def test_token_valid():
    return bool(META_TOKEN and META_APP_ID and META_TOKEN.startswith("EA"))
