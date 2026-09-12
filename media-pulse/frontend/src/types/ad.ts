export interface Ad {
  ad_archive_id: string;
  library_id?: string;
  page_name: string;
  status: "active" | "inactive" | string;
  creative_body: string;
  creative_type: "video" | "image" | "text" | string;
  countries: string[];
  platforms: string[];
  platform: string;
  spend_low: number;
  spend_high: number;
  spend_egp_low: number;
  spend_egp_high: number;
  impressions_low: number;
  impressions_high: number;
  audience_low: number;
  audience_high: number;
  categories: string[];
  start_date: string;
  duration_days: number;
  is_estimated: boolean;
  snapshot_url: string;
  disclaimer?: string;
}

export interface AdPreview {
  brand: string;
  preview_country: string;
  pages_found: number;
  total_ads: number;
  pages: PagePreview[];
  note: string;
}

export interface PagePreview {
  page_name: string;
  ads_count: number;
  active_count: number;
  example_creative?: string;
  sample_creative?: string;
  is_new?: boolean;
}

export interface AdSearchResponse {
  ads: Ad[];
  results_found: number;
  results_saved: number;
  disclaimer: string;
}

export interface AdStats {
  total_ads: number;
  active_ads: number;
  total_spend_low: number;
  total_spend_high: number;
  by_country: Record<string, number>;
}

export interface Country {
  code: string;
  name: string;
  name_ar: string;
}
