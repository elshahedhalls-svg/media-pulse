import { Globe2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { EmptyState } from "../EmptyState";

interface CountriesTabProps {
  countriesData: any;
  lang: string;
}

/** Countries tab: downloads bar chart + per-country details. */
export function CountriesTab({ countriesData, lang }: CountriesTabProps) {
  if (!countriesData || !countriesData.countries?.length) {
    return (
      <EmptyState
        icon={<Globe2 size={32} className="text-slate-300" />}
        title={lang === "ar" ? "جاري تحميل بيانات الدول..." : "Loading country data..."}
      />
    );
  }

  return (
    <>
      <div className="border rounded-xl p-3">
        <p className="text-xs font-bold text-slate-700 mb-2">{lang === "ar" ? "التحميلات حسب الدولة" : "Downloads by Country"}</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={countriesData.countries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="country" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v?.toLocaleString() || ""} />
            <Tooltip formatter={(v: any) => v?.toLocaleString() || v} />
            <Bar dataKey="downloads_min" fill="#3b82f6" name="Downloads (min)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="border rounded-xl p-3">
        <p className="text-xs font-bold text-slate-700 mb-2">{lang === "ar" ? "تفاصيل الدول" : "Country Details"}</p>
        <div className="space-y-1.5">
          {countriesData.countries.map((c: any) => (
            <div key={c.country} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded">
              <span className="font-medium">{c.country}</span>
              <span className="text-slate-600">{c.downloads_label} • ⭐{c.rating_avg || "?"}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
