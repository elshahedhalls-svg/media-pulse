import { Globe2 } from "lucide-react";
import type { SourceBreakdown } from "../../types/brand";
import { sourceIcons, sourceColors, getSentimentLabel } from "./helpers";

interface SourcesTabProps {
  breakdown: Record<string, SourceBreakdown>;
  lang: string;
}

/** Sources tab: per-source sentiment cards. */
export function SourcesTab({ breakdown, lang }: SourcesTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(breakdown || {}).map(([source, data]) => {
        const Icon = sourceIcons[source] || Globe2;
        const color = sourceColors[source] || "#6B7280";
        return (
          <div key={source} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                <Icon className="w-5 h-5" style={{ color }} aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 capitalize">{source}</h4>
                <p className="text-sm text-gray-500">{data.count} {lang === "ar" ? "ذكرى" : "mentions"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{lang === "ar" ? "متوسط المشاعر" : "Avg Sentiment"}</span>
                <span className="font-medium" style={{ color: getSentimentLabel(data.avg_sentiment, lang).color }}>{(data.avg_sentiment * 100).toFixed(0)}%</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">👍 {data.positive}</span>
                <span className="text-red-600">👎 {data.negative}</span>
                <span className="text-gray-600">➖ {data.neutral}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
