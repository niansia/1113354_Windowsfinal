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
// ---- build markers: one "hero" per country + one per curated culture item ----
const ALL = [];
for (const co of COUNTRIES) {
  // hero marker = the country itself (image `{id}.jpg`); always present
  ALL.push({
    id: co.id + '-0', lat: co.lat, lon: co.lon, category: 'landmark',
    img: co.id + '.jpg', color: hexRGB(CAT.landmark.color), size: 9, tier: 0,
    country: co, item: null, isHero: true
  });
  co.items.forEach((it, i) => {
    const idx = i + 1;
    const ring = 2.0 + (idx % 3) * 1.3;
    const ang = idx * 2.39996;
    const lat = co.lat + Math.sin(ang) * ring;
    const lon = co.lon + (Math.cos(ang) * ring) / Math.max(0.4, Math.cos(co.lat * Math.PI / 180));
    ALL.push({
      id: co.id + '-' + idx, lat, lon, category: it.cat,
      img: co.id + '-' + idx + '.jpg', color: hexRGB((CAT[it.cat] || CATEGORIES[0]).color),
      size: 7, tier: idx, country: co, item: it, isHero: false
    });
  });
}
let presentImages = new Set();   // filenames the server reports as actually on disk

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
  const vis = visibleMarkers();
  globe.setMarkers(vis);
  globe.setImageCallouts(
    vis.filter((m) => presentImages.has(m.img))
      .map((m) => ({
        lat: m.lat, lon: m.lon, url: 'images/' + m.img,
        color: (CAT[m.category] || CATEGORIES[0]).color,
        marker: m   // hover tooltip + click card read the name/details from here
      }))
  );
  renderCounts();
}

async function loadImageList() {
  try {
    const d = await (await fetch('/api/images', { cache: 'no-store' })).json();
    presentImages = new Set(d.images || []);
  } catch (e) { /* no images yet -> dots */ }
  applyFilter();
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
  // card icon: the marker image if the user supplied one, else the category glyph
  const flagEl = $('#cardFlag');
  const imgEl = $('#cardImg');
  if (presentImages.has(m.img)) {
    imgEl.src = 'images/' + m.img; imgEl.hidden = false; flagEl.hidden = true;
  } else {
    flagEl.textContent = cat.glyph; flagEl.style.color = cat.color;
    flagEl.hidden = false; imgEl.hidden = true;
  }
  $('#cardCountry').textContent = loc(co.zh, co.en);
  $('#cardRegion').textContent = loc(REGIONS[co.region].zh, REGIONS[co.region].en);
  const chip = $('#cardCat');
  chip.textContent = loc(cat.zh, cat.en);
  chip.style.color = cat.color; chip.style.background = cat.color + '22';

  let title, desc;
  if (m.isHero) {
    title = loc('文化總覽', 'Cultural overview');
    desc = loc(`探索${co.zh}的文化——點擊周圍的文化標記，或聆聽當地音樂與語言問候。`,
      `Explore ${co.en} — click the surrounding cultural markers, or hear its music and greeting.`);
  } else {
    title = loc(m.item.zh, m.item.en);
    desc = loc(m.item.dZh, m.item.dEn);
  }
  $('#cardTitle').textContent = title;
  $('#cardDesc').textContent = desc;

  const g = co.greeting;
  $('#cardGreet').innerHTML = g
    ? `<div class="g-label">${t('當地語言問候')}</div><div class="g-text">${g.text}</div><div class="g-rom">${g.roman} · ${g.lang}</div>`
    : '';

  $('#card').hidden = false;
  // user gesture -> play this marker's own short melody and SPEAK the country's greeting in
  // its OWN language. The written guide above describes the item's feature; we do not read it
  // aloud. The globe holds the view on this region while the card is open.
  playCountryMotif(co, m.id);
  speakGreeting(co);
  currentCountry = co; currentMarker = m;
}
function closeCard() { $('#card').hidden = true; globe.clearSelection(); stopAudio(); currentCountry = null; currentMarker = null; }
let currentCountry = null; let currentMarker = null;

$('#cardClose').onclick = closeCard;

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
  const title = m.isHero ? loc('文化總覽', 'Cultural overview') : loc(m.item.zh, m.item.en);
  const desc = m.isHero
    ? loc(`探索${co.zh}的文化——點擊周圍的文化標記，或聆聽當地音樂與語言問候。`,
      `Explore ${co.en} — click the surrounding cultural markers, or hear its music and greeting.`)
    : loc(m.item.dZh, m.item.dEn);
  $('#cardTitle').textContent = title;
  $('#cardDesc').textContent = desc;
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
loadImageList();   // fetches /api/images then applyFilter (markers + sprites)
setTimeout(() => $('#splash').classList.add('hide'), 600);
