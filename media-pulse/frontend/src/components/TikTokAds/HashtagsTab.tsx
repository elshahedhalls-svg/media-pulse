import { RefreshCw } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { Field } from "./Field";
import { formatNum } from "../../types/tiktok";
import type { TikTokHashtag, TikTokOption } from "../../types/tiktok";

interface HashtagsTabProps {
  country: string;
  period: string;
  industry: string;
  industries: TikTokOption[];
  countries: TikTokOption[];
  loading: boolean;
  hashtags: TikTokHashtag[];
  hasError: boolean;
  lang: string;
  onCountryChange: (v: string) => void;
  onPeriodChange: (v: string) => void;
  onIndustryChange: (v: string) => void;
  onLoad: () => void;
}

/** Trending-hashtags sub-tab: filters + ranked table. */
export function HashtagsTab(props: HashtagsTabProps) {
  const { loading, hashtags, hasError, lang, industries, countries } = props;
  return (
    <div>
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field id="tiktok-ht-country" label={lang === "ar" ? "الدولة" : "Country"}>
            <select id="tiktok-ht-country" value={props.country} onChange={(e) => props.onCountryChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              {countries.map((c) => <option key={c.code} value={c.code}>{lang === "ar" ? c.name_ar : c.name}</option>)}
            </select>
          </Field>
          <Field id="tiktok-ht-period" label={lang === "ar" ? "الفترة" : "Period"}>
            <select id="tiktok-ht-period" value={props.period} onChange={(e) => props.onPeriodChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              <option value="7">7 {lang === "ar" ? "أيام" : "days"}</option>
              <option value="30">30 {lang === "ar" ? "يوم" : "days"}</option>
            </select>
          </Field>
          <Field id="tiktok-ht-industry" label={lang === "ar" ? "الصناعة" : "Industry"}>
            <select id="tiktok-ht-industry" value={props.industry} onChange={(e) => props.onIndustryChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              {industries.map((ind) => <option key={ind.key} value={ind.key}>{ind.label}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <button onClick={props.onLoad} disabled={loading} className="w-full px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-500">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              {lang === "ar" ? "تحميل" : "Load"}
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="h-60 bg-slate-100 rounded-xl animate-pulse" role="status" aria-label={lang === "ar" ? "جاري التحميل" : "Loading"} />}

      {!loading && hashtags.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs">
                <th scope="col" className="px-4 py-3 text-left">#</th>
                <th scope="col" className="px-4 py-3 text-left">{lang === "ar" ? "الهاشتاج" : "Hashtag"}</th>
                <th scope="col" className="px-4 py-3 text-right">{lang === "ar" ? "عدد الفيديوهات" : "Videos"}</th>
                <th scope="col" className="px-4 py-3 text-right">{lang === "ar" ? "المشاهدات" : "Views"}</th>
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

      {!loading && hashtags.length === 0 && !hasError && (
        <EmptyState title={lang === "ar" ? "اضغط تحميل لعرض الهاشتاجات الرائجة" : "Click Load to see trending hashtags"} />
      )}
    </div>
  );
}
