import type { Country } from "../../types/ad";

interface CountryFilterProps {
  countryList: Country[];
  countries: string[];
  lang: string;
  t: (key: string) => string;
  onToggle: (code: string) => void;
}

/** Country checkbox pills (EG + GCC). */
export function CountryFilter({ countryList, countries, lang, t, onToggle }: CountryFilterProps) {
  return (
    <fieldset className="mt-4">
      <legend className="text-xs font-medium text-slate-700 mb-2">{t("countries")} (EG + GCC)</legend>
      <div className="flex flex-wrap gap-2">
        {countryList.map((c) => {
          const selected = countries.includes(c.code);
          return (
            <label key={c.code} className={`px-3 py-1.5 text-xs rounded-full border cursor-pointer flex items-center gap-1 focus-within:ring-2 focus-within:ring-blue-500 ${selected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"}`}>
              <input type="checkbox" checked={selected} onChange={() => onToggle(c.code)} className="sr-only" />
              {lang === "ar" ? (c.name_ar || c.name) : c.name} ({c.code})
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
