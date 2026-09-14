import { BarChart3, Heart, Share2, MessageCircle, Eye } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { formatNum } from "../../types/tiktok";
import type { TikTokAdDetail } from "../../types/tiktok";

interface AnalyticsTabProps {
  analyticsId: string;
  loading: boolean;
  adDetail: TikTokAdDetail | null;
  hasError: boolean;
  lang: string;
  onIdChange: (v: string) => void;
  onAnalyze: () => void;
}

/** Ad-analytics sub-tab: Material ID lookup + metric cards. */
export function AnalyticsTab(props: AnalyticsTabProps) {
  const { loading, adDetail, hasError, lang } = props;
  return (
    <div>
      <div className="bg-white border rounded-xl p-4 mb-4">
        <label htmlFor="tiktok-material-id" className="text-[10px] text-slate-500 mb-1 block">Material ID</label>
        <div className="flex gap-2">
          <input
            id="tiktok-material-id"
            value={props.analyticsId}
            onChange={(e) => props.onIdChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && props.onAnalyze()}
            placeholder={lang === "ar" ? "الصق Material ID من TikTok Creative Center" : "Paste Material ID from TikTok Creative Center"}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button onClick={props.onAnalyze} disabled={loading || !props.analyticsId.trim()} className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-500">
            <BarChart3 size={14} aria-hidden="true" />
            {lang === "ar" ? "تحليل" : "Analyze"}
          </button>
        </div>
      </div>

      {loading && <div className="h-60 bg-slate-100 rounded-xl animate-pulse" role="status" aria-label={lang === "ar" ? "جاري التحميل" : "Loading"} />}

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
              <Heart size={18} className="mx-auto text-rose-500 mb-1" aria-hidden="true" />
              <p className="text-lg font-bold text-slate-800">{formatNum(adDetail.likes)}</p>
              <p className="text-[10px] text-slate-500">{lang === "ar" ? "إعجابات" : "Likes"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <Share2 size={18} className="mx-auto text-emerald-500 mb-1" aria-hidden="true" />
              <p className="text-lg font-bold text-slate-800">{formatNum(adDetail.shares)}</p>
              <p className="text-[10px] text-slate-500">{lang === "ar" ? "مشاركات" : "Shares"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <MessageCircle size={18} className="mx-auto text-amber-500 mb-1" aria-hidden="true" />
              <p className="text-lg font-bold text-slate-800">{formatNum(adDetail.comments)}</p>
              <p className="text-[10px] text-slate-500">{lang === "ar" ? "تعليقات" : "Comments"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <Eye size={18} className="mx-auto text-blue-500 mb-1" aria-hidden="true" />
              <p className="text-lg font-bold text-slate-800">{adDetail.ctr ? `${(adDetail.ctr * 100).toFixed(1)}%` : "—"}</p>
              <p className="text-[10px] text-slate-500">CTR</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {adDetail.cost !== undefined && adDetail.cost > 0 && (
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">{lang === "ar" ? "التكلفة التقديرية" : "Estimated Cost"}</p>
                <p className="text-lg font-bold text-emerald-700">${adDetail.cost.toFixed(2)}</p>
              </div>
            )}
            {adDetail.landing_page && (
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-slate-500">{lang === "ar" ? "صفحة الهبوط" : "Landing Page"}</p>
                <a href={adDetail.landing_page} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
                  {adDetail.landing_page}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !adDetail && !hasError && (
        <EmptyState title={lang === "ar" ? "أدخل Material ID واضغط تحليل" : "Enter a Material ID and click Analyze"} />
      )}
    </div>
  );
}
