export interface BrandSentiment {
  brand: string;
  provider: string;
  overall_score: number;
  total_mentions: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  positive_percentage: number;
  negative_percentage: number;
  neutral_percentage: number;
  sources_breakdown: Record<string, SourceBreakdown>;
  positive_mentions: Mention[];
  negative_mentions: Mention[];
  neutral_mentions: Mention[];
  all_mentions: Mention[];
  analyzed_at: string;
}

export interface SourceBreakdown {
  count: number;
  avg_sentiment: number;
  positive: number;
  negative: number;
  neutral: number;
}

export interface Mention {
  text: string;
  source: string;
  author: string;
  date: string;
  url: string;
  score: number;
  title: string;
  comments_count: number;
  sentiment: Sentiment;
}

export interface Sentiment {
  score: number;
  label: "positive" | "negative" | "neutral";
  confidence: number;
}

export interface BrandMention {
  id: string;
  text: string;
  source: string;
  url: string;
  author?: string;
  date: string;
  sentiment?: Sentiment;
}

export interface ScraperProvider {
  id: string;
  name: string;
  name_ar: string;
  type: string;
  supported_sources: string[];
  requires_api_key: boolean;
  is_available: boolean;
}
