import { useState, useEffect } from "react";
import { searchAds, listAds, getCountries, getKeywords, getStats, exportAds, searchPages, previewBrand } from "../api/client";
import { Search, Download, RefreshCw, AlertTriangle, ExternalLink, Building2, ChevronDown, CheckCircle2, Globe2 } from "lucide-react";

export default function AdLibrary({ t, lang }: { t: any; lang: string }) {
  const [brand, setBrand] = useState("Vodafone");
  const [pageName, setPageName] = useState("");
  const [countries, setCountries] = useState<string[]>(["EG","SA"]);
  const [platform] = useState("meta");
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [countryList, setCountryList] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [customKw, setCustomKw] = useState("");
  const [selectedKw, setSelectedKw] = useState<string | null>(null);
  const [pageSuggestions, setPageSuggestions] = useState<any[]>([]);
  const [showPageSuggest, setShowPageSuggest] = useState(false);
  // Preview & confirmation flow
  const [preview, setPreview] = useState<any>(null);
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
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder={t("search_brand")} className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg" />
            <p className="text-[10px] text-slate-400 mt-1">{lang==="ar" ? "ابحث بالبراند أو الكلمة المفتاحية" : "Search by brand or keyword"}</p>
          </div>
          <div className="relative">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" />
            <input value={pageName} onChange={e=>{setPageName(e.target.value); setShowPageSuggest(true);}} onFocus={()=> pageName.trim().length>=1 && setShowPageSuggest(true)} onBlur={()=> setTimeout(()=> setShowPageSuggest(false), 200)} placeholder={lang==="ar" ? "اسم الصفحة (اختياري) – مثلاً: Vodafone Egypt" : "Page name (optional) – e.g. Vodafone Egypt"} className="w-full pl-9 pr-8 py-2 text-sm bg-violet-50 border border-violet-200 rounded-lg focus:bg-white" />
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400" />
            <p className="text-[10px] text-violet-500 mt-1">{lang==="ar" ? "اكتب اسم الصفحة ليظهر إعلاناتها فقط – سيظهر اقتراحات تلقائياً" : "Type page name – suggestions will appear automatically"}</p>
            {showPageSuggest && pageSuggestions.length>0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-violet-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] text-slate-400 border-b sticky top-0 bg-white">{pageSuggestions.length} {lang==="ar" ? "صفحات مقترحة" : "suggested pages"} – اضغط للاختيار</div>
                {pageSuggestions.map((p:any)=>(
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
        {(previewing || (pendingConfirm && preview)) && (
          <div className="mt-3 border-2 border-blue-300 bg-blue-50 rounded-xl p-3">
            {previewing ? (
              <p className="text-xs text-blue-700 flex items-center gap-2"><RefreshCw size={14} className="animate-spin"/> {lang==="ar" ? "جاري فحص Meta Ad Library للصفحات المرتبطة..." : "Scanning Meta Ad Library for related pages..."}</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-bold text-blue-900 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600"/>
                    {lang==="ar" ? `تم العثور على ${preview.pages_found} صفحة (${preview.total_ads} إعلان حقيقي) لـ "${preview.brand}"` : `Found ${preview.pages_found} pages (${preview.total_ads} real ads) for "${preview.brand}"`}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={runSearch} disabled={loading} className="px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold disabled:opacity-60">
                      ✓ {lang==="ar" ? "تأكيد وتنفيذ البحث" : "Confirm & Search"}
                    </button>
                    <button onClick={()=>setPendingConfirm(false)} className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg">
                      {lang==="ar" ? "إلغاء" : "Cancel"}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-blue-600 mt-1">{preview.note}</p>
                {preview.pages?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {preview.pages.map((p:any)=>(
                      <button key={p.page_name} onClick={()=>{ setPageName(p.page_name); }} title={p.sample_creative} className={`px-2.5 py-1 text-xs rounded-full border transition ${pageName===p.page_name ? "bg-blue-600 text-white border-blue-600" : "bg-white border-blue-200 text-blue-800 hover:bg-blue-100"}`}>
                        <Building2 size={11} className="inline mr-1 -mt-0.5"/>{p.page_name}
                        <span className="ml-1 opacity-70">({p.ads_count} {lang==="ar" ? "إعلان" : "ads"}{p.active_count < p.ads_count ? `, ${p.active_count} ${lang==="ar" ? "نشط" : "active"}` : ""})</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-blue-500 mt-2">{lang==="ar" ? "اضغط على اسم صفحة لفلترة النتائج عليها، ثم أكد البحث" : "Click a page to filter results by it, then confirm the search"}</p>
              </>
            )}
          </div>
        )}
        {/* Countries Checkbox */}
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-700 mb-2">{t("countries")} (EG + GCC)</p>
          <div className="flex flex-wrap gap-2">
            {countryList.map((c:any)=>(
              <label key={c.code} className={`px-3 py-1.5 text-xs rounded-full border cursor-pointer flex items-center gap-1 ${countries.includes(c.code) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}>
                <input type="checkbox" checked={countries.includes(c.code)} onChange={()=>toggleCountry(c.code)} className="hidden" />
                {lang==="ar" ? (c.name_ar || c.name) : c.name} ({c.code})
              </label>
            ))}
          </div>
        </div>
        {/* Keywords – Improved */}
        <div className="mt-3">
          <div className="flex gap-2 mb-2">
            <input value={customKw} onChange={e=>setCustomKw(e.target.value)} onKeyDown={e=> e.key==='Enter' && addCustomKw()} placeholder={lang==="ar" ? "أضف كلمة مخصصة..." : "Add custom keyword..."} className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg" />
            <button onClick={addCustomKw} className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg">+ {lang==="ar" ? "إضافة" : "Add"}</button>
          </div>
          {keywords.length>0 ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl">
              <p className="text-xs font-bold text-amber-800 flex items-center gap-1">🔑 {t("keyword_auto")} <span className="text-[11px] font-normal text-amber-600">({keywords.length}) – {t("customize")} – اضغط للبحث</span></p>
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto">
                {keywords.map(k=> (
                  <button key={k} onClick={()=>useKeyword(k)} className={`px-2.5 py-1 text-xs rounded-full border transition ${selectedKw===k ? "bg-blue-600 text-white border-blue-600" : "bg-white border-amber-200 text-amber-800 hover:bg-amber-100"}`}>
                    {k} {selectedKw===k && "✓"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-amber-700 mt-2">💡 اكتب في الحقل العلوي (Brand) وشاهد الكلمات تتولد تلقائياً – أو أضف كلمة مخصصة واضغط عليها للبحث</p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
              <p className="text-xs text-slate-500">{brand.trim().length < 2 ? (lang==="ar" ? "اكتب حرفين على الأقل ليظهر الاقتراحات" : "Type at least 2 chars for suggestions") : (lang==="ar" ? "جاري تحميل الاقتراحات..." : "Loading suggestions...")}</p>
            </div>
          )}
        </div>
        {msg && <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-2 rounded border">{msg}</p>}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">{t("total_ads")}</p><p className="text-lg font-bold">{stats.total_ads}</p></div>
          <div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">{t("active_ads")}</p><p className="text-lg font-bold text-emerald-600">{stats.active_ads}</p></div>
          <div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">{t("spend")}</p><p className="text-sm font-bold">${stats.total_spend_low} - ${stats.total_spend_high}</p></div>
          <div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">{t("by_country")}</p><p className="text-xs">{Object.entries(stats.by_country).map(([k,v])=>`${k}:${v}`).join(" ")}</p></div>
        </div>
      )}

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
          {ads.length===0 && <p className="p-6 text-sm text-slate-500 text-center border border-dashed rounded-xl">{t("no_ads")}</p>}
          {ads.map((ad:any)=>{
            const isAr = /[\u0600-\u06FF]/.test(ad.creative_body || "");
            const creativeTypeIcon = ad.creative_type==="video" ? "🎬" : ad.creative_type==="image" ? "🖼️" : "📝";
            return (
            <div key={ad.ad_archive_id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition bg-slate-50/50">
              {/* Header */}
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                    {ad.page_name || "Unknown Page"}
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ad.status==="active" ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-slate-200 text-slate-600 border border-slate-300"}`}>
                      {ad.status==="active" ? (lang==="ar" ? "● نشط الآن" : "● Active") : (lang==="ar" ? "متوقف" : "Inactive")}
                    </span>
                    <span className="text-[11px] font-normal px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{ad.creative_type ? `${creativeTypeIcon} ${ad.creative_type}` : "📝 text"}</span>
                  </p>
                  {/* شغال فين */}
                  <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 flex-wrap">
                    <Globe2 size={12} className="text-violet-500"/>
                    <span className="font-semibold">{lang==="ar" ? "شغال في:" : "Running in:"}</span>
                    {(ad.countries||[]).map((c:string)=> <span key={c} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-medium">{c}</span>)}
                    <span className="text-slate-400">•</span>
                    <span>{(ad.platforms||[ad.platform]).join(" + ")}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Library ID: <span className="font-mono text-slate-700 select-all">{ad.library_id || ad.ad_archive_id}</span> • {ad.start_date?.slice(0,10)} – {ad.duration_days} {t("days")} {ad.is_estimated ? "(تقديري)" : "(رسمي)"}</p>
                </div>
                <a href={ad.snapshot_url} target="_blank" className="shrink-0 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"><ExternalLink size={12}/> {lang==="ar" ? "فتح في المكتبة" : "Open in Library"}</a>
              </div>
              {/* Creative Body – Arabic handling */}
              <div dir={isAr ? "rtl" : "ltr"} className={`p-3 bg-white border rounded-lg text-sm leading-relaxed ${isAr ? "text-right font-[Cairo,system-ui]" : "text-left"}`} style={{fontFamily: isAr ? "Cairo, sans-serif" : "inherit"}}>
                {ad.creative_body || <span className="text-slate-400">— لا يوجد نص —</span>}
              </div>
              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                <div className="bg-white p-2.5 rounded-lg border">
                  <p className="text-[11px] text-slate-500">Platforms</p>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">{(ad.platforms||[ad.platform]).join(" • ")}</p>
                  <p className="text-[10px] text-slate-400">Facebook • Instagram</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border">
                  <p className="text-[11px] text-slate-500">Categories</p>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">{(ad.categories||["All"]).join(", ")}</p>
                  <p className="text-[10px] text-slate-400">Ad Library</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border">
                  <p className="text-[11px] text-slate-500">Estimated audience size</p>
                  <p className="text-xs font-bold text-violet-700 mt-0.5">{ad.audience_low?.toLocaleString()} – {ad.audience_high?.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">Unique reach (65-85% of impressions)</p>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <p className="text-[11px] text-emerald-700">Amount spent (EGP) {ad.is_estimated?"(تقديري)":"(رسمي)"}</p>
                  <p className="text-xs font-bold text-emerald-800 mt-0.5">{ad.spend_egp_low?.toLocaleString()} – {ad.spend_egp_high?.toLocaleString()} EGP</p>
                  <p className="text-[10px] text-emerald-600">${ad.spend_low} – ${ad.spend_high} USD</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border">
                  <p className="text-[11px] text-slate-500">Impressions</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{ad.impressions_low?.toLocaleString()} – {ad.impressions_high?.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">{ad.impressions_low && ad.audience_low ? `Freq ~ ${(ad.impressions_low/ad.audience_low).toFixed(1)}` : ""}</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border">
                  <p className="text-[11px] text-slate-500">Countries • Status</p>
                  <p className="text-xs font-medium mt-0.5 flex flex-wrap gap-1">{(ad.countries||[]).map((c:string)=> <span key={c} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[11px]">{c}</span>)} <span className={`px-1.5 py-0.5 rounded text-[11px] ${ad.status==="active"?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-600"}`}>{ad.status}</span></p>
                  <p className="text-[10px] text-slate-400 mt-1">Library ID: {String(ad.library_id||ad.ad_archive_id).slice(0,16)}...</p>
                </div>
              </div>
              {ad.disclaimer && <p className="text-[11px] text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-200">{ad.disclaimer}</p>}
            </div>
          )})}
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
