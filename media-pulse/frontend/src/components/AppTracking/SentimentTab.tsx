import { RefreshCw, MessageSquare } from "lucide-react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { EmptyState } from "../EmptyState";

interface SentimentTabProps {
  sentimentData: any;
  lang: string;
  onRefresh: () => void;
}

function SentimentSummaryCard({ title, data }: { title: string; data: any }) {
  if (!data) return <p className="text-xs text-slate-400">—</p>;
  return (
    <>
      <div className="flex gap-2 mb-2">
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">+{data.positive_pct}%</span>
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">-{data.negative_pct}%</span>
        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">={data.neutral_pct}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2" role="img" aria-label={`${title}: ${data.positive_pct}% positive`}>
        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${data.positive_pct}%` }} />
      </div>
      <p className="text-[10px] text-slate-500 mt-1">Score: {data.sentiment_score}</p>
    </>
  );
}

/** Sentiment tab: summary cards + distribution pie + recent reviews. */
export function SentimentTab({ sentimentData, lang, onRefresh }: SentimentTabProps) {
  if (!sentimentData || sentimentData.total_reviews === 0) {
    return (
      <EmptyState
        icon={<MessageSquare size={32} className="text-slate-300" />}
        title={lang === "ar" ? "لا توجد مراجعات بعد" : "No reviews yet"}
        description={lang === "ar" ? "اضغط تحديث لجلب المراجعات" : "Click refresh to load reviews"}
        action={
          <button onClick={onRefresh} className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400">
            {lang === "ar" ? "تحديث" : "Refresh"}
          </button>
        }
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700">{lang === "ar" ? "تحليل المشاعر" : "Sentiment Analysis"}</h3>
        <button onClick={onRefresh} className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-slate-400">
          <RefreshCw size={12} /> {lang === "ar" ? "تحديث" : "Refresh"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="border rounded-xl p-3">
          <p className="text-xs font-bold text-slate-700 mb-2">{lang === "ar" ? "آخر 10 ريفيوز" : "Recent 10 Reviews"}</p>
          <SentimentSummaryCard title="Recent" data={sentimentData.recent_sentiment} />
        </div>
        <div className="border rounded-xl p-3">
          <p className="text-xs font-bold text-slate-700 mb-2">{lang === "ar" ? "أعلى 10 ريفيوز" : "Top 10 Reviews"}</p>
          <SentimentSummaryCard title="Top" data={sentimentData.top_sentiment} />
        </div>
      </div>

      {sentimentData.recent_sentiment && (
        <div className="border rounded-xl p-3">
          <p className="text-xs font-bold text-slate-700 mb-2">{lang === "ar" ? "توزيع المشاعر" : "Sentiment Distribution"}</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={[
                { name: lang === "ar" ? "إيجابي" : "Positive", value: sentimentData.recent_sentiment.positive },
                { name: lang === "ar" ? "سلبي" : "Negative", value: sentimentData.recent_sentiment.negative },
                { name: lang === "ar" ? "محايد" : "Neutral", value: sentimentData.recent_sentiment.neutral },
              ]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                <Cell fill="#22c55e" />
                <Cell fill="#ef4444" />
                <Cell fill="#6b7280" />
              </Pie>
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="border rounded-xl p-3">
        <p className="text-xs font-bold text-slate-700 mb-2">{lang === "ar" ? "الريفيوز" : "Reviews"} ({sentimentData.total_reviews})</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(sentimentData.recent_sentiment?.details || []).slice(0, 5).map((rev: any, i: number) => (
            <div key={i} className="p-2 bg-slate-50 rounded text-xs">
              <div className="flex justify-between mb-1">
                <span className="font-medium">{rev.author}</span>
                <span aria-label={`${rev.stars} stars`}>{"⭐".repeat(rev.stars)}</span>
              </div>
              <p className="text-slate-600">{rev.text?.slice(0, 100)}{rev.text?.length > 100 ? "..." : ""}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
