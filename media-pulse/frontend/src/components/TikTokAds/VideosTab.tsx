import { RefreshCw, ExternalLink, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { Field } from "./Field";
import { formatNum } from "../../types/tiktok";
import type { TikTokVideo, TikTokOption } from "../../types/tiktok";

interface VideosTabProps {
  country: string;
  period: string;
  sortBy: string;
  countries: TikTokOption[];
  loading: boolean;
  videos: TikTokVideo[];
  hasError: boolean;
  lang: string;
  onCountryChange: (v: string) => void;
  onPeriodChange: (v: string) => void;
  onSortChange: (v: string) => void;
  onLoad: () => void;
}

function formatDuration(totalSeconds: number | undefined) {
  if (!totalSeconds || totalSeconds <= 0) return null;
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
}

/** Trending-videos sub-tab: filters + video cards. */
export function VideosTab(props: VideosTabProps) {
  const { loading, videos, hasError, lang, countries } = props;
  return (
    <div>
      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field id="tiktok-vid-country" label={lang === "ar" ? "الدولة" : "Country"}>
            <select id="tiktok-vid-country" value={props.country} onChange={(e) => props.onCountryChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              {countries.map((c) => <option key={c.code} value={c.code}>{lang === "ar" ? c.name_ar : c.name}</option>)}
            </select>
          </Field>
          <Field id="tiktok-vid-period" label={lang === "ar" ? "الفترة" : "Period"}>
            <select id="tiktok-vid-period" value={props.period} onChange={(e) => props.onPeriodChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              <option value="7">7 {lang === "ar" ? "أيام" : "days"}</option>
              <option value="30">30 {lang === "ar" ? "يوم" : "days"}</option>
            </select>
          </Field>
          <Field id="tiktok-vid-sort" label={lang === "ar" ? "ترتيب حسب" : "Sort By"}>
            <select id="tiktok-vid-sort" value={props.sortBy} onChange={(e) => props.onSortChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
              <option value="vv">{lang === "ar" ? "المشاهدات" : "Views"}</option>
              <option value="like">{lang === "ar" ? "الإعجابات" : "Likes"}</option>
              <option value="comment">{lang === "ar" ? "التعليقات" : "Comments"}</option>
              <option value="share">{lang === "ar" ? "المشاركات" : "Shares"}</option>
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

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="status" aria-label={lang === "ar" ? "جاري التحميل" : "Loading"}>
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {videos.map((v, i) => (
            <div key={i} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition">
              {v.cover_url && (
                <div className="relative">
                  <img src={v.cover_url} alt="" className="w-full h-40 object-cover" loading="lazy" />
                  {formatDuration(v.duration) && (
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {formatDuration(v.duration)}
                    </span>
                  )}
                </div>
              )}
              <div className="p-3">
                <p className="text-sm font-bold text-slate-800 line-clamp-2 mb-1">{v.title || "No title"}</p>
                <p className="text-xs text-slate-500 mb-2">@{v.author_handle || v.author}</p>
                <div className="flex gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><Eye size={12} className="text-blue-400" aria-hidden="true" />{formatNum(v.views)}</span>
                  <span className="flex items-center gap-1"><Heart size={12} className="text-rose-400" aria-hidden="true" />{formatNum(v.likes)}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={12} className="text-amber-400" aria-hidden="true" />{formatNum(v.comments)}</span>
                  <span className="flex items-center gap-1"><Share2 size={12} className="text-emerald-400" aria-hidden="true" />{formatNum(v.shares)}</span>
                </div>
                {v.video_url && (
                  <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded">
                    <ExternalLink size={12} aria-hidden="true" />
                    {lang === "ar" ? "مشاهدة على TikTok" : "Watch on TikTok"}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && videos.length === 0 && !hasError && (
        <EmptyState title={lang === "ar" ? "اضغط تحميل لعرض الفيديوهات الرائجة" : "Click Load to see trending videos"} />
      )}
    </div>
  );
}
