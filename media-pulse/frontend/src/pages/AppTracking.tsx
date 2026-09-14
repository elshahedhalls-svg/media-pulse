import { useState, useEffect } from "react";
import { searchApps, trackApp, trackAppByUrl, listTrackedApps, refreshApp, removeTrackedApp, getSentiment, getAsKeywords, getCountryDownloads, getAppHistory, getCorrelation, getROI, getAttribution, getTrackedAppDetail } from "../api/client";
import { Search, RefreshCw, Smartphone } from "lucide-react";
import { ErrorBoundary, Tabs, Drawer, ConfirmDialog } from "../components";
import { TrackedAppRow } from "../components/AppTracking/TrackedAppRow";
import { OverviewTab } from "../components/AppTracking/OverviewTab";
import { SentimentTab } from "../components/AppTracking/SentimentTab";
import { KeywordsTab } from "../components/AppTracking/KeywordsTab";
import { CountriesTab } from "../components/AppTracking/CountriesTab";
import { HistoryTab } from "../components/AppTracking/HistoryTab";
import { CorrelationTab } from "../components/AppTracking/CorrelationTab";
import type { Tab } from "../components";
import type { TrackedListItem, AppSearchResult } from "../types/app";

function AppTrackingInner({ t, lang }: { t: any; lang: string }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("EG");
  const [store, setStore] = useState("all");
  const [results, setResults] = useState<AppSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [apps, setApps] = useState<TrackedListItem[]>([]);
  const [selectedApp, setSelectedApp] = useState<TrackedListItem | null>(null);
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
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);
  const [appLink, setAppLink] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

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

  const doTrack = async (app: AppSearchResult) => {
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

  const doTrackByUrl = async () => {
    if (!appLink.trim()) return;
    setLinkLoading(true); setMsg("");
    try {
      const res = await trackAppByUrl(appLink.trim(), country);
      setMsg(`✅ ${lang === "ar" ? "تمت إضافة" : "Tracked"}: ${res.name} (${res.store === "play" ? "Google Play" : "App Store"})`);
      setAppLink("");
      loadApps();
    } catch(e:any) { setMsg(`❌ ${e.message}`); }
    setLinkLoading(false);
  };

  const doRefresh = async (trackedId: number) => {
    const prev = apps.find(a => a.id === trackedId);
    const prevSnap = prev?.latest_snapshot;
    setRefreshingId(trackedId);
    try {
      const res = await refreshApp(trackedId, country);
      await loadApps();
      // Report what actually changed so a refresh with identical Google data
      // is distinguishable from a failed/stale refresh.
      const d = res?.data || {};
      const newInstalls = d.installs?.estimated_exact ?? d.installs?.min;
      const deltas: string[] = [];
      if (newInstalls !== undefined && prevSnap?.installs_exact !== undefined) {
        const diff = newInstalls - (prevSnap.installs_exact || 0);
        deltas.push(`${lang === "ar" ? "التحميلات" : "Installs"}: ${newInstalls.toLocaleString()} (${diff > 0 ? `+${diff}` : diff})`);
      }
      if (d.rating_count !== undefined && prevSnap?.rating_count !== undefined) {
        const diff = d.rating_count - (prevSnap.rating_count || 0);
        deltas.push(`${lang === "ar" ? "التقييمات" : "Ratings"}: ${d.rating_count} (${diff > 0 ? `+${diff}` : diff})`);
      }
      if (d.version && d.version !== prevSnap?.version) {
        deltas.push(`${lang === "ar" ? "إصدار جديد" : "New version"}: ${d.version}`);
      }
      const changed = deltas.some(x => !x.includes("(0)"));
      const now = new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-US");
      setMsg(changed
        ? `✅ ${prev?.name || ""} — ${lang === "ar" ? "فُحصت" : "checked"} ${now} • ${deltas.join(" • ")}`
        : `✅ ${prev?.name || ""} — ${lang === "ar" ? "فُحصت" : "checked"} ${now} • ${lang === "ar" ? "لا تغيير في بيانات جوجل منذ آخر فحص" : "No change in Google data since last check"}`);
      if (selectedApp?.id === trackedId) openDetail(trackedId);
    } catch(e:any) { setMsg(`❌ ${e.message}`); }
    setRefreshingId(null);
  };

  const doRemove = async () => {
    if (!pendingDelete) return;
    const { id: trackedId, name } = pendingDelete;
    try {
      await removeTrackedApp(trackedId);
      setApps(prev => prev.filter(a => a.id !== trackedId));
      if (selectedApp?.id === trackedId) { setSelectedApp(null); setDetailData(null); }
    } catch(e:any) { setMsg(e.message); }
    setPendingDelete(null);
  };

  const openDetail = async (trackedId: number) => {
    setLoading(true);
    try {
      const app = apps.find(a => a.id === trackedId);
      if (!app) { setMsg(lang === "ar" ? "التطبيق غير موجود" : "App not found"); setLoading(false); return; }
      setSelectedApp(app);
      setActiveTab("overview");
      // Fetch detail + sentiment + keywords in parallel (auth handled in client)
      const [data, sentimentRes, keywordsRes] = await Promise.all([
        getTrackedAppDetail(trackedId),
        getSentiment(trackedId, country).catch(() => null),
        getAsKeywords(trackedId, country).catch(() => null),
      ]);
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
            <label htmlFor="app-search-input" className="block text-xs font-medium text-slate-700 mb-1">{lang==="ar" ? "بحث التطبيقات" : "Search apps"}</label>
            <Search size={16} className="absolute start-3 top-[38px] -translate-y-1/2 text-slate-400" aria-hidden="true"/>
            <input id="app-search-input" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter" && doSearch()}
              placeholder={lang==="ar" ? "اسم التطبيق أو Package ID (مثلاً: Vodafone Egypt, com.vodafone.eg)" : "App name or package ID"}
              className="w-full ps-9 pe-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label htmlFor="app-store-select" className="block text-xs font-medium text-slate-700 mb-1">{lang==="ar" ? "المتجر" : "Store"}</label>
            <select id="app-store-select" value={store} onChange={e=>setStore(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg">
              <option value="all">{lang==="ar" ? "كل المتاجر" : "All Stores"}</option>
              <option value="play">{lang==="ar" ? "Google Play" : "Google Play"}</option>
              <option value="appstore">{lang==="ar" ? "Apple App Store" : "Apple App Store"}</option>
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label htmlFor="app-country-select" className="block text-xs font-medium text-slate-700 mb-1">{lang==="ar" ? "الدولة" : "Country"}</label>
              <select id="app-country-select" value={country} onChange={e=>setCountry(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg">
                {["EG","SA","AE","QA","KW","BH","OM"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={doSearch} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <RefreshCw size={14} className={loading?"animate-spin":""}/> {lang==="ar" ? "بحث" : "Search"}
            </button>
          </div>
        </div>
        {msg && <p role="status" aria-live="polite" className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">{msg}</p>}
        {/* إضافة بلينك مباشر */}
        <div className="flex gap-2 mt-3">
          <div className="flex-1">
            <label htmlFor="app-link-input" className="block text-xs font-medium text-slate-700 mb-1">{lang === "ar" ? "أو الصق لينك التطبيق مباشرة" : "Or paste an app link directly"}</label>
            <input
              id="app-link-input"
              value={appLink}
              onChange={(e) => setAppLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doTrackByUrl()}
              placeholder={lang === "ar" ? "https://play.google.com/store/apps/details?id=... أو https://apps.apple.com/.../id..." : "https://play.google.com/... or https://apps.apple.com/..."}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              dir="ltr"
            />
          </div>
          <button onClick={doTrackByUrl} disabled={linkLoading || !appLink.trim()} className="self-end px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <RefreshCw size={14} className={linkLoading ? "animate-spin" : ""} aria-hidden="true" /> 🔗 {lang === "ar" ? "إضافة باللينك" : "Add by link"}
          </button>
        </div>
      </div>

      {/* نتائج البحث القريبة */}
      {results.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-bold text-blue-800 mb-3">{lang==="ar" ? `نتائج البحث (${results.length})` : `Search Results (${results.length})`} – {lang==="ar" ? "اضغط تتبع لإضافة" : "Click Track to add"}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {results.map((app) => (
              <div key={app.app_id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg hover:bg-blue-50 transition">
                <img src={app.icon_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' rx='8' fill='%233b82f6'/%3E%3C/svg%3E"}
                  onError={(e) => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' rx='8' fill='%233b82f6'/%3E%3C/svg%3E"; }}
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
            {apps.map((app) => (
              <TrackedAppRow
                key={app.id}
                app={app}
                lang={lang}
                refreshing={refreshingId===app.id}
                onDetail={openDetail}
                onRefresh={doRefresh}
                onRemove={(a) => setPendingDelete(a)}
              />
            ))}
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
              <img src={selectedApp.icon_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' rx='12' fill='%2394a3b8'/%3E%3C/svg%3E"} onError={(e) => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' rx='12' fill='%2394a3b8'/%3E%3C/svg%3E"; }} alt="" className="w-14 h-14 rounded-xl border object-cover"/>
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
              {activeTab === "overview" && (
                <OverviewTab app={selectedApp} detailData={detailData} lang={lang} />
              )}

              {activeTab === "sentiment" && (
                <SentimentTab
                  sentimentData={sentimentData}
                  lang={lang}
                  onRefresh={() => getSentiment(selectedApp.id, country).then(setSentimentData).catch(() => {})}
                />
              )}

              {activeTab === "keywords" && (
                <KeywordsTab keywordsData={keywordsData} lang={lang} />
              )}

              {activeTab === "countries" && (
                <CountriesTab countriesData={countriesData} lang={lang} />
              )}

              {activeTab === "history" && (
                <HistoryTab
                  historyData={historyData}
                  timeRange={timeRange}
                  lang={lang}
                  onRangeChange={onRangeChange}
                />
              )}

              {activeTab === "correlation" && (
                <CorrelationTab
                  correlationData={correlationData}
                  roiData={roiData}
                  attributionData={attributionData}
                  corrLoading={corrLoading}
                  lang={lang}
                />
              )}
            </div>
          </>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={lang==="ar" ? "حذف من المتابعة؟" : "Remove from tracking?"}
        message={pendingDelete ? (lang==="ar" ? `حذف ${pendingDelete.name} من المتابعة؟` : `Remove ${pendingDelete.name} from tracking?`) : ""}
        confirmLabel={lang==="ar" ? "حذف" : "Remove"}
        cancelLabel={lang==="ar" ? "إلغاء" : "Cancel"}
        onConfirm={doRemove}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default function AppTracking(props: { t: any; lang: string }) {
  return <ErrorBoundary><AppTrackingInner {...props} /></ErrorBoundary>;
}
