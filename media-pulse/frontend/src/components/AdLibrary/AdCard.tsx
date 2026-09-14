import { ExternalLink, Globe2 } from "lucide-react";
import type { Ad } from "../../types/ad";

interface AdCardProps {
  ad: Ad;
  lang: string;
  t: (key: string) => string;
}

/** Single ad detail card: header, creative body, spend/impression grid. */
export function AdCard({ ad, lang, t }: AdCardProps) {
  const isAr = /[\u0600-\u06FF]/.test(ad.creative_body || "");
  const creativeTypeIcon = ad.creative_type === "video" ? "🎬" : ad.creative_type === "image" ? "🖼️" : "📝";
  const platforms = ad.platforms || [ad.platform];

  return (
    <article className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition bg-slate-50/50">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 flex items-center gap-2 flex-wrap">
            {ad.page_name || "Unknown Page"}
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ad.status === "active" ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-slate-200 text-slate-600 border border-slate-300"}`}>
              {ad.status === "active" ? (lang === "ar" ? "● نشط الآن" : "● Active") : (lang === "ar" ? "متوقف" : "Inactive")}
            </span>
            <span className="text-[11px] font-normal px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{ad.creative_type ? `${creativeTypeIcon} ${ad.creative_type}` : "📝 text"}</span>
          </p>
          <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 flex-wrap">
            <Globe2 size={12} className="text-violet-500" aria-hidden="true" />
            <span className="font-semibold">{lang === "ar" ? "شغال في:" : "Running in:"}</span>
            {(ad.countries || []).map((c) => <span key={c} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-medium">{c}</span>)}
            <span className="text-slate-400" aria-hidden="true">•</span>
            <span>{platforms.join(" + ")}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Library ID: <span className="font-mono text-slate-700 select-all">{ad.library_id || ad.ad_archive_id}</span> • {ad.start_date?.slice(0, 10)} – {ad.duration_days} {t("days")} {ad.is_estimated ? "(تقديري)" : "(رسمي)"}</p>
        </div>
        <a href={ad.snapshot_url} target="_blank" rel="noopener noreferrer" className="shrink-0 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <ExternalLink size={12} aria-hidden="true" /> {lang === "ar" ? "فتح في المكتبة" : "Open in Library"}
        </a>
      </div>
      <div dir={isAr ? "rtl" : "ltr"} className={`p-3 bg-white border rounded-lg text-sm leading-relaxed ${isAr ? "text-right" : "text-left"}`}>
        {ad.creative_body || <span className="text-slate-400">— لا يوجد نص —</span>}
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
        <div className="bg-white p-2.5 rounded-lg border">
          <dt className="text-[11px] text-slate-500">Platforms</dt>
          <dd className="text-xs font-medium text-slate-800 mt-0.5">{platforms.join(" • ")}</dd>
          <dd className="text-[10px] text-slate-400">Facebook • Instagram</dd>
        </div>
        <div className="bg-white p-2.5 rounded-lg border">
          <dt className="text-[11px] text-slate-500">Categories</dt>
          <dd className="text-xs font-medium text-slate-800 mt-0.5">{(ad.categories || ["All"]).join(", ")}</dd>
          <dd className="text-[10px] text-slate-400">Ad Library</dd>
        </div>
        <div className="bg-white p-2.5 rounded-lg border">
          <dt className="text-[11px] text-slate-500">Estimated audience size</dt>
          <dd className="text-xs font-bold text-violet-700 mt-0.5">{ad.audience_low?.toLocaleString()} – {ad.audience_high?.toLocaleString()}</dd>
          <dd className="text-[10px] text-slate-400">Unique reach (65-85% of impressions)</dd>
        </div>
        <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
          <dt className="text-[11px] text-emerald-700">Amount spent (EGP) {ad.is_estimated ? "(تقديري)" : "(رسمي)"}</dt>
          <dd className="text-xs font-bold text-emerald-800 mt-0.5">{ad.spend_egp_low?.toLocaleString()} – {ad.spend_egp_high?.toLocaleString()} EGP</dd>
          <dd className="text-[10px] text-emerald-600">${ad.spend_low} – ${ad.spend_high} USD</dd>
        </div>
        <div className="bg-white p-2.5 rounded-lg border">
          <dt className="text-[11px] text-slate-500">Impressions</dt>
          <dd className="text-xs font-bold text-slate-800 mt-0.5">{ad.impressions_low?.toLocaleString()} – {ad.impressions_high?.toLocaleString()}</dd>
          <dd className="text-[10px] text-slate-400">{ad.impressions_low && ad.audience_low ? `Freq ~ ${(ad.impressions_low / ad.audience_low).toFixed(1)}` : ""}</dd>
        </div>
        <div className="bg-white p-2.5 rounded-lg border">
          <dt className="text-[11px] text-slate-500">Countries • Status</dt>
          <dd className="text-xs font-medium mt-0.5 flex flex-wrap gap-1">
            {(ad.countries || []).map((c) => <span key={c} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[11px]">{c}</span>)}
            <span className={`px-1.5 py-0.5 rounded text-[11px] ${ad.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{ad.status}</span>
          </dd>
          <dd className="text-[10px] text-slate-400 mt-1">Library ID: {String(ad.library_id || ad.ad_archive_id).slice(0, 16)}...</dd>
        </div>
      </dl>
      {ad.disclaimer && <p className="text-[11px] text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-200">{ad.disclaimer}</p>}
    </article>
  );
}
