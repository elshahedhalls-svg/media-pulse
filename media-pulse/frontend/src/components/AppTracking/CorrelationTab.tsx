import { RefreshCw, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { EmptyState } from "../EmptyState";

interface CorrelationTabProps {
  correlationData: any;
  roiData: any;
  attributionData: any;
  corrLoading: boolean;
  lang: string;
}

function strengthLabel(strength: string | undefined, lang: string) {
  if (strength === "strong") return "💪 قوي";
  if (strength === "moderate") return "⚡ متوسط";
  if (strength === "weak") return "🐌 ضعيف";
  return "—";
}

/** Correlation & ROI tab: Pearson KPIs, ROI cards, spend/downloads + lag charts, attribution. */
export function CorrelationTab({ correlationData, roiData, attributionData, corrLoading, lang }: CorrelationTabProps) {
  if (corrLoading) {
    return (
      <div className="text-center py-8 text-slate-400" role="status" aria-live="polite">
        <RefreshCw size={24} className="mx-auto mb-2 animate-spin" aria-hidden="true" />
        <p className="text-sm">{lang === "ar" ? "جاري تحليل الارتباط..." : "Analyzing correlation..."}</p>
      </div>
    );
  }

  if (!correlationData) {
    return (
      <EmptyState
        icon={<TrendingUp size={32} className="text-slate-300" />}
        title={lang === "ar" ? "جاري تحميل بيانات الارتباط..." : "Loading correlation data..."}
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="border rounded-xl p-3 bg-blue-50">
          <p className="text-[10px] text-slate-500">{lang === "ar" ? "معامل بيرسون" : "Pearson Correlation"}</p>
          <p className="text-xl font-bold text-blue-700">{correlationData.pearson?.r?.toFixed(2) || "—"}</p>
          <p className="text-[10px] text-slate-500">
            {lang === "ar" ? "قوة:" : "Strength:"} {strengthLabel(correlationData.pearson?.strength, lang)}
            {correlationData.pearson?.significant ? " ✅" : " ⚠️"}
          </p>
        </div>
        <div className="border rounded-xl p-3 bg-emerald-50">
          <p className="text-[10px] text-slate-500">{lang === "ar" ? "أفضل تأخير" : "Best Lag"}</p>
          <p className="text-xl font-bold text-emerald-700">{correlationData.lag_analysis?.best_lag || 0} {lang === "ar" ? "يوم" : "days"}</p>
          <p className="text-[10px] text-slate-500">
            r = {correlationData.lag_analysis?.best_r?.toFixed(2) || "—"}
          </p>
        </div>
      </div>

      {roiData && (
        <div className="grid grid-cols-3 gap-2">
          <div className="border rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500">{lang === "ar" ? "التكلفة/تحميل" : "CAC"}</p>
            <p className="text-sm font-bold text-blue-700">${roiData.cac?.toFixed(2) || "—"}</p>
          </div>
          <div className="border rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500">{lang === "ar" ? "إجمالي الإنفاق" : "Total Spend"}</p>
            <p className="text-sm font-bold text-slate-700">${roiData.total_spend_usd?.toLocaleString() || "—"}</p>
          </div>
          <div className="border rounded-xl p-3 text-center">
            <p className="text-[10px] text-slate-500">{lang === "ar" ? "التحميلات" : "Downloads"}</p>
            <p className="text-sm font-bold text-emerald-700">{roiData.total_downloads?.toLocaleString() || "—"}</p>
          </div>
        </div>
      )}

      {correlationData.series?.dates?.length > 0 && (
        <div className="border rounded-xl p-3">
          <p className="text-xs font-bold text-slate-700 mb-2">
            {lang === "ar" ? "الإنفاق مقابل التحميلات" : "Spend vs Downloads"}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={correlationData.series.dates.map((d: string, i: number) => ({
              date: d,
              spend: correlationData.series.spends[i],
              downloads: correlationData.series.downloads[i],
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v?.toLocaleString() || ""}`} stroke="#3b82f6" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.toLocaleString() || ""} stroke="#22c55e" />
              <Tooltip labelFormatter={(d) => d || ""} formatter={(v: any, name: string) => name === "spend" ? `$${v.toLocaleString()}` : v.toLocaleString()} />
              <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} dot={false} name="Spend (USD)" />
              <Line yAxisId="right" type="monotone" dataKey="downloads" stroke="#22c55e" strokeWidth={2} dot={false} name="Downloads" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {correlationData.lag_analysis?.lag_correlations?.length > 0 && (
        <div className="border rounded-xl p-3">
          <p className="text-xs font-bold text-slate-700 mb-2">
            {lang === "ar" ? "تحليل التأخير" : "Lag Analysis"}
          </p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={correlationData.lag_analysis.lag_correlations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="lag_days" tick={{ fontSize: 10 }} />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => v.toFixed(3)} />
              <Bar dataKey="r" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Correlation (r)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {attributionData && attributionData.total_attributed_installs > 0 && (
        <div className="border rounded-xl p-3">
          <p className="text-xs font-bold text-slate-700 mb-2">
            {lang === "ar" ? "الإنساب (آخر 7 أيام)" : "Attribution (Last 7 days)"}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded">
              <p className="text-slate-500">{lang === "ar" ? "التحميلات المنسبة" : "Attributed Installs"}</p>
              <p className="font-bold">{attributionData.total_attributed_installs}</p>
            </div>
            <div className="bg-slate-50 p-2 rounded">
              <p className="text-slate-500">{lang === "ar" ? "الإنفاق المنسب" : "Spend Attributed"}</p>
              <p className="font-bold">${attributionData.total_spend_attributed?.toFixed(0) || "—"}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            {lang === "ar" ? "نموذج: آخر نقرة (7 أيام)" : "Model: Last Click (7 days)"}
          </p>
        </div>
      )}

      {correlationData.lag_analysis?.insight && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
          💡 {correlationData.lag_analysis.insight}
        </div>
      )}

      <p className="text-[10px] text-slate-400 text-center">
        {lang === "ar"
          ? "⚠️ الإنفاق تقديري (نموذج CPM). التحميلات تقديرية. الارتباط لا يعني السببية."
          : "⚠️ Spend is estimated (CPM model). Downloads are estimates. Correlation does not imply causation."}
      </p>
    </>
  );
}
