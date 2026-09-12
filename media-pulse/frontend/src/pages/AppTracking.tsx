import { useState, useEffect } from "react";
import { searchApps, trackApp, listTrackedApps, refreshApp, removeTrackedApp, getSentiment, getAsKeywords, getCountryDownloads, getAppHistory, getCorrelation, getROI, getAttribution } from "../api/client";
import { Search, RefreshCw, Trash2, Star, Download, Eye, ExternalLink, X, BarChart3, TrendingUp, Smartphone, Globe2, MessageSquare, Hash, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { ErrorBoundary, Tabs, TabPanel, Drawer, EmptyState, TableSkeleton } from "../components";
import type { Tab } from "../components";
import type { TrackedApp, AppSnapshot, SentimentData, KeywordData, CountryDownloads, CorrelationData, ROIData, AttributionData } from "../types";

function AppTrackingInner({ t, lang }: { t: any; lang: string }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("EG");
  const [store, setStore] = useState("all");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [apps, setApps] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [refreshingId, setRefreshingId] = useState<number|null>(null);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [keywordsData, setKeywordsData] = useState<any>(null);
  const [countriesData, setCountriesData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "sentiment" | "keywords" | "countries" | "history" | "correlation">("overview");
  const [correlationData, setCorrelationData] = useState<any>(null);
  const [roiData, setRoiData] = useState<any>(null);
  const [attributionData, setAttributionData] = useState<any>(null);
  const [corrLoading, setCorrLoading] = useState(false);
  const [revenuePerDownload, setRevenuePerDownload] = useState<number>(0);

  useEffect(() => { loadApps(); }, []);

  const loadApps = async () => {
    try {
      const data = await listTrackedApps(country);
      setApps(data);
    } catch(e:any) { console.error(e); }
  };

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setMsg(""); setResults([]);
    try {
      const data = await searchApps(query.trim(), store, country);
      setResults(data.results || []);
      setMsg(`${data.count} ${lang==="ar" ? "نتيجة" : "results"} – ${data.country}`);
    } catch(e:any) { setMsg(e.message); }
    setLoading(false);
  };

  const doTrack = async (app: any) => {
    try {
      await trackApp({
        app_id: app.app_id,
        store: app.store,
        name: app.name,
        country,
        icon_url: app.icon_url,
        url: app.url,
        category: app.category,
      });
      setMsg(`✅ ${lang==="ar" ? "تمت إضافة" : "Tracked"}: ${app.name}`);
      loadApps();
    } catch(e:any) { setMsg(e.message); }
  };

  const doRefresh = async (trackedId: number) => {
    setRefreshingId(trackedId);
    try {
      await refreshApp(trackedId, country);
      loadApps();
      if (selectedApp?.id === trackedId) openDetail(trackedId);
    } catch(e:any) { setMsg(`❌ ${e.message}`); }
    setRefreshingId(null);
  };

  const doRemove = async (trackedId: number, name: string) => {
    if (!confirm(lang==="ar" ? `حذف ${name} من المتابعة؟` : `Remove ${name} from tracking?`)) return;
    try {
      await removeTrackedApp(trackedId);
      setApps(prev => prev.filter(a => a.id !== trackedId));
      if (selectedApp?.id === trackedId) { setSelectedApp(null); setDetailData(null); }
    } catch(e:any) { setMsg(e.message); }
  };

  const openDetail = async (trackedId: number) => {
    setLoading(true);
    try {
      const app = apps.find(a => a.id === trackedId);
      setSelectedApp(app);
      setActiveTab("overview");
      // Fetch detail + history + sentiment + keywords in parallel
      const [detailRes, sentimentRes, keywordsRes] = await Promise.all([
        fetch(`${(import.meta.env.VITE_API_URL || "http://localhost:8000")}/api/apps/${trackedId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("mp_token")}` }
        }),
        getSentiment(trackedId, country).catch(() => null),
        getAsKeywords(trackedId, country).catch(() => null),
      ]);
      const data = await detailRes.json();
      setDetailData(data);
      setSentimentData(sentimentRes);
      setKeywordsData(keywordsRes);
    } catch(e:any) { setMsg(e.message); }
    setLoading(false);
  };

  const loadCountryData = async (trackedId: number) => {
    try {
      const data = await getCountryDownloads(trackedId);
      setCountriesData(data);
    } catch(e:any) { console.error(e); }
  };

  const loadHistoryData = async (trackedId: number, range: string = timeRange) => {
    try {
      const data = await getAppHistory(trackedId, country, range);
      setHistoryData(data);
    } catch(e:any) { console.error(e); }
  };

  const onRangeChange = async (newRange: string) => {
    setTimeRange(newRange);
    if (selectedApp) {
      await loadHistoryData(selectedApp.id, newRange);
    }
  };

  const loadCorrelationData = async (trackedId: number, range: string = timeRange) => {
    setCorrLoading(true);
    try {
      const [corrRes, roiRes, attrRes] = await Promise.all([
        getCorrelation(trackedId, country, range).catch(() => null),
        getROI(trackedId, country, revenuePerDownload).catch(() => null),
        getAttribution(trackedId, country, "last_click", 7).catch(() => null),
      ]);
      setCorrelationData(corrRes);
      setRoiData(roiRes);
      setAttributionData(attrRes);
    } catch(e:any) { console.error(e); }
    setCorrLoading(false);
  };

  // KPI summary
  const totalApps = apps.length;
  const totalDownloads = apps.reduce((s, a) => s + (a.latest_snapshot?.downloads_est || 0), 0);
  const avgRating = apps.length > 0 ? (apps.reduce((s, a) => s + (a.latest_snapshot?.rating_avg || 0), 0) / apps.filter(a => a.latest_snapshot?.rating_avg).length || 0) : 0;
  const totalReviews = apps.reduce((s, a) => s + (a.latest_snapshot?.rating_count || 0), 0);

  return (
    <div className="p-6 space-y-5">
      {/* شريط البحث */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter" && doSearch()}
              placeholder={lang==="ar" ? "اسم التطبيق أو Package ID (مثلاً: Vodafone Egypt, com.vodafone.eg)" : "App name or package ID"}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"/>
          </div>
          <select value={store} onChange={e=>setStore(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg">
            <option value="all">{lang==="ar" ? "كل المتاجر" : "All Stores"}</option>
            <option value="play">{lang==="ar" ? "Google Play" : "Google Play"}</option>
            <option value="appstore">{lang==="ar" ? "Apple App Store" : "Apple App Store"}</option>
          </select>
          <div className="flex gap-2">
            <select value={country} onChange={e=>setCountry(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg flex-1">
              {["EG","SA","AE","QA","KW","BH","OM"].map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={doSearch} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60">
              <RefreshCw size={14} className={loading?"animate-spin":""}/> {lang==="ar" ? "بحث" : "Search"}
            </button>
          </div>
        </div>
        {msg && <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">{msg}</p>}
      </div>

      {/* نتائج البحث القريبة */}
      {results.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-bold text-blue-800 mb-3">{lang==="ar" ? `نتائج البحث (${results.length})` : `Search Results (${results.length})`} – {lang==="ar" ? "اضغط تتبع لإضافة" : "Click Track to add"}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {results.map((app:any) => (
              <div key={app.app_id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:bg-blue-50 transition">
                <img src={app.icon_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' rx='8' fill='%233b82f6'/%3E%3C/svg%3E"}
                  alt="" className="w-10 h-10 rounded-lg object-cover border"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{app.name}</p>
                  <p className="text-[11px] text-slate-500">{app.developer} • <span className={`px-1 rounded ${app.store==="play" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{app.store==="play" ? "Play" : "AppStore"}</span></p>
                </div>
                <button onClick={()=>doTrack(app)} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  + {lang==="ar" ? "تتبع" : "Track"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-3">
          <p className="text-[11px] text-slate-500">{lang==="ar" ? "تطبيقات متابعة" : "Tracked Apps"}</p>
          <p className="text-xl font-bold">{totalApps}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-[11px] text-slate-500">{lang==="ar" ? "إجمالي التحميلات" : "Total Downloads"}</p>
          <p className="text-xl font-bold text-blue-700">{totalDownloads > 0 ? totalDownloads.toLocaleString() : "—"}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-[11px] text-slate-500">{lang==="ar" ? "متوسط التقييم" : "Avg Rating"}</p>
          <p className="text-xl font-bold text-amber-600">{avgRating > 0 ? `⭐ ${avgRating.toFixed(1)}` : "—"}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-[11px] text-slate-500">{lang==="ar" ? "إجمالي المراجعات" : "Total Reviews"}</p>
          <p className="text-xl font-bold">{totalReviews > 0 ? totalReviews.toLocaleString() : "—"}</p>
        </div>
      </div>

      {/* جدول التطبيقات المتابعة */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="text-sm font-bold">{lang==="ar" ? "التطبيقات المتابعة" : "Tracked Apps"} ({apps.length})</h3>
          <span className="text-[11px] text-slate-500">{lang==="ar" ? "اخر تحديث" : "Last refresh"}: {new Date().toLocaleDateString()}</span>
        </div>
        {apps.length === 0 ? (
          <div className="p-8 text-center">
            <Smartphone size={40} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-sm text-slate-500">{lang==="ar" ? "لا توجد تطبيقات متابعة بعد — ابحث وأضف تطبيق" : "No tracked apps yet — search and add one"}</p>
          </div>
        ) : (
          <div className="p-4 grid gap-3">
            {apps.map((app:any) => {
              const snap = app.latest_snapshot || {};
              return (
                <div key={app.id} className="flex items-center gap-4 p-3 border border-slate-100 rounded-xl hover:shadow-sm transition bg-slate-50/50">
                  <img src={app.icon_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' rx='10' fill='%2394a3b8'/%3E%3C/svg%3E"}
                    alt="" className="w-12 h-12 rounded-xl object-cover border"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{app.name}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${app.store==="play" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                        {app.store==="play" ? "Google Play" : "App Store"}
                      </span>
                      {app.category && <span className="text-slate-400">• {app.category}</span>}
                      {snap.version && <span className="text-slate-400">• v{snap.version}</span>}
                    </p>
                  </div>
                  {/* KPIs */}
                  <div className="hidden md:flex gap-4 text-center">
                    <div>
                      <p className="text-[10px] text-slate-500">{lang==="ar" ? "التحميلات" : "Installs"}</p>
                      <p className="text-xs font-bold text-blue-700">{snap.installs_exact ? snap.installs_exact.toLocaleString() : snap.downloads_est ? snap.downloads_est.toLocaleString() : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">{lang==="ar" ? "التقييم" : "Rating"}</p>
                      <p className="text-xs font-bold text-amber-600">{snap.rating_avg ? `⭐ ${snap.rating_avg.toFixed(1)}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">{lang==="ar" ? "المراجعات" : "Reviews"}</p>
                      <p className="text-xs font-bold">{snap.rating_count ? snap.rating_count.toLocaleString() : "—"}</p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={()=>openDetail(app.id)} title="تفاصيل" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={16}/></button>
                    <button onClick={()=>doRefresh(app.id)} disabled={refreshingId===app.id} title="تحديث" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50">
                      <RefreshCw size={16} className={refreshingId===app.id?"animate-spin":""}/>
                    </button>
                    <a href={app.url} target="_blank" title="فتح في المتجر" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><ExternalLink size={16}/></a>
                    <button onClick={()=>doRemove(app.id, app.name)} title="حذف" className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* تفاصيل التطبيق (Drawer) */}
      <Drawer
        isOpen={!!(selectedApp && detailData)}
        onClose={() => {
          setSelectedApp(null);
          setDetailData(null);
          setSentimentData(null);
          setKeywordsData(null);
          setCountriesData(null);
          setHistoryData(null);
        }}
        title={selectedApp?.name}
        size="md"
      >
        {selectedApp && detailData && (
          <>
            {/* App Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
              <img src={selectedApp.icon_url || ""} alt="" className="w-14 h-14 rounded-xl border"/>
              <div>
                <p className="font-bold text-slate-800">{selectedApp.name}</p>
                <p className="text-xs text-slate-500">{selectedApp.store==="play" ? "Google Play" : "App Store"} • {selectedApp.category || ""}</p>
              </div>
            </div>

            {/* تبويبات */}
            <Tabs
              tabs={[
                { id: "overview", label: lang==="ar" ? "نظرة عامة" : "Overview" },
                { id: "sentiment", label: lang==="ar" ? "المشاعر" : "Sentiment" },
                { id: "keywords", label: lang==="ar" ? "الكلمات المفتاحية" : "Keywords" },
                { id: "countries", label: lang==="ar" ? "الدول" : "Countries" },
                { id: "history", label: lang==="ar" ? "التاريخ" : "History" },
                { id: "correlation", label: lang==="ar" ? "الارتباط" : "Correlation" },
              ]}
              activeTab={activeTab}
              onChange={(tabId) => {
                setActiveTab(tabId as any);
                if (tabId === "sentiment" && !sentimentData) getSentiment(selectedApp.id, country).then(setSentimentData).catch(()=>{});
                if (tabId === "keywords" && !keywordsData) getAsKeywords(selectedApp.id, country).then(setKeywordsData).catch(()=>{});
                if (tabId === "countries" && !countriesData) loadCountryData(selectedApp.id);
                if (tabId === "history" && !historyData) loadHistoryData(selectedApp.id);
                if (tabId === "correlation" && !correlationData) loadCorrelationData(selectedApp.id);
              }}
              className="border-b px-4"
            />

            <div className="p-4 space-y-4">
              {/* ===== نظرة عامة ===== */}
              {activeTab === "overview" && (<>
                {/* KPIs Row */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <Download size={18} className="mx-auto text-blue-500 mb-1"/>
                    <p className="text-lg font-bold text-blue-700">{selectedApp.latest_snapshot?.installs_exact ? selectedApp.latest_snapshot.installs_exact.toLocaleString() : selectedApp.latest_snapshot?.downloads_est ? selectedApp.latest_snapshot.downloads_est.toLocaleString() : "—"}</p>
                    <p className="text-[10px] text-slate-500">{lang==="ar" ? "إجمالي التحميلات" : "Total Downloads"}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <TrendingUp size={18} className="mx-auto text-emerald-500 mb-1"/>
                    <p className="text-lg font-bold text-emerald-700">{selectedApp.latest_snapshot?.daily_downloads ? `+${selectedApp.latest_snapshot.daily_downloads.toLocaleString()}` : "—"}</p>
                    <p className="text-[10px] text-slate-500">{lang==="ar" ? "تحميلات اليوم" : "Daily Downloads"}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <Star size={18} className="mx-auto text-amber-500 mb-1"/>
                    <p className="text-lg font-bold text-amber-700">{selectedApp.latest_snapshot?.rating_avg ? selectedApp.latest_snapshot.rating_avg.toFixed(1) : "—"}</p>
                    <p className="text-[10px] text-slate-500">{lang==="ar" ? "التقييم" : "Rating"}</p>
                  </div>
                  <div className="bg-slate-100 rounded-xl p-3 text-center">
                    <BarChart3 size={18} className="mx-auto text-slate-500 mb-1"/>
                    <p className="text-lg font-bold">{selectedApp.latest_snapshot?.rating_count?.toLocaleString() || "—"}</p>
                    <p className="text-[10px] text-slate-500">{lang==="ar" ? "المراجعات" : "Reviews"}</p>
                  </div>
                </div>

                {/* رسم بياني: التقييم عبر الزمن */}
                {detailData.snapshots?.length > 1 && (
                  <div className="border rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">{lang==="ar" ? "تطور التقييم" : "Rating Over Time"}</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={detailData.snapshots}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                        <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d?.slice(0,10)||""}/>
                        <YAxis domain={[0,5]} tick={{fontSize:10}}/>
                        <Tooltip labelFormatter={d=>d?.slice(0,10)||""}/>
                        <Line type="monotone" dataKey="rating_avg" stroke="#f59e0b" strokeWidth={2} dot={{r:3}} name="Rating"/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* رسم بياني: التحميلات عبر الزمن */}
                {detailData.snapshots?.length > 1 && detailData.snapshots.some((s:any)=>s.downloads_est > 0) && (
                  <div className="border rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">{lang==="ar" ? "تطور التحميلات" : "Downloads Over Time"}</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={detailData.snapshots}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                        <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d?.slice(0,10)||""}/>
                        <YAxis tick={{fontSize:10}} tickFormatter={v=>v?.toLocaleString()||""}/>
                        <Tooltip formatter={(v:any)=>v?.toLocaleString()||v}/>
                        <Bar dataKey="downloads_est" fill="#3b82f6" radius={[4,4,0,0]} name="Downloads"/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* ملاحظة Apple */}
                {selectedApp.store==="appstore" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                    <TrendingUp size={14} className="inline mr-1 -mt-0.5"/>
                    {lang==="ar" ? "Apple لا تكشف عدد التحميلات — التقييم وعدد المراجعات هما المؤشر الأساسي" : "Apple doesn't expose download counts — rating & review count are the main metrics"}
                  </div>
                )}
              </>)}

              {/* ===== تحليل المشاعر ===== */}
              {activeTab === "sentiment" && (<>
                {sentimentData && sentimentData.total_reviews > 0 ? (<>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-700">{lang==="ar" ? "تحليل المشاعر" : "Sentiment Analysis"}</h3>
                    <button onClick={() => getSentiment(selectedApp.id, country).then(setSentimentData).catch(()=>{})}
                      className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-1">
                      <RefreshCw size={12}/> {lang==="ar" ? "تحديث" : "Refresh"}
                    </button>
                  </div>
                  {/* ملخص المشاعر */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-700 mb-2">{lang==="ar" ? "آخر 10 ريفيوز" : "Recent 10 Reviews"}</p>
                      {sentimentData.recent_sentiment ? (<>
                        <div className="flex gap-2 mb-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">+{sentimentData.recent_sentiment.positive_pct}%</span>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">-{sentimentData.recent_sentiment.negative_pct}%</span>
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">={sentimentData.recent_sentiment.neutral_pct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-l-full" style={{width:`${sentimentData.recent_sentiment.positive_pct}%`}}/>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Score: {sentimentData.recent_sentiment.sentiment_score}</p>
                      </>) : <p className="text-xs text-slate-400">—</p>}
                    </div>
                    <div className="border rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-700 mb-2">{lang==="ar" ? "أعلى 10 ريفيوز" : "Top 10 Reviews"}</p>
                      {sentimentData.top_sentiment ? (<>
                        <div className="flex gap-2 mb-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">+{sentimentData.top_sentiment.positive_pct}%</span>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">-{sentimentData.top_sentiment.negative_pct}%</span>
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">={sentimentData.top_sentiment.neutral_pct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-l-full" style={{width:`${sentimentData.top_sentiment.positive_pct}%`}}/>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Score: {sentimentData.top_sentiment.sentiment_score}</p>
                      </>) : <p className="text-xs text-slate-400">—</p>}
                    </div>
                  </div>

                  {/* رسم بياني دائري */}
                  {sentimentData.recent_sentiment && (
                    <div className="border rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-700 mb-2">{lang==="ar" ? "توزيع المشاعر" : "Sentiment Distribution"}</p>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={[
                            {name: lang==="ar" ? "إيجابي" : "Positive", value: sentimentData.recent_sentiment.positive},
                            {name: lang==="ar" ? "سلبي" : "Negative", value: sentimentData.recent_sentiment.negative},
                            {name: lang==="ar" ? "محايد" : "Neutral", value: sentimentData.recent_sentiment.neutral},
                          ]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                            <Cell fill="#22c55e"/>
                            <Cell fill="#ef4444"/>
                            <Cell fill="#6b7280"/>
                          </Pie>
                          <Legend wrapperStyle={{fontSize:10}}/>
                          <Tooltip/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* الريفيوز */}
                  <div className="border rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">{lang==="ar" ? "الريفيوز" : "Reviews"} ({sentimentData.total_reviews})</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(sentimentData.recent_sentiment?.details || []).slice(0, 5).map((rev:any, i:number) => (
                        <div key={i} className="p-2 bg-slate-50 rounded text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{rev.author}</span>
                            <span>{"⭐".repeat(rev.stars)}</span>
                          </div>
                          <p className="text-slate-600">{rev.text?.slice(0, 100)}{rev.text?.length > 100 ? "..." : ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>) : (
                  <div className="text-center py-8 text-slate-400">
                    <MessageSquare size={32} className="mx-auto mb-2"/>
                    <p className="text-sm">{lang==="ar" ? "لا توجد مراجعات بعد — اضغط تحديث" : "No reviews yet — click Refresh"}</p>
                  </div>
                )}
              </>)}

              {/* ===== الكلمات المفتاحية ===== */}
              {activeTab === "keywords" && (<>
                {keywordsData && keywordsData.keywords?.length > 0 ? (
                  <div className="border rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-700 mb-3">{lang==="ar" ? "الكلمات المفتاحية (ASO)" : "ASO Keywords"}</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b">
                          <th className="text-right py-1">#</th>
                          <th className="text-right py-1">{lang==="ar" ? "الكلمة" : "Keyword"}</th>
                          <th className="text-right py-1">{lang==="ar" ? "الشعبية" : "Popularity"}</th>
                          <th className="text-right py-1">{lang==="ar" ? "الحجم" : "Volume"}</th>
                          <th className="text-right py-1">KD</th>
                          <th className="text-right py-1">Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keywordsData.keywords.map((kw:any, i:number) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-1.5 text-slate-400">{kw.rank}</td>
                            <td className="py-1.5 font-medium text-slate-800">{kw.keyword}</td>
                            <td className="py-1.5">
                              <div className="w-16 bg-slate-200 rounded-full h-1.5 inline-block">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{width:`${kw.popularity}%`}}/>
                              </div>
                              <span className="ml-1 text-slate-500">{kw.popularity}</span>
                            </td>
                            <td className="py-1.5 text-slate-600">{kw.volume?.toLocaleString()}</td>
                            <td className="py-1.5"><span className={`px-1 rounded ${kw.kd < 30 ? "bg-green-100 text-green-700" : kw.kd < 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{kw.kd}</span></td>
                            <td className="py-1.5 text-slate-600">{kw.rank}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Hash size={32} className="mx-auto mb-2"/>
                    <p className="text-sm">{lang==="ar" ? "لا توجد كلمات مفتاحية — اضغط تحديث" : "No keywords — click Refresh"}</p>
                  </div>
                )}
              </>)}

              {/* ===== الدول ===== */}
              {activeTab === "countries" && (<>
                {countriesData && countriesData.countries?.length > 0 ? (<>
                  <div className="border rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">{lang==="ar" ? "التحميلات حسب الدولة" : "Downloads by Country"}</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={countriesData.countries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                        <XAxis dataKey="country" tick={{fontSize:10}}/>
                        <YAxis tick={{fontSize:10}} tickFormatter={v=>v?.toLocaleString()||""}/>
                        <Tooltip formatter={(v:any)=>v?.toLocaleString()||v}/>
                        <Bar dataKey="downloads_min" fill="#3b82f6" name="Downloads (min)"/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="border rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">{lang==="ar" ? "تفاصيل الدول" : "Country Details"}</p>
                    <div className="space-y-1.5">
                      {countriesData.countries.map((c:any) => (
                        <div key={c.country} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded">
                          <span className="font-medium">{c.country}</span>
                          <span className="text-slate-600">{c.downloads_label} • ⭐{c.rating_avg || "?"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>) : (
                  <div className="text-center py-8 text-slate-400">
                    <Globe2 size={32} className="mx-auto mb-2"/>
                    <p className="text-sm">{lang==="ar" ? "جاري تحميل بيانات الدول..." : "Loading country data..."}</p>
                  </div>
                )}
              </>)}

              {/* ===== تتبع تاريخي مع فلتر المدة ===== */}
              {activeTab === "history" && (<>
                {/* Time Range Buttons */}
                <div className="border rounded-xl p-3 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-slate-500"/>
                    <p className="text-xs font-bold text-slate-700">
                      {lang==="ar" ? "اختر المدة الزمنية" : "Select Time Range"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {key: "1m", label: lang==="ar" ? "شهر" : "1 Month"},
                      {key: "3m", label: lang==="ar" ? "3 شهور" : "3 Months"},
                      {key: "6m", label: lang==="ar" ? "6 شهور" : "6 Months"},
                      {key: "1y", label: lang==="ar" ? "سنة" : "1 Year"},
                      {key: "2y", label: lang==="ar" ? "سنتين" : "2 Years"},
                      {key: "5y", label: lang==="ar" ? "5 سنين" : "5 Years"},
                      {key: "all", label: lang==="ar" ? "الكل" : "All"},
                    ].map(r => (
                      <button key={r.key} onClick={() => onRangeChange(r.key)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                          timeRange === r.key
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {historyData && historyData.data?.length > 0 ? (<>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-500">{lang==="ar" ? "عدد اللقطات" : "Snapshots"}</p>
                      <p className="text-sm font-bold text-blue-700">{historyData.summary?.total_snapshots || 0}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-500">{lang==="ar" ? "من" : "From"}</p>
                      <p className="text-xs font-bold text-emerald-700">{(historyData.summary?.period_start || "").slice(0,10)}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-500">{lang==="ar" ? "إلى" : "To"}</p>
                      <p className="text-xs font-bold text-amber-700">{(historyData.summary?.period_end || "").slice(0,10)}</p>
                    </div>
                  </div>

                  {/* Downloads chart */}
                  <div className="border rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">
                      {lang==="ar" ? "تطور التحميلات" : "Downloads Over Time"}
                      <span className="text-slate-400 font-normal mr-2">
                        ({historyData.summary?.bucket === "day" ? (lang==="ar" ? "يومي" : "Daily") :
                          historyData.summary?.bucket === "week" ? (lang==="ar" ? "أسبوعي" : "Weekly") :
                          (lang==="ar" ? "شهري" : "Monthly")})
                      </span>
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={historyData.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                        <XAxis dataKey="date" tick={{fontSize:9}} angle={-45} textAnchor="end" height={50}/>
                        <YAxis tick={{fontSize:10}} tickFormatter={v=>v?.toLocaleString()||""}/>
                        <Tooltip labelFormatter={d=>d||""} formatter={(v:any)=>v?.toLocaleString()||v}/>
                        <Line type="monotone" dataKey="downloads_est" stroke="#3b82f6" strokeWidth={2} dot={{r:3}} name="Downloads"/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Rating chart */}
                  <div className="border rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">
                      {lang==="ar" ? "تطور التقييم" : "Rating Over Time"}
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={historyData.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                        <XAxis dataKey="date" tick={{fontSize:9}} angle={-45} textAnchor="end" height={50}/>
                        <YAxis domain={[0,5]} tick={{fontSize:10}}/>
                        <Tooltip labelFormatter={d=>d||""}/>
                        <Line type="monotone" dataKey="rating_avg" stroke="#f59e0b" strokeWidth={2} dot={{r:3}} name="Rating"/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Reviews count chart */}
                  <div className="border rounded-xl p-3">
                    <p className="text-xs font-bold text-slate-700 mb-2">
                      {lang==="ar" ? "عدد المراجعات" : "Reviews Count Over Time"}
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={historyData.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                        <XAxis dataKey="date" tick={{fontSize:9}} angle={-45} textAnchor="end" height={50}/>
                        <YAxis tick={{fontSize:10}} tickFormatter={v=>v?.toLocaleString()||""}/>
                        <Tooltip labelFormatter={d=>d||""} formatter={(v:any)=>v?.toLocaleString()||v}/>
                        <Bar dataKey="rating_count" fill="#8b5cf6" radius={[4,4,0,0]} name="Reviews"/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>) : (
                  <div className="text-center py-8 text-slate-400">
                    <TrendingUp size={32} className="mx-auto mb-2"/>
                    <p className="text-sm">
                      {lang==="ar"
                        ? historyData ? "لا توجد لقطات في هذه المدة — اعمل refresh للتطبيق" : "اختر مدة زمنية..."
                        : historyData ? "No snapshots in this range — refresh the app" : "Select a time range..."}
                    </p>
                  </div>
                )}
              </>)}

              {/* ===== الارتباط والـ ROI ===== */}
              {activeTab === "correlation" && (<>
                {corrLoading ? (
                  <div className="text-center py-8 text-slate-400">
                    <RefreshCw size={24} className="mx-auto mb-2 animate-spin"/>
                    <p className="text-sm">{lang==="ar" ? "جاري تحليل الارتباط..." : "Analyzing correlation..."}</p>
                  </div>
                ) : correlationData ? (<>
                  {/* Correlation KPIs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border rounded-xl p-3 bg-blue-50">
                      <p className="text-[10px] text-slate-500">{lang==="ar" ? "معامل بيرسون" : "Pearson Correlation"}</p>
                      <p className="text-xl font-bold text-blue-700">{correlationData.pearson?.r?.toFixed(2) || "—"}</p>
                      <p className="text-[10px] text-slate-500">
                        {lang==="ar" ? "قوة:" : "Strength:"} {correlationData.pearson?.strength === "strong" ? "💪 قوي" : correlationData.pearson?.strength === "moderate" ? "⚡ متوسط" : correlationData.pearson?.strength === "weak" ? "🐌 ضعيف" : "—"}
                        {correlationData.pearson?.significant ? " ✅" : " ⚠️"}
                      </p>
                    </div>
                    <div className="border rounded-xl p-3 bg-emerald-50">
                      <p className="text-[10px] text-slate-500">{lang==="ar" ? "أفضل تأخير" : "Best Lag"}</p>
                      <p className="text-xl font-bold text-emerald-700">{correlationData.lag_analysis?.best_lag || 0} {lang==="ar" ? "يوم" : "days"}</p>
                      <p className="text-[10px] text-slate-500">
                        r = {correlationData.lag_analysis?.best_r?.toFixed(2) || "—"}
                      </p>
                    </div>
                  </div>

                  {/* ROI KPIs */}
                  {roiData && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="border rounded-xl p-3 text-center">
                        <p className="text-[10px] text-slate-500">{lang==="ar" ? "التكلفة/تحميل" : "CAC"}</p>
                        <p className="text-sm font-bold text-blue-700">${roiData.cac?.toFixed(2) || "—"}</p>
                      </div>
                      <div className="border rounded-xl p-3 text-center">
                        <p className="text-[10px] text-slate-500">{lang==="ar" ? "إجمالي الإنفاق" : "Total Spend"}</p>
                        <p className="text-sm font-bold text-slate-700">${roiData.total_spend_usd?.toLocaleString() || "—"}</p>
                      </div>
                      <div className="border rounded-xl p-3 text-center">
                        <p className="text-[10px] text-slate-500">{lang==="ar" ? "التحميلات" : "Downloads"}</p>
                        <p className="text-sm font-bold text-emerald-700">{roiData.total_downloads?.toLocaleString() || "—"}</p>
                      </div>
                    </div>
                  )}

                  {/* Correlation Chart */}
                  {correlationData.series?.dates?.length > 0 && (
                    <div className="border rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-700 mb-2">
                        {lang==="ar" ? "الإنفاق مقابل التحميلات" : "Spend vs Downloads"}
                      </p>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={correlationData.series.dates.map((d: string, i: number) => ({
                          date: d,
                          spend: correlationData.series.spends[i],
                          downloads: correlationData.series.downloads[i],
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                          <XAxis dataKey="date" tick={{fontSize:9}} angle={-45} textAnchor="end" height={50}/>
                          <YAxis yAxisId="left" tick={{fontSize:10}} tickFormatter={v=>`$${v?.toLocaleString()||""}`} stroke="#3b82f6"/>
                          <YAxis yAxisId="right" orientation="right" tick={{fontSize:10}} tickFormatter={v=>v?.toLocaleString()||""} stroke="#22c55e"/>
                          <Tooltip labelFormatter={d=>d||""} formatter={(v:any, name:string)=>name==="spend" ? `$${v.toLocaleString()}` : v.toLocaleString()}/>
                          <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} dot={false} name="Spend (USD)"/>
                          <Line yAxisId="right" type="monotone" dataKey="downloads" stroke="#22c55e" strokeWidth={2} dot={false} name="Downloads"/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Lag Analysis Chart */}
                  {correlationData.lag_analysis?.lag_correlations?.length > 0 && (
                    <div className="border rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-700 mb-2">
                        {lang==="ar" ? "تحليل التأخير" : "Lag Analysis"}
                      </p>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={correlationData.lag_analysis.lag_correlations}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                          <XAxis dataKey="lag_days" tick={{fontSize:10}} label={{value: lang==="ar" ? "أيام التأخير" : "Lag Days", position:"bottom", fontSize:10}}/>
                          <YAxis domain={[-1, 1]} tick={{fontSize:10}}/>
                          <Tooltip formatter={(v:any)=>v.toFixed(3)}/>
                          <Bar dataKey="r" fill="#8b5cf6" radius={[4,4,0,0]} name="Correlation (r)"/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Attribution Summary */}
                  {attributionData && attributionData.total_attributed_installs > 0 && (
                    <div className="border rounded-xl p-3">
                      <p className="text-xs font-bold text-slate-700 mb-2">
                        {lang==="ar" ? "الإنساب (آخر 7 أيام)" : "Attribution (Last 7 days)"}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2 rounded">
                          <p className="text-slate-500">{lang==="ar" ? "التحميلات المنسبة" : "Attributed Installs"}</p>
                          <p className="font-bold">{attributionData.total_attributed_installs}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded">
                          <p className="text-slate-500">{lang==="ar" ? "الإنفاق المنسب" : "Spend Attributed"}</p>
                          <p className="font-bold">${attributionData.total_spend_attributed?.toFixed(0) || "—"}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">
                        {lang==="ar" ? "نموذج: آخر نقرة (7 أيام)" : "Model: Last Click (7 days)"}
                      </p>
                    </div>
                  )}

                  {/* Insight */}
                  {correlationData.lag_analysis?.insight && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                      💡 {correlationData.lag_analysis.insight}
                    </div>
                  )}

                  {/* Disclaimer */}
                  <p className="text-[10px] text-slate-400 text-center">
                    {lang==="ar"
                      ? "⚠️ الإنفاق تقديري (نموذج CPM). التحميلات تقديرية. الارتباط لا يหมาย السببية."
                      : "⚠️ Spend is estimated (CPM model). Downloads are estimates. Correlation does not imply causation."}
                  </p>
                </>) : (
                  <div className="text-center py-8 text-slate-400">
                    <TrendingUp size={32} className="mx-auto mb-2"/>
                    <p className="text-sm">{lang==="ar" ? "جاري تحميل بيانات الارتباط..." : "Loading correlation data..."}</p>
                  </div>
                )}
              </>)}

              {/* تاريخ اللقطات */}
              {activeTab === "overview" && (
                <div className="border rounded-xl p-3">
                  <p className="text-xs font-bold text-slate-700 mb-2">{lang==="ar" ? "اللقطات" : "Snapshots"} ({detailData.snapshots?.length || 0})</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {(detailData.snapshots || []).reverse().map((s:any, i:number) => (
                      <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-slate-50 rounded">
                        <span className="text-slate-500">{s.date?.slice(0,10)} • {s.country}</span>
                        <span className="font-medium">
                          {s.rating_avg ? `⭐${s.rating_avg.toFixed(1)}` : ""} {s.downloads_est ? `${s.downloads_est.toLocaleString()} DL` : ""}
                        </span>
                      </div>
                    ))}
                    {(!detailData.snapshots || detailData.snapshots.length === 0) && (
                      <p className="text-xs text-slate-400 text-center py-3">{lang==="ar" ? "لا توجد لقطات بعد — اضغط تحديث" : "No snapshots yet — click Refresh"}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

export default function AppTracking(props: { t: any; lang: string }) {
  return <ErrorBoundary><AppTrackingInner {...props} /></ErrorBoundary>;
}
