export interface TikTokAd {
  brand?: string;
  title?: string;
  likes?: number;
  ctr?: number;
  cost?: number;
  video_url?: string;
  cover_url?: string;
}

export interface TikTokHashtag {
  rank?: number;
  name: string;
  video_count?: number;
  view_count?: number;
}

export interface TikTokVideo {
  title?: string;
  author?: string;
  author_handle?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  duration?: number;
  cover_url?: string;
  video_url?: string;
}

export interface TikTokAdDetail {
  brand?: string;
  title?: string;
  likes?: number;
  shares?: number;
  comments?: number;
  ctr?: number;
  cost?: number;
  landing_page?: string;
  source?: string;
}

export interface TikTokOption {
  code?: string;
  key?: string;
  name?: string;
  name_ar?: string;
  label?: string;
}

export function formatNum(n: number | undefined | null) {
  return n?.toLocaleString() || "0";
}
