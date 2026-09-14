import { Download, TrendingUp, Star, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

interface OverviewTabProps {
  app: any;
  detailData: any;
  lang: string;
}

/** Overview tab: KPI cards + rating/downloads charts + Apple note + snapshots. */
export function OverviewTab({ app, detailData, lang }: OverviewTabProps) {
  const snap = app.latest_snapshot || {};
  const compact = (v: number) => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en", { notation: "compact" }).format(v);
  const isEst = app.store === "appstore" && snap.downloads_est_low && snap.downloads_est_high;
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <Download size={18} className="mx-auto text-blue-500 mb-1" aria-hidden="true" />
          <p className="text-lg font-bold text-blue-700" title={isEst ? `${snap.downloads_est_low.toLocaleString()} – ${snap.downloads_est_high.toLocaleString()}` : undefined}>
            {isEst
              ? `~${compact(snap.downloads_est_low)}–${compact(snap.downloads_est_high)}`
              : snap.installs_exact ? snap.installs_exact.toLocaleString() : snap.downloads_est ? snap.downloads_est.toLocaleString() : "—"}
          </p>
          <p className="text-[10px] text-slate-500">{lang === "ar" ? (app.store === "appstore" ? "تحميلات مقدّرة *" : "إجمالي التحميلات") : (app.store === "appstore" ? "Est. downloads *" : "Total Downloads")}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <TrendingUp size={18} className="mx-auto text-emerald-500 mb-1" aria-hidden="true" />
          <p className="text-lg font-bold text-emerald-700">
            {app.store === "appstore"
              ? (snap.new_ratings != null ? `+${snap.new_ratings.toLocaleString()}` : "—")
              : (snap.daily_downloads ? `+${snap.daily_downloads.toLocaleString()}` : "—")}
          </p>
          <p className="text-[10px] text-slate-500">{lang === "ar" ? (app.store === "appstore" ? "تقييمات جديدة" : "تحميلات اليوم") : (app.store === "appstore" ? "New ratings" : "Daily Downloads")}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <Star size={18} className="mx-auto text-amber-500 mb-1" aria-hidden="true" />
          <p className="text-lg font-bold text-amber-700">{snap.rating_avg ? snap.rating_avg.toFixed(1) : "—"}</p>
          <p className="text-[10px] text-slate-500">{lang === "ar" ? "التقييم" : "Rating"}</p>
        </div>
        <div className="bg-slate-100 rounded-xl p-3 text-center">
          <BarChart3 size={18} className="mx-auto text-slate-500 mb-1" aria-hidden="true" />
          <p className="text-lg font-bold">{snap.rating_count?.toLocaleString() || "—"}</p>
          <p className="text-[10px] text-slate-500">{lang === "ar" ? "المراجعات" : "Reviews"}</p>
        </div>
      </div>

      {detailData.snapshots?.length > 1 && (
        <div className="border rounded-xl p-3">
          <p className="text-xs font-bold text-slate-700 mb-2">{lang === "ar" ? "تطور التقييم" : "Rating Over Time"}</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={detailData.snapshots}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d?.slice(0, 10) || ""} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(d) => d?.slice(0, 10) || ""} />
              <Line type="monotone" dataKey="rating_avg" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Rating" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {detailData.snapshots?.length > 1 && detailData.snapshots.some((s: any) => s.downloads_est > 0) && (
        <div className="border rounded-xl p-3">
          <p className="text-xs font-bold text-slate-700 mb-2">{lang === "ar" ? "تطور التحميلات" : "Downloads Over Time"}</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={detailData.snapshots}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d?.slice(0, 10) || ""} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v?.toLocaleString() || ""} />
              <Tooltip formatter={(v: any) => v?.toLocaleString() || v} />
              <Bar dataKey="downloads_est" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Downloads" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {app.store === "appstore" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          <TrendingUp size={14} className="inline mr-1 -mt-0.5" aria-hidden="true" />
          {lang === "ar" ? "* آبل لا تكشف عدد التحميلات — النطاق تقدير من إجمالي التقييمات (×20 – ×50) وسرعة التقييمات الجديدة هي مؤشر النمو" : "* Apple doesn't expose download counts — range is estimated from total ratings (×20–×50); new-ratings velocity is the growth signal"}
        </div>
      )}

      <div className="border rounded-xl p-3">
        <p className="text-xs font-bold text-slate-700 mb-2">{lang === "ar" ? "اللقطات" : "Snapshots"} ({detailData.snapshots?.length || 0})</p>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {(detailData.snapshots || []).slice().reverse().map((s: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-slate-50 rounded">
              <span className="text-slate-500">{s.date?.slice(0, 10)} • {s.country}</span>
              <span className="font-medium">
                {s.rating_avg ? `⭐${s.rating_avg.toFixed(1)}` : ""}{" "}
                {s.downloads_est_low && s.downloads_est_high
                  ? `~${compact(s.downloads_est_low)}–${compact(s.downloads_est_high)} DL*`
                  : s.downloads_est ? `${s.downloads_est.toLocaleString()} DL` : ""}
                {s.new_ratings != null && s.new_ratings > 0 ? ` (+${s.new_ratings.toLocaleString()})` : ""}
              </span>
            </div>
          ))}
          {(!detailData.snapshots || detailData.snapshots.length === 0) && (
            <p className="text-xs text-slate-400 text-center py-3">{lang === "ar" ? "لا توجد لقطات بعد — اضغط تحديث" : "No snapshots yet — click Refresh"}</p>
          )}
        </div>
      </div>
    </>
  );
}
