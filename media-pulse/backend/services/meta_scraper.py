"""
Meta Ad Library Direct Scraping Fallback (Playwright)
Used when Graph API fails or for old ads
For Demo: returns mock structure if Playwright not available
"""
import asyncio
from datetime import datetime, timedelta
import random
from services.estimation import estimate_budget_and_impressions

# Mock data for demo when scraping blocked
MOCK_ADS = [
    {
        "ad_archive_id": "mock_1001",
        "page_name": "Vodafone Egypt",
        "creative_body": "عروض الصيف من فودافون - باقة 100 جيجا بسعر 150 جنيه!",
        "countries": ["EG"],
        "start_offset_days": 12,
    },
    {
        "ad_archive_id": "mock_1002",
        "page_name": "Vodafone Egypt",
        "creative_body": "Vodafone Ramadan Offer - Unlimited calls + 50GB",
        "countries": ["EG", "SA"],
        "start_offset_days": 45,
    },
    {
        "ad_archive_id": "mock_1003",
        "page_name": "Etisalat UAE",
        "creative_body": "Etisalat 5G - أسرع إنترنت في الإمارات",
        "countries": ["AE"],
        "start_offset_days": 7,
    },
]

async def scrape_meta_direct(brand: str, countries: list[str]):
    """
    Direct scraping via Playwright
    For now returns mock + real estimation to keep Demo working without browser dependency
    In production: uncomment Playwright logic below
    """
    # TODO: Real Playwright logic:
    # from playwright.async_api import async_playwright
    # url = f"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=EG&is_targeted_country=false&media_type=all&q={brand}&search_type=keyword_unordered"
    # async with async_playwright() as p:
    #   browser = await p.chromium.launch(headless=True)
    #   ...

    # For Demo: filter mock by brand/countries and add estimation
    results = []
    brand_lower = brand.lower()
    for mock in MOCK_ADS:
        # Simple brand matching
        if brand_lower not in mock["page_name"].lower() and brand_lower not in mock["creative_body"].lower():
            # Allow if brand is generic test like "vodafone" or "test"
            if brand_lower not in ["vodafone", "test", "فودافون", "careem", "etisalat"]:
                continue
        # Country filter
        if not any(c in mock["countries"] for c in countries):
            continue
        start_dt = datetime.utcnow() - timedelta(days=mock["start_offset_days"])
        est = estimate_budget_and_impressions(start_dt, None, mock["countries"], "meta")
        results.append({
            "ad_archive_id": f"{mock['ad_archive_id']}_{brand_lower}",
            "brand_query": brand,
            "page_name": mock["page_name"],
            "page_id": None,
            "creative_body": mock["creative_body"],
            "creative_link_title": None,
            "creative_link_caption": None,
            "snapshot_url": f"https://www.facebook.com/ads/library/?id={mock['ad_archive_id']}",
            "start_date": start_dt.isoformat(),
            "end_date": None,
            "duration_days": est["duration_days"],
            "countries": mock["countries"],
            "platform": "meta",
            "status": "active",
            "spend_low": est["spend_low"],
            "spend_high": est["spend_high"],
            "impressions_low": est["impressions_low"],
            "impressions_high": est["impressions_high"],
            "is_estimated": True,
            "real_spend": None,
            "real_impressions": None,
            "disclaimer": est["disclaimer"] + " (Scraping Fallback - Mock for Demo)",
            "raw_data": mock,
        })

    # If no mock matched, create one dynamically
    if not results:
        start_dt = datetime.utcnow() - timedelta(days=random.randint(5, 30))
        est = estimate_budget_and_impressions(start_dt, None, countries[:2], "meta")
        results.append({
            "ad_archive_id": f"mock_dyn_{brand_lower}_{random.randint(1000,9999)}",
            "brand_query": brand,
            "page_name": f"{brand} Official",
            "page_id": None,
            "creative_body": f"إعلان تجريبي لـ {brand} – هذا نص تقديري للـ Demo (Scraping Fallback)",
            "snapshot_url": "https://www.facebook.com/ads/library/",
            "start_date": start_dt.isoformat(),
            "end_date": None,
            "duration_days": est["duration_days"],
            "countries": countries[:2],
            "platform": "meta",
            "status": "active",
            "spend_low": est["spend_low"],
            "spend_high": est["spend_high"],
            "impressions_low": est["impressions_low"],
            "impressions_high": est["impressions_high"],
            "is_estimated": True,
            "disclaimer": est["disclaimer"],
            "raw_data": {"mock": True},
        })
    return results
