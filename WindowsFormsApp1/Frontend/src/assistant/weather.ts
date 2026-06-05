import type { Lang } from '../i18n/strings';
import { ASSISTANT_TEXT } from './assistantText';

// Live weather via Open-Meteo — a free, key-less, CORS-enabled API. Geocodes a city name
// then fetches the current conditions. Everything degrades to a friendly error string when
// the network is unavailable (e.g. offline WinForms host), so the assistant never throws.

export interface WeatherResult {
  ok: boolean;
  city: string;
  temperature: number;
  apparent: number;
  humidity: number;
  conditionKey: string; // a key in ASSISTANT_TEXT, translated by the caller
  emoji: string;
}

// Map an Open-Meteo timezone to a sensible default city (matches the Settings timezone list).
const TIMEZONE_CITY: Record<string, { query: string; label: string }> = {
  'Asia/Taipei': { query: 'Taipei', label: '台北' },
  'Asia/Tokyo': { query: 'Tokyo', label: '東京' },
  'America/Los_Angeles': { query: 'Los Angeles', label: '洛杉磯' },
  'Europe/London': { query: 'London', label: '倫敦' }
};

const GEO_LANG: Record<Lang, string> = {
  'zh-TW': 'zh',
  'zh-CN': 'zh',
  en: 'en',
  ja: 'ja',
  ko: 'ko'
};

// WMO weather code → { condition text key, emoji }
function describeCode(code: number): { key: string; emoji: string } {
  if (code === 0) return { key: ASSISTANT_TEXT.wClear, emoji: '☀️' };
  if (code === 1) return { key: ASSISTANT_TEXT.wMostlyClear, emoji: '🌤️' };
  if (code === 2) return { key: ASSISTANT_TEXT.wPartly, emoji: '⛅' };
  if (code === 3) return { key: ASSISTANT_TEXT.wOvercast, emoji: '☁️' };
  if (code === 45 || code === 48) return { key: ASSISTANT_TEXT.wFog, emoji: '🌫️' };
  if (code >= 51 && code <= 57) return { key: ASSISTANT_TEXT.wDrizzle, emoji: '🌦️' };
  if (code >= 61 && code <= 65) return { key: code >= 65 ? ASSISTANT_TEXT.wHeavyRain : ASSISTANT_TEXT.wRain, emoji: '🌧️' };
  if (code === 66 || code === 67) return { key: ASSISTANT_TEXT.wRain, emoji: '🌧️' };
  if (code >= 71 && code <= 77) return { key: ASSISTANT_TEXT.wSnow, emoji: '❄️' };
  if (code >= 80 && code <= 82) return { key: ASSISTANT_TEXT.wShowers, emoji: '🌦️' };
  if (code === 85 || code === 86) return { key: ASSISTANT_TEXT.wSnow, emoji: '🌨️' };
  if (code >= 95) return { key: ASSISTANT_TEXT.wThunder, emoji: '⛈️' };
  return { key: ASSISTANT_TEXT.wPartly, emoji: '⛅' };
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<any> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function defaultCity(timezone: string): { query: string; label: string } {
  return TIMEZONE_CITY[timezone] ?? TIMEZONE_CITY['Asia/Taipei'];
}

export async function fetchWeather(
  cityInput: string | undefined,
  lang: Lang,
  timezone: string,
  signal?: AbortSignal
): Promise<WeatherResult> {
  const fallback = defaultCity(timezone);
  const wanted = (cityInput && cityInput.trim()) || fallback.query;

  try {
    // 1) geocode the city name → lat/lon
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(wanted)}&count=1&language=${GEO_LANG[lang]}&format=json`;
    const geo = await fetchJson(geoUrl, signal);
    const place = geo?.results?.[0];

    // Keep label and coordinates consistent: a geocoding miss falls back to the default
    // city (label + its coordinates together), never the user's label on default coords.
    const latitude = place?.latitude ?? 25.0478; // Taipei fallback
    const longitude = place?.longitude ?? 121.5319;
    const city = place?.name ?? fallback.label;

    // 2) current conditions
    const wxUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=auto`;
    const wx = await fetchJson(wxUrl, signal);
    const current = wx?.current;
    if (!current) throw new Error('no current weather');

    const { key, emoji } = describeCode(Number(current.weather_code));
    return {
      ok: true,
      city,
      temperature: Math.round(Number(current.temperature_2m)),
      apparent: Math.round(Number(current.apparent_temperature)),
      humidity: Math.round(Number(current.relative_humidity_2m)),
      conditionKey: key,
      emoji
    };
  } catch {
    return {
      ok: false,
      city: cityInput?.trim() || fallback.label,
      temperature: 0,
      apparent: 0,
      humidity: 0,
      conditionKey: ASSISTANT_TEXT.wPartly,
      emoji: '🌧️'
    };
  }
}
