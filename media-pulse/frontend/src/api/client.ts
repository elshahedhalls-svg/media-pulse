const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken() { return localStorage.getItem("mp_token"); }
export function setToken(t: string) { localStorage.setItem("mp_token", t); }
export function clearToken() { localStorage.removeItem("mp_token"); }

function headers() {
  const h: any = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

export async function login(username: string, password: string) {
  const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  if (!r.ok) throw new Error((await r.json()).detail || "Login failed");
  return r.json();
}

export async function previewBrand(brand: string, countries: string[], platform="meta", page_name?: string) {
  const r = await fetch(`${API}/api/ads/preview`, { method: "POST", headers: headers(), body: JSON.stringify({ brand_name: brand, countries, platform, use_api: true, page_name: page_name || null }) });
  if (!r.ok) throw new Error((await r.json()).detail || "Preview failed");
  return r.json();
}

export async function searchAds(brand: string, countries: string[], platform="meta", use_api=true, page_name?: string, active_only=true) {
  const r = await fetch(`${API}/api/ads/search`, { method: "POST", headers: headers(), body: JSON.stringify({ brand_name: brand, countries, platform, use_api, page_name: page_name || null, active_only }) });
  if (!r.ok) throw new Error((await r.json()).detail || "Search failed");
  return r.json();
}

export async function listAds(brand?: string, countries?: string[], page_name?: string, active_only=true) {
  const p = new URLSearchParams();
  if (brand) p.set("brand", brand);
  if (countries?.length) p.set("countries", countries.join(","));
  if (page_name) p.set("page_name", page_name);
  p.set("active_only", String(active_only));
  const r = await fetch(`${API}/api/ads?${p.toString()}`, { headers: headers() });
  return r.json();
}

export async function getCountries() {
  const r = await fetch(`${API}/api/countries`);
  return r.json();
}

export async function getKeywords(brand: string) {
  const r = await fetch(`${API}/api/keywords/${encodeURIComponent(brand)}`, { headers: headers() });
  return r.json();
}

export async function getStats(brand: string) {
  const r = await fetch(`${API}/api/stats/${encodeURIComponent(brand)}`, { headers: headers() });
  return r.json();
}

export async function searchPages(query: string) {
  if (!query || query.trim().length < 1) return [];
  const r = await fetch(`${API}/api/pages/search?q=${encodeURIComponent(query)}`);
  if (!r.ok) return [];
  return r.json();
}

export function exportUrl(brand?: string, countries?: string[]) {
  const p = new URLSearchParams();
  if (brand) p.set("brand", brand);
  if (countries?.length) p.set("countries", countries.join(","));
  const token = getToken();
  // We use fetch with auth instead of direct link, so handle in component
  return `${API}/api/export/ads?${p.toString()}`;
}

export async function exportAds(brand?: string, countries?: string[]) {
  const p = new URLSearchParams();
  if (brand) p.set("brand", brand);
  if (countries?.length) p.set("countries", countries.join(","));
  const r = await fetch(`${API}/api/export/ads?${p.toString()}`, { headers: headers() });
  if (!r.ok) throw new Error("Export failed");
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${brand || "ads"}_${new Date().toISOString().slice(0,10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== APP TRACKING ====================
export async function searchApps(query: string, store: string = "all", country: string = "EG") {
  const r = await fetch(`${API}/api/apps/search?query=${encodeURIComponent(query)}&store=${store}&country=${country}`, { method: "POST", headers: headers() });
  if (!r.ok) throw new Error((await r.json()).detail || "Search failed");
  return r.json();
}

export async function trackApp(data: { app_id: string; store: string; name: string; country: string; icon_url?: string; url?: string; category?: string }) {
  const r = await fetch(`${API}/api/apps/track`, { method: "POST", headers: headers(), body: JSON.stringify(data) });
  if (!r.ok) throw new Error((await r.json()).detail || "Track failed");
  return r.json();
}

export async function trackAppByUrl(url: string, country: string = "EG") {
  const r = await fetch(`${API}/api/apps/track-url?country=${country}`, { method: "POST", headers: headers(), body: JSON.stringify({ url }) });
  if (!r.ok) throw new Error((await r.json()).detail || "Failed to add app by link");
  return r.json();
}

export async function listTrackedApps(country?: string) {
  const q = country ? `?country=${country}` : "";
  const r = await fetch(`${API}/api/apps${q}`, { headers: headers() });
  if (!r.ok) throw new Error((await r.json()).detail || "Failed to load apps");
  return r.json();
}

export async function getTrackedApp(trackedId: number) {
  const r = await fetch(`${API}/api/apps/${trackedId}`, { headers: headers() });
  if (!r.ok) throw new Error((await r.json()).detail || "Failed to load app");
  return r.json();
}

// Alias kept for readability at call sites that load full detail (snapshots included).
export const getTrackedAppDetail = getTrackedApp;

export async function refreshApp(trackedId: number, country: string = "EG") {
  const r = await fetch(`${API}/api/apps/${trackedId}/refresh?country=${country}`, { method: "POST", headers: headers() });
  if (!r.ok) throw new Error((await r.json()).detail || "Refresh failed");
  return r.json();
}

export async function getAppHistory(trackedId: number, country?: string, range: string = "all") {
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (range && range !== "all") params.set("range", range);
  const q = params.toString() ? `?${params.toString()}` : "";
  const r = await fetch(`${API}/api/apps/${trackedId}/history${q}`, { headers: headers() });
  return r.json();
}

export async function removeTrackedApp(trackedId: number) {
  const r = await fetch(`${API}/api/apps/${trackedId}`, { method: "DELETE", headers: headers() });
  if (!r.ok) throw new Error("Delete failed");
  return r.json();
}

// ==================== SENTIMENT ANALYSIS ====================
export async function getSentiment(trackedId: number, country: string = "EG") {
  const r = await fetch(`${API}/api/apps/${trackedId}/sentiment?country=${country}`, { headers: headers() });
  return r.json();
}

export async function getStoreRank(trackedId: number, country: string = "EG") {
  const r = await fetch(`${API}/api/apps/${trackedId}/rank?country=${country}`, { headers: headers() });
  return r.json();
}

export async function getAsKeywords(trackedId: number, country: string = "EG") {
  const r = await fetch(`${API}/api/apps/${trackedId}/keywords?country=${country}`, { headers: headers() });
  return r.json();
}

export async function getCountryDownloads(trackedId: number) {
  const r = await fetch(`${API}/api/apps/${trackedId}/countries`, { headers: headers() });
  return r.json();
}

export async function getWeeklyTracking(trackedId: number, weeks: number = 12) {
  const r = await fetch(`${API}/api/apps/${trackedId}/weekly?weeks=${weeks}`, { headers: headers() });
  return r.json();
}

// ==================== CORRELATION ====================
export async function getCorrelation(trackedId: number, country?: string, range: string = "all", maxLag: number = 14) {
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (range && range !== "all") params.set("range", range);
  if (maxLag !== 14) params.set("max_lag", String(maxLag));
  const q = params.toString() ? `?${params.toString()}` : "";
  const r = await fetch(`${API}/api/correlation/${trackedId}${q}`, { headers: headers() });
  return r.json();
}

export async function getROI(trackedId: number, country?: string, revenuePerDownload: number = 0) {
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (revenuePerDownload > 0) params.set("revenue_per_download", String(revenuePerDownload));
  const q = params.toString() ? `?${params.toString()}` : "";
  const r = await fetch(`${API}/api/correlation/${trackedId}/roi${q}`, { headers: headers() });
  return r.json();
}

export async function getAttribution(trackedId: number, country?: string, model: string = "last_click", windowDays: number = 7) {
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  params.set("model", model);
  params.set("window_days", String(windowDays));
  const q = `?${params.toString()}`;
  const r = await fetch(`${API}/api/correlation/${trackedId}/attribution${q}`, { headers: headers() });
  return r.json();
}

// ==================== BRAND INTELLIGENCE (auth included) ====================
export async function fetchBrandSentiment(brand: string, sources: string[], limit: number = 100, provider?: string) {
  const params = new URLSearchParams({ sources: sources.join(","), limit: String(limit) });
  if (provider) params.set("provider", provider);
  const r = await fetch(`${API}/api/brand/${encodeURIComponent(brand)}/sentiment?${params}`, { headers: headers() });
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
}

export async function fetchBrandMentions(brand: string, sources: string[], limit: number = 50, provider?: string) {
  const params = new URLSearchParams({ sources: sources.join(","), limit: String(limit) });
  if (provider) params.set("provider", provider);
  const r = await fetch(`${API}/api/brand/${encodeURIComponent(brand)}/mentions?${params}`, { headers: headers() });
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
}

export async function fetchBrandTrend(brand: string, days: number = 30, sources: string[] = []) {
  const params = new URLSearchParams({ days: String(days) });
  if (sources.length) params.set("sources", sources.join(","));
  const r = await fetch(`${API}/api/brand/${encodeURIComponent(brand)}/trend?${params}`, { headers: headers() });
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
}

export async function fetchBrandSources() {
  const r = await fetch(`${API}/api/brand/sources`, { headers: headers() });
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
}

// ==================== TIKTOK ====================
export async function searchTikTokAds(keyword: string, country: string = "EG", industry: string = "all", period: string = "7", limit: number = 20) {
  const params = new URLSearchParams();
  params.set("keyword", keyword);
  params.set("country", country);
  if (industry !== "all") params.set("industry", industry);
  params.set("period", period);
  params.set("limit", String(limit));
  const r = await fetch(`${API}/api/tiktok/ads/search?${params.toString()}`, { headers: headers() });
  return r.json();
}

export async function getTikTokTrendingHashtags(country: string = "EG", period: string = "7", industry: string = "all", limit: number = 20) {
  const params = new URLSearchParams();
  params.set("country", country);
  params.set("period", period);
  if (industry !== "all") params.set("industry", industry);
  params.set("limit", String(limit));
  const r = await fetch(`${API}/api/tiktok/trending/hashtags?${params.toString()}`, { headers: headers() });
  return r.json();
}

export async function getTikTokTrendingVideos(country: string = "EG", period: string = "7", sortBy: string = "vv", limit: number = 20) {
  const params = new URLSearchParams();
  params.set("country", country);
  params.set("period", period);
  params.set("sort_by", sortBy);
  params.set("limit", String(limit));
  const r = await fetch(`${API}/api/tiktok/trending/videos?${params.toString()}`, { headers: headers() });
  return r.json();
}

export async function getTikTokAdAnalytics(materialId: string) {
  const r = await fetch(`${API}/api/tiktok/ad/${materialId}`, { headers: headers() });
  return r.json();
}

export async function getTikTokIndustries() {
  const r = await fetch(`${API}/api/tiktok/industries`);
  return r.json();
}

export async function getTikTokCountries() {
  const r = await fetch(`${API}/api/tiktok/countries`);
  return r.json();
}

// ==================== TRENDING & DISCOVERY ====================
export async function getTrendingApps(country: string = "EG", category?: string, limit: number = 20) {
  const params = new URLSearchParams({ country, limit: String(limit) });
  if (category) params.set("category", category);
  const r = await fetch(`${API}/api/apps/trending?${params}`, { headers: headers() });
  return r.json();
}

export async function getAppCategories() {
  const r = await fetch(`${API}/api/apps/categories`);
  return r.json();
}

export async function getCategoryApps(category: string, country: string = "EG", limit: number = 20) {
  const params = new URLSearchParams({ country, limit: String(limit) });
  const r = await fetch(`${API}/api/apps/category/${category}?${params}`, { headers: headers() });
  return r.json();
}

export async function compareApps(appIds: string[], country: string = "EG") {
  const r = await fetch(`${API}/api/apps/compare?country=${country}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ app_ids: appIds }),
  });
  if (!r.ok) throw new Error("Compare failed");
  return r.json();
}
