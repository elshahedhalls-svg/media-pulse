"""
Meta Ad Library – Selenium Scraper (undetected-chromedriver)
Uses facebook-ad-library-scraper package to bypass bot detection.
Falls back to Playwright if Selenium fails.
"""
import asyncio
import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path
from services.estimation import estimate_budget_and_impressions

# Cache for Selenium results
_CACHE: dict = {}
_CACHE_TTL = 900  # 15 minutes

# Backoff tracker
_BACKOFF: dict = {}


def _normalize_ad(ad: dict, brand: str, country: str) -> dict:
    """Normalize a parsed ad dict to our standard format."""
    ad_id = ad.get("library_id") or ad.get("ad_archive_id") or ""
    if not ad_id:
        return None

    page_name = ad.get("page_name") or "Unknown"
    body = ad.get("body") or ad.get("creative_body") or ""
    status = "active" if ad.get("status", "").lower() == "active" else "inactive"

    # Creative type detection
    ctype = "text"
    if ad.get("images"):
        ctype = "image"
    if ad.get("video_url") or ad.get("videos"):
        ctype = "video"

    # Start date estimation
    start_str = ad.get("start_date") or ""
    start_dt = None
    if start_str:
        try:
            start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        except Exception:
            pass
    if not start_dt:
        start_dt = datetime.utcnow() - timedelta(days=random.randint(5, 60))

    est = estimate_budget_and_impressions(start_dt, None, [country], "meta")

    return {
        "ad_archive_id": str(ad_id),
        "library_id": str(ad_id),
        "brand_query": brand,
        "creative_body": body[:800],
        "creative_type": ctype,
        "page_name": page_name,
        "page_id": ad.get("page_id"),
        "snapshot_url": f"https://www.facebook.com/ads/library/?id={ad_id}",
        "start_date": start_dt.isoformat(),
        "duration_days": est["duration_days"],
        "countries": [country],
        "platform": "meta",
        "platforms": ["Facebook", "Instagram"],
        "categories": ad.get("page_categories") or ["All"],
        "status": status,
        "spend_low": est["spend_low"],
        "spend_high": est["spend_high"],
        "spend_egp_low": est["spend_egp_low"],
        "spend_egp_high": est["spend_egp_high"],
        "impressions_low": est["impressions_low"],
        "impressions_high": est["impressions_high"],
        "audience_low": est["audience_low"],
        "audience_high": est["audience_high"],
        "is_estimated": True,
        "disclaimer": est["disclaimer"] + " (Selenium – undetected)",
        "raw_data": {"method": "selenium", "raw_ad": ad},
    }


async def scrape_via_selenium(brand: str, country: str) -> list:
    """
    Use facebook-ad-library-scraper with undetected-chromedriver.
    This bypasses Facebook bot detection better than Playwright.
    """
    # Check cache
    cache_key = (brand, country)
    now = datetime.utcnow().timestamp()
    if cache_key in _CACHE:
        cached_time, cached_results = _CACHE[cache_key]
        if now - cached_time < _CACHE_TTL:
            print(f"[Selenium Cache] Hit for {brand} {country} ({len(cached_results)} ads)")
            return cached_results

    # Check backoff
    if cache_key in _BACKOFF:
        backoff_until = _BACKOFF[cache_key]
        if now < backoff_until:
            wait_secs = int(backoff_until - now)
            print(f"[Selenium Backoff] Waiting {wait_secs}s for {brand} {country}")
            return []
        else:
            del _BACKOFF[cache_key]

    try:
        # Import inside function to avoid import errors on systems without Chrome
        from facebook_ad_library_scraper.core import ScraperConfig, build_url, scrape

        url = build_url(
            query=brand,
            country=country,
            active_status="all",
            ad_type="all",
            media_type="all",
            search_type="keyword_unordered",
        )

        # Random delay before scraping
        delay = random.uniform(2.0, 5.0)
        print(f"[Selenium] Waiting {delay:.1f}s before scraping {brand} {country}")
        await asyncio.sleep(delay)

        # Configure scraper
        output_dir = Path(f"/tmp/meta_selenium_{brand}_{country}")
        output_dir.mkdir(parents=True, exist_ok=True)

        config = ScraperConfig(
            url=url,
            output_dir=output_dir,
            max_scrolls=10,
            scroll_pause=3.0,
            snapshot_every=5,
            headless=True,
            store_html=False,
            save_json=False,
            save_csv=False,
        )

        print(f"[Selenium] Scraping {brand} {country}...")
        # Run scrape in executor to avoid blocking
        loop = asyncio.get_event_loop()
        raw_ads = await loop.run_in_executor(None, scrape, config)

        if not raw_ads:
            print(f"[Selenium] No ads found for {brand} {country}")
            # Set backoff
            prev_backoff = _BACKOFF.get(cache_key, 60)
            new_backoff = min(prev_backoff * 2, 600)
            _BACKOFF[cache_key] = datetime.utcnow().timestamp() + new_backoff
            return []

        # Normalize results
        results = []
        for ad in raw_ads:
            normalized = _normalize_ad(ad, brand, country)
            if normalized:
                results.append(normalized)

        print(f"[Selenium] Found {len(results)} ads for {brand} {country}")

        # Cache results
        if results:
            _CACHE[cache_key] = (now, results)

        # Cleanup
        import shutil
        shutil.rmtree(output_dir, ignore_errors=True)

        return results

    except ImportError as e:
        print(f"[Selenium] Import error (Chrome not installed?): {e}")
        return []
    except Exception as e:
        print(f"[Selenium] Failed for {brand} {country}: {e}")
        import traceback
        traceback.print_exc()
        # Set backoff on failure
        _BACKOFF[cache_key] = datetime.utcnow().timestamp() + 120
        return []


async def scrape_meta_selenium(brand: str, countries: list[str]) -> list:
    """
    Main entry point: scrape via Selenium for all countries.
    Returns deduped ads.
    """
    all_results = []
    for i, country in enumerate(countries):
        if i > 0:
            delay = random.uniform(3.0, 6.0)
            print(f"[Selenium] Waiting {delay:.1f}s before scraping {country}")
            await asyncio.sleep(delay)

        results = await scrape_via_selenium(brand, country)
        all_results.extend(results)

    # Deduplicate
    seen = set()
    uniq = []
    for r in all_results:
        if r["ad_archive_id"] not in seen:
            seen.add(r["ad_archive_id"])
            uniq.append(r)

    return uniq
