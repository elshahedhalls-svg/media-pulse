"""Tests for TikTok service functions"""
import pytest
from services.tiktok import (
    get_industries,
    get_supported_countries,
)


class TestGetIndustries:
    """Test get_industries function"""

    def test_returns_list(self):
        """Test that get_industries returns a list"""
        result = get_industries()
        assert isinstance(result, list)
        assert len(result) > 0

    def test_industry_structure(self):
        """Test that each industry has required fields"""
        result = get_industries()
        for industry in result:
            assert "key" in industry
            assert "label" in industry

    def test_all_industry_included(self):
        """Test that 'all' industry is included"""
        result = get_industries()
        keys = [i["key"] for i in result]
        assert "all" in keys


class TestGetSupportedCountries:
    """Test get_supported_countries function"""

    def test_returns_list(self):
        """Test that get_supported_countries returns a list"""
        result = get_supported_countries()
        assert isinstance(result, list)
        assert len(result) > 0

    def test_country_structure(self):
        """Test that each country has required fields"""
        result = get_supported_countries()
        for country in result:
            assert "code" in country
            assert "name" in country
            assert "name_ar" in country

    def test_egypt_included(self):
        """Test that Egypt is included"""
        result = get_supported_countries()
        codes = [c["code"] for c in result]
        assert "EG" in codes

    def test_gcc_countries_included(self):
        """Test that GCC countries are included"""
        result = get_supported_countries()
        codes = [c["code"] for c in result]
        assert "SA" in codes
        assert "AE" in codes
