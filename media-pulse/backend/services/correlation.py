"""
Correlation Engine — الربط بين إنفاق الإعلانات والتحميلات
يربط بيانات Meta Ads (spend) مع App Store downloads لحساب ROI و Attribution
"""
import math
from datetime import datetime, timedelta
from typing import Optional
from collections import OrderedDict


def pearson_correlation(x: list[float], y: list[float]) -> dict:
    """حساب معامل ارتباط بيرسون — من -1 إلى 1"""
    n = len(x)
    if n < 3:
        return {"r": 0, "p_value": 1, "n": n, "strength": "insufficient"}

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    ss_x = sum((xi - mean_x) ** 2 for xi in x)
    ss_y = sum((yi - mean_y) ** 2 for yi in y)
    ss_xy = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))

    if ss_x == 0 or ss_y == 0:
        return {"r": 0, "p_value": 1, "n": n, "strength": "no_variance"}

    r = ss_xy / math.sqrt(ss_x * ss_y)
    r = max(-1, min(1, r))  # clamp

    # p-value approximation using t-distribution
    if abs(r) >= 1:
        p_value = 0.0
    else:
        t_stat = r * math.sqrt((n - 2) / (1 - r ** 2))
        # Simple approximation for p-value
        df = n - 2
        p_value = _t_to_p(t_stat, df)

    strength = _classify_correlation(r)

    return {
        "r": round(r, 4),
        "p_value": round(p_value, 4),
        "n": n,
        "strength": strength,
        "significant": p_value < 0.05,
    }


def spearman_correlation(x: list[float], y: list[float]) -> dict:
    """حساب معامل ارتباط سبيرمان (rank-based)"""
    n = len(x)
    if n < 3:
        return {"rho": 0, "p_value": 1, "n": n, "strength": "insufficient"}

    rank_x = _rank(x)
    rank_y = _rank(y)

    return pearson_correlation(rank_x, rank_y)


def detect_lag(spends: list[float], downloads: list[float], max_lag: int = 14) -> dict:
    """
    كشف التأخير الأمثل بين الإنفاق والتحميلات
    يجرب lags من 0 إلى max_lag يوم ويحسب最强 correlation
    """
    if len(spends) < 7:
        return {"best_lag": 0, "best_r": 0, "lag_correlations": [], "message": "Insufficient data"}

    results = []
    for lag in range(0, max_lag + 1):
        if lag == 0:
            s = spends
            d = downloads
        else:
            s = spends[:-lag] if lag < len(spends) else []
            d = downloads[lag:] if lag < len(downloads) else []

        if len(s) < 3:
            continue

        corr = pearson_correlation(s, d)
        results.append({
            "lag_days": lag,
            "r": corr["r"],
            "p_value": corr["p_value"],
            "significant": corr["significant"],
        })

    if not results:
        return {"best_lag": 0, "best_r": 0, "lag_correlations": [], "message": "No valid lags"}

    best = max(results, key=lambda x: abs(x["r"]))
    return {
        "best_lag": best["lag_days"],
        "best_r": best["r"],
        "best_p_value": best["p_value"],
        "lag_correlations": results,
        "insight": _lag_insight(best["lag_days"], best["r"]),
    }


def compute_roi(ad_spend_usd: float, downloads: int, revenue_per_download: float = 0.0) -> dict:
    """حساب ROI الأساسي"""
    cac = ad_spend_usd / downloads if downloads > 0 else float('inf')
    revenue = downloads * revenue_per_download
    roi = ((revenue - ad_spend_usd) / ad_spend_usd * 100) if ad_spend_usd > 0 else 0

    return {
        "total_spend_usd": round(ad_spend_usd, 2),
        "total_downloads": downloads,
        "cac": round(cac, 2),
        "revenue_est": round(revenue, 2),
        "roi_pct": round(roi, 1),
    }


def compute_attribution_simple(
    ads: list[dict],
    installs: list[dict],
    window_days: int = 7,
    model: str = "last_click"
) -> dict:
    """
    نموذج Attribution بسيط
    models: last_click, linear, time_decay
    """
    if not ads or not installs:
        return {"attributions": [], "total_attributed": 0, "total_spend": 0}

    # Sort by date
    ads_sorted = sorted(ads, key=lambda x: x.get("date", ""))
    installs_sorted = sorted(installs, key=lambda x: x.get("date", ""))

    attributions = []
    for install in installs_sorted:
        install_date = _parse_date(install.get("date", ""))
        if not install_date:
            continue

        # Find ads within window
        relevant_ads = []
        for ad in ads_sorted:
            ad_date = _parse_date(ad.get("date", ""))
            if not ad_date:
                continue
            delta = (install_date - ad_date).days
            if 0 <= delta <= window_days:
                relevant_ads.append({**ad, "days_before": delta})

        if not relevant_ads:
            continue

        # Apply attribution model
        if model == "last_click":
            # Most recent ad gets full credit
            best_ad = max(relevant_ads, key=lambda x: x["days_before"])
            best_ad["attribution_weight"] = 1.0
            attributions.append({
                "install_date": install.get("date"),
                "install_country": install.get("country"),
                "ad_archive_id": best_ad.get("ad_archive_id"),
                "page_name": best_ad.get("page_name"),
                "days_before": best_ad["days_before"],
                "spend_attributed": best_ad.get("spend_usd", 0),
                "model": model,
            })

        elif model == "linear":
            # Equal credit to all ads in window
            weight = 1.0 / len(relevant_ads)
            for ad in relevant_ads:
                ad["attribution_weight"] = weight
                attributions.append({
                    "install_date": install.get("date"),
                    "install_country": install.get("country"),
                    "ad_archive_id": ad.get("ad_archive_id"),
                    "page_name": ad.get("page_name"),
                    "days_before": ad["days_before"],
                    "spend_attributed": ad.get("spend_usd", 0) * weight,
                    "model": model,
                })

        elif model == "time_decay":
            # More recent ads get more credit (exponential decay)
            total_weight = sum(math.exp(-0.3 * ad["days_before"]) for ad in relevant_ads)
            for ad in relevant_ads:
                weight = math.exp(-0.3 * ad["days_before"]) / total_weight
                ad["attribution_weight"] = weight
                attributions.append({
                    "install_date": install.get("date"),
                    "install_country": install.get("country"),
                    "ad_archive_id": ad.get("ad_archive_id"),
                    "page_name": ad.get("page_name"),
                    "days_before": ad["days_before"],
                    "spend_attributed": ad.get("spend_usd", 0) * weight,
                    "model": model,
                })

    total_spend = sum(a.get("spend_attributed", 0) for a in attributions)
    return {
        "model": model,
        "window_days": window_days,
        "total_attributed_installs": len(set(a["install_date"] for a in attributions)),
        "total_spend_attributed": round(total_spend, 2),
        "attributions": attributions[:100],  # Limit for response size
    }


def align_daily_series(
    ad_data: list[dict],
    app_data: list[dict],
    country: str = None,
) -> tuple[list[str], list[float], list[float]]:
    """
    محاذاة بيانات الإعلانات والتطبيقات يوم بيوم
    يرجع: (dates, spends, downloads)
    """
    # Build daily spend map
    daily_spend = OrderedDict()
    for ad in ad_data:
        if country and country not in (ad.get("countries") or []):
            continue
        start = _parse_date(ad.get("start_date"))
        end = _parse_date(ad.get("end_date")) or datetime.utcnow()
        if not start:
            continue

        duration = max(1, (end - start).days)
        daily = (ad.get("spend_low", 0) + ad.get("spend_high", 0)) / 2 / duration

        # Distribute across days
        current = start
        while current <= end:
            key = current.strftime("%Y-%m-%d")
            daily_spend[key] = daily_spend.get(key, 0) + daily
            current += timedelta(days=1)

    # Build daily downloads map
    daily_downloads = OrderedDict()
    for snap in app_data:
        if country and snap.get("country") != country:
            continue
        date_str = snap.get("date")
        if not date_str:
            continue
        key = date_str[:10] if isinstance(date_str, str) else date_str.strftime("%Y-%m-%d")
        daily_downloads[key] = daily_downloads.get(key, 0) + (snap.get("downloads_est") or 0)

    # Align on common dates
    all_dates = sorted(set(list(daily_spend.keys()) + list(daily_downloads.keys())))
    spends = [daily_spend.get(d, 0) for d in all_dates]
    downloads = [daily_downloads.get(d, 0) for d in all_dates]

    return all_dates, spends, downloads


def _rank(values: list[float]) -> list[float]:
    """حساب الـ ranks لمصفوفة"""
    sorted_vals = sorted(enumerate(values), key=lambda x: x[1])
    ranks = [0.0] * len(values)
    for rank, (idx, _) in enumerate(sorted_vals, 1):
        ranks[idx] = float(rank)
    return ranks


def _t_to_p(t: float, df: int) -> float:
    """تقريب p-value من t-statistic (لـ df > 2)"""
    x = df / (df + t ** 2)
    if x >= 1:
        return 1.0
    if x <= 0:
        return 0.0
    # Simple approximation
    p = 0.5 * x ** (df / 2)
    return min(1.0, max(0.0, p * 2))


def _classify_correlation(r: float) -> str:
    """تصنيف قوة الارتباط"""
    abs_r = abs(r)
    if abs_r >= 0.7:
        return "strong"
    elif abs_r >= 0.4:
        return "moderate"
    elif abs_r >= 0.2:
        return "weak"
    else:
        return "negligible"


def _lag_insight(lag_days: int, r: float) -> str:
    """نصيحة بناءً على التأخير"""
    abs_r = abs(r)
    direction = "positive" if r > 0 else "negative"

    if lag_days == 0:
        return f"Strong {direction} correlation on same day. Ad spend immediately impacts downloads."
    elif lag_days <= 3:
        return f"Optimal lag is {lag_days} day(s). Ads take {lag_days} day(s) to impact downloads ({direction} correlation)."
    elif lag_days <= 7:
        return f"Optimal lag is {lag_days} days. Ad effect takes ~1 week to materialize ({direction} correlation)."
    else:
        return f"Optimal lag is {lag_days} days. Long delay between ad spend and download response ({direction} correlation)."


def _parse_date(date_str) -> Optional[datetime]:
    """تحويل تاريخ إلى datetime"""
    if not date_str:
        return None
    if isinstance(date_str, datetime):
        return date_str
    try:
        return datetime.fromisoformat(str(date_str).replace("Z", "+00:00").replace("+00:00", ""))
    except:
        try:
            return datetime.strptime(str(date_str)[:10], "%Y-%m-%d")
        except:
            return None
