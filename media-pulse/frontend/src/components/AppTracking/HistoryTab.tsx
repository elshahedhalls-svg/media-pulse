import { Calendar, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { EmptyState } from "../EmptyState";

interface HistoryTabProps {
  historyData: any;
  timeRange: string;
  lang: string;
  onRangeChange: (range: string) => void;
}

const RANGES = [
  { key: "1m", labelAr: "شهر", labelEn: "1 Month" },
  { key: "3m", labelAr: "3 شهور", labelEn: "3 Months" },
  { key: "6m", labelAr: "6 شهور", labelEn: "6 Months" },
  { key: "1y", labelAr: "سنة", labelEn: "1 Year" },
  { key: "2y", labelAr: "سنتين", labelEn: "2 Years" },
  { key: "5y", labelAr: "5 سنين", labelEn: "5 Years" },
  { key: "all", labelAr: "الكل", labelEn: "All" },
];

/** History tab: time-range filter + downloads/rating/reviews charts. */
export function HistoryTab({ historyData, timeRange, lang, onRangeChange }: HistoryTabProps) {
  return (
    <>
      <div className="border rounded-xl p-3 bg-slate-50/50">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} className="text-slate-500" aria-hidden="true" />
          <p className="text-xs font-bold text-slate-700">
            {lang === "ar" ? "اختر المدة الزمنية" : "Select Time Range"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={lang === "ar" ? "المدة الزمنية" : "Time range"}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => onRangeChange(r.key)}
              aria-pressed={timeRange === r.key}
              className={`px-3 py-1.5 text-xs rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                timeRange === r.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {lang === "ar" ? r.labelAr : r.labelEn}
            </button>
          ))}
        </div>
      </div>

      {historyData && historyData.data?.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-500">{lang === "ar" ? "عدد اللقطات" : "Snapshots"}</p>
              <p className="text-sm font-bold text-blue-700">{historyData.summary?.total_snapshots || 0}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-500">{lang === "ar" ? "من" : "From"}</p>
              <p className="text-xs font-bold text-emerald-700">{(historyData.summary?.period_start || "").slice(0, 10)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-500">{lang === "ar" ? "إلى" : "To"}</p>
              <p className="text-xs font-bold text-amber-700">{(historyData.summary?.period_end || "").slice(0, 10)}</p>
            </div>
          </div>

          <div className="border rounded-xl p-3">
            <p className="text-xs font-bold text-slate-700 mb-2">
              {lang === "ar" ? "تطور التحميلات" : "Downloads Over Time"}
              <span className="text-slate-400 font-normal mr-2">
                ({historyData.summary?.bucket === "day" ? (lang === "ar" ? "يومي" : "Daily") :
                  historyData.summary?.bucket === "week" ? (lang === "ar" ? "أسبوعي" : "Weekly") :
                  (lang === "ar" ? "شهري" : "Monthly")})
              </span>
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={historyData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v?.toLocaleString() || ""} />
                <Tooltip labelFormatter={(d) => d || ""} formatter={(v: any) => v?.toLocaleString() || v} />
                <Line type="monotone" dataKey="downloads_est" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Downloads" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="border rounded-xl p-3">
            <p className="text-xs font-bold text-slate-700 mb-2">
              {lang === "ar" ? "تطور التقييم" : "Rating Over Time"}
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={historyData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={(d) => d || ""} />
                <Line type="monotone" dataKey="rating_avg" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Rating" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="border rounded-xl p-3">
            <p className="text-xs font-bold text-slate-700 mb-2">
              {lang === "ar" ? "عدد المراجعات" : "Reviews Count Over Time"}
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={historyData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v?.toLocaleString() || ""} />
                <Tooltip labelFormatter={(d) => d || ""} formatter={(v: any) => v?.toLocaleString() || v} />
                <Bar dataKey="rating_count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Reviews" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<TrendingUp size={32} className="text-slate-300" />}
          title={lang === "ar" ? "لا توجد لقطات" : "No snapshots"}
          description={lang === "ar"
            ? historyData ? "لا توجد لقطات في هذه المدة — اعمل refresh للتطبيق" : "اختر مدة زمنية..."
            : historyData ? "No snapshots in this range — refresh the app" : "Select a time range..."}
        />
      )}
    </>
  );
}
