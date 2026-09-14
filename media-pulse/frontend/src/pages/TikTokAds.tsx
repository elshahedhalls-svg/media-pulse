import { useState, useEffect } from "react";
import { searchTikTokAds, getTikTokTrendingHashtags, getTikTokTrendingVideos, getTikTokAdAnalytics, getTikTokIndustries, getTikTokCountries } from "../api/client";
import { Search, Play, Hash, BarChart3, AlertTriangle } from "lucide-react";
import { AdSearchTab } from "../components/TikTokAds/AdSearchTab";
import { HashtagsTab } from "../components/TikTokAds/HashtagsTab";
import { VideosTab } from "../components/TikTokAds/VideosTab";
import { AnalyticsTab } from "../components/TikTokAds/AnalyticsTab";
import type { TikTokAd, TikTokHashtag, TikTokVideo, TikTokAdDetail, TikTokOption } from "../types/tiktok";

type SubTab = "search" | "hashtags" | "videos" | "analytics";

export default function TikTokAds({ t, lang }: { t: any; lang: string }) {
  const [subTab, setSubTab] = useState<SubTab>("search");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("EG");
  const [industry, setIndustry] = useState("all");
  const [period, setPeriod] = useState("7");
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("vv");

  // Data
  const [ads, setAds] = useState<TikTokAd[]>([]);
  const [hashtags, setHashtags] = useState<TikTokHashtag[]>([]);
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [adDetail, setAdDetail] = useState<TikTokAdDetail | null>(null);
  const [analyticsId, setAnalyticsId] = useState("");

  // Metadata
  const [industries, setIndustries] = useState<TikTokOption[]>([]);
  const [countries, setCountries] = useState<TikTokOption[]>([]);

  useEffect(() => {
    getTikTokIndustries().then(setIndustries).catch(() => setIndustries([]));
    getTikTokCountries().then(d => setCountries(d)).catch(() => setCountries([]));
  }, []);

  const doSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true); setError(""); setAds([]);
    try {
      const data = await searchTikTokAds(keyword, country, industry, period, limit);
      if (data.error) { setError(data.needs_cookies ? "TikTok Creative Center requires login cookies. Please paste cookies from your browser." : data.error); }
      else { setAds(data.ads || []); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const loadHashtags = async () => {
    setLoading(true); setError(""); setHashtags([]);
    try {
      const data = await getTikTokTrendingHashtags(country, period, industry, limit);
      if (data.error) { setError(data.error); }
      else { setHashtags(data.hashtags || []); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const loadVideos = async () => {
    setLoading(true); setError(""); setVideos([]);
    try {
      const data = await getTikTokTrendingVideos(country, period, sortBy, limit);
      if (data.error) { setError(data.error); }
      else { setVideos(data.videos || []); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const loadAnalytics = async () => {
    if (!analyticsId.trim()) return;
    setLoading(true); setError(""); setAdDetail(null);
    try {
      const data = await getTikTokAdAnalytics(analyticsId.trim());
      if (data.error) { setError(data.error); }
      else { setAdDetail(data); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const subTabs: { id: SubTab; icon: typeof Search; labelAr: string; labelEn: string }[] = [
    { id: "search", icon: Search, labelAr: "بحث الإعلانات", labelEn: "Ad Search" },
    { id: "hashtags", icon: Hash, labelAr: "الهاشتاجات الرائجة", labelEn: "Trending Hashtags" },
    { id: "videos", icon: Play, labelAr: "الفيديوهات الرائجة", labelEn: "Trending Videos" },
    { id: "analytics", icon: BarChart3, labelAr: "تحليل إعلان", labelEn: "Ad Analytics" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Play size={20} className="text-rose-500" />
            {lang === "ar" ? "تحليل إعلانات TikTok" : "TikTok Ads Analysis"}
          </h2>
          <p className="text-xs text-slate-500">{lang === "ar" ? "بيانات من TikTok Creative Center" : "Data from TikTok Creative Center"}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div role="tablist" aria-label={lang === "ar" ? "أقسام تيك توك" : "TikTok sections"} className="flex gap-1 mb-4 border-b border-slate-200">
        {subTabs.map(st => (
          <button
            key={st.id}
            role="tab"
            aria-selected={subTab === st.id}
            onClick={() => setSubTab(st.id)}
            className={`px-4 py-2.5 text-sm flex items-center gap-2 border-b-2 transition focus:outline-none focus:ring-2 focus:ring-rose-500 ${
              subTab === st.id
                ? "border-rose-500 text-rose-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <st.icon size={15} aria-hidden="true" />
            {lang === "ar" ? st.labelAr : st.labelEn}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* ============ SUB-TAB: AD SEARCH ============ */}
      {subTab === "search" && (
        <AdSearchTab
          keyword={keyword}
          country={country}
          industry={industry}
          period={period}
          industries={industries}
          countries={countries}
          loading={loading}
          ads={ads}
          hasError={!!error}
          lang={lang}
          onKeywordChange={setKeyword}
          onCountryChange={setCountry}
          onIndustryChange={setIndustry}
          onPeriodChange={setPeriod}
          onSearch={doSearch}
        />
      )}

      {/* ============ SUB-TAB: TRENDING HASHTAGS ============ */}
      {subTab === "hashtags" && (
        <HashtagsTab
          country={country}
          period={period}
          industry={industry}
          industries={industries}
          countries={countries}
          loading={loading}
          hashtags={hashtags}
          hasError={!!error}
          lang={lang}
          onCountryChange={setCountry}
          onPeriodChange={setPeriod}
          onIndustryChange={setIndustry}
          onLoad={loadHashtags}
        />
      )}

      {/* ============ SUB-TAB: TRENDING VIDEOS ============ */}
      {subTab === "videos" && (
        <VideosTab
          country={country}
          period={period}
          sortBy={sortBy}
          countries={countries}
          loading={loading}
          videos={videos}
          hasError={!!error}
          lang={lang}
          onCountryChange={setCountry}
          onPeriodChange={setPeriod}
          onSortChange={setSortBy}
          onLoad={loadVideos}
        />
      )}

      {/* ============ SUB-TAB: AD ANALYTICS ============ */}
      {subTab === "analytics" && (
        <AnalyticsTab
          analyticsId={analyticsId}
          loading={loading}
          adDetail={adDetail}
          hasError={!!error}
          lang={lang}
          onIdChange={setAnalyticsId}
          onAnalyze={loadAnalytics}
        />
      )}
    </div>
  );
}