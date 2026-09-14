export interface AppSnapshotSummary {
  installs_exact?: number;
  downloads_est?: number;
  installs_display?: string;
  rating_avg?: number;
  rating_count?: number;
  daily_downloads?: number;
  new_ratings?: number;
  downloads_est_low?: number;
  downloads_est_high?: number;
  version?: string;
  date?: string;
  country?: string;
}

export interface TrackedListItem {
  id: number;
  app_id: string;
  name: string;
  store: string;
  icon_url?: string;
  url?: string;
  category?: string;
  latest_snapshot?: AppSnapshotSummary;
}

export interface AppSearchResult {
  app_id: string;
  name: string;
  store: string;
  developer?: string;
  icon_url?: string;
  url?: string;
  category?: string;
}

export interface TrackedApp {
  id: number;
  tracked_id: number;
  app_id: string;
  name: string;
  store: "ios" | "android" | string;
  country: string;
  icon_url?: string;
  url?: string;
  category?: string;
  brand_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface AppSnapshot {
  id: number;
  app_id: number;
  date: string;
  rating?: number;
  rating_count?: number;
  downloads_est?: number;
  country_code: string;
  version?: string;
  description?: string;
}

export interface AppHistory {
  snapshots: AppSnapshot[];
  total_snapshots: number;
}

export interface SentimentData {
  overall_sentiment: string;
  sentiment_score: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  total_reviews: number;
  reviews: Review[];
}

export interface Review {
  id: string;
  text: string;
  rating: number;
  sentiment: string;
  date: string;
  author?: string;
}

export interface KeywordData {
  keywords: Keyword[];
  total_keywords: number;
}

export interface Keyword {
  keyword: string;
  rank: number;
  volume: number;
  difficulty: number;
  trend: "up" | "down" | "stable";
}

export interface CountryDownloads {
  country_code: string;
  country_name: string;
  downloads_est: number;
  percentage: number;
}

export interface CorrelationData {
  app_id: number;
  app_name: string;
  store: string;
  country: string;
  range: string;
  data_points: number;
  date_range: {
    start: string;
    end: string;
  };
  pearson: CorrelationResult;
  spearman: CorrelationResult;
  lag_analysis: LagAnalysis;
  series: {
    dates: string[];
    spends: number[];
    downloads: number[];
  };
  disclaimer: string;
}

export interface CorrelationResult {
  r: number;
  p_value: number;
  n: number;
  strength: "strong" | "moderate" | "weak" | "negligible" | "insufficient" | "no_variance";
  significant: boolean;
}

export interface LagAnalysis {
  best_lag: number;
  best_r: number;
  best_p_value?: number;
  lag_correlations: LagCorrelation[];
  insight?: string;
  message?: string;
}

export interface LagCorrelation {
  lag_days: number;
  r: number;
  p_value: number;
  significant: boolean;
}

export interface ROIData {
  total_spend_usd: number;
  total_downloads: number;
  cac: number;
  revenue_est: number;
  roi_pct: number;
  app_name: string;
  store: string;
  country: string;
  revenue_per_download: number;
  disclaimer: string;
}

export interface AttributionData {
  model: string;
  window_days: number;
  total_attributed_installs: number;
  total_spend_attributed: number;
  attributions: Attribution[];
  app_name: string;
  store: string;
  country: string;
  disclaimer: string;
}

export interface Attribution {
  install_date: string;
  install_country: string;
  ad_archive_id: string;
  page_name: string;
  days_before: number;
  spend_attributed: number;
  model: string;
}
