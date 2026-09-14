import { useState, useEffect, Suspense, lazy } from "react";
import Login from "./pages/Login";
import { clearToken } from "./api/client";
import { ErrorBoundary } from "./components";
import ar from "./i18n/ar.json";
import en from "./i18n/en.json";
import { Megaphone, Smartphone, BarChart3, Video } from "lucide-react";

// Code-split heavy pages (each pulls recharts) so the initial bundle stays small.
const AdLibrary = lazy(() => import("./pages/AdLibrary"));
const AppTracking = lazy(() => import("./pages/AppTracking"));
const BrandIntelligence = lazy(() => import("./pages/BrandIntelligence"));
const TikTokAds = lazy(() => import("./pages/TikTokAds"));

function PageFallback() {
  return (
    <div className="p-6 space-y-3" aria-busy="true" aria-label="Loading page">
      <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
      <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
    </div>
  );
}

export type Lang = "ar" | "en";
const dicts = { ar, en };

export function useLang() {
  const [lang, setLang] = useState<Lang>((localStorage.getItem("mp_lang") as Lang) || "ar");
  useEffect(() => {
    localStorage.setItem("mp_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const t = (k: string) => (dicts[lang] as any)[k] || k;
  return { lang, setLang, t };
}

type Tab = "ads" | "apps" | "brand" | "tiktok";

const mainTabs: { id: Tab; icon: typeof Megaphone; labelAr: string; labelEn: string }[] = [
  { id: "ads", icon: Megaphone, labelAr: "إعلانات فيسبوك", labelEn: "Meta Ads" },
  { id: "apps", icon: Smartphone, labelAr: "تتبع التطبيقات", labelEn: "App Tracking" },
  { id: "brand", icon: BarChart3, labelAr: "استخبارات البراند", labelEn: "Brand Intelligence" },
  { id: "tiktok", icon: Video, labelAr: "إعلانات تيك توك", labelEn: "TikTok Ads" },
];

// Static Tailwind classes per tab — DO NOT interpolate color names
// (dynamic `border-${color}-500` is invisible to the JIT scanner and silently breaks).
const tabStyles: Record<Tab, { active: string; focus: string }> = {
  ads: { active: "border-blue-500", focus: "focus:ring-blue-500" },
  apps: { active: "border-emerald-500", focus: "focus:ring-emerald-500" },
  brand: { active: "border-indigo-500", focus: "focus:ring-indigo-500" },
  tiktok: { active: "border-rose-500", focus: "focus:ring-rose-500" },
};

export default function App() {
  const { lang, setLang, t } = useLang();
  const [authed, setAuthed] = useState(!!localStorage.getItem("mp_token"));
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<Tab>((localStorage.getItem("mp_tab") as Tab) || "ads");

  useEffect(() => {
    localStorage.setItem("mp_tab", tab);
  }, [tab]);

  useEffect(() => {
    const token = localStorage.getItem("mp_token");
    if (token) {
      fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) { clearToken(); setAuthed(false); return null; }
          return r.json();
        })
        .then(d => { if (d?.username) setUser(d); })
        .catch(() => { clearToken(); setAuthed(false); });
    } else {
      setAuthed(false);
    }
  }, [authed]);

  const logout = () => { localStorage.removeItem("mp_token"); setAuthed(false); setUser(null); };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold" aria-hidden="true">MP</div>
          <div>
            <h1 className="text-sm font-bold">{t("app_name")}</h1>
            <p className="text-[11px] text-slate-400">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="px-3 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
          >
            {lang === "ar" ? "EN" : "العربية"}
          </button>
          {authed && (
            <>
              <span className="text-xs text-slate-300">{user?.username} ({user?.role})</span>
              <button
                onClick={logout}
                className="px-3 py-1 text-xs bg-rose-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>
      {authed && (
        <nav role="tablist" aria-label="Main navigation" className="bg-slate-900 border-b border-slate-700 px-6 flex gap-1">
          {mainTabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`tabpanel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm flex items-center gap-2 border-b-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${tabStyles[t.id].focus} ${
                tab === t.id
                  ? `${tabStyles[t.id].active} text-white`
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <t.icon size={15} aria-hidden="true" />
              {lang === "ar" ? t.labelAr : t.labelEn}
            </button>
          ))}
        </nav>
      )}
      <main>
        {!authed ? (
          <Login t={t} onLogin={() => setAuthed(true)} />
        ) : (
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <div role="tabpanel" id="tabpanel-ads" hidden={tab !== "ads"}>
                {tab === "ads" && <AdLibrary t={t} lang={lang} />}
              </div>
              <div role="tabpanel" id="tabpanel-apps" hidden={tab !== "apps"}>
                {tab === "apps" && <AppTracking t={t} lang={lang} />}
              </div>
              <div role="tabpanel" id="tabpanel-brand" hidden={tab !== "brand"}>
                {tab === "brand" && <BrandIntelligence t={t} lang={lang} />}
              </div>
              <div role="tabpanel" id="tabpanel-tiktok" hidden={tab !== "tiktok"}>
                {tab === "tiktok" && <TikTokAds t={t} lang={lang} />}
              </div>
            </Suspense>
          </ErrorBoundary>
        )}
      </main>
      <footer className="text-center text-[11px] text-slate-400 py-4">
        Media Pulse Demo • {t("disclaimer")}
      </footer>
    </div>
  );
}
