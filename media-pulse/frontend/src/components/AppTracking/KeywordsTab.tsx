import { Hash } from "lucide-react";
import { EmptyState } from "../EmptyState";

interface KeywordsTabProps {
  keywordsData: any;
  lang: string;
}

/** Keywords (ASO) tab: table of ranked keywords. */
export function KeywordsTab({ keywordsData, lang }: KeywordsTabProps) {
  if (!keywordsData || !keywordsData.keywords?.length) {
    return (
      <EmptyState
        icon={<Hash size={32} className="text-slate-300" />}
        title={lang === "ar" ? "لا توجد كلمات مفتاحية" : "No keywords"}
        description={lang === "ar" ? "اضغط تحديث لجلب الكلمات" : "Click refresh to load keywords"}
      />
    );
  }

  return (
    <div className="border rounded-xl p-3">
      <p className="text-xs font-bold text-slate-700 mb-3">{lang === "ar" ? "الكلمات المفتاحية (ASO)" : "ASO Keywords"}</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500 border-b">
            <th scope="col" className="text-right py-1">#</th>
            <th scope="col" className="text-right py-1">{lang === "ar" ? "الكلمة" : "Keyword"}</th>
            <th scope="col" className="text-right py-1">{lang === "ar" ? "الشعبية" : "Popularity"}</th>
            <th scope="col" className="text-right py-1">{lang === "ar" ? "الحجم" : "Volume"}</th>
            <th scope="col" className="text-right py-1">KD</th>
            <th scope="col" className="text-right py-1">Rank</th>
          </tr>
        </thead>
        <tbody>
          {keywordsData.keywords.map((kw: any, i: number) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-1.5 text-slate-400">{kw.rank}</td>
              <td className="py-1.5 font-medium text-slate-800">{kw.keyword}</td>
              <td className="py-1.5">
                <div className="w-16 bg-slate-200 rounded-full h-1.5 inline-block" role="img" aria-label={`Popularity ${kw.popularity}%`}>
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${kw.popularity}%` }} />
                </div>
                <span className="ml-1 text-slate-500">{kw.popularity}</span>
              </td>
              <td className="py-1.5 text-slate-600">{kw.volume?.toLocaleString()}</td>
              <td className="py-1.5"><span className={`px-1 rounded ${kw.kd < 30 ? "bg-green-100 text-green-700" : kw.kd < 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{kw.kd}</span></td>
              <td className="py-1.5 text-slate-600">{kw.rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
