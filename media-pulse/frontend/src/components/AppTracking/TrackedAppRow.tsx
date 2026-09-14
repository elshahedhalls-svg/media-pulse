import { Eye, RefreshCw, ExternalLink, Trash2 } from "lucide-react";
import type { TrackedListItem } from "../../types/app";

const ICON_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' rx='10' fill='%2394a3b8'/%3E%3C/svg%3E";

interface TrackedAppRowProps {
  app: TrackedListItem;
  lang: string;
  refreshing: boolean;
  onDetail: (id: number) => void;
  onRefresh: (id: number) => void;
  onRemove: (app: { id: number; name: string }) => void;
}

/** Presentational row for one tracked app — no data fetching inside. */
export function TrackedAppRow({ app, lang, refreshing, onDetail, onRefresh, onRemove }: TrackedAppRowProps) {
  const snap = app.latest_snapshot || {};
  const compact = (v: number) => new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en", { notation: "compact" }).format(v);
  const isEst = app.store === "appstore" && snap.downloads_est_low && snap.downloads_est_high;
  return (
    <div className="flex items-center gap-4 p-3 border border-slate-100 rounded-xl hover:shadow-sm transition bg-slate-50/50">
      <img
        src={app.icon_url || ICON_FALLBACK}
        onError={(e) => { e.currentTarget.src = ICON_FALLBACK; }}
        alt=""
        className="w-12 h-12 rounded-xl object-cover border"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{app.name}</p>
        <p className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${app.store === "play" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
            {app.store === "play" ? "Google Play" : "App Store"}
          </span>
          {app.category && <span className="text-slate-400">• {app.category}</span>}
          {snap.version && <span className="text-slate-400">• v{snap.version}</span>}
          {snap.date && <span className="text-slate-400" title={lang === "ar" ? "آخر فحص" : "Last checked"}>• 🕒 {snap.date.slice(0, 16).replace("T", " ")}</span>}
        </p>
      </div>
      <div className="hidden md:flex gap-4 text-center">
        <div>
          <p className="text-[10px] text-slate-500">{lang === "ar" ? (app.store === "appstore" ? "تحميلات مقدّرة" : "التحميلات") : (app.store === "appstore" ? "Est. installs" : "Installs")}</p>
          <p className="text-xs font-bold text-blue-700" title={isEst ? `${snap.downloads_est_low!.toLocaleString()} – ${snap.downloads_est_high!.toLocaleString()}` : undefined}>
            {isEst
              ? `~${compact(snap.downloads_est_low!)}–${compact(snap.downloads_est_high!)}`
              : snap.installs_exact ? snap.installs_exact.toLocaleString() : snap.downloads_est ? snap.downloads_est.toLocaleString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">{lang === "ar" ? "التقييم" : "Rating"}</p>
          <p className="text-xs font-bold text-amber-600">{snap.rating_avg ? `⭐ ${snap.rating_avg.toFixed(1)}` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">{lang === "ar" ? "المراجعات" : "Reviews"}</p>
          <p className="text-xs font-bold">{snap.rating_count ? snap.rating_count.toLocaleString() : "—"}</p>
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button onClick={() => onDetail(app.id)} aria-label={lang === "ar" ? `عرض تفاصيل ${app.name}` : `View ${app.name} details`} title="تفاصيل" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><Eye size={16} /></button>
        <button onClick={() => onRefresh(app.id)} disabled={refreshing} aria-label={lang === "ar" ? `تحديث ${app.name}` : `Refresh ${app.name}`} title="تحديث" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
        <a href={app.url} target="_blank" rel="noopener noreferrer" aria-label={lang === "ar" ? `فتح ${app.name} في المتجر` : `Open ${app.name} in store`} title="فتح في المتجر" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"><ExternalLink size={16} /></a>
        <button onClick={() => onRemove({ id: app.id, name: app.name })} aria-label={lang === "ar" ? `حذف ${app.name} من المتابعة` : `Remove ${app.name} from tracking`} title="حذف" className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"><Trash2 size={16} /></button>
      </div>
    </div>
  );
}
