import { Globe2, MessageSquare, Newspaper, Twitter, Youtube, Instagram, Hash, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

export const sourceIcons: Record<string, any> = {
  youtube: Youtube,
  google: Globe2,
  instagram: Instagram,
  tiktok: Hash,
  twitter: Twitter,
  reddit: MessageSquare,
  news: Newspaper,
};

export const sourceColors: Record<string, string> = {
  youtube: "#FF0000",
  google: "#4285F4",
  instagram: "#E4405F",
  tiktok: "#000000",
  twitter: "#1DA1F2",
  reddit: "#FF4500",
  news: "#6B7280",
};

export const sentimentColors = {
  positive: "#10B981",
  negative: "#EF4444",
  neutral: "#6B7280",
};

export function getSentimentLabel(score: number, lang: string) {
  if (score > 0.1)
    return {
      label: lang === "ar" ? "إيجابي" : "Positive",
      color: sentimentColors.positive,
      icon: ThumbsUp,
    };
  if (score < -0.1)
    return {
      label: lang === "ar" ? "سلبي" : "Negative",
      color: sentimentColors.negative,
      icon: ThumbsDown,
    };
  return {
    label: lang === "ar" ? "محايد" : "Neutral",
    color: sentimentColors.neutral,
    icon: Minus,
  };
}
