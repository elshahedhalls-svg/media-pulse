from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import asyncio
import os
from dotenv import load_dotenv
from io import BytesIO

load_dotenv()

from database import engine, get_db, Base
from models import User, Brand
import crud
from schemas import UserLogin, UserCreate, AdSearchRequest
from services.auth import verify_password, create_token, decode_token, hash_password
from services.meta_api import search_meta_ads_api, test_token_valid
from services.meta_scraper import scrape_meta_direct
from services.meta_scraper_v2 import scrape_meta_direct_v2
from services.meta_scraper_v3 import scrape_meta_selenium
from services.keyword_generator import generate_keywords, suggest_custom_keywords
from services.correlation import pearson_correlation, spearman_correlation, detect_lag, compute_roi, compute_attribution_simple, align_daily_series
from services.tiktok import search_tiktok_ads, get_trending_hashtags, get_trending_videos, get_ad_analytics, get_industries, get_supported_countries

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Media Pulse API", version="1.0.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    db = next(get_db())
    crud.init_db(db)
    db.close()

# --- Auth helpers ---
def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        print(f"[AUTH] Missing or bad auth header: {repr(authorization)[:80] if authorization else None}")
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ",1)[1]
    print(f"[AUTH] Token length={len(token)} prefix={token[:20]}...")
    payload = decode_token(token)
    if not payload:
        print(f"[AUTH] Invalid token payload")
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.username == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# --- Health ---
@app.get("/api/health")
def health():
    # Diagnostic: which commit is live + is Meta scraping capable?
    pw_status = {"installed": False, "chromium": False}
    try:
        import playwright  # noqa
        pw_status["installed"] = True
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            pw_status["chromium"] = bool(p.chromium.executable_path)
    except Exception as e:
        pw_status["error"] = str(e)[:120]
    return {"status":"ok", "service":"media-pulse", "meta_token_valid": test_token_valid(),
            "commit": os.getenv("RAILWAY_GIT_COMMIT_SHA", "local")[:8],
            "playwright": pw_status, "time": datetime.utcnow().isoformat()}

@app.get("/api/supabase-config")
def supabase_config():
    return {
        "url": os.getenv("SUPABASE_URL"),
        "anon_key": os.getenv("SUPABASE_ANON_KEY"),
        "publishable_key": os.getenv("SUPABASE_PUBLISHABLE_KEY"),
        "note": "Use these in frontend for Supabase client if needed. DB direct needs password."
    }

# --- Auth ---
@app.post("/api/auth/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user.username, "role": user.role.value})
    return {"access_token": token, "token_type":"bearer", "user": {"id": user.id, "username": user.username, "role": user.role.value, "allowed_features": user.allowed_features, "allowed_platforms": user.allowed_platforms}}

@app.get("/api/auth/me")
def me(current: User = Depends(get_current_user)):
    return {"id": current.id, "username": current.username, "role": current.role.value, "allowed_features": current.allowed_features, "allowed_platforms": current.allowed_platforms}

@app.get("/api/users")
def list_users(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if current.role.value not in ["admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    users = db.query(User).all()
    return [{"id":u.id,"username":u.username,"role":u.role.value,"is_active":u.is_active,"created_at":u.created_at.isoformat() if u.created_at else None} for u in users]

@app.post("/api/users")
def create_user(data: UserCreate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if current.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username exists")
    u = User(username=data.username, password_hash=hash_password(data.password), role=data.role, allowed_features=data.allowed_features, allowed_platforms=data.allowed_platforms)
    db.add(u); db.commit(); db.refresh(u)
    return {"id":u.id,"username":u.username,"role":u.role.value}

# --- Regions / Countries ---
@app.get("/api/regions")
def regions(db: Session = Depends(get_db)):
    return crud.get_regions(db)

@app.get("/api/countries")
def countries(db: Session = Depends(get_db)):
    cs = crud.get_countries(db)
    return [{"code":c.code,"name":c.name,"name_ar":c.name_ar,"region_id":c.region_id} for c in cs]

# --- Keywords ---
@app.get("/api/keywords/{brand_name}")
def keywords(brand_name: str):
    kws = generate_keywords(brand_name)
    return suggest_custom_keywords(kws)

@app.post("/api/keywords/custom")
def custom_keywords(data: dict, db: Session = Depends(get_db)):
    # data: {brand_name, phrases: []}
    return {"message": f"Saved {len(data.get('phrases',[]))} keywords for {data.get('brand_name')}"}

# --- Ads Preview (تأكيد قبل البحث) ---
@app.post("/api/ads/preview")
async def preview_ads(req: AdSearchRequest, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """
    معاينة سريعة: يجلب الصفحات المرتبطة بالبراند من Ad Library قبل تنفيذ البحث الكامل.
    يُستخدم للتأكيد: "وجدنا هذه الصفحات – هل تريد البحث؟"
    """
    query = req.page_name.strip() if req.page_name and req.page_name.strip() else req.brand_name
    # المعاينة على أول دولة مختارة (أسرع) – البحث الكامل يشمل كل الدول
    country = req.countries[0] if req.countries else "EG"
    # Try Selenium first, then Playwright
    results = []
    try:
        results = await asyncio.wait_for(scrape_meta_selenium(query, [country]), timeout=60)
    except (asyncio.TimeoutError, Exception) as e:
        print(f"Selenium preview failed: {e}")
    if not results:
        results = await scrape_meta_direct_v2(query, [country])
    if req.page_name and req.page_name.strip():
        pn_lower = req.page_name.strip().lower()
        results = [r for r in results if pn_lower in (r.get("page_name") or "").lower()]
    pages: dict = {}
    for r in results:
        pn = r.get("page_name") or "Unknown"
        if pn not in pages:
            pages[pn] = {
                "page_name": pn,
                "ads_count": 0,
                "active_count": 0,
                "countries": sorted(set((r.get("countries") or [country]))),
                "sample_creative": (r.get("creative_body") or "")[:90],
            }
        pages[pn]["ads_count"] += 1
        if r.get("status") == "active":
            pages[pn]["active_count"] += 1
        for c in (r.get("countries") or []):
            if c not in pages[pn]["countries"]:
                pages[pn]["countries"].append(c)
                pages[pn]["countries"].sort()
    plist = sorted(pages.values(), key=lambda p: -p["ads_count"])
    try:
        from services.meta_scraper_v2 import get_diag
        debug = get_diag()
    except Exception:
        debug = {}
    return {
        "brand": query,
        "preview_country": country,
        "pages_found": len(plist),
        "total_ads": len(results),
        "pages": plist,
        "debug": debug,
        "note": f"Preview scanned {country} only. Full search will scan: {', '.join(req.countries)}" if len(req.countries) > 1 else f"Preview scanned {country}",
    }

# --- Ads Search (On-Demand) ---
@app.post("/api/ads/search")
async def search_ads(req: AdSearchRequest, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    # Check permission
    if current.allowed_platforms and req.platform not in current.allowed_platforms and current.role.value != "admin":
        raise HTTPException(status_code=403, detail=f"No access to platform {req.platform}")
    # Use page_name as query if provided, else brand_name
    query = req.page_name.strip() if req.page_name and req.page_name.strip() else req.brand_name
    job = crud.create_job(db, query, req.countries, req.platform, job_type="ads", user_id=current.id)
    crud.update_job(db, job.id, status="running", started_at=datetime.utcnow())
    try:
        results = []
        api_error = None
        # 1. Selenium (undetected-chromedriver) — bypasses bot detection
        try:
            results = await asyncio.wait_for(scrape_meta_selenium(query, req.countries), timeout=60)
            if results:
                print(f"[Selenium] Found {len(results)} ads for {query}")
        except asyncio.TimeoutError:
            print("[Selenium] Overall timeout")
            results = []
        except Exception as e1:
            print(f"Selenium scraper failed: {e1}")
            results = []
        # 2. Playwright GraphQL + DOM fallback
        if not results:
            try:
                results = await scrape_meta_direct_v2(query, req.countries)
            except Exception as e2:
                print(f"V2 scraper failed: {e2}")
                results = []
        # 3. Meta API fallback
        if not results and req.use_api and test_token_valid():
            try:
                results = await search_meta_ads_api(query, req.countries)
                if not results:
                    api_error = "No results from API (needs permission at facebook.com/ads/library/api – code 10)."
                    print(api_error)
            except Exception as e:
                api_error = str(e)
                print(f"API failed: {e}")
                results = []
        # If page_name filter requested, filter results to matching page
        if req.page_name and req.page_name.strip():
            pn_lower = req.page_name.strip().lower()
            filtered = [r for r in results if pn_lower in (r.get("page_name") or "").lower()]
            if filtered:
                results = filtered
        # إعلانات حقيقية فقط (بدون Demo/Mock نهائياً)
        results = [r for r in results if str(r.get("ad_archive_id", "")).isdigit()]
        # الإعلانات الشغالة فعلياً فقط (افتراضياً)
        if req.active_only:
            results = [r for r in results if r.get("status", "active") == "active"]
        saved = crud.save_ads(db, query, results)
        crud.update_job(db, job.id, status="completed", results_found=len(results), results_saved=saved, completed_at=datetime.utcnow())
        scraper_note = None
        if not results:
            scraper_note = ("Facebook did not return ads for this search right now (API permission missing + automated "
                            "search throttled from the server). Try again in a few minutes, or authorize the app at "
                            "facebook.com/ads/library/api to enable the official API.")
        return {
            "job_id": job.id,
            "brand": req.brand_name,
            "countries": req.countries,
            "platform": req.platform,
            "active_only": req.active_only,
            "results_found": len(results),
            "results_saved": saved,
            "api_error": api_error,
            "scraper_note": scraper_note,
            "disclaimer": "Real Meta Ad Library ads (GraphQL). Spend/Impressions are ESTIMATED via CPM model. Not Meta official data.",
            "ads": results
        }
    except Exception as e:
        crud.update_job(db, job.id, status="failed", error_message=str(e), completed_at=datetime.utcnow())
        raise HTTPException(status_code=500, detail=str(e))

def _ad_to_dict(a):
    # Fix mojibake: handle mixed correct Arabic + mojibake like "إعلان ÙØ¨Ø§Ø´Ø±"
    body = a.creative_body or ""
    if "Ù" in body or "Ø" in body:
        try:
            # Fix per-word to avoid corrupting already-correct Arabic
            words = body.split(" ")
            fixed_words = []
            for w in words:
                if "Ù" in w or "Ø" in w:
                    try:
                        fixed_words.append(w.encode('latin1').decode('utf-8'))
                    except:
                        fixed_words.append(w)
                else:
                    fixed_words.append(w)
            body = " ".join(fixed_words)
        except: pass
    # Then handle \u escapes if any
    try:
        if "\\u" in body:
            import json
            body = json.loads(f'"{body}"')
    except: pass
    # Fallback for EGP/audience if not in DB (computed from raw_data or estimation)
    raw = a.raw_data or {}
    # Try to get from raw_data first
    spend_egp_low = raw.get("spend_egp_low") or (int(a.spend_low*50.5) if a.spend_low else None)
    spend_egp_high = raw.get("spend_egp_high") or (int(a.spend_high*50.5) if a.spend_high else None)
    audience_low = raw.get("audience_low") or (int(a.impressions_low*0.65) if a.impressions_low else None)
    audience_high = raw.get("audience_high") or (int(a.impressions_high*0.85) if a.impressions_high else None)
    platforms = raw.get("platforms") or (["Facebook","Instagram"] if "meta" in str(a.platform).lower() else [str(a.platform)])
    categories = raw.get("categories") or ["All"]
    creative_type = raw.get("creative_type") or raw.get("creativeType") or "text"
    library_id = raw.get("library_id") or raw.get("lib_id") or a.ad_archive_id
    return {
        "id": a.id,
        "ad_archive_id": a.ad_archive_id,
        "library_id": library_id,
        "page_name": a.page_name,
        "creative_body": body,
        "creative_type": creative_type,
        "snapshot_url": a.snapshot_url,
        "start_date": a.start_date.isoformat() if a.start_date else None,
        "duration_days": a.duration_days,
        "countries": a.countries,
        "platform": a.platform.value if hasattr(a.platform, 'value') else str(a.platform),
        "platforms": platforms,
        "categories": categories,
        "status": a.status,
        "spend_low": a.spend_low,
        "spend_high": a.spend_high,
        "spend_egp_low": spend_egp_low,
        "spend_egp_high": spend_egp_high,
        "impressions_low": a.impressions_low,
        "impressions_high": a.impressions_high,
        "audience_low": audience_low,
        "audience_high": audience_high,
        "is_estimated": a.is_estimated,
        "scraped_at": a.scraped_at.isoformat() if a.scraped_at else None,
    }

@app.get("/api/ads")
def list_ads(brand: str = None, countries: str = None, platform: str = None, page_name: str = None, active_only: bool = True, limit: int = 100, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    cs = countries.split(",") if countries else None
    ads = crud.get_ads(db, brand_name=brand, countries=cs, platform=platform, page_name=page_name, limit=limit)
    # إعلانات حقيقية فقط (بدون Demo) + الشغالة فعلياً
    ads = [a for a in ads if str(a.ad_archive_id).isdigit()]
    if active_only:
        ads = [a for a in ads if (a.status or "active") == "active"]
    return [_ad_to_dict(a) for a in ads]

@app.get("/api/pages/search")
def search_pages(q: str = "", limit: int = 10, db: Session = Depends(get_db)):
    """Autocomplete for page names – يرجع أسماء الصفحات التي تحتوي q"""
    if not q or len(q.strip()) < 1:
        return []
    pages = crud.search_pages(db, q.strip(), limit)
    return pages

@app.get("/api/jobs")
def jobs(limit: int = 20, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    js = crud.get_jobs(db, limit)
    return [{"id":j.id,"brand_name":j.brand_name,"countries":j.countries,"platform":j.platform,"status":j.status.value if hasattr(j.status,'value') else j.status,"results_found":j.results_found,"results_saved":j.results_saved,"created_at":j.created_at.isoformat()} for j in js]

# --- Export Excel ---
@app.get("/api/export/ads")
def export_ads(brand: str = None, countries: str = None, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    cs = countries.split(",") if countries else None
    ads = crud.get_ads(db, brand_name=brand, countries=cs, limit=1000)
    try:
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Ads"
        headers = ["Library ID","Page","Creative (Arabic)","Creative Type","Platforms","Categories","Countries","Start Date","Duration (days)","Amount Spent (EGP)","Amount Spent (USD)","Impressions","Estimated Audience Size","Status","Estimated?","Snapshot URL"]
        ws.append(headers)
        for a in ads:
            d = _ad_to_dict(a)
            ws.append([
                d["library_id"],
                d["page_name"],
                d["creative_body"],
                d["creative_type"],
                ", ".join(d["platforms"] or []),
                ", ".join(d["categories"] or []),
                ",".join(d["countries"] or []),
                d["start_date"][:10] if d["start_date"] else "",
                d["duration_days"],
                f"{d['spend_egp_low']:,} - {d['spend_egp_high']:,} EGP" if d["spend_egp_low"] else "",
                f"${d['spend_low']} - ${d['spend_high']}" if d["spend_low"] else "",
                f"{d['impressions_low']:,} - {d['impressions_high']:,}" if d["impressions_low"] else "",
                f"{d['audience_low']:,} - {d['audience_high']:,}" if d["audience_low"] else "",
                d["status"],
                "Yes (Est.)" if d["is_estimated"] else "No (Official)",
                d["snapshot_url"]
            ])
        # Auto width
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = min(max_len+2, 50)
        ws.append([])
        ws.append(["Disclaimer: Spend/Impressions are ESTIMATED via CPM model (EG $1.5, GCC $6-8). Not official Meta data."])
        bio = BytesIO()
        wb.save(bio)
        bio.seek(0)
        fname = f"{brand or 'all'}_ads_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"
        return StreamingResponse(bio, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={fname}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")

# --- Stats ---
@app.get("/api/stats/{brand_name}")
def stats(brand_name: str, db: Session = Depends(get_db)):
    ads = crud.get_ads(db, brand_name=brand_name, limit=1000)
    total = len(ads)
    active = len([a for a in ads if a.status=="active"])
    total_spend_low = sum(a.spend_low or 0 for a in ads)
    total_spend_high = sum(a.spend_high or 0 for a in ads)
    by_country = {}
    for a in ads:
        for c in (a.countries or []):
            by_country[c] = by_country.get(c,0)+1
    return {"brand":brand_name,"total_ads":total,"active_ads":active,"total_spend_low":total_spend_low,"total_spend_high":total_spend_high,"by_country":by_country}

# ==================== APP TRACKING ====================
@app.post("/api/apps/search")
async def search_apps(query: str, store: str = "all", country: str = "EG",
                      db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """بحث في Google Play و Apple App Store (iTunes)"""
    results = []
    if store in ("play", "all"):
        from services.playstore import search_apps as play_search
        play_results = await play_search(query, country, limit=5)
        results.extend(play_results)
    if store in ("appstore", "all"):
        from services.itunes import search_itunes
        itunes_results = await search_itunes(query, country, limit=5)
        results.extend(itunes_results)
    return {"query": query, "country": country, "results": results, "count": len(results)}

def parse_app_link(url: str):
    """Parse a direct app link (or bare package/id) → (store, app_id) or None.
    Play: https://play.google.com/store/apps/details?id=com.xxx
    AppStore: https://apps.apple.com/.../app/.../id123456789
    Also accepts bare 'com.xxx.yyy' (play) or bare digits (appstore id)."""
    import re
    url = (url or "").strip()
    if not url:
        return None
    if url.isdigit():
        return ("appstore", url)
    if re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+", url):
        return ("play", url)
    m = re.search(r"[?&]id=([a-zA-Z0-9._]+)", url)
    if "play.google.com" in url and m:
        return ("play", m.group(1))
    m = re.search(r"/id(\d+)", url)
    if ("apps.apple.com" in url or "itunes.apple.com" in url) and m:
        return ("appstore", m.group(1))
    return None

@app.post("/api/apps/track-url")
async def track_app_by_url(data: dict, country: str = "EG", db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """إضافة تطبيق بلينك مباشر (Play/AppStore) — parse + details + snapshot"""
    url = (data.get("url") or "").strip()
    parsed = parse_app_link(url)
    if not parsed:
        raise HTTPException(status_code=400, detail="Unrecognized app link. Paste a Google Play or App Store link.")
    store, app_id = parsed
    try:
        if store == "play":
            from services.playstore import get_app_details
            app_data = await get_app_details(app_id, country)
        else:
            from services.itunes import get_itunes_details
            app_data = await get_itunes_details(app_id, country)
    except Exception as e:
        print(f"[TrackURL] details failed for {url}: {e}")
        app_data = None
    if not app_data:
        raise HTTPException(status_code=502, detail="Could not fetch app data from this link. Check the link and country.")
    app = crud.get_or_create_app(db, app_id=app_data.get("app_id", app_id),
                                 name=app_data.get("name", app_id), store=store,
                                 icon_url=app_data.get("icon_url"), url=app_data.get("url"),
                                 category=app_data.get("category"), developer=app_data.get("developer"))
    snap = crud.save_app_snapshot(db, app.id, app_data, country)
    return {
        "message": "Tracked",
        "app_id": app.id,
        "name": app.name,
        "store": store,
        "snapshot_id": snap.id if snap else None,
        "has_data": snap is not None,
    }

@app.post("/api/apps/track")
async def track_app(data: dict, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """إضافة تطبيق للمتابعة + جلب البيانات تلقائي"""
    app_id = data.get("app_id", "")
    store = data.get("store", "play")
    name = data.get("name", "")
    country = data.get("country", "EG")
    icon_url = data.get("icon_url")
    url = data.get("url")
    category = data.get("category")
    app = crud.get_or_create_app(db, app_id=app_id, name=name, store=store,
                                  icon_url=icon_url, url=url, category=category)
    # جلب البيانات تلقائي بعد التتبع
    snap = None
    try:
        if store == "play":
            from services.playstore import get_app_details
            app_data = await get_app_details(app_id, country)
        else:
            from services.appstore import get_app_details
            app_data = await get_app_details(app_id, country)
        if app_data:
            snap = crud.save_app_snapshot(db, app.id, app_data, country)
    except Exception as e:
        print(f"[Track] Auto-snapshot failed for {app_id}: {e}")
    return {
        "message": "Tracked",
        "app_id": app.id,
        "name": app.name,
        "snapshot_id": snap.id if snap else None,
        "has_data": snap is not None,
    }

@app.get("/api/apps")
async def list_apps(country: str = None, db: Session = Depends(get_db),
                    current: User = Depends(get_current_user)):
    """قائمة التطبيقات المتابعة"""
    return crud.get_tracked_apps(db, country=country)


# ==================== TRENDING & DISCOVERY (must be before /{tracked_id}) ====================
@app.get("/api/apps/trending")
async def trending_apps(country: str = "EG", category: str = None, limit: int = 20):
    """التطبيقات الرائجة — Top Charts"""
    from services.playstore import get_trending_apps
    apps = await get_trending_apps(country, category, limit)
    return {"country": country, "category": category, "apps": apps, "count": len(apps)}


@app.get("/api/apps/categories")
async def app_categories():
    """قائمة التصنيفات"""
    from services.playstore import get_categories
    return get_categories()


@app.get("/api/apps/category/{category}")
async def category_apps(category: str, country: str = "EG", limit: int = 20):
    """تطبيقات حسب التصنيف"""
    from services.playstore import get_category_apps
    apps = await get_category_apps(category, country, limit)
    return {"category": category, "country": country, "apps": apps, "count": len(apps)}


@app.post("/api/apps/compare")
async def compare_apps_endpoint(data: dict, country: str = "EG"):
    """مقارنة تطبيقات"""
    from services.playstore import compare_apps
    app_ids = data.get("app_ids", [])
    if not app_ids:
        raise HTTPException(status_code=400, detail="app_ids required")
    results = await compare_apps(app_ids, country)
    return {"country": country, "apps": results, "count": len(results)}


@app.get("/api/apps/{tracked_id}")
async def get_app(tracked_id: int, db: Session = Depends(get_db),
                  current: User = Depends(get_current_user)):
    """تفاصيل تطبيق متابّع"""
    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    snapshots = crud.get_app_snapshots(db, app.id, limit=100)
    
    # Get latest snapshot for current stats
    latest = snapshots[-1] if snapshots else None
    
    return {
        "id": app.id, "app_id": app.app_id, "name": app.name, "store": app.store,
        "icon_url": app.icon_url, "url": app.url, "category": app.category,
        "latest_snapshot": {
            "downloads_est": latest.downloads_est if latest else None,
            "installs_exact": latest.installs_exact if latest else None,
            "installs_display": latest.installs_display if latest else None,
            "rating_avg": latest.rating_avg if latest else None,
            "rating_count": latest.rating_count if latest else None,
            "reviews_count": latest.reviews_count if latest else None,
            "daily_downloads": latest.daily_downloads if latest else None,
            "daily_growth_pct": latest.daily_growth_pct if latest else None,
            "new_ratings": latest.new_ratings if latest else None,
            "downloads_est_low": latest.downloads_est_low if latest else None,
            "downloads_est_high": latest.downloads_est_high if latest else None,
            "star_distribution": latest.star_distribution if latest else None,
            "version": latest.version if latest else None,
            "last_updated": latest.last_updated if latest else None,
            "developer": latest.developer if latest else None,
            "category": latest.category if latest else None,
        } if latest else None,
        "snapshots": [{
            "date": s.date.isoformat() if s.date else None,
            "downloads_est": s.downloads_est,
            "installs_exact": s.installs_exact,
            "installs_display": s.installs_display,
            "rating_avg": s.rating_avg,
            "rating_count": s.rating_count,
            "reviews_count": s.reviews_count,
            "daily_downloads": s.daily_downloads,
            "daily_growth_pct": s.daily_growth_pct,
            "new_ratings": s.new_ratings,
            "downloads_est_low": s.downloads_est_low,
            "downloads_est_high": s.downloads_est_high,
            "star_distribution": s.star_distribution,
            "country": s.country_code,
        } for s in snapshots]
    }

@app.post("/api/apps/{tracked_id}/refresh")
async def refresh_app(tracked_id: int, country: str = "EG", reviews_count: int = 10,
                      db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """لقطة جديدة On-Demand"""
    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    data = None
    if app.store == "play":
        from services.playstore import get_app_details, get_app_reviews
        data = await get_app_details(app.app_id, country)
        if data:
            reviews = await get_app_reviews(app.app_id, country, count=reviews_count)
            data["reviews"] = reviews
    else:
        from services.itunes import get_itunes_details
        data = await get_itunes_details(app.app_id, country)
        if data:
            data["reviews"] = []
    if not data:
        raise HTTPException(status_code=502, detail="Failed to fetch app data")
    snap = crud.save_app_snapshot(db, app.id, data, country)
    return {
        "message": "Snapshot saved",
        "snapshot_id": snap.id,
        "data": {
            "installs": data.get("installs"),
            "rating_avg": data.get("rating_avg"),
            "rating_count": data.get("rating_count"),
            "reviews_count": len(data.get("reviews", [])),
            "version": data.get("version"),
            "last_updated": data.get("last_updated"),
        }
    }

@app.get("/api/apps/{tracked_id}/history")
async def app_history(tracked_id: int, country: str = None, range: str = "all",
                      db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """تاريخ اللقطات للرسوم البيانية — مع فلتر المدة الزمنية
    range: '1m' (شهر), '3m' (3 شهور), '6m' (6 شهور), '1y' (سنة), '2y', '5y', 'all'
    """
    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    snaps = crud.get_app_snapshots(db, app.id, country=country, limit=500)

    # فلتر حسب المدة الزمنية
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    range_days = {
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365,
        "2y": 730,
        "5y": 1825,
    }.get(range)

    if range_days:
        cutoff = now - timedelta(days=range_days)
        snaps = [s for s in snaps if s.date and s.date >= cutoff]

    # تجميع حسب الفترة الزمنية (لتقليل عدد النقاط في الرسم البياني)
    # للمدى القصير (1m, 3m) نعرض يومي، للمدى الطويل (1y, 5y) نعرض أسبوعي
    if range in ["1m", "3m"]:
        bucket = "day"
    elif range in ["6m", "1y"]:
        bucket = "week"
    else:  # 2y, 5y, all
        bucket = "month"

    def get_bucket_key(dt):
        if bucket == "day":
            return dt.strftime("%Y-%m-%d")
        elif bucket == "week":
            iso = dt.isocalendar()
            return f"{iso[0]}-W{iso[1]:02d}"
        else:  # month
            return dt.strftime("%Y-%m")

    # تجميع اللقطات في buckets
    from collections import OrderedDict
    buckets = OrderedDict()
    for s in sorted(snaps, key=lambda x: x.date):
        if not s.date:
            continue
        key = get_bucket_key(s.date)
        if key not in buckets:
            buckets[key] = {"downloads": [], "rating": [], "reviews": []}
        if s.downloads_est:
            buckets[key]["downloads"].append(s.downloads_est)
        if s.rating_avg:
            buckets[key]["rating"].append(s.rating_avg)
        if s.rating_count:
            buckets[key]["reviews"].append(s.rating_count)

    # حساب المتوسط لكل bucket
    aggregated = []
    for key, vals in buckets.items():
        downloads_avg = int(sum(vals["downloads"]) / len(vals["downloads"])) if vals["downloads"] else 0
        rating_avg = sum(vals["rating"]) / len(vals["rating"]) if vals["rating"] else None
        reviews_avg = int(sum(vals["reviews"]) / len(vals["reviews"])) if vals["reviews"] else 0
        aggregated.append({
            "date": key,
            "downloads_est": downloads_avg,
            "rating_avg": round(rating_avg, 2) if rating_avg else None,
            "rating_count": reviews_avg,
            "reviews_count": reviews_avg,
            "country": country or "ALL",
        })

    # إضافة ملخص الإحصائيات
    total_snapshots = len(snaps)
    summary = {
        "total_snapshots": total_snapshots,
        "range": range,
        "bucket": bucket,
        "period_start": snaps[-1].date.isoformat() if snaps else None,
        "period_end": snaps[0].date.isoformat() if snaps else None,
    }

    return {
        "app_id": app.id,
        "app_name": app.name,
        "store": app.store,
        "summary": summary,
        "data": aggregated,
    }

@app.delete("/api/apps/{tracked_id}")
async def remove_app(tracked_id: int, db: Session = Depends(get_db),
                     current: User = Depends(get_current_user)):
    """حذف تطبيق من المتابعة"""
    ok = crud.delete_app(db, tracked_id)
    if not ok:
        raise HTTPException(status_code=404, detail="App not found")
    return {"message": "Deleted"}

# ==================== SENTIMENT ANALYSIS ====================
@app.get("/api/apps/{tracked_id}/sentiment")
async def get_sentiment(tracked_id: int, country: str = "EG",
                       db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """تحليل مشاعر الريفيوز — آخر 10 + أعلى 10"""
    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    from services.sentiment import analyze_reviews, classify_star_rating
    
    # جلب الريفيوز من المتجر
    reviews_data = []
    if app.store == "play":
        from services.playstore import get_app_reviews
        reviews_data = await get_app_reviews(app.app_id, country, count=30)
    else:
        from services.appstore import get_app_reviews
        reviews_data = await get_app_reviews(app.app_id, country, count=30)
    
    if not reviews_data:
        return {
            "app_id": app.id,
            "app_name": app.name,
            "store": app.store,
            "country": country,
            "total_reviews": 0,
            "recent_sentiment": None,
            "top_sentiment": None,
        }
    
    # تصنيف الريفيوز حسب النجوم إن وجد
    for r in reviews_data:
        if "stars" in r and "sentiment" not in r:
            r["star_sentiment"] = classify_star_rating(r.get("stars", 3))
    
    # آخر 10 ريفيوز (الأحدث)
    recent_10 = reviews_data[:10]
    recent_sentiment = analyze_reviews(recent_10)
    
    # أعلى 10 ريفيوز (الأعلى تقييماً)
    top_10 = sorted(reviews_data, key=lambda x: x.get("stars", 0), reverse=True)[:10]
    top_sentiment = analyze_reviews(top_10)
    
    return {
        "app_id": app.id,
        "app_name": app.name,
        "store": app.store,
        "country": country,
        "total_reviews": len(reviews_data),
        "recent_sentiment": recent_sentiment,
        "top_sentiment": top_sentiment,
    }

@app.get("/api/apps/{tracked_id}/rank")
async def get_store_rank(tracked_id: int, country: str = "EG",
                        db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """جلب ترتيب التطبيق في المتجر"""
    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    rank_data = None
    if app.store == "play":
        from services.playstore import get_app_details
        data = await get_app_details(app.app_id, country)
        if data:
            rank_data = {
                "rank": data.get("rank"),
                "category_rank": data.get("category_rank"),
                "category": data.get("category"),
            }
    else:
        from services.appstore import get_app_details
        data = await get_app_details(app.app_id, country)
        if data:
            rank_data = {
                "rank": data.get("rank"),
                "category_rank": data.get("category_rank"),
                "category": data.get("category"),
            }
    
    return {
        "app_id": app.id,
        "app_name": app.name,
        "store": app.store,
        "country": country,
        "rank_data": rank_data,
    }

@app.get("/api/apps/{tracked_id}/keywords")
async def get_aso_keywords(tracked_id: int, country: str = "EG",
                          db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """جلب كلمات مفتاحية مقترحة للتطبيق (ASO)"""
    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    # تحليل الوصف والعنون لاستخراج كلمات مفتاحية
    keywords = []
    if app.store == "play":
        from services.playstore import get_app_details
        data = await get_app_details(app.app_id, country)
        if data:
            desc = data.get("description", "")
            title = data.get("name", app.name)
            category = data.get("category", "")
            developer = data.get("developer", "")
            keywords = _extract_keywords(title, desc, category, developer)
    else:
        from services.appstore import get_app_details
        data = await get_app_details(app.app_id, country)
        if data:
            desc = data.get("description", "")
            title = data.get("name", app.name)
            category = data.get("category", "")
            developer = data.get("developer", "")
            keywords = _extract_keywords(title, desc, category, developer)
    
    return {
        "app_id": app.id,
        "app_name": app.name,
        "store": app.store,
        "country": country,
        "keywords": keywords,
    }


def _extract_keywords(title: str, description: str, category: str = "", developer: str = "") -> list[dict]:
    """استخراج كلمات مفتاحية من العنوان والوصف + bigrams + category"""
    import re
    from collections import Counter

    if not description:
        description = ""
    if not title:
        title = ""

    # دمج النص
    full_text = f"{title} {description} {category} {developer}".lower()

    # قائمة كلمات التوقف الموسعة
    stop_words = {
        # English common
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "shall", "can", "this", "that",
        "these", "those", "i", "you", "he", "she", "it", "we", "they",
        "app", "application", "mobile", "phone", "device", "apps", "download",
        "free", "new", "best", "top", "more", "all", "your", "my", "our",
        "their", "his", "her", "its", "what", "which", "who", "how", "when",
        "where", "why", "not", "no", "yes", "if", "then", "than", "also",
        "just", "only", "very", "even", "some", "any", "each", "every",
        "one", "two", "three", "using", "use", "used", "make", "made",
        "get", "got", "let", "see", "now", "way", "many", "much",
        "up", "down", "out", "about", "into", "over", "after", "before",
        "through", "during", "above", "below", "between", "off", "back",
        "well", "still", "here", "there", "such", "own", "same", "other",
        # Arabic common
        "في", "من", "على", "إلى", "عن", "مع", "هذا", "هذه", "التي", "الذي",
        "التي", "الذي", "كما", "لكن", "لكنه", "ولكن", "أو", "ثم", "حتى",
        "إذا", "عند", "عندما", "بين", "كذلك", "أيضا", "قد", "كان", "كانت",
        "يكون", "تكون", "أن", "إن", "لا", "لم", "لن", "كل", "بعض", "غير",
    }

    # استخراج كلمات مفردة (3+ حروف)
    words = re.findall(r'[\w\u0600-\u06FF]{3,}', full_text)
    words = [w for w in words if w not in stop_words and len(w) >= 3 and not w.isdigit()]

    # استخراج bigrams (كلمتين متتاليتين)
    text_words = re.findall(r'[\w\u0600-\u06FF]{3,}', full_text)
    text_words = [w for w in text_words if w not in stop_words]
    bigrams = []
    for i in range(len(text_words) - 1):
        bg = f"{text_words[i]} {text_words[i+1]}"
        bigrams.append(bg)

    # عدّ الكلمات والـ bigrams
    word_counts = Counter(words)
    bigram_counts = Counter(bigrams)

    # أفضل 15 كلمة فردية + أفضل 8 bigrams
    top_words = word_counts.most_common(15)
    top_bigrams = bigram_counts.most_common(8)

    # دمج: ابدأ بالـ bigrams الأكثر شيوعاً، ثم الكلمات
    results = []
    seen = set()

    # أولاً: bigrams (أكثر قيمة ككلمات مفتاحية)
    for bigram, count in top_bigrams:
        if count < 1 or bigram in seen:
            continue
        seen.add(bigram)
        results.append({
            "keyword": bigram,
            "popularity": min(50 + count * 5, 100),
            "volume": min(count * 2000, 100000),
            "kd": max(30, 70 - count * 3),
            "rank": len(results) + 1,
        })

    # ثانياً: كلمات مفردة
    for word, count in top_words:
        if word in seen or count < 1:
            continue
        seen.add(word)
        # أضف الـ keyword كأيضاً bigram مع title word للـ boosting
        results.append({
            "keyword": word,
            "popularity": min(count * 12, 100),
            "volume": min(count * 1500, 100000),
            "kd": max(25, 75 - count * 4),
            "rank": len(results) + 1,
        })

    # إذا لم نحصل على كلمات كافية، أضف كلمات من العنوان
    if len(results) < 5 and title:
        title_words = re.findall(r'[\w\u0600-\u06FF]{3,}', title.lower())
        for w in title_words:
            if w not in seen and w not in stop_words and len(w) >= 3:
                seen.add(w)
                results.append({
                    "keyword": w,
                    "popularity": 40,
                    "volume": 5000,
                    "kd": 50,
                    "rank": len(results) + 1,
                })
                if len(results) >= 15:
                    break

    return results[:15]


# ==================== COUNTRY DOWNLOADS ====================
@app.get("/api/apps/{tracked_id}/countries")
async def get_country_downloads(tracked_id: int, db: Session = Depends(get_db),
                               current: User = Depends(get_current_user)):
    """تحميلات + تقييمات التطبيق حسب الدولة
    ⚠️ Play Store/Apple لا يعرضون تحميلات per-country علناً
    → نعرض: rating_avg + rating_count (يختلف حسب الدولة) + downloads global + تقدير per-country
    """
    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    countries_data = []
    test_countries = ["EG", "SA", "AE", "QA", "KW", "BH", "OM"]

    # أولاً: جلب البيانات من مصر (baseline) للحصول على إجمالي التحميلات
    baseline_data = None
    if app.store == "play":
        from services.playstore import get_app_details
        baseline_data = await get_app_details(app.app_id, "EG")
    else:
        from services.appstore import get_app_details
        baseline_data = await get_app_details(app.app_id, "EG")

    total_downloads_global = 0
    if baseline_data:
        installs = baseline_data.get("installs", {})
        total_downloads_global = installs.get("min", 0)

    # توزيع تقريبي للتحميلات حسب الدولة (بناءً على حجم السوق)
    # هذه نسب تقريبية من تقارير متاجر التطبيقات
    market_share = {
        "EG": 0.40,  # مصر 40% من السوق العربي
        "SA": 0.30,  # السعودية 30%
        "AE": 0.15,  # الإمارات 15%
        "KW": 0.05,  # الكويت 5%
        "QA": 0.04,  # قطر 4%
        "OM": 0.03,  # عمان 3%
        "BH": 0.03,  # البحرين 3%
    }

    for country in test_countries:
        try:
            if app.store == "play":
                from services.playstore import get_app_details
                data = await get_app_details(app.app_id, country)
            else:
                from services.appstore import get_app_details
                data = await get_app_details(app.app_id, country)

            if data:
                installs = data.get("installs", {})
                country_downloads_min = int(total_downloads_global * market_share.get(country, 0.05))
                countries_data.append({
                    "country": country,
                    "downloads_global": total_downloads_global,
                    "downloads_min": country_downloads_min,  # تقدير
                    "downloads_max": int(country_downloads_min * 1.3),
                    "downloads_label": installs.get("label", "N/A"),
                    "rating_avg": data.get("rating_avg"),
                    "rating_count": data.get("rating_count"),
                    "is_estimated": True,  # علماً بأن هذا تقدير
                })
        except Exception as e:
            print(f"[CountryDownloads] {country} failed: {e}")
            countries_data.append({
                "country": country,
                "error": str(e)[:100],
            })

    return {
        "app_id": app.id,
        "app_name": app.name,
        "store": app.store,
        "total_downloads_global": total_downloads_global,
        "note": lang_to_note(app.store),  # تنبيه للمستخدم
        "countries": countries_data,
    }


def lang_to_note(store: str) -> str:
    """ملاحظة عن مصدر البيانات"""
    if store == "play":
        return "Play Store يعرض التحميلات globally فقط. التقدير per-country مبني على حصة السوق التقريبية."
    else:
        return "Apple لا تكشف التحميلات. التقدير مبني على عدد التقييمات وحصة السوق."


# ==================== CORRELATION ENGINE ====================
@app.get("/api/correlation/{tracked_id}")
async def get_correlation(tracked_id: int, country: str = None, range: str = "all",
                         max_lag: int = 14, db: Session = Depends(get_db),
                         current: User = Depends(get_current_user)):
    """
    تحليل الارتباط بين إنفاق الإعلانات والتحميلات
    يربط Ad spend مع App downloads لكل يوم/بلد
    """
    from services.correlation import pearson_correlation, spearman_correlation, detect_lag

    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    # Get app snapshots
    snaps = crud.get_app_snapshots(db, app.id, country=country, limit=500)

    # Get ads (filtered by brand if linked, otherwise all)
    if app.brand_id:
        ads = crud.get_ads(db, limit=500)
        brand = db.query(Brand).filter(Brand.id == app.brand_id).first()
        if brand:
            ads = crud.get_ads(db, brand_name=brand.name, limit=500)
    else:
        ads = crud.get_ads(db, limit=500)

    # Align daily series
    from services.correlation import align_daily_series
    app_data = []
    for s in snaps:
        app_data.append({
            "date": s.date.isoformat() if s.date else None,
            "downloads_est": s.downloads_est or 0,
            "country": s.country_code,
        })

    ad_data = []
    for a in ads:
        ad_data.append({
            "start_date": a.start_date.isoformat() if a.start_date else None,
            "end_date": a.end_date.isoformat() if a.end_date else None,
            "spend_low": a.spend_low or 0,
            "spend_high": a.spend_high or 0,
            "countries": a.countries or [],
        })

    dates, spends, downloads = align_daily_series(ad_data, app_data, country=country)

    # Filter by range
    now = datetime.utcnow()
    range_days = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "2y": 730, "5y": 1825}.get(range)
    if range_days and dates:
        cutoff = (now - timedelta(days=range_days)).strftime("%Y-%m-%d")
        filtered = [(d, s, dl) for d, s, dl in zip(dates, spends, downloads) if d >= cutoff]
        if filtered:
            dates, spends, downloads = zip(*filtered)
            dates, spends, downloads = list(dates), list(spends), list(downloads)

    # Compute correlations
    pearson = pearson_correlation(spends, downloads)
    spearman = spearman_correlation(spends, downloads)
    lag_result = detect_lag(spends, downloads, max_lag=max_lag)

    return {
        "app_id": app.id,
        "app_name": app.name,
        "store": app.store,
        "country": country or "ALL",
        "range": range,
        "data_points": len(dates),
        "date_range": {"start": dates[0] if dates else None, "end": dates[-1] if dates else None},
        "pearson": pearson,
        "spearman": spearman,
        "lag_analysis": lag_result,
        "series": {"dates": dates, "spends": spends, "downloads": downloads},
        "disclaimer": "Spending data is estimated (CPM model). Downloads are estimates. Correlation does not imply causation.",
    }


@app.get("/api/correlation/{tracked_id}/roi")
async def get_roi(tracked_id: int, country: str = None, revenue_per_download: float = 0.0,
                  db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """حساب ROI و CAC للتطبيق"""
    from services.correlation import compute_roi

    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    snaps = crud.get_app_snapshots(db, app.id, country=country, limit=500)

    # Get ads
    if app.brand_id:
        brand = db.query(Brand).filter(Brand.id == app.brand_id).first()
        ads = crud.get_ads(db, brand_name=brand.name, limit=500) if brand else []
    else:
        ads = crud.get_ads(db, limit=500)

    total_spend = 0
    for ad in ads:
        if country and country not in (ad.countries or []):
            continue
        avg_spend = ((ad.spend_low or 0) + (ad.spend_high or 0)) / 2
        total_spend += avg_spend

    total_downloads = sum(s.downloads_est or 0 for s in snaps)

    roi = compute_roi(total_spend, total_downloads, revenue_per_download)
    roi["app_name"] = app.name
    roi["store"] = app.store
    roi["country"] = country or "ALL"
    roi["revenue_per_download"] = revenue_per_download
    roi["disclaimer"] = "Spend is estimated (CPM model). Downloads are estimates. ROI calculation is approximate."

    return roi


@app.get("/api/correlation/{tracked_id}/attribution")
async def get_attribution(tracked_id: int, country: str = None, model: str = "last_click",
                         window_days: int = 7, db: Session = Depends(get_db),
                         current: User = Depends(get_current_user)):
    """حساب Attribution — أي إعلان تسبب في التحميل"""
    from services.correlation import compute_attribution_simple

    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")

    # Get app snapshots (installs)
    snaps = crud.get_app_snapshots(db, app.id, country=country, limit=500)
    installs = []
    for s in snaps:
        installs.append({
            "date": s.date.isoformat() if s.date else None,
            "country": s.country_code,
            "downloads_est": s.downloads_est or 0,
        })

    # Get ads
    if app.brand_id:
        brand = db.query(Brand).filter(Brand.id == app.brand_id).first()
        ads = crud.get_ads(db, brand_name=brand.name, limit=500) if brand else []
    else:
        ads = crud.get_ads(db, limit=500)

    ad_list = []
    for a in ads:
        ad_list.append({
            "date": a.start_date.isoformat() if a.start_date else None,
            "ad_archive_id": a.ad_archive_id,
            "page_name": a.page_name,
            "countries": a.countries or [],
            "spend_usd": ((a.spend_low or 0) + (a.spend_high or 0)) / 2,
        })

    result = compute_attribution_simple(ad_list, installs, window_days=window_days, model=model)
    result["app_name"] = app.name
    result["store"] = app.store
    result["country"] = country or "ALL"
    result["disclaimer"] = "Attribution is simplified (time-based). Does not account for multiple touchpoints or external factors."

    return result


@app.get("/api/correlation/brand/{brand_name}")
async def get_brand_correlation(brand_name: str, country: str = None, range: str = "all",
                                db: Session = Depends(get_db),
                                current: User = Depends(get_current_user)):
    """تحليل ارتباط على مستوى البراند — جميع الإعلانات مع جميع التطبيقات"""
    from services.correlation import pearson_correlation, detect_lag, align_daily_series

    brand = db.query(Brand).filter(func.lower(Brand.name) == brand_name.lower()).first()
    if not brand:
        raise HTTPException(status_code=404, detail=f"Brand '{brand_name}' not found")

    # Get all ads for brand
    ads = crud.get_ads(db, brand_name=brand.name, limit=1000)

    # Get all apps linked to brand
    from models import AppTracked
    apps = db.query(AppTracked).filter(AppTracked.brand_id == brand.id).all()

    # Get all snapshots for all apps
    all_snaps = []
    for app in apps:
        snaps = crud.get_app_snapshots(db, app.id, country=country, limit=500)
        for s in snaps:
            all_snaps.append({
                "date": s.date.isoformat() if s.date else None,
                "downloads_est": s.downloads_est or 0,
                "country": s.country_code,
            })

    # Get all ads data
    ad_data = []
    for a in ads:
        ad_data.append({
            "start_date": a.start_date.isoformat() if a.start_date else None,
            "end_date": a.end_date.isoformat() if a.end_date else None,
            "spend_low": a.spend_low or 0,
            "spend_high": a.spend_high or 0,
            "countries": a.countries or [],
        })

    dates, spends, downloads = align_daily_series(ad_data, all_snaps, country=country)

    pearson = pearson_correlation(spends, downloads)
    lag_result = detect_lag(spends, downloads, max_lag=14)

    return {
        "brand_name": brand.name,
        "total_ads": len(ads),
        "total_apps": len(apps),
        "country": country or "ALL",
        "data_points": len(dates),
        "pearson": pearson,
        "lag_analysis": lag_result,
        "series": {"dates": dates, "spends": spends, "downloads": downloads},
        "disclaimer": "Brand-level correlation. Spend and downloads are estimates. Correlation does not imply causation.",
    }


# ==================== TIKTOK CREATIVE CENTER ====================
@app.get("/api/tiktok/ads/search")
async def tiktok_search_ads(keyword: str, country: str = "EG", industry: str = "all",
                            period: str = "7", limit: int = 20,
                            current: User = Depends(get_current_user)):
    """البحث عن إعلانات TikTok حسب الكلمة المفتاحية"""
    result = await search_tiktok_ads(keyword, country, industry, period, limit)
    return result


@app.get("/api/tiktok/trending/hashtags")
async def tiktok_trending_hashtags(country: str = "EG", period: str = "7",
                                   industry: str = "all", limit: int = 20,
                                   current: User = Depends(get_current_user)):
    """الهاشتاجات الرائجة على TikTok"""
    result = await get_trending_hashtags(country, period, industry, limit)
    return result


@app.get("/api/tiktok/trending/videos")
async def tiktok_trending_videos(country: str = "EG", period: str = "7",
                                 sort_by: str = "vv", limit: int = 20,
                                 current: User = Depends(get_current_user)):
    """الفيديوهات الرائجة على TikTok"""
    result = await get_trending_videos(country, period, sort_by=sort_by, limit=limit)
    return result


@app.get("/api/tiktok/ad/{material_id}")
async def tiktok_ad_analytics(material_id: str, current: User = Depends(get_current_user)):
    """تحليلات إعلان TikTok محدد"""
    result = await get_ad_analytics(material_id)
    return result


@app.get("/api/tiktok/industries")
async def tiktok_industries():
    """الصناعات المتاحة على TikTok Creative Center"""
    return get_industries()


@app.get("/api/tiktok/countries")
async def tiktok_countries():
    """الدول المدعومة"""
    return get_supported_countries()


# ==================== BRAND SENTIMENT ENGINE ====================
@app.get("/api/brand/sources")
async def get_brand_sources():
    """المصادر المتاحة لتحليل مشاعر البراند"""
    from services.brand_sentiment import get_available_sources
    return get_available_sources()


@app.get("/api/brand/{brand_name}/sentiment")
async def get_brand_sentiment(
    brand_name: str,
    sources: str = "twitter,reddit,news",
    language: str = "all",
    limit: int = 100,
    use_groq: bool = True,
    provider: str = None,
):
    """
    تحليل شامل لمشاعر البراند من مصادر متعددة

    Parameters:
    - brand_name: اسم البراند
    - sources: قائمة المصادر مفصولة بـ comma (twitter,reddit,news)
    - language: all, ar, en
    - limit: عدد النتائج لكل مصدر (max 100)
    - use_groq: استخدام Groq LLM لتحليل المشاعر
    - provider: scraper provider (firecrawl, scrapegraph, rss, google)
    """
    from services.brand_sentiment import get_brand_sentiment

    # Parse sources
    sources_list = [s.strip() for s in sources.split(",") if s.strip()]

    result = await get_brand_sentiment(
        brand=brand_name,
        sources=sources_list,
        language=language,
        limit=min(limit, 100),
        use_groq=use_groq,
        provider=provider,
    )

    return result


@app.get("/api/brand/{brand_name}/mentions")
async def get_brand_mentions(
    brand_name: str,
    sources: str = "twitter,reddit,news",
    limit: int = 50,
    provider: str = None,
):
    """الحصول على أحدث الذكريات للبراند من جميع المصادر"""
    from services.brand_sentiment import get_brand_sentiment

    sources_list = [s.strip() for s in sources.split(",") if s.strip()]

    result = await get_brand_sentiment(
        brand=brand_name,
        sources=sources_list,
        limit=min(limit, 100),
        use_groq=True,
        provider=provider,
    )

    return {
        "brand": brand_name,
        "total_mentions": result.get("total_mentions", 0),
        "sources": sources_list,
        "mentions": result.get("all_mentions", []),
    }


@app.get("/api/brand/{brand_name}/trend")
async def get_brand_trend(
    brand_name: str,
    days: int = 30,
    sources: str = "youtube,google,instagram,tiktok,twitter,reddit,news",
):
    """الحصول على اتجاه مشاعر البراند خلال فترة"""
    from services.brand_sentiment import get_brand_trend

    sources_list = [s.strip() for s in sources.split(",") if s.strip()]

    result = await get_brand_trend(
        brand=brand_name,
        days=days,
        sources=sources_list,
    )

    return result


# ==================== WEEKLY TRACKING ====================
@app.get("/api/apps/{tracked_id}/weekly")
async def get_weekly_tracking(tracked_id: int, weeks: int = 12,
                             db: Session = Depends(get_db),
                             current: User = Depends(get_current_user)):
    """تتبع أسبوعي للتحميلات"""
    app = crud.get_app_by_tracked_id(db, tracked_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    snaps = crud.get_app_snapshots(db, app.id, limit=weeks)
    
    weekly_data = []
    for snap in snaps:
        weekly_data.append({
            "date": snap.date.isoformat() if snap.date else None,
            "downloads_est": snap.downloads_est,
            "rating_avg": snap.rating_avg,
            "rating_count": snap.rating_count,
            "reviews_count": snap.reviews_count,
            "country": snap.country_code,
        })
    
    return {
        "app_id": app.id,
        "app_name": app.name,
        "store": app.store,
        "weekly_data": weekly_data,
    }
