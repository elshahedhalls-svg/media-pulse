interface KeywordsPanelProps {
  keywords: string[];
  selectedKw: string | null;
  customKw: string;
  brand: string;
  lang: string;
  t: (key: string) => string;
  onCustomKwChange: (v: string) => void;
  onAddCustomKw: () => void;
  onUseKeyword: (kw: string) => void;
}

/** Auto-generated keyword suggestions + custom keyword input. */
export function KeywordsPanel({ keywords, selectedKw, customKw, brand, lang, t, onCustomKwChange, onAddCustomKw, onUseKeyword }: KeywordsPanelProps) {
  return (
    <div className="mt-3">
      <div className="flex gap-2 mb-2">
        <label htmlFor="ad-custom-kw" className="sr-only">{lang === "ar" ? "كلمة مخصصة" : "Custom keyword"}</label>
        <input id="ad-custom-kw" value={customKw} onChange={(e) => onCustomKwChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAddCustomKw()} placeholder={lang === "ar" ? "أضف كلمة مخصصة..." : "Add custom keyword..."} className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
        <button onClick={onAddCustomKw} className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">+ {lang === "ar" ? "إضافة" : "Add"}</button>
      </div>
      {keywords.length > 0 ? (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl">
          <p className="text-xs font-bold text-amber-800">🔑 {t("keyword_auto")} <span className="text-[11px] font-normal text-amber-600">({keywords.length}) – {t("customize")} – اضغط للبحث</span></p>
          <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto">
            {keywords.map((k) => (
              <button key={k} onClick={() => onUseKeyword(k)} aria-pressed={selectedKw === k} className={`px-2.5 py-1 text-xs rounded-full border transition focus:outline-none focus:ring-2 focus:ring-amber-500 ${selectedKw === k ? "bg-blue-600 text-white border-blue-600" : "bg-white border-amber-200 text-amber-800 hover:bg-amber-100"}`}>
                {k} {selectedKw === k && "✓"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-amber-700 mt-2">💡 اكتب في الحقل العلوي (Brand) وشاهد الكلمات تتولد تلقائياً – أو أضف كلمة مخصصة واضغط عليها للبحث</p>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
          <p className="text-xs text-slate-500">{brand.trim().length < 2 ? (lang === "ar" ? "اكتب حرفين على الأقل ليظهر الاقتراحات" : "Type at least 2 chars for suggestions") : (lang === "ar" ? "جاري تحميل الاقتراحات..." : "Loading suggestions...")}</p>
        </div>
      )}
    </div>
  );
}
