import type { AdStats } from "../../types/ad";

interface StatsCardsProps {
  stats: AdStats;
  t: (key: string) => string;
}

/** Brand stat cards: totals, active, spend range, per-country. */
export function StatsCards({ stats, t }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">{t("total_ads")}</p><p className="text-lg font-bold">{stats.total_ads}</p></div>
      <div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">{t("active_ads")}</p><p className="text-lg font-bold text-emerald-600">{stats.active_ads}</p></div>
      <div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">{t("spend")}</p><p className="text-sm font-bold">${stats.total_spend_low} - ${stats.total_spend_high}</p></div>
      <div className="bg-white border rounded-xl p-3"><p className="text-xs text-slate-500">{t("by_country")}</p><p className="text-xs">{Object.entries(stats.by_country || {}).map(([k, v]) => `${k}:${v}`).join(" ")}</p></div>
    </div>
  );
}
