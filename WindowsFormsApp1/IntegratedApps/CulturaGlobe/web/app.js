import { createGlobe } from './globe.js';
import { playCountryMotif, speakGreeting, stopAudio, initAudioVoices } from './audio.js';
import { CATEGORIES, REGIONS, COUNTRIES } from './data.js';
import { t, tf, loc, setLang, getLang, LANGS } from './i18n.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
(function initLang() { const l = params.get('lang'); if (l && LANGS.indexOf(l) >= 0) setLang(l); })();

const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
// ---- build markers from the dataset ----
const ALL = [];
for (const co of COUNTRIES) {
  const entries = [{ cat: 'language', greeting: true }, { cat: 'music', music: true }];
  for (const it of co.items) entries.push({ cat: it.cat, item: it });
  entries.forEach((e, idx) => {
    const ring = 2.0 + (idx % 3) * 1.2;
    const ang = idx * 2.39996;
    const lat = co.lat + Math.sin(ang) * ring;
    const lon = co.lon + (Math.cos(ang) * ring) / Math.max(0.4, Math.cos(co.lat * Math.PI / 180));
    ALL.push({
      id: co.id + '-' + idx,
      lat, lon,
      category: e.cat,
      color: hexRGB((CAT[e.cat] || CATEGORIES[0]).color),
      size: e.greeting || e.music ? 9 : 7,
      tier: idx,
      country: co,
      item: e.item || null,
      isGreeting: !!e.greeting,
      isMusic: !!e.music
    });
  });
}

// ---- filter state ----
const activeCats = new Set(CATEGORIES.map((c) => c.id));
let activeRegion = 'all';
let search = '';

function visibleMarkers() {
  const q = search.trim().toLowerCase();
  return ALL.filter((m) => {
    if (!activeCats.has(m.category)) return false;
    if (activeRegion !== 'all' && m.country.region !== activeRegion) return false;
    if (q) {
      const hay = (m.country.zh + ' ' + m.country.en + ' ' + (m.item ? m.item.zh + ' ' + m.item.en : '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ---- globe ----
const tip = $('#tip');
const globe = createGlobe($('#globe'), {
  onHover(marker, x, y) {
    if (!marker) { tip.hidden = true; return; }
    tip.hidden = false;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    const catName = loc(CAT[marker.category].zh, CAT[marker.category].en);
    tip.innerHTML = `<b>${loc(marker.country.zh, marker.country.en)}</b> · ${catName}`;
  },
  onPick(marker) {
    if (!marker) { closeCard(); return; }
    openCard(marker);
  }
});

function applyFilter() {
  globe.setMarkers(visibleMarkers());
  renderCounts();
}

function renderCounts() {
  const vis = visibleMarkers();
  const countries = new Set(vis.map((m) => m.country.id)).size;
  $('#counts').innerHTML = `<b>${vis.length}</b> ${t('個文化標記')} · <b>${countries}</b> ${t('個國家／地區')}`;
}

// ---- info card ----
function openCard(m) {
  const co = m.country;
  const cat = CAT[m.category];
  // category glyph as the card icon (Windows/WebView2 can't render flag emoji).
  const flagEl = $('#cardFlag');
  flagEl.textContent = cat.glyph;
  flagEl.style.color = cat.color;
  $('#cardCountry').textContent = loc(co.zh, co.en);
  $('#cardRegion').textContent = loc(REGIONS[co.region].zh, REGIONS[co.region].en);
  const chip = $('#cardCat');
  chip.textContent = loc(cat.zh, cat.en);
  chip.style.color = cat.color; chip.style.background = cat.color + '22';

  let title, desc;
  if (m.isGreeting) {
    title = loc('語言問候', 'Language & Greeting');
    desc = loc(`在${co.zh}，人們這樣打招呼。`, `How people greet one another in ${co.en}.`);
  } else if (m.isMusic) {
    title = loc('傳統音樂', 'Traditional Music');
    desc = loc(`${co.zh}的音樂以特有的音階與樂器著稱（以下為程式即時合成的風格樂句）。`,
      `${co.en}'s music, evoked here by a live-synthesised motif in its characteristic scale and timbre.`);
  } else {
    title = loc(m.item.zh, m.item.en);
    desc = loc(m.item.dZh, m.item.dEn);
  }
  $('#cardTitle').textContent = title;
  $('#cardDesc').textContent = desc;

  const g = co.greeting;
  $('#cardGreet').innerHTML = g
    ? `<div class="g-text">${g.text}</div><div class="g-rom">${g.roman} · ${g.lang}</div>`
    : '';

  $('#card').hidden = false;
  // play audio (user gesture from the click satisfies autoplay policy)
  playCountryMotif(co);
  if (m.isGreeting) setTimeout(() => speakGreeting(co), 120);
  currentCountry = co; currentMarker = m;
}
function closeCard() { $('#card').hidden = true; globe.clearSelection(); stopAudio(); currentCountry = null; }
let currentCountry = null; let currentMarker = null;

$('#cardClose').onclick = closeCard;
$('#btnAudio').onclick = () => { if (currentCountry) playCountryMotif(currentCountry); };
$('#btnGreet').onclick = () => { if (currentCountry) speakGreeting(currentCountry); };

// ---- legend ----
function buildLegend() {
  const cats = $('#legendCats'); cats.innerHTML = '';
  CATEGORIES.forEach((c) => {
    const el = document.createElement('div');
    el.className = 'leg' + (activeCats.has(c.id) ? '' : ' off');
    el.innerHTML = `<span class="dot" style="color:${c.color}"></span><span class="gl">${c.glyph}</span><span class="nm">${loc(c.zh, c.en)}</span>`;
    el.onclick = () => {
      if (activeCats.has(c.id)) activeCats.delete(c.id); else activeCats.add(c.id);
      if (activeCats.size === 0) CATEGORIES.forEach((x) => activeCats.add(x.id)); // never empty
      buildLegend(); applyFilter();
    };
    cats.appendChild(el);
  });
  const regs = $('#legendRegions'); regs.innerHTML = '';
  const mk = (id, label) => {
    const r = document.createElement('div');
    r.className = 'reg' + (activeRegion === id ? ' on' : '');
    r.textContent = label;
    r.onclick = () => { activeRegion = id; buildLegend(); applyFilter(); };
    regs.appendChild(r);
  };
  mk('all', t('全部'));
  Object.entries(REGIONS).forEach(([id, r]) => mk(id, loc(r.zh, r.en)));
}

// ---- search ----
$('#search').placeholder = t('搜尋國家或文化…');
$('#search').addEventListener('input', (e) => { search = e.target.value; applyFilter(); });

// ---- i18n / locale sync ----
function applyStatic() {
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.getAttribute('data-i18n')); });
  $('#search').placeholder = t('搜尋國家或文化…');
  document.documentElement.lang = getLang();
}
function rerender() { applyStatic(); buildLegend(); renderCounts(); if (currentMarker) openCardSilent(currentMarker); }
function openCardSilent(m) { // refresh card text without replaying audio
  const wasOpen = !$('#card').hidden;
  if (!wasOpen) return;
  const co = m.country; const cat = CAT[m.category];
  $('#cardCountry').textContent = loc(co.zh, co.en);
  $('#cardRegion').textContent = loc(REGIONS[co.region].zh, REGIONS[co.region].en);
  $('#cardCat').textContent = loc(cat.zh, cat.en);
  if (m.item) { $('#cardTitle').textContent = loc(m.item.zh, m.item.en); $('#cardDesc').textContent = loc(m.item.dZh, m.item.dEn); }
}
function applyLocale(d) {
  const lang = d.language || (d.payload && d.payload.language);
  if (lang && LANGS.indexOf(lang) >= 0 && lang !== getLang()) { setLang(lang); rerender(); }
}
window.addEventListener('message', (ev) => {
  let d = ev.data; if (!d) return;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
  if (d.type === 'FUSION_LOCALE_CHANGED' || d.type === 'FUSION_SET_LANGUAGE') applyLocale(d);
});
if (window.chrome && window.chrome.webview) {
  window.chrome.webview.addEventListener('message', (ev) => window.dispatchEvent(new MessageEvent('message', { data: ev.data })));
}

window.addEventListener('resize', () => globe.resize());
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard(); });

// ---- boot ----
initAudioVoices();
applyStatic();
buildLegend();
applyFilter();
setTimeout(() => $('#splash').classList.add('hide'), 600);
