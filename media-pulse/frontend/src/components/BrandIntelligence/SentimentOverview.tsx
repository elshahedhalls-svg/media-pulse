import { Globe2, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { BrandSentiment, Mention } from "../../types/brand";
import { sourceIcons, sourceColors, sentimentColors } from "./helpers";

interface SentimentOverviewProps {
  data: BrandSentiment;
  lang: string;
}

function TopMentions({ title, items, tone, lang }: { title: string; items: Mention[] | undefined; tone: "positive" | "negative"; lang: string }) {
  const Icon = tone === "positive" ? ThumbsUp : ThumbsDown;
  // Static classes only — dynamic `bg-${color}-50` is invisible to the Tailwind scanner.
  const styles = tone === "positive"
    ? { title: "text-green-700", card: "bg-green-50 border-green-100" }
    : { title: "text-red-700", card: "bg-red-50 border-red-100" };
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <h3 className={`text-lg font-semibold ${styles.title} mb-4 flex items-center gap-2`}>
        <Icon className="w-5 h-5" aria-hidden="true" />{title}
      </h3>
      <div className="space-y-3">
        {items?.slice(0, 5).map((m, i) => (
          <div key={i} className={`p-3 ${styles.card} rounded-lg border`}>
            <p className="text-sm text-gray-800 line-clamp-2">{m.text?.substring(0, 150)}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span className="capitalize">{m.source}</span>
              {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" aria-label={lang === "ar" ? "فتح المصدر" : "Open source"} className="text-indigo-600 hover:underline"><ExternalLink className="w-3 h-3" /></a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Overview tab: distribution pie + source performance + top pos/neg mentions. */
export function SentimentOverview({ data, lang }: SentimentOverviewProps) {
  const maxCount = Math.max(...Object.values(data.sources_breakdown || {}).map((d) => d.count), 1);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{lang === "ar" ? "توزيع المشاعر" : "Sentiment Distribution"}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={[
              { name: lang === "ar" ? "إيجابي" : "Positive", value: data.positive_count },
              { name: lang === "ar" ? "سلبي" : "Negative", value: data.negative_count },
              { name: lang === "ar" ? "محايد" : "Neutral", value: data.neutral_count },
            ]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
              <Cell fill={sentimentColors.positive} />
              <Cell fill={sentimentColors.negative} />
              <Cell fill={sentimentColors.neutral} />
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{lang === "ar" ? "أداء المصادر" : "Source Performance"}</h3>
        <div className="space-y-3">
          {Object.entries(data.sources_breakdown || {}).map(([source, info]) => {
            const Icon = sourceIcons[source] || Globe2;
            const color = sourceColors[source] || "#6B7280";
            return (
              <div key={source} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="w-4 h-4" style={{ color }} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 capitalize">{source}</span>
                    <span className="text-sm text-gray-500">{info.count} {lang === "ar" ? "ذكرى" : "mentions"}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1" role="img" aria-label={`${source}: ${info.count} mentions`}>
                    <div className="h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(5, (info.count / maxCount) * 100))}%`, backgroundColor: color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <TopMentions title={lang === "ar" ? "أفضل الذكريات الإيجابية" : "Top Positive"} items={data.positive_mentions} tone="positive" lang={lang} />
      <TopMentions title={lang === "ar" ? "أفضل الذكريات السلبية" : "Top Negative"} items={data.negative_mentions} tone="negative" lang={lang} />
    </div>
  );
}
