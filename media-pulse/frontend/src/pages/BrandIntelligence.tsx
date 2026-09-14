import { useState, useEffect, useCallback } from "react";
import { Search, BarChart3, TrendingUp, Globe2, Loader2 } from "lucide-react";
import { ErrorBoundary } from "../components";
import { fetchBrandSentiment, fetchBrandMentions, fetchBrandTrend, fetchBrandSources } from "../api/client";
import type { BrandSentiment } from "../types/brand";
import { sourceIcons } from "../components/BrandIntelligence/helpers";
import { ScoreHeader } from "../components/BrandIntelligence/ScoreHeader";
import { SentimentOverview } from "../components/BrandIntelligence/SentimentOverview";
import { MentionsTab } from "../components/BrandIntelligence/MentionsTab";
import type { MentionFilter } from "../components/BrandIntelligence/MentionsTab";
import { SourcesTab } from "../components/BrandIntelligence/SourcesTab";
import { TrendTab } from "../components/BrandIntelligence/TrendTab";

type Tab = "overview" | "mentions" | "sources" | "trend";

function BrandIntelligenceInner({ t, lang }: { t: any; lang: string }) {
  const [searchBrand, setSearchBrand] = useState("");
  const [brand, setBrand] = useState("");
  const [sources, setSources] = useState<string[]>(["youtube", "google", "instagram", "tiktok", "twitter", "reddit", "news"]);
  const [availableSources, setAvailableSources] = useState<any[]>([]);
  const [sentimentData, setSentimentData] = useState<BrandSentiment | null>(null);
  const [mentionsData, setMentionsData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [mentionFilter, setMentionFilter] = useState<MentionFilter>("all");
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

  const refreshMentions = useCallback(() => {
    if (brand) fetchBrandMentions(brand, sources, 50, provider || undefined).then(setMentionsData).catch(() => {});
  }, [brand, sources, provider]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" aria-hidden="true" />
            {lang === "ar" ? "استخبارات البراند" : "Brand Intelligence"}
          </h2>
          <p className="mt-2 text-gray-600">
            {lang === "ar" ? "تحليل شامل لمشاعر البراند من مصادر متعددة" : "Comprehensive brand sentiment analysis from multiple sources"}
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="brand-name-input" className="block text-sm font-medium text-gray-700 mb-2">{lang === "ar" ? "اسم البراند" : "Brand Name"}</label>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                <input id="brand-name-input" type="text" value={searchBrand} onChange={e => setSearchBrand(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && doSearch()}
                  placeholder={lang === "ar" ? "أدخل اسم البراند..." : "Enter brand name..."}
                  className="w-full ps-10 pe-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none text-lg" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label htmlFor="brand-provider-select" className="block text-xs font-medium text-gray-700 mb-1">{lang === "ar" ? "المحلل" : "Analyzer"}</label>
                <select id="brand-provider-select" value={provider} onChange={e => setProvider(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{lang === "ar" ? "محلل افتراضي" : "Default Analyzer"}</option>
                <option value="google">{lang === "ar" ? "بحث جوجل" : "Google Search"}</option>
                <option value="firecrawl">{lang === "ar" ? "Firecrawl" : "Firecrawl"}</option>
                <option value="rss">{lang === "ar" ? "RSS" : "RSS Feeds"}</option>
              </select>
              </div>
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
                const selected = sources.includes(source.id);
                return (
                  <button key={source.id} onClick={() => toggleSource(source.id)} aria-pressed={selected}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      selected ? "bg-indigo-100 text-indigo-700 border-2 border-indigo-300" : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200"
                    }`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {lang === "ar" ? source.name_ar : source.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"><p className="text-red-700 text-sm">{error}</p></div>}

        {sentimentData && (
          <>
            <ScoreHeader data={sentimentData} lang={lang} />

            {/* Tabs */}
            <div className="flex gap-2 mb-6" role="tablist" aria-label={lang === "ar" ? "أقسام التحليل" : "Analysis sections"}>
              {([
                { id: "overview" as Tab, label: lang === "ar" ? "نظرة عامة" : "Overview" },
                { id: "mentions" as Tab, label: lang === "ar" ? "الذكريات" : "Mentions" },
                { id: "sources" as Tab, label: lang === "ar" ? "المصادر" : "Sources" },
                { id: "trend" as Tab, label: lang === "ar" ? "الاتجاه" : "Trend" },
              ]).map(tab => (
                <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => handleTabChange(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    activeTab === tab.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}>
                  {tab.id === "trend" && <TrendingUp className="w-4 h-4" aria-hidden="true" />}
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
              <SentimentOverview data={sentimentData} lang={lang} />
            )}

            {/* Mentions Tab */}
            {activeTab === "mentions" && !tabLoading && (
              <MentionsTab
                mentions={mentionsData?.mentions || []}
                filter={mentionFilter}
                lang={lang}
                onFilterChange={setMentionFilter}
                onRefresh={refreshMentions}
              />
            )}

            {/* Sources Tab */}
            {activeTab === "sources" && !tabLoading && (
              <SourcesTab breakdown={sentimentData.sources_breakdown} lang={lang} />
            )}

            {/* Trend Tab */}
            {activeTab === "trend" && !tabLoading && (
              <TrendTab trendData={trendData} lang={lang} />
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
