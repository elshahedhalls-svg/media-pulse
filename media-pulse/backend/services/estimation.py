"""
Estimation Layer for Media Pulse
Budget & Impressions estimation based on CPM model per country
Disclaimer is always shown in UI
"""
from datetime import datetime

# CPM in USD per 1000 impressions – قابل للتعديل من Settings
CPM_BY_COUNTRY = {
    "EG": 1.5,
    "SA": 7.0,
    "AE": 8.0,
    "QA": 6.0,
    "KW": 6.0,
    "BH": 6.0,
    "OM": 6.0,
    "DEFAULT": 3.0,
}

# متوسط Impressions لكل إعلان في اليوم
AVG_IMPRESSIONS_PER_DAY = {
    "meta": 8000,
    "google": 6000,
    "tiktok": 12000,
}

CTR_BY_PLATFORM = {
    "meta": 0.012,
    "google": 0.025,
    "tiktok": 0.018,
}

def calculate_duration_days(start_date, end_date=None):
    if not start_date:
        return 0
    if isinstance(start_date, str):
        try:
            start_date = datetime.fromisoformat(start_date.replace("Z", ""))
        except:
            return 0
    end = end_date or datetime.utcnow()
    if isinstance(end, str):
        try:
            end = datetime.fromisoformat(end.replace("Z", ""))
        except:
            end = datetime.utcnow()
    delta = end - start_date
    return max(1, delta.days)

USD_TO_EGP = 50.5  # سعر تحويل تقديري

def estimate_budget_and_impressions(start_date, end_date, countries, platform="meta"):
    duration = calculate_duration_days(start_date, end_date)
    if duration == 0:
        duration = 7  # default week

    avg_imp = AVG_IMPRESSIONS_PER_DAY.get(platform, 8000)
    # impressions range: low 60% / high 140% of avg
    imp_low = int(duration * avg_imp * 0.6)
    imp_high = int(duration * avg_imp * 1.4)

    # CPM weighted by countries
    if not countries:
        countries = ["EG"]
    avg_cpm = sum(CPM_BY_COUNTRY.get(c, CPM_BY_COUNTRY["DEFAULT"]) for c in countries) / len(countries)

    # Spend = impressions/1000 * CPM
    # Video multiplier 1.3 – نستخدمه كـ high
    spend_low = int((imp_low / 1000) * avg_cpm)
    spend_high = int((imp_high / 1000) * avg_cpm * 1.3)

    # تعديل للـ multi-country (زيادة 20% لكل دولة إضافية)
    multiplier = 1 + (len(countries) - 1) * 0.2
    spend_low = int(spend_low * multiplier)
    spend_high = int(spend_high * multiplier)
    imp_low = int(imp_low * multiplier)
    imp_high = int(imp_high * multiplier)

    # Audience = impressions * 0.65-0.85 (unique reach)
    audience_low = int(imp_low * 0.65)
    audience_high = int(imp_high * 0.85)

    # EGP
    spend_egp_low = int(spend_low * USD_TO_EGP)
    spend_egp_high = int(spend_high * USD_TO_EGP)

    return {
        "duration_days": duration,
        "impressions_low": imp_low,
        "impressions_high": imp_high,
        "audience_low": audience_low,
        "audience_high": audience_high,
        "spend_low": spend_low,
        "spend_high": spend_high,
        "spend_egp_low": spend_egp_low,
        "spend_egp_high": spend_egp_high,
        "avg_cpm": avg_cpm,
        "is_estimated": True,
        "disclaimer": f"Estimation based on CPM model (avg ${avg_cpm}/1000) * duration {duration}d. Not official Meta data."
    }

def estimate_results(impressions_mid, platform="meta"):
    ctr = CTR_BY_PLATFORM.get(platform, 0.012)
    clicks = int(impressions_mid * ctr)
    # App download CVR 3-8%
    downloads_low = int(clicks * 0.03)
    downloads_high = int(clicks * 0.08)
    return {
        "clicks_est": clicks,
        "downloads_low": downloads_low,
        "downloads_high": downloads_high,
        "ctr": ctr
    }
