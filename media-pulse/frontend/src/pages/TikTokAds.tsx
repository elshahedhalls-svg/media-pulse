import { useState, useEffect } from "react";
import { searchTikTokAds, getTikTokTrendingHashtags, getTikTokTrendingVideos, getTikTokAdAnalytics, getTikTokIndustries, getTikTokCountries } from "../api/client";
import { Search, Play, Hash, BarChart3, RefreshCw, ExternalLink, AlertTriangle, Filter, TrendingUp, Eye, Heart, MessageCircle, Share2, Clock } from "lucide-react";

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
  const [ads, setAds] = useState<any[]>([]);
  const [hashtags, setHashtags] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [adDetail, setAdDetail] = useState<any>(null);
  const [analyticsId, setAnalyticsId] = useState("");

  // Metadata
  const [industries, setIndustries] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);

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

  const formatNum = (n: number) => n?.toLocaleString() || "0";

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
      <div role="tablist" className="flex gap-1 mb-4 border-b border-slate-200">
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
            <st.icon size={15} />
            {lang === "ar" ? st.labelAr : st.labelEn}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* ============ SUB-TAB: AD SEARCH ============ */}
      {subTab === "search" && (
        <div>
          <div className="bg-white border rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "كلمة البحث" : "Search Keyword"}</label>
                <div className="flex gap-2">
                  <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && doSearch()}
                    placeholder={lang === "ar" ? "مثال: Vodafone, اتصالات..." : "e.g. Vodafone, Etisalat..."}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
                  />
                  <button onClick={doSearch} disabled={loading} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50">
                    <Search size={16} />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "الدولة" : "Country"}</label>
                <select value={country} onChange={e => setCountry(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {countries.map((c: any) => <option key={c.code} value={c.code}>{lang === "ar" ? c.name_ar : c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "الصناعة" : "Industry"}</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {industries.map((ind: any) => <option key={ind.key} value={ind.key}>{ind.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "الفترة" : "Period"}</label>
                <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="7">{lang === "ar" ? "7 أيام" : "7 days"}</option>
                  <option value="30">{lang === "ar" ? "30 يوم" : "30 days"}</option>
                  <option value="90">{lang === "ar" ? "90 يوم" : "90 days"}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          )}
          {!loading && ads.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ads.map((ad, i) => (
                <div key={i} className="bg-white border rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{ad.brand || "Unknown"}</p>
                      <p className="text-xs text-slate-500 truncate">{ad.title || "No title"}</p>
                    </div>
                    {ad.video_url && (
                      <a href={ad.video_url} target="_blank" rel="noopener" className="p-1 text-rose-400 hover:text-rose-600">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><Heart size={12} className="text-rose-400" />{formatNum(ad.likes)}</span>
                    <span className="flex items-center gap-1"><Eye size={12} className="text-blue-400" />{ad.ctr ? `${(ad.ctr * 100).toFixed(1)}%` : "—"}</span>
                    <span className="flex items-center gap-1"><BarChart3 size={12} className="text-emerald-400" />{ad.cost ? `$${ad.cost.toFixed(2)}` : "—"}</span>
                  </div>
                  {ad.cover_url && (
                    <img src={ad.cover_url} alt="" className="mt-2 w-full h-32 object-cover rounded-lg" />
                  )}
                </div>
              ))}
            </div>
          )}
          {!loading && ads.length === 0 && !error && (
            <div className="text-center py-12 text-slate-400 text-sm">
              {lang === "ar" ? "ابدأ البحث عن إعلانات TikTok" : "Search for TikTok ads to get started"}
            </div>
          )}
        </div>
      )}

      {/* ============ SUB-TAB: TRENDING HASHTAGS ============ */}
      {subTab === "hashtags" && (
        <div>
          <div className="bg-white border rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "الدولة" : "Country"}</label>
                <select value={country} onChange={e => setCountry(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {countries.map((c: any) => <option key={c.code} value={c.code}>{lang === "ar" ? c.name_ar : c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "الفترة" : "Period"}</label>
                <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="7">7 {lang === "ar" ? "أيام" : "days"}</option>
                  <option value="30">30 {lang === "ar" ? "يوم" : "days"}</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "الصناعة" : "Industry"}</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {industries.map((ind: any) => <option key={ind.key} value={ind.key}>{ind.label}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={loadHashtags} disabled={loading} className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  {lang === "ar" ? "تحميل" : "Load"}
                </button>
              </div>
            </div>
          </div>

          {loading && <div className="h-60 bg-slate-100 rounded-xl animate-pulse" />}

          {!loading && hashtags.length > 0 && (
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">{lang === "ar" ? "الهاشتاج" : "Hashtag"}</th>
                    <th className="px-4 py-3 text-right">{lang === "ar" ? "عدد الفيديوهات" : "Videos"}</th>
                    <th className="px-4 py-3 text-right">{lang === "ar" ? "المشاهدات" : "Views"}</th>
                  </tr>
                </thead>
                <tbody>
                  {hashtags.map((h, i) => (
                    <tr key={i} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-rose-500">{h.rank || i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">#{h.name}</td>
                      <td className="px-4 py-3 text-right">{formatNum(h.video_count)}</td>
                      <td className="px-4 py-3 text-right">{formatNum(h.view_count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && hashtags.length === 0 && !error && (
            <div className="text-center py-12 text-slate-400 text-sm">
              {lang === "ar" ? "اضغط تحميل لعرض الهاشتاجات الرائجة" : "Click Load to see trending hashtags"}
            </div>
          )}
        </div>
      )}

      {/* ============ SUB-TAB: TRENDING VIDEOS ============ */}
      {subTab === "videos" && (
        <div>
          <div className="bg-white border rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "الدولة" : "Country"}</label>
                <select value={country} onChange={e => setCountry(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  {countries.map((c: any) => <option key={c.code} value={c.code}>{lang === "ar" ? c.name_ar : c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "الفترة" : "Period"}</label>
                <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="7">7 {lang === "ar" ? "أيام" : "days"}</option>
                  <option value="30">30 {lang === "ar" ? "يوم" : "days"}</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "ترتيب حسب" : "Sort By"}</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="vv">{lang === "ar" ? "المشاهدات" : "Views"}</option>
                  <option value="like">{lang === "ar" ? "الإعجابات" : "Likes"}</option>
                  <option value="comment">{lang === "ar" ? "التعليقات" : "Comments"}</option>
                  <option value="share">{lang === "ar" ? "المشاركات" : "Shares"}</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={loadVideos} disabled={loading} className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  {lang === "ar" ? "تحميل" : "Load"}
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          )}

          {!loading && videos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {videos.map((v, i) => (
                <div key={i} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition">
                  {v.cover_url && (
                    <div className="relative">
                      <img src={v.cover_url} alt="" className="w-full h-40 object-cover" />
                      {v.duration > 0 && (
                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {Math.floor(v.duration / 60)}:{(v.duration % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-bold text-slate-800 line-clamp-2 mb-1">{v.title || "No title"}</p>
                    <p className="text-xs text-slate-500 mb-2">@{v.author_handle || v.author}</p>
                    <div className="flex gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1"><Eye size={12} className="text-blue-400" />{formatNum(v.views)}</span>
                      <span className="flex items-center gap-1"><Heart size={12} className="text-rose-400" />{formatNum(v.likes)}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={12} className="text-amber-400" />{formatNum(v.comments)}</span>
                      <span className="flex items-center gap-1"><Share2 size={12} className="text-emerald-400" />{formatNum(v.shares)}</span>
                    </div>
                    {v.video_url && (
                      <a href={v.video_url} target="_blank" rel="noopener" className="mt-2 flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700">
                        <ExternalLink size={12} />
                        {lang === "ar" ? "مشاهدة على TikTok" : "Watch on TikTok"}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && videos.length === 0 && !error && (
            <div className="text-center py-12 text-slate-400 text-sm">
              {lang === "ar" ? "اضغط تحميل لعرض الفيديوهات الرائجة" : "Click Load to see trending videos"}
            </div>
          )}
        </div>
      )}

      {/* ============ SUB-TAB: AD ANALYTICS ============ */}
      {subTab === "analytics" && (
        <div>
          <div className="bg-white border rounded-xl p-4 mb-4">
            <label className="text-[10px] text-slate-500 mb-1 block">{lang === "ar" ? "Material ID" : "Material ID"}</label>
            <div className="flex gap-2">
              <input
                value={analyticsId}
                onChange={e => setAnalyticsId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadAnalytics()}
                placeholder={lang === "ar" ? "الصق Material ID من TikTok Creative Center" : "Paste Material ID from TikTok Creative Center"}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
              />
              <button onClick={loadAnalytics} disabled={loading || !analyticsId.trim()} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2">
                <BarChart3 size={14} />
                {lang === "ar" ? "تحليل" : "Analyze"}
              </button>
            </div>
          </div>

          {loading && <div className="h-60 bg-slate-100 rounded-xl animate-pulse" />}

          {!loading && adDetail && (
            <div className="bg-white border rounded-xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">{adDetail.brand || "Unknown Brand"}</h3>
                  <p className="text-sm text-slate-600">{adDetail.title || "No title"}</p>
                </div>
                {adDetail.source && (
                  <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] rounded-full font-medium">TikTok Creative Center</span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Heart size={18} className="mx-auto text-rose-500 mb-1" />
                  <p className="text-lg font-bold text-slate-800">{formatNum(adDetail.likes)}</p>
                  <p className="text-[10px] text-slate-500">{lang === "ar" ? "إعجابات" : "Likes"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Share2 size={18} className="mx-auto text-emerald-500 mb-1" />
                  <p className="text-lg font-bold text-slate-800">{formatNum(adDetail.shares)}</p>
                  <p className="text-[10px] text-slate-500">{lang === "ar" ? "مشاركات" : "Shares"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <MessageCircle size={18} className="mx-auto text-amber-500 mb-1" />
                  <p className="text-lg font-bold text-slate-800">{formatNum(adDetail.comments)}</p>
                  <p className="text-[10px] text-slate-500">{lang === "ar" ? "تعليقات" : "Comments"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <Eye size={18} className="mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-bold text-slate-800">{adDetail.ctr ? `${(adDetail.ctr * 100).toFixed(1)}%` : "—"}</p>
                  <p className="text-[10px] text-slate-500">CTR</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {adDetail.cost > 0 && (
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500">{lang === "ar" ? "التكلفة التقديرية" : "Estimated Cost"}</p>
                    <p className="text-lg font-bold text-emerald-700">${adDetail.cost.toFixed(2)}</p>
                  </div>
                )}
                {adDetail.landing_page && (
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500">{lang === "ar" ? "صفحة الهبوط" : "Landing Page"}</p>
                    <a href={adDetail.landing_page} target="_blank" rel="noopener" className="text-sm text-blue-600 hover:underline truncate block">
                      {adDetail.landing_page}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !adDetail && !error && (
            <div className="text-center py-12 text-slate-400 text-sm">
              {lang === "ar" ? "أدخل Material ID واضغط تحليل" : "Enter a Material ID and click Analyze"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}