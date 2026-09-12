"""Tests for correlation service functions"""
import pytest
from services.correlation import (
    pearson_correlation,
    spearman_correlation,
    detect_lag,
    compute_roi,
    compute_attribution_simple,
    align_daily_series,
)


class TestPearsonCorrelation:
    """Test Pearson correlation calculation"""

    def test_perfect_positive_correlation(self):
        """Test perfect positive correlation"""
        x = [1, 2, 3, 4, 5]
        y = [2, 4, 6, 8, 10]
        result = pearson_correlation(x, y)
        assert result["r"] == 1.0
        assert result["strength"] == "strong"

    def test_perfect_negative_correlation(self):
        """Test perfect negative correlation"""
        x = [1, 2, 3, 4, 5]
        y = [10, 8, 6, 4, 2]
        result = pearson_correlation(x, y)
        assert result["r"] == -1.0
        assert result["strength"] == "strong"

    def test_no_correlation(self):
        """Test no correlation"""
        x = [1, 2, 3, 4, 5]
        y = [3, 1, 4, 1, 5]
        result = pearson_correlation(x, y)
        assert -1 <= result["r"] <= 1
        assert result["n"] == 5

    def test_insufficient_data(self):
        """Test with insufficient data points"""
        x = [1, 2]
        y = [3, 4]
        result = pearson_correlation(x, y)
        assert result["strength"] == "insufficient"
        assert result["n"] == 2

    def test_empty_lists(self):
        """Test with empty lists"""
        result = pearson_correlation([], [])
        assert result["strength"] == "insufficient"

    def test_constant_values(self):
        """Test with constant values (no variance)"""
        x = [5, 5, 5, 5, 5]
        y = [1, 2, 3, 4, 5]
        result = pearson_correlation(x, y)
        assert result["strength"] == "no_variance"


class TestSpearmanCorrelation:
    """Test Spearman correlation calculation"""

    def test_monotonic_relationship(self):
        """Test monotonic relationship"""
        x = [1, 2, 3, 4, 5]
        y = [1, 4, 9, 16, 25]
        result = spearman_correlation(x, y)
        assert result["r"] == 1.0

    def test_insufficient_data(self):
        """Test with insufficient data"""
        x = [1, 2]
        y = [3, 4]
        result = spearman_correlation(x, y)
        assert result["strength"] == "insufficient"


class TestDetectLag:
    """Test lag detection"""

    def test_detect_lag_with_clear_pattern(self):
        """Test lag detection with clear delayed pattern"""
        spends = [100, 200, 300, 400, 500, 600]
        downloads = [10, 20, 30, 40, 50, 60]
        result = detect_lag(spends, downloads, max_lag=3)
        assert "best_lag" in result
        assert "best_r" in result
        assert "lag_correlations" in result

    def test_detect_lag_insufficient_data(self):
        """Test lag detection with insufficient data"""
        spends = [100, 200]
        downloads = [10, 20]
        result = detect_lag(spends, downloads, max_lag=3)
        assert "message" in result


class TestComputeROI:
    """Test ROI calculation"""

    def test_basic_roi(self):
        """Test basic ROI calculation"""
        result = compute_roi(ad_spend_usd=1000, downloads=100, revenue_per_download=5.0)
        assert result["total_spend_usd"] == 1000
        assert result["total_downloads"] == 100
        assert result["cac"] == 10.0
        assert result["revenue_est"] == 500.0
        assert result["roi_pct"] == -50.0

    def test_roi_with_zero_downloads(self):
        """Test ROI with zero downloads"""
        result = compute_roi(ad_spend_usd=1000, downloads=0)
        assert result["cac"] == float('inf')

    def test_roi_with_zero_spend(self):
        """Test ROI with zero spend"""
        result = compute_roi(ad_spend_usd=0, downloads=100)
        assert result["roi_pct"] == 0

    def test_positive_roi(self):
        """Test positive ROI scenario"""
        result = compute_roi(ad_spend_usd=1000, downloads=100, revenue_per_download=20.0)
        assert result["roi_pct"] == 100.0


class TestComputeAttributionSimple:
    """Test simple attribution calculation"""

    def test_last_click_attribution(self):
        """Test last click attribution model"""
        ads = [
            {"date": "2024-01-01", "ad_archive_id": "ad1", "page_name": "Page1", "spend_usd": 100},
            {"date": "2024-01-03", "ad_archive_id": "ad2", "page_name": "Page2", "spend_usd": 200},
        ]
        installs = [
            {"date": "2024-01-05", "country": "EG", "downloads_est": 10},
        ]
        result = compute_attribution_simple(ads, installs, window_days=7, model="last_click")
        assert result["model"] == "last_click"
        assert result["total_attributed_installs"] == 1

    def test_linear_attribution(self):
        """Test linear attribution model"""
        ads = [
            {"date": "2024-01-01", "ad_archive_id": "ad1", "page_name": "Page1", "spend_usd": 100},
            {"date": "2024-01-03", "ad_archive_id": "ad2", "page_name": "Page2", "spend_usd": 200},
        ]
        installs = [
            {"date": "2024-01-05", "country": "EG", "downloads_est": 10},
        ]
        result = compute_attribution_simple(ads, installs, window_days=7, model="linear")
        assert result["model"] == "linear"

    def test_empty_data(self):
        """Test with empty data"""
        result = compute_attribution_simple([], [])
        assert result["total_attributed"] == 0
        assert result["total_spend"] == 0


class TestAlignDailySeries:
    """Test daily series alignment"""

    def test_basic_alignment(self):
        """Test basic alignment of ad and app data"""
        ad_data = [
            {"start_date": "2024-01-01", "end_date": "2024-01-03", "spend_low": 100, "spend_high": 200, "countries": ["EG"]},
        ]
        app_data = [
            {"date": "2024-01-01", "downloads_est": 10, "country": "EG"},
            {"date": "2024-01-02", "downloads_est": 15, "country": "EG"},
            {"date": "2024-01-03", "downloads_est": 20, "country": "EG"},
        ]
        dates, spends, downloads = align_daily_series(ad_data, app_data)
        assert len(dates) == 3
        assert len(spends) == 3
        assert len(downloads) == 3

    def test_alignment_with_country_filter(self):
        """Test alignment with country filter"""
        ad_data = [
            {"start_date": "2024-01-01", "end_date": "2024-01-01", "spend_low": 100, "spend_high": 200, "countries": ["EG"]},
        ]
        app_data = [
            {"date": "2024-01-01", "downloads_est": 10, "country": "EG"},
            {"date": "2024-01-01", "downloads_est": 5, "country": "SA"},
        ]
        dates, spends, downloads = align_daily_series(ad_data, app_data, country="EG")
        assert downloads[0] == 10

    def test_empty_data(self):
        """Test with empty data"""
        dates, spends, downloads = align_daily_series([], [])
        assert dates == []
        assert spends == []
        assert downloads == []
