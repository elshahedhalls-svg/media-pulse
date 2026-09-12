import { useState, useEffect, useCallback } from "react";
import { Search, BarChart3, TrendingUp, Globe2, MessageSquare, ThumbsUp, ThumbsDown, Minus, Twitter, Youtube, Instagram, Newspaper, Hash, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid } from "recharts";
import { ErrorBoundary } from "../components";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchBrandSentiment(brand: string, sources: string[], limit: number = 100, provider?: string) {
  const params = new URLSearchParams({ sources: sources.join(","), limit: String(limit) });
  if (provider) params.set("provider", provider);
  const res = await fetch(`${API}/api/brand/${encodeURIComponent(brand)}/sentiment?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchBrandMentions(brand: string, sources: string[], limit: number = 50, provider?: string) {
  const params = new URLSearchParams({ sources: sources.join(","), limit: String(limit) });
  if (provider) params.set("provider", provider);
  const res = await fetch(`${API}/api/brand/${encodeURIComponent(brand)}/mentions?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchBrandTrend(brand: string, days: number = 30, sources: string[] = []) {
  const params = new URLSearchParams({ days: String(days) });
  if (sources.length) params.set("sources", sources.join(","));
  const res = await fetch(`${API}/api/brand/${encodeURIComponent(brand)}/trend?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchBrandSources() {
  const res = await fetch(`${API}/api/brand/sources`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const sourceIcons: Record<string, any> = {
  youtube: Youtube, google: Globe2, instagram: Instagram, tiktok: Hash,
  twitter: Twitter, reddit: MessageSquare, news: Newspaper,
};
const sourceColors: Record<string, string> = {
  youtube: "#FF0000", google: "#4285F4", instagram: "#E4405F", tiktok: "#000000",
  twitter: "#1DA1F2", reddit: "#FF4500", news: "#6B7280",
};
const sentimentColors = { positive: "#10B981", negative: "#EF4444", neutral: "#6B7280" };

type Tab = "overview" | "mentions" | "sources" | "trend";

function BrandIntelligenceInner({ t, lang }: { t: any; lang: string }) {
  const [searchBrand, setSearchBrand] = useState("");
  const [brand, setBrand] = useState("");
  const [sources, setSources] = useState<string[]>(["youtube", "google", "instagram", "tiktok", "twitter", "reddit", "news"]);
  const [availableSources, setAvailableSources] = useState<any[]>([]);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [mentionsData, setMentionsData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [mentionFilter, setMentionFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");
  const [provider, setProvider] = useState<string>("");

  useEffect(() => { loadSources(); }, []);

  const loadSources = async () => {
    try { setAvailableSources(await fetchBrandSources()); } catch (e) { console.error(e); }
  };

  const loadTabData = useCallback(async (tab: Tab, b: string, srcs: string[]) => {
    if (!b) return;
    setTabLoading(true);
    try {
      if (tab === "mentions" && !mentionsData) {
        const data = await fetchBrandMentions(b, srcs, 50, provider || undefined);
        setMentionsData(data);
      } else if (tab === "trend" && !trendData) {
        const data = await fetchBrandTrend(b, 30, srcs);
        setTrendData(data);
      }
    } catch (e: any) { console.error(e); }
    setTabLoading(false);
  }, [mentionsData, trendData, provider]);

  const doSearch = async () => {
    if (!searchBrand.trim()) return;
    setLoading(true); setError("");
    const b = searchBrand.trim();
    setBrand(b); setMentionsData(null); setTrendData(null);
    try {
      const sentiment = await fetchBrandSentiment(b, sources, 100, provider || undefined);
      setSentimentData(sentiment);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (brand) loadTabData(tab, brand, sources);
  };

  const toggleSource = (id: string) => setSources(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);

  const getSentimentLabel = (score: number) => {
    if (score > 0.1) return { label: lang === "ar" ? "إيجابي" : "Positive", color: sentimentColors.positive, icon: ThumbsUp };
    if (score < -0.1) return { label: lang === "ar" ? "سلبي" : "Negative", color: sentimentColors.negative, icon: ThumbsDown };
    return { label: lang === "ar" ? "محايد" : "Neutral", color: sentimentColors.neutral, icon: Minus };
  };

  const filteredMentions = mentionsData?.mentions?.filter((m: any) =>
    mentionFilter === "all" || m.sentiment?.label === mentionFilter
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            {lang === "ar" ? "استخبارات البراند" : "Brand Intelligence"}
          </h1>
          <p className="mt-2 text-gray-600">
            {lang === "ar" ? "تحليل شامل لمشاعر البراند من مصادر متعددة" : "Comprehensive brand sentiment analysis from multiple sources"}
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">{lang === "ar" ? "اسم البراند" : "Brand Name"}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={searchBrand} onChange={e => setSearchBrand(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && doSearch()}
                  placeholder={lang === "ar" ? "أدخل اسم البراند..." : "Enter brand name..."}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <select value={provider} onChange={e => setProvider(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white">
                <option value="">{lang === "ar" ? "محلل افتراضي" : "Default Analyzer"}</option>
                <option value="google">{lang === "ar" ? "بحث جوجل" : "Google Search"}</option>
                <option value="firecrawl">{lang === "ar" ? "Firecrawl" : "Firecrawl"}</option>
                <option value="rss">{lang === "ar" ? "RSS" : "RSS Feeds"}</option>
              </select>
              <button onClick={doSearch} disabled={loading || !searchBrand.trim()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {lang === "ar" ? "تحليل" : "Analyze"}
              </button>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{lang === "ar" ? "المصادر" : "Sources"}</label>
            <div className="flex flex-wrap gap-2">
              {availableSources.map((source: any) => {
                const Icon = sourceIcons[source.id] || Globe2;
                return (
                  <button key={source.id} onClick={() => toggleSource(source.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      sources.includes(source.id) ? "bg-indigo-100 text-indigo-700 border-2 border-indigo-300" : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200"
                    }`}>
                    <Icon className="w-4 h-4" />
                    {lang === "ar" ? source.name_ar : source.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"><p className="text-red-700 text-sm">{error}</p></div>}

        {sentimentData && (
          <>
            {/* Overall Score */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative">
                  <svg className="w-40 h-40" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke={getSentimentLabel(sentimentData.overall_score).color}
                      strokeWidth="8" strokeDasharray={`${Math.abs(sentimentData.overall_score) * 251.2} 251.2`}
                      strokeDashoffset={sentimentData.overall_score >= 0 ? 0 : 251.2 * 0.75} strokeLinecap="round" transform="rotate(-90 50 50)" />
                    <text x="50" y="45" textAnchor="middle" className="text-2xl font-bold" fill="#1F2937">{(sentimentData.overall_score * 100).toFixed(0)}%</text>
                    <text x="50" y="62" textAnchor="middle" className="text-xs" fill="#6B7280">{getSentimentLabel(sentimentData.overall_score).label}</text>
                  </svg>
                </div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-3xl font-bold text-gray-900">{sentimentData.total_mentions}</p>
                    <p className="text-sm text-gray-600">{lang === "ar" ? "إجمالي" : "Total"}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <p className="text-3xl font-bold text-green-600">{sentimentData.positive_count}</p>
                    <p className="text-sm text-green-700">{lang === "ar" ? "إيجابي" : "Positive"}</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <p className="text-3xl font-bold text-red-600">{sentimentData.negative_count}</p>
                    <p className="text-sm text-red-700">{lang === "ar" ? "سلبي" : "Negative"}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-100 rounded-xl">
                    <p className="text-3xl font-bold text-gray-600">{sentimentData.neutral_count}</p>
                    <p className="text-sm text-gray-700">{lang === "ar" ? "محايد" : "Neutral"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {([
                { id: "overview" as Tab, label: lang === "ar" ? "نظرة عامة" : "Overview" },
                { id: "mentions" as Tab, label: lang === "ar" ? "الذكريات" : "Mentions" },
                { id: "sources" as Tab, label: lang === "ar" ? "المصادر" : "Sources" },
                { id: "trend" as Tab, label: lang === "ar" ? "الاتجاه" : "Trend" },
              ]).map(tab => (
                <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    activeTab === tab.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}>
                  {tab.id === "trend" && <TrendingUp className="w-4 h-4" />}
                  {tab.label}
                </button>
              ))}
            </div>

            {tabLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-3 text-gray-600">{lang === "ar" ? "جاري تحميل البيانات..." : "Loading data..."}</span>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === "overview" && !tabLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{lang === "ar" ? "توزيع المشاعر" : "Sentiment Distribution"}</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={[
                        { name: lang === "ar" ? "إيجابي" : "Positive", value: sentimentData.positive_count },
                        { name: lang === "ar" ? "سلبي" : "Negative", value: sentimentData.negative_count },
                        { name: lang === "ar" ? "محايد" : "Neutral", value: sentimentData.neutral_count },
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
                    {Object.entries(sentimentData.sources_breakdown || {}).map(([source, data]: [string, any]) => {
                      const Icon = sourceIcons[source] || Globe2;
                      const color = sourceColors[source] || "#6B7280";
                      const maxCount = Math.max(...Object.values(sentimentData.sources_breakdown).map((d: any) => d.count), 1);
                      return (
                        <div key={source} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 capitalize">{source}</span>
                              <span className="text-sm text-gray-500">{data.count} {lang === "ar" ? "ذكرى" : "mentions"}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div className="h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(5, (data.count / maxCount) * 100))}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center gap-2"><ThumbsUp className="w-5 h-5" />{lang === "ar" ? "أفضل الذكريات الإيجابية" : "Top Positive"}</h3>
                  <div className="space-y-3">
                    {sentimentData.positive_mentions?.slice(0, 5).map((m: any, i: number) => (
                      <div key={i} className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm text-gray-800 line-clamp-2">{m.text?.substring(0, 150)}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span className="capitalize">{m.source}</span>
                          {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline"><ExternalLink className="w-3 h-3" /></a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2"><ThumbsDown className="w-5 h-5" />{lang === "ar" ? "أفضل الذكريات السلبية" : "Top Negative"}</h3>
                  <div className="space-y-3">
                    {sentimentData.negative_mentions?.slice(0, 5).map((m: any, i: number) => (
                      <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-sm text-gray-800 line-clamp-2">{m.text?.substring(0, 150)}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span className="capitalize">{m.source}</span>
                          {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline"><ExternalLink className="w-3 h-3" /></a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mentions Tab */}
            {activeTab === "mentions" && !tabLoading && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="flex gap-2 mb-4">
                  {(["all", "positive", "negative", "neutral"] as const).map(f => (
                    <button key={f} onClick={() => setMentionFilter(f)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${mentionFilter === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {lang === "ar" ? { all: "الكل", positive: "إيجابي", negative: "سلبي", neutral: "محايد" }[f] : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                  <button onClick={() => brand && fetchBrandMentions(brand, sources, 50, provider || undefined).then(setMentionsData)}
                    className="ml-auto px-3 py-1 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> {lang === "ar" ? "تحديث" : "Refresh"}
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredMentions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">{lang === "ar" ? "لا توجد ذكريات" : "No mentions found"}</p>
                  ) : filteredMentions.map((mention: any, i: number) => {
                    const sentiment = getSentimentLabel(mention.sentiment?.score || 0);
                    const Icon = sentiment.icon;
                    return (
                      <div key={i} className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${sentiment.color}20` }}>
                            <Icon className="w-4 h-4" style={{ color: sentiment.color }} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{mention.text?.substring(0, 200)}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <span className="capitalize">{mention.source}</span>
                              {mention.author && <span>• @{mention.author}</span>}
                              {mention.url && <a href={mention.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline"><ExternalLink className="w-3 h-3" /></a>}
                            </div>
                          </div>
                          <span className="text-sm font-medium" style={{ color: sentiment.color }}>{(mention.sentiment?.score * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sources Tab */}
            {activeTab === "sources" && !tabLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(sentimentData.sources_breakdown || {}).map(([source, data]: [string, any]) => {
                  const Icon = sourceIcons[source] || Globe2;
                  const color = sourceColors[source] || "#6B7280";
                  return (
                    <div key={source} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                          <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 capitalize">{source}</h4>
                          <p className="text-sm text-gray-500">{data.count} {lang === "ar" ? "ذكرى" : "mentions"}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{lang === "ar" ? "متوسط المشاعر" : "Avg Sentiment"}</span>
                          <span className="font-medium" style={{ color: getSentimentLabel(data.avg_sentiment).color }}>{(data.avg_sentiment * 100).toFixed(0)}%</span>
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
            )}

            {/* Trend Tab */}
            {activeTab === "trend" && !tabLoading && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
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
                  <p className="text-center text-gray-500 py-12">{lang === "ar" ? "لا توجد بيانات اتجاه" : "No trend data available"}</p>
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
            )}

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">
                <strong>{lang === "ar" ? "ملاحظة:" : "Note:"}</strong>{" "}
                {lang === "ar" ? "البيانات من مصادر عامة. تحليل المشاعر بالذكاء الاصطناعي وقد لا يكون دقيقاً 100%. النتائج للرجوع فقط." : "Data from public sources. AI sentiment analysis may not be 100% accurate. For reference only."}
              </p>
            </div>
          </>
        )}

        {!sentimentData && !loading && (
          <div className="text-center py-16">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">{lang === "ar" ? "ابدأ بتحليل البراند" : "Start Analyzing"}</h3>
            <p className="text-gray-500">{lang === "ar" ? "أدخل اسم البراند واضغط تحليل" : "Enter a brand name and click Analyze"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrandIntelligence({ t, lang }: { t: any; lang: string }) {
  return <ErrorBoundary><BrandIntelligenceInner t={t} lang={lang} /></ErrorBoundary>;
}
