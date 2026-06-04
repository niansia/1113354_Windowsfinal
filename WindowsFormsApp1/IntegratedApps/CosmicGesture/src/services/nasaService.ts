// NASA Astronomy Picture of the Day (APOD) service.
// Live fetch with a hard timeout, in-memory + localStorage cache, and a static
// fallback so the UI never breaks when offline or rate-limited.

export interface ApodData {
  title: string;
  explanation: string;
  url: string;
  mediaType: "image" | "video" | "other";
  date: string;
  copyright?: string;
  source: "live" | "cache" | "fallback";
}

// Live APOD is opt-in. DEMO_KEY is intentionally not used here because its low rate
// limit produces browser console 429 errors in normal previews.
const APOD_ENDPOINT = String(import.meta.env.VITE_NASA_APOD_ENDPOINT ?? "");
const CACHE_KEY = "cosmic.apod.v1";
const FETCH_TIMEOUT_MS = 6000;

const FALLBACK: ApodData = {
  title: "粒子宇宙：探索的起點",
  explanation:
    "目前無法連線到 NASA APOD 服務，顯示內建的離線宇宙影像。連上網路後，這裡會自動更新為 NASA 每日天文影像 (Astronomy Picture of the Day)，由 NASA 與全球天文社群每日精選。",
  url: "",
  mediaType: "other",
  date: "—",
  source: "fallback"
};

let memoryCache: ApodData | null = null;

function readLocalCache(): ApodData | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { day: string; data: ApodData };
    if (parsed.day !== todayKey()) return null;
    return { ...parsed.data, source: "cache" };
  } catch {
    return null;
  }
}

function writeLocalCache(data: ApodData) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ day: todayKey(), data }));
  } catch {
    /* ignore quota / privacy errors */
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchApod(): Promise<ApodData> {
  if (memoryCache) return memoryCache;

  const cached = readLocalCache();
  if (cached) {
    memoryCache = cached;
    return cached;
  }

  if (!APOD_ENDPOINT) {
    memoryCache = FALLBACK;
    return FALLBACK;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(APOD_ENDPOINT, { signal: controller.signal });
    if (!response.ok) throw new Error(`APOD HTTP ${response.status}`);
    const json = (await response.json()) as Record<string, unknown>;
    const mediaType = json.media_type === "image" ? "image" : json.media_type === "video" ? "video" : "other";
    const data: ApodData = {
      title: typeof json.title === "string" ? json.title : FALLBACK.title,
      explanation: typeof json.explanation === "string" ? json.explanation : FALLBACK.explanation,
      url: typeof json.thumbnail_url === "string" ? json.thumbnail_url : typeof json.url === "string" ? json.url : "",
      mediaType,
      date: typeof json.date === "string" ? json.date : todayKey(),
      copyright: typeof json.copyright === "string" ? json.copyright : undefined,
      source: "live"
    };
    memoryCache = data;
    writeLocalCache(data);
    return data;
  } catch {
    return FALLBACK;
  } finally {
    window.clearTimeout(timer);
  }
}
