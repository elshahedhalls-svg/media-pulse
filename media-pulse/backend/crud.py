from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime, timedelta
from models import Region, Country, Brand, Ad, User, UserRole, ScrapeJob, ScrapeStatus, Keyword, Settings, AppTracked, AppSnapshot
from data.regions import MENA_REGIONS
from services.auth import hash_password
import json

# --- Init ---
def init_db(db: Session):
    # Regions & Countries
    if db.query(Region).count() == 0:
        for r in MENA_REGIONS:
            region = Region(name=r["name"], code=r["code"], name_ar=r.get("name_ar"), is_mena=r.get("is_mena", False))
            db.add(region)
            db.commit()
            db.refresh(region)
            for c in r.get("countries", []):
                country = Country(name=c["name"], code=c["code"], name_ar=c.get("name_ar"), region_id=region.id, is_mena=True, arabic_speaking=c.get("arabic_speaking", True))
                db.add(country)
            db.commit()
    # Users (5 default)
    if db.query(User).count() == 0:
        defaults = [
            ("admin1", "Admin123!", "admin"),
            ("admin2", "Admin123!", "admin"),
            ("analyst1", "Analyst123!", "analyst"),
            ("viewer1", "Viewer123!", "viewer"),
            ("viewer2", "Viewer123!", "viewer"),
        ]
        for uname, pwd, role in defaults:
            u = User(username=uname, password_hash=hash_password(pwd), role=UserRole(role), allowed_features=["ads","app","social","correlation"], allowed_platforms=["meta","google","tiktok"])
            db.add(u)
        db.commit()

def get_or_create_brand(db: Session, name: str, category=None, user_id=None):
    brand = db.query(Brand).filter(func.lower(Brand.name) == name.lower()).first()
    if not brand:
        brand = Brand(name=name, category=category, created_by=user_id)
        db.add(brand)
        db.commit()
        db.refresh(brand)
    return brand

# --- Ads ---
def save_ads(db: Session, brand_name: str, ads_data: list):
    brand = get_or_create_brand(db, brand_name)
    saved = 0
    for ad in ads_data:
        existing = db.query(Ad).filter(Ad.ad_archive_id == ad["ad_archive_id"]).first()
        if existing:
            # update
            for k, v in ad.items():
                if k in ["start_date","end_date"]:
                    try:
                        v = datetime.fromisoformat(v.replace("Z","+00:00")) if isinstance(v, str) and v else None
                    except: v = None
                if hasattr(existing, k):
                    setattr(existing, k, v)
            db.commit()
        else:
            # convert dates
            start = ad.get("start_date")
            end = ad.get("end_date")
            try: start = datetime.fromisoformat(start.replace("Z","+00:00")) if isinstance(start, str) and start else start
            except: start = None
            try: end = datetime.fromisoformat(end.replace("Z","+00:00")) if isinstance(end, str) and end else end
            except: end = None
            db_ad = Ad(
                ad_archive_id=ad["ad_archive_id"],
                brand_id=brand.id,
                page_name=ad.get("page_name"),
                page_id=ad.get("page_id"),
                creative_body=ad.get("creative_body"),
                creative_link_title=ad.get("creative_link_title"),
                creative_link_caption=ad.get("creative_link_caption"),
                snapshot_url=ad.get("snapshot_url"),
                start_date=start,
                end_date=end,
                duration_days=ad.get("duration_days"),
                countries=ad.get("countries"),
                platform=ad.get("platform","meta"),
                status=ad.get("status","active"),
                spend_low=ad.get("spend_low"),
                spend_high=ad.get("spend_high"),
                impressions_low=ad.get("impressions_low"),
                impressions_high=ad.get("impressions_high"),
                is_estimated=ad.get("is_estimated", True),
                real_spend=ad.get("real_spend"),
                real_impressions=ad.get("real_impressions"),
                raw_data=ad.get("raw_data"),
            )
            db.add(db_ad)
            saved += 1
    db.commit()
    return saved

def get_ads(db: Session, brand_name=None, countries=None, platform=None, page_name=None, limit=50):
    q = db.query(Ad).join(Brand)
    if brand_name:
        q = q.filter(func.lower(Brand.name) == brand_name.lower())
    if platform:
        q = q.filter(Ad.platform == platform)
    if page_name:
        q = q.filter(func.lower(Ad.page_name).contains(page_name.lower()))
    # countries filter: JSON contains
    # For SQLite JSON, do simple Python filter after query
    ads = q.order_by(Ad.scraped_at.desc()).limit(limit*3).all()
    if countries:
        filtered = []
        for ad in ads:
            ad_countries = ad.countries or []
            if any(c in ad_countries for c in countries):
                filtered.append(ad)
        ads = filtered[:limit]
    else:
        ads = ads[:limit]
    return ads

# --- Scrape Jobs ---
def create_job(db: Session, brand_name, countries, platform, job_type="ads", user_id=None):
    job = ScrapeJob(brand_name=brand_name, countries=",".join(countries) if countries else None, platform=platform, job_type=job_type, status=ScrapeStatus.PENDING, requested_by=user_id)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

def update_job(db: Session, job_id, **kwargs):
    job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
    if job:
        for k,v in kwargs.items():
            setattr(job, k, v)
        db.commit()
        db.refresh(job)
    return job

def get_jobs(db: Session, limit=20):
    return db.query(ScrapeJob).order_by(ScrapeJob.created_at.desc()).limit(limit).all()
def search_pages(db: Session, query: str, limit: int = 10):
    # Search distinct page names containing query (case-insensitive, supports Arabic)
    from sqlalchemy import func
    # Get distinct page names with count
    rows = db.query(Ad.page_name, func.count(Ad.id).label("cnt"))\
        .filter(Ad.page_name.ilike(f"%{query}%"))\
        .group_by(Ad.page_name)\
        .order_by(func.count(Ad.id).desc())\
        .limit(limit).all()
    result = []
    for name, cnt in rows:
        if not name:
            continue
        # Get one example ad for preview
        example = db.query(Ad).filter(Ad.page_name == name).first()
        result.append({
            "page_name": name,
            "ads_count": cnt,
            "example_creative": (example.creative_body[:80] + "...") if example and example.creative_body else "",
            "countries": example.countries if example else []
        })
    # If no results in DB, still suggest the typed query as a page to search via scraping
    if not result:
        result.append({
            "page_name": query,
            "ads_count": 0,
            "example_creative": f"ابحث عن صفحة '{query}' عبر Scraping (سيجلب إعلاناتها مباشرة)",
            "countries": [],
            "is_new": True
        })
    return result

def get_countries(db: Session):
    return db.query(Country).all()


def get_regions(db: Session):
    return db.query(Region).all()

# --- App Tracking ---
def get_or_create_app(db: Session, app_id: str, name: str, store: str,
                       icon_url: str = None, url: str = None, category: str = None,
                       developer: str = None) -> AppTracked:
    app = db.query(AppTracked).filter(AppTracked.app_id == app_id).first()
    if app:
        app.name = name or app.name
        app.icon_url = icon_url or app.icon_url
        app.url = url or app.url
        db.commit()
        db.refresh(app)
        return app
    app = AppTracked(
        store=store,
        app_id=app_id,
        name=name,
        icon_url=icon_url,
        url=url,
        category=category,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app

def get_tracked_apps(db: Session, country: str = None) -> list:
    apps = db.query(AppTracked).order_by(AppTracked.created_at.desc()).all()
    result = []
    for app in apps:
        latest = None
        q = db.query(AppSnapshot).filter(AppSnapshot.app_id == app.id)
        if country:
            q = q.filter(AppSnapshot.country_code == country)
        latest = q.order_by(AppSnapshot.date.desc()).first()
        result.append({
            "id": app.id,
            "app_id": app.app_id,
            "name": app.name,
            "store": app.store,
            "icon_url": app.icon_url,
            "url": app.url,
            "category": app.category,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "latest_snapshot": {
                "downloads_est": latest.downloads_est,
                "installs_exact": latest.installs_exact,
                "installs_display": latest.installs_display,
                "installs_bucket_min": latest.installs_bucket_min,
                "rating_avg": latest.rating_avg,
                "rating_count": latest.rating_count,
                "reviews_count": latest.reviews_count,
                "daily_downloads": latest.daily_downloads,
                "daily_growth_pct": latest.daily_growth_pct,
                "new_ratings": latest.new_ratings,
                "downloads_est_low": latest.downloads_est_low,
                "downloads_est_high": latest.downloads_est_high,
                "star_distribution": latest.star_distribution,
                "developer": latest.developer,
                "category": latest.category,
                "version": latest.version or (latest.raw_data.get("version") if latest and latest.raw_data else None),
                "last_updated": latest.last_updated,
                "country": latest.country_code,
                "date": latest.date.isoformat() if latest and latest.date else None,
            } if latest else None,
        })
    return result

def save_app_snapshot(db: Session, app_tracked_id: int, data: dict, country: str) -> AppSnapshot:
    """Save app snapshot with exact install data from google-play-scraper"""
    # Get previous snapshot for daily delta calculation
    prev_snapshot = (
        db.query(AppSnapshot)
        .filter(AppSnapshot.app_id == app_tracked_id)
        .order_by(AppSnapshot.date.desc())
        .first()
    )
    
    # Calculate exact installs
    installs_exact = data.get("installs_exact") or data.get("installs", {}).get("estimated_exact") or data.get("installs", {}).get("min")
    installs_display = data.get("installs_display") or data.get("installs", {}).get("label", "N/A")
    installs_bucket_min = data.get("installs_bucket_min") or data.get("installs", {}).get("min", 0)
    
    # Calculate daily delta
    daily_downloads = None
    daily_growth_pct = None
    if prev_snapshot and prev_snapshot.installs_exact and installs_exact:
        daily_downloads = installs_exact - prev_snapshot.installs_exact
        if prev_snapshot.installs_exact > 0:
            daily_growth_pct = round((daily_downloads / prev_snapshot.installs_exact) * 100, 2)
    
    # reviews_count = عدد المراجعات الفعلية إن وجد، وإلا rating_count (إجمالي التقييمات)
    fetched_reviews = len(data.get("reviews", []))
    total_reviews = data.get("rating_count") or 0

    # سرعة التقييمات + نطاق تقدير التحميلات (لـ App Store — آبل لا تنشر التحميلات)
    # نسبة التقييم/تحميل المتعارف عليها 2-5% → مضاعف 20x..50x
    new_ratings = None
    downloads_est_low = None
    downloads_est_high = None
    try:
        parent_store = db.query(AppTracked).filter(AppTracked.id == app_tracked_id).first()
        is_appstore = parent_store is not None and parent_store.store == "appstore"
    except Exception:
        is_appstore = False
    if is_appstore and total_reviews:
        downloads_est_low = int(total_reviews * 20)
        downloads_est_high = int(total_reviews * 50)
        prev_same_country = (
            db.query(AppSnapshot)
            .filter(AppSnapshot.app_id == app_tracked_id, AppSnapshot.country_code == country)
            .order_by(AppSnapshot.date.desc())
            .first()
        )
        if prev_same_country and prev_same_country.rating_count is not None:
            delta = total_reviews - prev_same_country.rating_count
            new_ratings = delta if delta >= 0 else None

    snap = AppSnapshot(
        app_id=app_tracked_id,
        downloads_est=installs_exact,  # backwards compat
        installs_exact=installs_exact,
        installs_display=installs_display,
        installs_bucket_min=installs_bucket_min,
        rating_avg=data.get("rating_avg"),
        rating_count=total_reviews,
        reviews_count=fetched_reviews if fetched_reviews > 0 else total_reviews,
        star_distribution=data.get("star_distribution"),
        daily_downloads=daily_downloads,
        daily_growth_pct=daily_growth_pct,
        new_ratings=new_ratings,
        downloads_est_low=downloads_est_low,
        downloads_est_high=downloads_est_high,
        version=data.get("version"),
        last_updated=data.get("last_updated"),
        developer=data.get("developer"),
        category=data.get("category"),
        is_free=data.get("is_free"),
        offers_iap=data.get("offers_iap"),
        ad_supported=data.get("ad_supported"),
        country_code=country,
        raw_data=data,
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    # Backfill parent app metadata from fresh details (search results carry
    # no icon for Play, so without this the icon stays NULL forever).
    try:
        parent = db.query(AppTracked).filter(AppTracked.id == app_tracked_id).first()
        if parent:
            changed = False
            if not parent.icon_url and data.get("icon_url"):
                parent.icon_url = data["icon_url"]
                changed = True
            if not parent.url and data.get("url"):
                parent.url = data["url"]
                changed = True
            if not parent.category and data.get("category"):
                parent.category = data["category"]
                changed = True
            if changed:
                db.commit()
                db.refresh(parent)
    except Exception as e:
        print(f"[Snapshot] parent backfill failed for {app_tracked_id}: {e}")
    return snap

def get_app_snapshots(db: Session, app_tracked_id: int, country: str = None, limit: int = 50) -> list:
    q = db.query(AppSnapshot).filter(AppSnapshot.app_id == app_tracked_id)
    if country:
        q = q.filter(AppSnapshot.country_code == country)
    return q.order_by(AppSnapshot.date.asc()).limit(limit).all()

def get_app_by_tracked_id(db: Session, tracked_id: int) -> AppTracked:
    return db.query(AppTracked).filter(AppTracked.id == tracked_id).first()

def delete_app(db: Session, tracked_id: int) -> bool:
    app = db.query(AppTracked).filter(AppTracked.id == tracked_id).first()
    if not app:
        return False
    db.delete(app)
    db.commit()
    return True
