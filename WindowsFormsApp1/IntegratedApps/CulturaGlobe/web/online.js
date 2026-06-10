// Optional online helper: free, no-API-key machine translation via MyMemory
// (CORS-enabled). Best-effort -- returns null on any failure so callers fall back to
// the offline behaviour. Results are cached so repeated clicks cost nothing.
const cache = new Map();

export async function translate(text, target) {
  if (!text) return null;
  const t = (target || '').split('-')[0].toLowerCase();
  if (!t || t === 'en') return text;          // source is already English
  const key = t + '|' + text;
  if (cache.has(key)) return cache.get(key);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${encodeURIComponent(t)}`;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    const d = await r.json();
    const out = d && d.responseData && d.responseData.translatedText;
    // MyMemory puts quota / error notices inside translatedText -- reject those
    if (out && !/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(out)) {
      cache.set(key, out);
      return out;
    }
  } catch (e) { /* offline / blocked / rate-limited -> fall back */ }
  return null;
}
