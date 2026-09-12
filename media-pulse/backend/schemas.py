from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "viewer"
    allowed_features: Optional[List[str]] = []
    allowed_platforms: Optional[List[str]] = []

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    allowed_features: List[str] = []
    allowed_platforms: List[str] = []
    is_active: bool
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class BrandCreate(BaseModel):
    name: str
    category: Optional[str] = None

class AdSearchRequest(BaseModel):
    brand_name: str
    countries: List[str] = ["EG"]
    platform: str = "meta"
    use_api: bool = True
    page_name: Optional[str] = None  # بحث باسم الصفحة مباشرة
    active_only: bool = True  # الإعلانات الشغالة فعلياً فقط

class AdOut(BaseModel):
    id: int
    ad_archive_id: str
    page_name: Optional[str]
    creative_body: Optional[str]
    snapshot_url: Optional[str]
    start_date: Optional[datetime]
    duration_days: Optional[int]
    countries: List[str] = []
    platform: str
    status: str
    spend_low: Optional[int]
    spend_high: Optional[int]
    impressions_low: Optional[int]
    impressions_high: Optional[int]
    is_estimated: bool
    class Config:
        from_attributes = True

class ScrapeJobOut(BaseModel):
    id: int
    brand_name: str
    countries: Optional[str]
    platform: Optional[str]
    status: str
    results_found: int
    results_saved: int
    error_message: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class KeywordCreate(BaseModel):
    brand_name: str
    phrase: str
    language: str = "en"

class AppSearchRequest(BaseModel):
    query: str  # name or url or id
    store: Optional[str] = "play"  # play/appstore
