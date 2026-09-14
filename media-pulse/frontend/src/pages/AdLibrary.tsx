import { useState, useEffect } from "react";
import { searchAds, listAds, getCountries, getKeywords, getStats, exportAds, searchPages, previewBrand } from "../api/client";
import { Search, Download, RefreshCw, AlertTriangle, Building2, ChevronDown } from "lucide-react";
import { EmptyState } from "../components";
import { AdCard } from "../components/AdLibrary/AdCard";
import { StatsCards } from "../components/AdLibrary/StatsCards";
import { CountryFilter } from "../components/AdLibrary/CountryFilter";
import { KeywordsPanel } from "../components/AdLibrary/KeywordsPanel";
import { PreviewBar } from "../components/AdLibrary/PreviewBar";
import type { Ad, AdPreview, AdStats, Country, PagePreview } from "../types/ad";

export default function AdLibrary({ t, lang }: { t: any; lang: string }) {
  const [brand, setBrand] = useState("Vodafone");
  const [pageName, setPageName] = useState("");
  const [countries, setCountries] = useState<string[]>(["EG","SA"]);
  const [platform] = useState("meta");
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [countryList, setCountryList] = useState<Country[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [stats, setStats] = useState<AdStats | null>(null);
  const [customKw, setCustomKw] = useState("");
  const [selectedKw, setSelectedKw] = useState<string | null>(null);
  const [pageSuggestions, setPageSuggestions] = useState<PagePreview[]>([]);
  const [showPageSuggest, setShowPageSuggest] = useState(false);
  // Preview & confirmation flow
  const [preview, setPreview] = useState<AdPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);

  useEffect(()=>{ getCountries().then(setCountryList).catch(()=> setCountryList([{code:"EG",name:"Egypt",name_ar:"مصر"},{code:"SA",name:"Saudi Arabia",name_ar:"السعودية"},{code:"AE",name:"UAE",name_ar:"الإمارات"},{code:"QA",name:"Qatar",name_ar:"قطر"},{code:"KW",name:"Kuwait",name_ar:"الكويت"},{code:"BH",name:"Bahrain",name_ar:"البحرين"},{code:"OM",name:"Oman",name_ar:"عمان"}])); },[]);
  useEffect(()=>{
    if(!brand || brand.trim().length < 2) { setKeywords([]); return; }
    const h = setTimeout(()=>{ getKeywords(brand.trim()).then(d=> setKeywords(d.auto_generated || [])).catch(()=> setKeywords([])); }, 300);
    return ()=> clearTimeout(h);
  },[brand]);
  useEffect(()=>{
    if(!pageName || pageName.trim().length < 1) { setPageSuggestions([]); return; }
    const h = setTimeout(()=>{
      searchPages(pageName.trim()).then(data=> {
        setPageSuggestions(data || []);
        setShowPageSuggest(true);
      }).catch(()=> setPageSuggestions([]));
    }, 300);
    return ()=> clearTimeout(h);
  },[pageName]);
  const toggleCountry = (c: string) => setCountries(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev, c]);
  const addCustomKw = () => {
    const v = customKw.trim();
    if(!v) return;
    if(!keywords.includes(v)) setKeywords(prev => [v, ...prev]);
    setBrand(v);
    setSelectedKw(v);
    setCustomKw("");
  };
  const useKeyword = (kw: string) => {
    setBrand(kw);
    setSelectedKw(kw);
  };

  // معاينة: يجلب أسماء الصفحات قبل تنفيذ البحث
  const doPreview = async () => {
    const q = brand.trim() || pageName.trim();
    if (!q) return;
    setPreviewing(true); setPendingConfirm(false); setMsg("");
    try {
      const data = await previewBrand(q, countries, platform, pageName.trim() || undefined);
      setPreview(data);
      setPendingConfirm(true);
      if (!data.pages || data.pages.length === 0) {
        setMsg(lang==="ar" ? `لا توجد صفحات حقيقية لـ "${q}" في ${data.preview_country} – جرّب تهجئة أخرى` : `No real pages found for "${q}" in ${data.preview_country} – try another spelling`);
      }
    } catch(e:any){ setMsg(e.message); }
    setPreviewing(false);
  };

  const doSearch = async () => {
    if (!brand.trim() && !pageName.trim()) return;
    const q = brand.trim() || pageName.trim();
    // التأكيد قبل التنفيذ: لو مفيش معاينة أو البراند اتغير → اعرض المعاينة الأول
    if (!pendingConfirm || !preview || preview.brand !== q) {
      await doPreview();
      return;
    }
    await runSearch();
  };

  const runSearch = async () => {
    const q = preview?.brand || brand.trim() || pageName.trim();
    setLoading(true); setMsg(""); setPendingConfirm(false);
    try {
      const data = await searchAds(q, countries, platform, true, pageName.trim() || undefined, activeOnly);
      setAds(data.ads || []);
      setMsg(`✅ ${lang==="ar" ? "إعلانات حقيقية" : "Real ads"}: ${data.results_found} ${lang==="ar" ? "(محفوظ" : "(saved"} ${data.results_saved}) ${lang==="ar" ? "• الشغالة فقط" : "• active only"} • ${data.disclaimer}`);
      const s = await getStats(q).catch(()=>null);
      if(s) setStats(s);
    } catch(e:any){ setMsg(e.message); }
    setLoading(false);
  };

  const doLoad = async () => {
    setLoading(true);
    try{ const data = await listAds(brand, countries, pageName.trim() || undefined, activeOnly); setAds(data); } catch(e:any){ setMsg(e.message); }
    setLoading(false);
  };
  const doExport = async () => { try{ await exportAds(brand, countries); } catch(e:any){ setMsg(e.message); } };

  return (
    <div className="p-6 space-y-5">
      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <label htmlFor="ad-brand-input" className="block text-xs font-medium text-slate-700 mb-1">{t("search_brand")}</label>
            <Search size={16} className="absolute start-3 top-[38px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input id="ad-brand-input" value={brand} onChange={e=>setBrand(e.target.value)} placeholder={t("search_brand")} className="w-full ps-9 pe-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-[10px] text-slate-400 mt-1">{lang==="ar" ? "ابحث بالبراند أو الكلمة المفتاحية" : "Search by brand or keyword"}</p>
          </div>
          <div className="relative">
            <label htmlFor="ad-page-input" className="block text-xs font-medium text-slate-700 mb-1">{lang==="ar" ? "اسم الصفحة (اختياري)" : "Page name (optional)"}</label>
            <Building2 size={16} className="absolute start-3 top-[38px] -translate-y-1/2 text-violet-400" aria-hidden="true" />
            <input id="ad-page-input" value={pageName} onChange={e=>{setPageName(e.target.value); setShowPageSuggest(true);}} onFocus={()=> pageName.trim().length>=1 && setShowPageSuggest(true)} onBlur={()=> setTimeout(()=> setShowPageSuggest(false), 200)} placeholder={lang==="ar" ? "اسم الصفحة (اختياري) – مثلاً: Vodafone Egypt" : "Page name (optional) – e.g. Vodafone Egypt"} className="w-full ps-9 pe-8 py-2 text-sm bg-violet-50 border border-violet-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <ChevronDown size={14} className="absolute end-3 top-[38px] -translate-y-1/2 text-violet-400" aria-hidden="true" />
            <p className="text-[10px] text-violet-500 mt-1">{lang==="ar" ? "اكتب اسم الصفحة ليظهر إعلاناتها فقط – سيظهر اقتراحات تلقائياً" : "Type page name – suggestions will appear automatically"}</p>
            {showPageSuggest && pageSuggestions.length>0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-violet-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] text-slate-400 border-b sticky top-0 bg-white">{pageSuggestions.length} {lang==="ar" ? "صفحات مقترحة" : "suggested pages"} – اضغط للاختيار</div>
                {pageSuggestions.map((p)=>(
                  <button key={p.page_name} onMouseDown={e=> e.preventDefault()} onClick={()=>{ setPageName(p.page_name); setShowPageSuggest(false); }} className="w-full text-left px-3 py-2.5 text-xs hover:bg-violet-50 border-b border-slate-100 last:border-0 flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{p.page_name}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.example_creative || ""}</p>
                    </div>
                    <span className={`shrink-0 px-1.5 py-0.5 text-[10px] rounded-full ${p.ads_count>0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.ads_count} ads {p.is_new && "• جديد"}</span>
                  </button>
                ))}
                <div className="px-3 py-1.5 text-[10px] text-violet-600 bg-violet-50">💡 اختر صفحة أو اكتب اسم جديد واضغط "تحديث الآن" لجلب إعلاناتها مباشرة</div>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <button onClick={doSearch} disabled={loading || previewing} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60">
            <RefreshCw size={16} className={(loading||previewing)?"animate-spin":""} /> {previewing ? (lang==="ar" ? "جاري المعاينة..." : "Previewing...") : (lang==="ar" ? "بحث" : "Search")} {pageName.trim() && `• ${pageName}`}
          </button>
          <button onClick={doLoad} className="px-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg">{lang==="ar" ? "المحفوظة" : "Load Saved"}</button>
          <button onClick={doExport} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg flex items-center gap-1"><Download size={14}/> {t("export_excel")}</button>
          <label className="px-3 py-2 text-xs rounded-lg border cursor-pointer flex items-center gap-2 bg-white">
            <input type="checkbox" checked={activeOnly} onChange={e=>setActiveOnly(e.target.checked)} className="accent-emerald-600" />
            {lang==="ar" ? "الشغالة فعلياً فقط" : "Active ads only"}
          </label>
          {(brand || pageName) && <button onClick={()=>{setBrand(""); setPageName(""); setKeywords([]); setAds([]); setPreview(null); setPendingConfirm(false);}} className="px-3 py-2 text-xs bg-slate-100 border rounded-lg">Clear</button>}
        </div>

        {/* شريط المعاينة والتأكيد */}
        <PreviewBar
          preview={preview}
          previewing={previewing}
          pendingConfirm={pendingConfirm}
          pageName={pageName}
          lang={lang}
          onConfirm={runSearch}
          onCancel={() => setPendingConfirm(false)}
          onSelectPage={setPageName}
        />
        {/* Countries Checkbox */}
        <CountryFilter
          countryList={countryList}
          countries={countries}
          lang={lang}
          t={t}
          onToggle={toggleCountry}
        />
        {/* Keywords – Improved */}
        <KeywordsPanel
          keywords={keywords}
          selectedKw={selectedKw}
          customKw={customKw}
          brand={brand}
          lang={lang}
          t={t}
          onCustomKwChange={setCustomKw}
          onAddCustomKw={addCustomKw}
          onUseKeyword={useKeyword}
        />
        {msg && <p role="status" aria-live="polite" className="mt-3 text-xs text-slate-600 bg-slate-50 p-2 rounded border">{msg}</p>}
      </div>

      {/* Stats */}
      {stats && <StatsCards stats={stats} t={t} />}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex gap-2">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5"/>
        <p className="text-xs text-amber-800">{t("disclaimer")}</p>
      </div>

      {/* Ads List – Detailed Cards */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h3 className="text-sm font-semibold">{t("ad_library")} ({ads.length}) {ads.length>0 && <span className="text-xs font-normal text-slate-500">– كل إعلان بكارته وتفاصيله</span>}</h3>
          <span className="text-xs text-slate-500">Platform: {platform} • Countries: {countries.join(", ")}</span>
        </div>
        <div className="p-4 grid gap-4">
          {ads.length === 0 ? (
            <EmptyState title={t("no_ads")} />
          ) : (
            ads.map((ad) => <AdCard key={ad.ad_archive_id} ad={ad} lang={lang} t={t} />)
          )}
        </div>
      </div>

      {/* DB Setup Instructions */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-4">
        <h4 className="text-sm font-bold mb-2">DB Setup – Media Pulse (Supabase)</h4>
        <p className="text-xs text-slate-400">Project: https://rpbybnbrcyfrqjgqpkxi.supabase.co</p>
        <ol className="text-xs mt-2 space-y-1 list-decimal list-inside">
          <li>Supabase Dashboard → SQL Editor → شغل SQL من <code>backend/database.py</code> (الـ tables هتتإنشأ أوتوماتيك عند أول تشغيل لو تستخدم SQLite)</li>
          <li>للوصول المباشر لـ Postgres: احتجت DB Password من Settings → Database → Connection String. حالياً Demo شغال على <code>sqlite:///./media_pulse.db</code> (محلي) – Supabase جاهز كـ Frontend client.</li>
          <li>التوكن محفوظ في <code>backend/.env</code> بصلاحيات 600 – لا يُرفع لـ Git.</li>
          <li>تشغيل: <code>cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000</code></li>
          <li>Frontend: <code>cd frontend && npm install && npm run dev</code></li>
        </ol>
      </div>
    </div>
  );
}
