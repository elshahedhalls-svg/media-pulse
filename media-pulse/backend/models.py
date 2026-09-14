from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SAEnum, Boolean, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum

from database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"

class ScrapeStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class AdPlatform(str, enum.Enum):
    META = "meta"
    GOOGLE = "google"
    TIKTOK = "tiktok"

# --- Users ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.VIEWER)
    allowed_features = Column(JSON, default=list)  # ["ads","app","social","correlation"]
    allowed_platforms = Column(JSON, default=list) # ["meta","google","tiktok"]
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

# --- Regions & Countries (EG + GCC) ---
class Region(Base):
    __tablename__ = "regions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)
    name_ar = Column(String, nullable=True)
    is_mena = Column(Boolean, default=False)
    countries = relationship("Country", back_populates="region")

class Country(Base):
    __tablename__ = "countries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    code = Column(String(5), unique=True, nullable=False, index=True)
    name_ar = Column(String, nullable=True)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)
    is_mena = Column(Boolean, default=False)
    arabic_speaking = Column(Boolean, default=True)
    region = relationship("Region", back_populates="countries")

# --- Brands ---
class Brand(Base):
    __tablename__ = "brands"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    category = Column(String(50), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    creator = relationship("User")
    ads = relationship("Ad", back_populates="brand", cascade="all, delete-orphan")
    keywords = relationship("Keyword", back_populates="brand", cascade="all, delete-orphan")

class Keyword(Base):
    __tablename__ = "keywords"
    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False)
    phrase = Column(String, nullable=False)
    language = Column(String, default="en")
    is_auto_generated = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    brand = relationship("Brand", back_populates="keywords")

# --- Ads (Meta + Google + TikTok) ---
class Ad(Base):
    __tablename__ = "ads"
    id = Column(Integer, primary_key=True, index=True)
    ad_archive_id = Column(String(255), unique=True, nullable=False, index=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False)
    page_name = Column(String(255), nullable=True)
    page_id = Column(String(255), nullable=True)
    creative_body = Column(Text, nullable=True)
    creative_link_title = Column(String(500), nullable=True)
    creative_link_caption = Column(String(500), nullable=True)
    snapshot_url = Column(Text, nullable=True)  # live fetch, not stored image
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    duration_days = Column(Integer, nullable=True)
    countries = Column(JSON, default=list)  # ["EG","SA"]
    platform = Column(SAEnum(AdPlatform), default=AdPlatform.META)
    status = Column(String(20), default="active")  # active/inactive
    # Estimation fields
    impressions_low = Column(Integer, nullable=True)
    impressions_high = Column(Integer, nullable=True)
    spend_low = Column(Integer, nullable=True)  # in USD cents or USD
    spend_high = Column(Integer, nullable=True)
    is_estimated = Column(Boolean, default=True)
    # Real data if available from API
    real_impressions = Column(String(50), nullable=True)
    real_spend = Column(String(50), nullable=True)
    raw_data = Column(JSON, nullable=True)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    brand = relationship("Brand", back_populates="ads")

# --- App Tracking ---
class AppTracked(Base):
    __tablename__ = "apps_tracked"
    id = Column(Integer, primary_key=True, index=True)
    store = Column(String(20), nullable=False)  # play/appstore
    app_id = Column(String(100), unique=True, nullable=False, index=True)  # package or apple id
    name = Column(String(255), nullable=False)
    url = Column(Text, nullable=True)
    icon_url = Column(Text, nullable=True)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    snapshots = relationship("AppSnapshot", back_populates="app", cascade="all, delete-orphan")

class AppSnapshot(Base):
    __tablename__ = "app_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    app_id = Column(Integer, ForeignKey("apps_tracked.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Download data
    downloads_est = Column(Integer, nullable=True)
    installs_exact = Column(Integer, nullable=True)      # realInstalls value
    installs_display = Column(String(50), nullable=True)  # "500,000+"
    installs_bucket_min = Column(Integer, nullable=True)  # minInstalls
    
    # Reviews & Ratings
    reviews_count = Column(Integer, nullable=True)
    rating_avg = Column(Float, nullable=True)
    rating_count = Column(Integer, nullable=True)
    star_distribution = Column(JSON, nullable=True)       # [321, 37, 46, 84, 455]
    
    # Growth metrics (computed)
    daily_downloads = Column(Integer, nullable=True)      # installs[today] - installs[yesterday]
    daily_growth_pct = Column(Float, nullable=True)       # (daily_downloads / yesterday) * 100
    new_ratings = Column(Integer, nullable=True)          # rating_count[today] - rating_count[prev] (same country)
    downloads_est_low = Column(Integer, nullable=True)    # lifetime estimate low (appstore: rating_count * 20)
    downloads_est_high = Column(Integer, nullable=True)   # lifetime estimate high (appstore: rating_count * 50)
    
    # App metadata
    version = Column(String(50), nullable=True)
    last_updated = Column(String(100), nullable=True)
    developer = Column(String(255), nullable=True)
    category = Column(String(100), nullable=True)
    
    # Monetization
    revenue_est = Column(Integer, nullable=True)
    is_free = Column(Boolean, nullable=True)
    offers_iap = Column(Boolean, nullable=True)
    ad_supported = Column(Boolean, nullable=True)
    
    # Location
    country_code = Column(String(5), nullable=True)
    
    # Raw data
    raw_data = Column(JSON, nullable=True)
    
    app = relationship("AppTracked", back_populates="snapshots")

# --- Scrape Jobs (On-Demand) ---
class ScrapeJob(Base):
    __tablename__ = "scrape_jobs"
    id = Column(Integer, primary_key=True, index=True)
    brand_name = Column(String(100), nullable=False)
    countries = Column(String(255), nullable=True)  # comma separated
    platform = Column(String(50), nullable=True)  # meta/google/tiktok/app/social
    job_type = Column(String(20), default="ads")  # ads/app/social
    status = Column(SAEnum(ScrapeStatus), default=ScrapeStatus.PENDING)
    results_found = Column(Integer, default=0)
    results_saved = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Settings(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=False)
