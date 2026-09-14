import { ExternalLink, RefreshCw } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { getSentimentLabel } from "./helpers";

export type MentionFilter = "all" | "positive" | "negative" | "neutral";

interface MentionsTabProps {
  mentions: any[];
  filter: MentionFilter;
  lang: string;
  onFilterChange: (f: MentionFilter) => void;
  onRefresh: () => void;
}

const FILTERS: MentionFilter[] = ["all", "positive", "negative", "neutral"];

function filterLabel(f: MentionFilter, lang: string) {
  if (lang === "ar") return { all: "الكل", positive: "إيجابي", negative: "سلبي", neutral: "محايد" }[f];
  return f.charAt(0).toUpperCase() + f.slice(1);
}

/** Mentions tab: sentiment filter + refresh + mention list. */
export function MentionsTab({ mentions, filter, lang, onFilterChange, onRefresh }: MentionsTabProps) {
  const filtered = filter === "all" ? mentions : mentions.filter((m) => m.sentiment?.label === filter);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => onFilterChange(f)} aria-pressed={filter === f}
            className={`px-3 py-1 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${filter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {filterLabel(f, lang)}
          </button>
        ))}
        <button onClick={onRefresh}
          className="ml-auto px-3 py-1 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <RefreshCw className="w-3 h-3" aria-hidden="true" /> {lang === "ar" ? "تحديث" : "Refresh"}
        </button>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState title={lang === "ar" ? "لا توجد ذكريات" : "No mentions found"} />
        ) : filtered.map((mention, i) => {
          const sentiment = getSentimentLabel(mention.sentiment?.score || 0, lang);
          const Icon = sentiment.icon;
          return (
            <div key={i} className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${sentiment.color}20` }}>
                  <Icon className="w-4 h-4" style={{ color: sentiment.color }} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{mention.text?.substring(0, 200)}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="capitalize">{mention.source}</span>
                    {mention.author && <span>• @{mention.author}</span>}
                    {mention.url && <a href={mention.url} target="_blank" rel="noopener noreferrer" aria-label={lang === "ar" ? "فتح المصدر" : "Open source"} className="text-indigo-600 hover:underline"><ExternalLink className="w-3 h-3" /></a>}
                  </div>
                </div>
                <span className="text-sm font-medium" style={{ color: sentiment.color }}>{(mention.sentiment?.score * 100).toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
