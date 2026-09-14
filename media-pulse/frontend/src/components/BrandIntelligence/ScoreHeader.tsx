import type { BrandSentiment } from "../../types/brand";
import { getSentimentLabel } from "./helpers";

interface ScoreHeaderProps {
  data: BrandSentiment;
  lang: string;
}

/** Score ring + total/positive/negative/neutral stat cards. */
export function ScoreHeader({ data, lang }: ScoreHeaderProps) {
  const label = getSentimentLabel(data.overall_score, lang);
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative" role="img" aria-label={`${label.label}: ${(data.overall_score * 100).toFixed(0)}%`}>
          <svg className="w-40 h-40" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="8" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={label.color}
              strokeWidth="8" strokeDasharray={`${Math.abs(data.overall_score) * 251.2} 251.2`}
              strokeDashoffset={data.overall_score >= 0 ? 0 : 251.2 * 0.75} strokeLinecap="round" transform="rotate(-90 50 50)" />
            <text x="50" y="45" textAnchor="middle" className="text-2xl font-bold" fill="#1F2937">{(data.overall_score * 100).toFixed(0)}%</text>
            <text x="50" y="62" textAnchor="middle" className="text-xs" fill="#6B7280">{label.label}</text>
          </svg>
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-3xl font-bold text-gray-900">{data.total_mentions}</p>
            <p className="text-sm text-gray-600">{lang === "ar" ? "إجمالي" : "Total"}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-3xl font-bold text-green-600">{data.positive_count}</p>
            <p className="text-sm text-green-700">{lang === "ar" ? "إيجابي" : "Positive"}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl">
            <p className="text-3xl font-bold text-red-600">{data.negative_count}</p>
            <p className="text-sm text-red-700">{lang === "ar" ? "سلبي" : "Negative"}</p>
          </div>
          <div className="text-center p-4 bg-gray-100 rounded-xl">
            <p className="text-3xl font-bold text-gray-600">{data.neutral_count}</p>
            <p className="text-sm text-gray-700">{lang === "ar" ? "محايد" : "Neutral"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
