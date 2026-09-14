import { Building2, CheckCircle2, RefreshCw } from "lucide-react";
import type { AdPreview } from "../../types/ad";

interface PreviewBarProps {
  preview: AdPreview | null;
  previewing: boolean;
  pendingConfirm: boolean;
  pageName: string;
  lang: string;
  onConfirm: () => void;
  onCancel: () => void;
  onSelectPage: (name: string) => void;
}

/** Meta preview strip: found pages + confirm/cancel before running the search. */
export function PreviewBar({ preview, previewing, pendingConfirm, pageName, lang, onConfirm, onCancel, onSelectPage }: PreviewBarProps) {
  if (previewing) {
    return (
      <div className="mt-3 border-2 border-blue-300 bg-blue-50 rounded-xl p-3" role="status" aria-live="polite">
        <p className="text-xs text-blue-700 flex items-center gap-2"><RefreshCw size={14} className="animate-spin" aria-hidden="true" /> {lang === "ar" ? "جاري فحص Meta Ad Library للصفحات المرتبطة..." : "Scanning Meta Ad Library for related pages..."}</p>
      </div>
    );
  }

  if (!pendingConfirm || !preview) return null;

  return (
    <div className="mt-3 border-2 border-blue-300 bg-blue-50 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-bold text-blue-900 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" aria-hidden="true" />
          {lang === "ar" ? `تم العثور على ${preview.pages_found} صفحة (${preview.total_ads} إعلان حقيقي) لـ "${preview.brand}"` : `Found ${preview.pages_found} pages (${preview.total_ads} real ads) for "${preview.brand}"`}
        </p>
        <div className="flex gap-2">
          <button onClick={onConfirm} className="px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500">
            ✓ {lang === "ar" ? "تأكيد وتنفيذ البحث" : "Confirm & Search"}
          </button>
          <button onClick={onCancel} className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400">
            {lang === "ar" ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-blue-600 mt-1">{preview.note}</p>
      {preview.pages?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {preview.pages.map((p) => (
            <button key={p.page_name} onClick={() => onSelectPage(p.page_name)} title={p.sample_creative} aria-pressed={pageName === p.page_name} className={`px-2.5 py-1 text-xs rounded-full border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${pageName === p.page_name ? "bg-blue-600 text-white border-blue-600" : "bg-white border-blue-200 text-blue-800 hover:bg-blue-100"}`}>
              <Building2 size={11} className="inline mr-1 -mt-0.5" aria-hidden="true" />{p.page_name}
              <span className="ml-1 opacity-70">({p.ads_count} {lang === "ar" ? "إعلان" : "ads"}{p.active_count < p.ads_count ? `, ${p.active_count} ${lang === "ar" ? "نشط" : "active"}` : ""})</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-blue-500 mt-2">{lang === "ar" ? "اضغط على اسم صفحة لفلترة النتائج عليها، ثم أكد البحث" : "Click a page to filter results by it, then confirm the search"}</p>
    </div>
  );
}
