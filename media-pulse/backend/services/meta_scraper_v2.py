"""
Meta Ad Library – Real Scraping (Requests + Playwright Hybrid)
Priority: 1. Requests to unofficial async endpoint (light) 2. Playwright (JS) 3. Mock fallback
Handles EG + GCC
"""
import asyncio
import httpx
import json
import os
import re
from datetime import datetime, timedelta
import random
from services.estimation import estimate_budget_and_impressions, USD_TO_EGP

# Last-run diagnostics (surfaced via /api/ads/preview debug field)
DIAG: dict = {"stage": "never_run", "error": None}

# Simple in-memory cache: {(brand, country): (timestamp, results)}
# Avoids hammering Facebook repeatedly from the same server
_CACHE: dict = {}
_CACHE_TTL = 900  # 15 minutes

# Backoff tracker: {(brand, country): backoff_seconds}
_BACKOFF: dict = {}

# Multiple user agents to rotate
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

def get_diag() -> dict:
    return dict(DIAG)

def decode_unicode(s: str) -> str:
    """فك تشفير \u0627 إلى عربي حقيقي – فقط إذا كان يحتوي على \\u"""
    if not s:
        return s
    # فقط فك التشفير إذا كان النص يحتوي على \u escapes
    if "\\u" not in s:
        return s
    try:
        # استخدم json.loads لفك آمن
        import json
        # لف النص بعلامات اقتباس لفك unicode
        return json.loads(f'"{s}"')
    except:
        try:
            return s.encode('utf-8').decode('unicode_escape')
        except:
            return s

# Headers to mimic browser (user agent rotates per request)
def _random_headers() -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

async def scrape_via_requests(brand: str, country: str):
    """
    Lightweight requests-based scraper.
    Only returns results if it finds real ad IDs in HTML (not fake synthetic IDs).
    Returns [] to allow Playwright GraphQL to handle the search.
    """
    results = []
    try:
        url = f"https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country={country}&is_targeted_country=false&media_type=all&q={brand}&search_type=keyword_unordered"
        headers = _random_headers()
        async with httpx.AsyncClient(timeout=20, headers=headers, follow_redirects=True) as client:
            resp = await client.get(url)
            text = resp.text
            # Only return [] to let Playwright handle it
            # The requests approach can't get real ad IDs from Facebook's JS-rendered content
            print(f"[Scraper Requests] {brand} {country}: HTML length {len(text)} – deferring to Playwright")
    except Exception as e:
        print(f"[Scraper Requests] {country} failed: {e}")
    return []

async def scrape_via_playwright(brand: str, country: str):
    """Playwright – يعترض GraphQL الحقيقي للحصول على Library ID والـ Creative الحقيقي وروابط مباشرة"""
    # Check cache first
    cache_key = (brand, country)
    now = datetime.utcnow().timestamp()
    if cache_key in _CACHE:
        cached_time, cached_results = _CACHE[cache_key]
        if now - cached_time < _CACHE_TTL:
            print(f"[Cache] Hit for {brand} {country} ({len(cached_results)} ads, {int(now - cached_time)}s old)")
            DIAG.update({"stage": "cache_hit", "error": None, "ads": len(cached_results), "query": brand, "country": country})
            return cached_results

    # Check backoff — if recently failed, wait before retrying
    if cache_key in _BACKOFF:
        backoff_until = _BACKOFF[cache_key]
        if now < backoff_until:
            wait_secs = int(backoff_until - now)
            print(f"[Backoff] Waiting {wait_secs}s before retrying {brand} {country}")
            DIAG.update({"stage": "backoff", "error": f"waiting {wait_secs}s", "query": brand, "country": country})
            return []
        else:
            del _BACKOFF[cache_key]

    DIAG.update({"stage": "started", "error": None, "query": brand, "country": country})
    try:
        from playwright.async_api import async_playwright
        import json

        # Random delay before launching (1-3 seconds)
        pre_delay = random.uniform(1.0, 3.0)
        print(f"[Delay] Waiting {pre_delay:.1f}s before launching browser for {brand} {country}")
        await asyncio.sleep(pre_delay)

        url = f"https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country={country}&is_targeted_country=false&media_type=all&q={brand}&search_type=keyword_unordered"
        captured = {"list": [], "raw_payloads": [], "graphql_total": 0, "ad_library_hits": 0, "ad_lib_keys": [], "errors": []}
        headers = _random_headers()
        async with async_playwright() as p:
            launch_args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"]
            browser = await p.chromium.launch(headless=True, args=launch_args)
            page = await browser.new_page(user_agent=headers["User-Agent"])
            # اعتراض GraphQL
            async def handle_response(resp):
                if "api/graphql" in resp.url:
                    captured["graphql_total"] += 1
                    try:
                        body = await resp.text()
                        if "ad_library_main" in body:
                            captured["ad_library_hits"] += 1
                            try:
                                dec = json.JSONDecoder()
                                obj, _ = dec.raw_decode(body.lstrip())
                                main = ((obj.get("data") or {}).get("ad_library_main")) or {}
                                # Capture ALL keys (not just 12)
                                for k in list(main.keys()):
                                    if k not in captured["ad_lib_keys"]:
                                        captured["ad_lib_keys"].append(k)
                                # Save full payload for debug (up to 3)
                                if len(captured["raw_payloads"]) < 3:
                                    captured["raw_payloads"].append(main)
                                    print(f"[GraphQL] ad_library_main keys: {list(main.keys())}")
                                errs = obj.get("errors")
                                if errs and len(captured["errors"]) < 3:
                                    captured["errors"].append(str(errs)[:200])
                            except Exception:
                                pass
                        if "search_results_connection" in body:
                            captured["list"].append(body)
                    except: pass
            page.on("response", handle_response)
            # محاولتان: أحياناً البحث لا يُطلق من أول تحميل (throttle من فيسبوك)
            page_title = ""
            html_len = 0
            for attempt in range(2):
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_timeout(10000)
                # Scroll several times to trigger GraphQL search load
                try:
                    for _ in range(4):
                        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                        await page.wait_for_timeout(4000)
                    await page.evaluate("window.scrollTo(0, 0)")
                    await page.wait_for_timeout(2000)
                except: pass
                # Wait for GraphQL to be captured (up to 20s)
                for _ in range(40):
                    if captured["list"]:
                        break
                    await page.wait_for_timeout(500)
                if captured["list"]:
                    break
                try:
                    page_title = await page.title()
                    html_len = len(await page.content())
                except: pass
                print(f"[GraphQL] attempt {attempt + 1} no capture for {brand} {country} (graphql={captured['graphql_total']}) – reloading")

            # DOM fallback: try while browser is still open
            if not captured["list"]:
                try:
                    print(f"[DOM] Trying DOM fallback for {brand} {country}...")
                    dom_results = await scrape_from_dom(page, brand, country)
                    if dom_results:
                        await browser.close()
                        print(f"[DOM] Fallback returned {len(dom_results)} ads for {brand} {country}")
                        DIAG.update({"stage": "dom_fallback", "error": None, "ads": len(dom_results), "query": brand, "country": country})
                        return dom_results
                except Exception as dom_err:
                    print(f"[DOM] Fallback failed: {dom_err}")

            await page.content()
            try:
                page_title = await page.title()
                html_len = len(await page.content())
            except: pass
            await browser.close()

            # Save debug payloads to file
            if captured["raw_payloads"]:
                try:
                    with open("/tmp/meta_gql_debug.json", "w") as f:
                        json.dump(captured["raw_payloads"], f, ensure_ascii=False, indent=2, default=str)
                    print(f"[GraphQL] Saved {len(captured['raw_payloads'])} payloads to /tmp/meta_gql_debug.json")
                except: pass

            # إذا التقطنا GraphQL حقيقي، استخدمه
            if captured["list"]:
                try:
                    # فك NDJSON: الرد قد يحتوي عدة JSON objects متتالية
                    def iter_jsons(text):
                        dec = json.JSONDecoder()
                        idx = 0
                        n = len(text)
                        while idx < n:
                            while idx < n and text[idx] in " \n\r\t":
                                idx += 1
                            if idx >= n:
                                break
                            try:
                                obj, end = dec.raw_decode(text, idx)
                                yield obj
                                idx = end
                            except json.JSONDecodeError:
                                idx += 1
                    edges = []
                    seen_ids = set()
                    for body in captured["list"]:
                        for obj in iter_jsons(body):
                            try:
                                conn = obj["data"]["ad_library_main"]["search_results_connection"]
                            except (KeyError, TypeError):
                                continue
                            for e in conn.get("edges", [])[:10]:
                                cr_ids = [cr.get("ad_archive_id") for cr in e.get("node", {}).get("collated_results", [])[:3]]
                                if any(i and i not in seen_ids for i in cr_ids):
                                    edges.append(e)
                                    seen_ids.update(i for i in cr_ids if i)
                    results = []
                    for edge in edges[:10]:
                        node = edge.get("node", {})
                        for cr in node.get("collated_results", [])[:3]:
                            ad_id = cr.get("ad_archive_id")
                            if not ad_id:
                                continue
                            snap = cr.get("snapshot", {}) or {}
                            page_name = decode_unicode(snap.get("page_name") or "Unknown")
                            body_obj = snap.get("body") or {}
                            creative = decode_unicode(body_obj.get("text") or snap.get("caption") or "")
                            if not creative:
                                # جرب cards
                                cards = snap.get("cards") or []
                                if cards and cards[0].get("body"):
                                    creative = decode_unicode(cards[0]["body"].get("text") or "")
                            if not creative:
                                creative = f"إعلان {page_name} – {snap.get('link_url') or ''}"
                            # نوع الكريتيف
                            ctype = "text"
                            if snap.get("videos") and len(snap["videos"]) > 0:
                                ctype = "video"
                            elif snap.get("images") and len(snap["images"]) > 0:
                                ctype = "image"
                            # رابط مباشر للإعلان نفسه (وليس البحث)
                            snap_url = f"https://www.facebook.com/ads/library/?id={ad_id}"
                            # تاريخ البداية: غير متوفر في GraphQL، نقدّره
                            start_dt = datetime.utcnow() - timedelta(days=random.randint(5, 60))
                            est = estimate_budget_and_impressions(start_dt, None, [country], "meta")
                            results.append({
                                "ad_archive_id": str(ad_id),
                                "library_id": str(ad_id),
                                "brand_query": brand,
                                "creative_body": creative[:800],
                                "creative_type": ctype,
                                "page_name": page_name,
                                "page_id": cr.get("page_id"),
                                "snapshot_url": snap_url,
                                "start_date": start_dt.isoformat(),
                                "duration_days": est["duration_days"],
                                "countries": [country],
                                "platform": "meta",
                                "platforms": ["Facebook", "Instagram"],
                                "categories": snap.get("page_categories") or ["All"],
                                "status": "active" if cr.get("is_active") else "inactive",
                                "spend_low": est["spend_low"],
                                "spend_high": est["spend_high"],
                                "spend_egp_low": est["spend_egp_low"],
                                "spend_egp_high": est["spend_egp_high"],
                                "impressions_low": est["impressions_low"],
                                "impressions_high": est["impressions_high"],
                                "audience_low": est["audience_low"],
                                "audience_high": est["audience_high"],
                                "is_estimated": True,
                                "disclaimer": est["disclaimer"] + " (GraphQL – Real ID & Creative)",
                                "raw_data": {"method": "graphql_real", "page_name": page_name, "ad_archive_id": ad_id, "snapshot": snap},
                            })
                    if results:
                        print(f"[GraphQL] Captured {len(results)} real ads for {brand} {country}")
                        DIAG.update({"stage": "ok", "error": None, "ads": len(results), "query": brand, "country": country})
                        return results
                except Exception as e:
                    print(f"[GraphQL Parse] failed: {e}")
                    DIAG.update({"stage": "graphql_parse", "error": str(e)[:300], "query": brand, "country": country})
                    import traceback; traceback.print_exc()

            else:
                print(f"[GraphQL] No capture for {brand} {country} – setting backoff")
                DIAG.update({"stage": "no_graphql_capture", "error": f"page_title={page_title[:100]}",
                             "graphql_total": captured["graphql_total"], "ad_library_hits": captured["ad_library_hits"],
                             "ad_lib_keys": captured["ad_lib_keys"], "gql_errors": captured["errors"],
                             "raw_payload_count": len(captured["raw_payloads"]),
                             "html_len": html_len, "query": brand, "country": country})
                # Set exponential backoff: 60s, 120s, 240s (max 10 min)
                prev_backoff = _BACKOFF.get(cache_key, 60)
                new_backoff = min(prev_backoff * 2, 600)
                _BACKOFF[cache_key] = datetime.utcnow().timestamp() + new_backoff
                print(f"[Backoff] Set {new_backoff}s backoff for {brand} {country}")
    except Exception as e:
        print(f"[Playwright GraphQL] {country} failed: {e}")
        DIAG.update({"stage": "playwright_failed", "error": str(e)[:300], "query": brand, "country": country})
        import traceback; traceback.print_exc()
        # Set backoff on failure too
        _BACKOFF[cache_key] = datetime.utcnow().timestamp() + 120
    return []


async def scrape_from_dom(page, brand: str, country: str) -> list:
    """
    DOM-based fallback: extract ads directly from Facebook Ad Library HTML.
    Used when GraphQL interception fails to capture search_results_connection.
    """
    results = []
    try:
        html = await page.content()
        # Facebook Ad Library renders ad cards in specific containers
        # Try multiple selector strategies
        ad_cards = await page.query_selector_all('div[role="article"]')
        if not ad_cards:
            ad_cards = await page.query_selector_all('div[data-testid="ad-library-card"]')
        if not ad_cards:
            # Broader fallback: look for containers with ad-like content
            ad_cards = await page.query_selector_all('div.xrvj5dj')
        if not ad_cards:
            # Even broader: any div with "ad_archive_id" link inside
            ad_cards = await page.query_selector_all('div:has(a[href*="ads/library/?id="])')

        print(f"[DOM] Found {len(ad_cards)} potential ad cards for {brand} {country}")

        seen_ids = set()
        for card in ad_cards[:15]:
            try:
                # Extract ad link/ID
                ad_link = await card.query_selector('a[href*="ads/library/?id="]')
                if not ad_link:
                    continue
                href = await ad_link.get_attribute('href') or ''
                ad_id_match = re.search(r'id=(\d+)', href)
                if not ad_id_match:
                    continue
                ad_id = ad_id_match.group(1)
                if ad_id in seen_ids:
                    continue
                seen_ids.add(ad_id)

                # Extract page name
                page_name = "Unknown"
                page_el = await card.query_selector('a.x8t9es0, span.x8t9es0, a[target="_blank"]')
                if page_el:
                    page_name = (await page_el.inner_text()).strip() or "Unknown"

                # Extract ad body text
                creative = ""
                # Try multiple text selectors
                for sel in ['div.xdj266r', 'span.x1lliihq', 'div[style*="text-align"]', 'span']:
                    text_el = await card.query_selector(sel)
                    if text_el:
                        t = (await text_el.inner_text()).strip()
                        if t and len(t) > 10:
                            creative = t
                            break

                if not creative:
                    creative = f"إعلان {page_name}"

                # Extract image/video indicator
                has_video = await card.query_selector('video, div[data-testid="video"]')
                has_image = await card.query_selector('img[src*="scontent"]')
                ctype = "video" if has_video else ("image" if has_image else "text")

                # Start date estimation
                start_dt = datetime.utcnow() - timedelta(days=random.randint(5, 60))
                est = estimate_budget_and_impressions(start_dt, None, [country], "meta")

                results.append({
                    "ad_archive_id": str(ad_id),
                    "library_id": str(ad_id),
                    "brand_query": brand,
                    "creative_body": creative[:800],
                    "creative_type": ctype,
                    "page_name": page_name,
                    "page_id": None,
                    "snapshot_url": f"https://www.facebook.com/ads/library/?id={ad_id}",
                    "start_date": start_dt.isoformat(),
                    "duration_days": est["duration_days"],
                    "countries": [country],
                    "platform": "meta",
                    "platforms": ["Facebook", "Instagram"],
                    "categories": ["All"],
                    "status": "active",
                    "spend_low": est["spend_low"],
                    "spend_high": est["spend_high"],
                    "spend_egp_low": est["spend_egp_low"],
                    "spend_egp_high": est["spend_egp_high"],
                    "impressions_low": est["impressions_low"],
                    "impressions_high": est["impressions_high"],
                    "audience_low": est["audience_low"],
                    "audience_high": est["audience_high"],
                    "is_estimated": True,
                    "disclaimer": est["disclaimer"] + " (DOM Fallback)",
                    "raw_data": {"method": "dom_fallback", "page_name": page_name, "ad_archive_id": ad_id},
                })
            except Exception as card_err:
                print(f"[DOM] Card parse error: {card_err}")
                continue

        if results:
            print(f"[DOM] Extracted {len(results)} ads from HTML for {brand} {country}")
    except Exception as e:
        print(f"[DOM] Scraping failed: {e}")
    return results

# Keep old mock for final fallback
MOCK_ADS = [
    {"ad_archive_id": "mock_1001", "page_name": "Mubasher", "creative_body": "تابع السوق لحظة بلحظة مع مباشر - حمّل تطبيق Mubasher Info!", "countries": ["EG"], "start_offset_days": 12},
    {"ad_archive_id": "mock_1002", "page_name": "Mubasher Trade", "creative_body": "Mubasher Trade - تداول الأسهم المصرية بعمولة تبدأ من 0.1%", "countries": ["EG"], "start_offset_days": 45},
]

def mock_fallback(brand: str, countries: list[str]):
    results = []
    brand_lower = brand.lower()
    for mock in MOCK_ADS:
        if brand_lower not in mock["page_name"].lower() and brand_lower not in mock["creative_body"].lower():
            if brand_lower not in ["mubasher", "test", "مباشر", "careem"]:
                continue
        if not any(c in mock["countries"] for c in countries):
            continue
        start_dt = datetime.utcnow() - timedelta(days=mock["start_offset_days"])
        est = estimate_budget_and_impressions(start_dt, None, mock["countries"], "meta")
        results.append({
            "ad_archive_id": f"{mock['ad_archive_id']}_{brand_lower}",
            "brand_query": brand,
            "page_name": mock["page_name"],
            "creative_body": mock["creative_body"],
            "snapshot_url": f"https://www.facebook.com/ads/library/?id={mock['ad_archive_id']}",
            "start_date": start_dt.isoformat(),
            "duration_days": est["duration_days"],
            "countries": mock["countries"],
            "platform": "meta",
            "status": "active",
            "spend_low": est["spend_low"],
            "spend_high": est["spend_high"],
            "impressions_low": est["impressions_low"],
            "impressions_high": est["impressions_high"],
            "is_estimated": True,
            "disclaimer": est["disclaimer"] + " (Mock Fallback)",
            "raw_data": mock,
        })
    if not results:
        start_dt = datetime.utcnow() - timedelta(days=random.randint(5, 30))
        est = estimate_budget_and_impressions(start_dt, None, countries[:2], "meta")
        results.append({
            "ad_archive_id": f"mock_dyn_{brand_lower}_{random.randint(1000,9999)}",
            "brand_query": brand,
            "page_name": f"{brand} Official",
            "creative_body": f"إعلان تجريبي لـ {brand} – Demo Fallback",
            "snapshot_url": "https://www.facebook.com/ads/library/",
            "start_date": start_dt.isoformat(),
            "duration_days": est["duration_days"],
            "countries": countries[:2],
            "platform": "meta",
            "status": "active",
            "spend_low": est["spend_low"],
            "spend_high": est["spend_high"],
            "impressions_low": est["impressions_low"],
            "impressions_high": est["impressions_high"],
            "is_estimated": True,
            "disclaimer": est["disclaimer"] + " (Mock)",
            "raw_data": {"mock": True},
        })
    return results

async def scrape_meta_direct_v2(brand: str, countries: list[str]):
    """
    Hybrid: Requests -> Playwright GraphQL (real ads only – no mock/demo).
    Returns deduped ads. Empty list if nothing real found.
    Includes in-memory cache to avoid repeated scraping.
    """
    # Check cache for all countries
    cache_key = (brand, tuple(countries))
    now = datetime.utcnow().timestamp()
    if cache_key in _CACHE:
        cached_time, cached_results = _CACHE[cache_key]
        if now - cached_time < _CACHE_TTL:
            print(f"[Cache] Hit for {brand} {countries} ({len(cached_results)} ads, {int(now - cached_time)}s old)")
            return cached_results

    all_results = []
    for i, country in enumerate(countries):
        # Random delay between countries (2-5 seconds) to avoid rate limiting
        if i > 0:
            delay = random.uniform(2.0, 5.0)
            print(f"[Delay] Waiting {delay:.1f}s before scraping {country}")
            await asyncio.sleep(delay)
        # 1. Requests (fast, no deps)
        req_res = await scrape_via_requests(brand, country)
        if req_res:
            all_results.extend(req_res)
            continue
        # 2. Playwright GraphQL (real Library IDs + real creative)
        pw_res = await scrape_via_playwright(brand, country)
        if pw_res:
            all_results.extend(pw_res)
    # Real ads only: drop any mock/fake IDs
    def _is_real(r):
        return str(r.get("ad_archive_id", "")).isdigit()
    all_results = [r for r in all_results if _is_real(r)]
    # Deduplicate
    seen = set()
    uniq = []
    for r in all_results:
        if r["ad_archive_id"] not in seen:
            seen.add(r["ad_archive_id"])
            uniq.append(r)
    # Cache results
    if uniq:
        _CACHE[cache_key] = (now, uniq)
        print(f"[Cache] Stored {len(uniq)} ads for {brand} {countries}")
    return uniq
