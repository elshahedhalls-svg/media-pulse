import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { EmptyState } from "../EmptyState";
import { sentimentColors } from "./helpers";

interface TrendTabProps {
  trendData: any;
  lang: string;
}

/** Trend tab: 30-day sentiment line + daily breakdown bars. */
export function TrendTab({ trendData, lang }: TrendTabProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-indigo-600" aria-hidden="true" />
        {lang === "ar" ? "اتجاه المشاعر خلال 30 يوم" : "Sentiment Trend (30 Days)"}
      </h3>
      {trendData?.trend?.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={trendData.trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[-1, 1]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="avg_sentiment" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} name={lang === "ar" ? "متوسط المشاعر" : "Avg Sentiment"} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState title={lang === "ar" ? "لا توجد بيانات اتجاه" : "No trend data available"} />
      )}
      {trendData?.daily_breakdown && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">{lang === "ar" ? "التوزيع اليومي" : "Daily Breakdown"}</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={Object.entries(trendData.daily_breakdown).map(([date, counts]: [string, any]) => ({
              date, positive: counts.positive || 0, negative: counts.negative || 0, neutral: counts.neutral || 0,
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="positive" fill={sentimentColors.positive} name={lang === "ar" ? "إيجابي" : "Positive"} />
              <Bar dataKey="negative" fill={sentimentColors.negative} name={lang === "ar" ? "سلبي" : "Negative"} />
              <Bar dataKey="neutral" fill={sentimentColors.neutral} name={lang === "ar" ? "محايد" : "Neutral"} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
