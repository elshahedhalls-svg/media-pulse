import { Search, RefreshCw, ExternalLink, Heart, Eye, BarChart3 } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { Field } from "./Field";
import { formatNum } from "../../types/tiktok";
import type { TikTokAd, TikTokOption } from "../../types/tiktok";

interface AdSearchTabProps {
  keyword: string;
  country: string;
  industry: string;
  period: string;
  industries: TikTokOption[];
  countries: TikTokOption[];
  loading: boolean;
  ads: TikTokAd[];
  hasError: boolean;
  lang: string;
  onKeywordChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onIndustryChange: (v: string) => void;
  onPeriodChange: (v: string) => void;
  onSearch: () => void;
}

/** Ad-search sub-tab: keyword/geo filters + ad result cards. */
export function AdSearchTab(props: AdSearchTabProps) {
  const { loading, ads, lang, industries, countries } = props;
  return (
    <div>
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="col-span-2">
            <label htmlFor="tiktok-keyword" className="text-[10px] text-slate-500 mb-1 block">
              {lang === "ar" ? "كلمة البحث" : "Search Keyword"}
            </label>
            <div className="flex gap-2">
              <input
                id="tiktok-keyword"
                value={props.keyword}
                onChange={(e) => props.onKeywordChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && props.onSearch()}
                placeholder={lang === "ar" ? "مثال: مباشر، Mubasher..." : "e.g. Mubasher..."}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button onClick={props.onSearch} disabled={loading} aria-label={lang === "ar" ? "بحث" : "Search"} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-500">
                <Search size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <Field id="tiktok-ad-country" label={lang === "ar" ? "الدولة" : "Country"}>
            <select id="tiktok-ad-country" value={props.country} onChange={(e) => props.onCountryChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              {countries.map((c) => <option key={c.code} value={c.code}>{lang === "ar" ? c.name_ar : c.name}</option>)}
            </select>
          </Field>
          <Field id="tiktok-ad-industry" label={lang === "ar" ? "الصناعة" : "Industry"}>
            <select id="tiktok-ad-industry" value={props.industry} onChange={(e) => props.onIndustryChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              {industries.map((ind) => <option key={ind.key} value={ind.key}>{ind.label}</option>)}
            </select>
          </Field>
          <Field id="tiktok-ad-period" label={lang === "ar" ? "الفترة" : "Period"}>
            <select id="tiktok-ad-period" value={props.period} onChange={(e) => props.onPeriodChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              <option value="7">{lang === "ar" ? "7 أيام" : "7 days"}</option>
              <option value="30">{lang === "ar" ? "30 يوم" : "30 days"}</option>
              <option value="90">{lang === "ar" ? "90 يوم" : "90 days"}</option>
            </select>
          </Field>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="status" aria-label={lang === "ar" ? "جاري التحميل" : "Loading"}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
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
                  <a href={ad.video_url} target="_blank" rel="noopener noreferrer" aria-label={lang === "ar" ? "مشاهدة الفيديو" : "Watch video"} className="p-1 text-rose-400 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded">
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}
              </div>
              <div className="flex gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1"><Heart size={12} className="text-rose-400" aria-hidden="true" />{formatNum(ad.likes)}</span>
                <span className="flex items-center gap-1"><Eye size={12} className="text-blue-400" aria-hidden="true" />{ad.ctr ? `${(ad.ctr * 100).toFixed(1)}%` : "—"}</span>
                <span className="flex items-center gap-1"><BarChart3 size={12} className="text-emerald-400" aria-hidden="true" />{ad.cost ? `$${ad.cost.toFixed(2)}` : "—"}</span>
              </div>
              {ad.cover_url && (
                <img src={ad.cover_url} alt="" className="mt-2 w-full h-32 object-cover rounded-lg" loading="lazy" />
              )}
            </div>
          ))}
        </div>
      )}
      {!loading && ads.length === 0 && !props.hasError && (
        <EmptyState
          title={lang === "ar" ? "ابدأ البحث عن إعلانات TikTok" : "Search for TikTok ads to get started"}
          action={
            <button onClick={props.onSearch} disabled={!props.keyword.trim()} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50 inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-500">
              <RefreshCw size={14} aria-hidden="true" /> {lang === "ar" ? "بحث" : "Search"}
            </button>
          }
        />
      )}
    </div>
  );
}
