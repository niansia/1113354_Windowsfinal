import { createGlobe } from './globe.js';
import { BIRDS, BIRD_REGIONS, SEASONS } from './birds.generated.js';
import { playGenericBird, stopSong } from './birdSong.js';
import { t, loc, setLang, getLang, LANGS } from './i18n.js';

// 世界鳥類星球 -- 1,100 real bird species imported from iNaturalist (real photos +
// real names). Click a bird to hear an actual field recording (streamed via the
// server /api/birdsong proxy; falls back to a synthesized chirp when none exists or
// offline). The season switcher filters which species are showing per continent.

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
(function initLang() { const l = params.get('lang'); if (l && LANGS.indexOf(l) >= 0) setLang(l); })();
(function wireTabs() {
  const q = params.get('lang') ? '?lang=' + params.get('lang') : '';
  $('#tabCulture').href = 'index.html' + q;
  $('#tabBirds').href = 'birds.html' + q;
})();

const SEASON_TEXT = {
  spring: { zh: '春', en: 'Spring' }, summer: { zh: '夏', en: 'Summer' },
  autumn: { zh: '秋', en: 'Autumn' }, winter: { zh: '冬', en: 'Winter' }
};
const REGION_COLORS = {
  asia: '#e0b15a', europe: '#7fb0e0', africa: '#e0a23a', namerica: '#6fcf97',
  samerica: '#e078b0', oceania: '#9b8cff', polar: '#7fd0e0'
};
function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

// the globe gets dots for ALL filtered birds but real photos only for the top N
// (by observation count, i.e. array order) so 1000+ image loads don't stampede.
const MAX_PHOTOS = (() => { const p = new URLSearchParams(location.search).get('photos'); return p !== null ? parseInt(p, 10) : 220; })();

let season = (() => {
  const m = new Date().getMonth() + 1;
  return m <= 2 || m === 12 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
})();
let activeRegion = 'all';
let search = '';

function filtered() {
  const q = search.trim().toLowerCase();
  return BIRDS.filter((b) => {
    if (!b.seasons.includes(season)) return false;
    if (activeRegion !== 'all' && !b.regions.includes(activeRegion)) return false;
    if (q && !((b.zh + ' ' + b.en + ' ' + b.sci).toLowerCase().includes(q))) return false;
    return true;
  });
}

const tip = $('#tip');
const globe = createGlobe($('#globe'), {
  calloutStyle: 'standing',
  dark: true,
  onHover(marker, x, y) {
    if (!marker) { tip.hidden = true; return; }
    tip.hidden = false;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.innerHTML = `<b>${loc(marker.bird.zh, marker.bird.en)}</b> · ${loc(BIRD_REGIONS[marker.bird.region].zh, BIRD_REGIONS[marker.bird.region].en)}`;
  },
  onPick(marker) { if (!marker) { closeCard(); return; } openCard(marker); },
  labelOf(m) { return loc(m.bird.zh, m.bird.en); }
});

// transparent cutout portraits (pre-built by tools/gen_birdcut.py with AI background
// removal). Loaded once each and cached; failures resolve null -> that bird keeps its dot.
const cutoutCache = new Map();
function loadCutout(b) {
  if (!cutoutCache.has(b.taxonId)) {
    cutoutCache.set(b.taxonId, new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = 'birdcut/' + b.taxonId + '.png';
    }));
  }
  return cutoutCache.get(b.taxonId);
}

let currentMarkers = [];
let filterToken = 0;
function applyFilter() {
  const list = filtered();
  currentMarkers = list.map((b) => ({
    id: b.id, lat: b.lat, lon: b.lon,
    color: hexRGB(REGION_COLORS[b.region] || '#c9c2b0'),
    size: 6, tier: 0, hasImg: false, bird: b
  }));
  globe.setMarkers(currentMarkers);
  renderCounts(list.length);
  buildBirdList(list);

  // ALL birds render as instanced cutouts (one draw call per atlas -> no jank).
  // Loaded in waves so the planet fills progressively instead of waiting for every
  // image; if the cutout pack is missing entirely, fall back to round photo discs.
  const token = ++filterToken;
  (async () => {
    const items = [];
    const WAVE = 250;
    for (let off = 0; off < currentMarkers.length; off += WAVE) {
      const wave = currentMarkers.slice(off, off + WAVE);
      const imgs = await Promise.all(wave.map((m) => loadCutout(m.bird)));
      if (token !== filterToken) return;
      imgs.forEach((img, i) => {
        const m = wave[i];
        if (img) {
          m.hasImg = true;
          items.push({ lat: m.lat, lon: m.lon, img, color: REGION_COLORS[m.bird.region], marker: m });
        }
      });
      if (items.length >= 30) {
        globe.setCutouts(items.slice());
        globe.setMarkers(currentMarkers);   // hide dots for birds now shown as cutouts
      }
    }
    if (token !== filterToken) return;
    if (items.length < 30) {
      // cutout pack absent (generator not run): round photo discs, capped
      currentMarkers.slice(0, MAX_PHOTOS).forEach((m) => { m.hasImg = true; });
      globe.setImageCallouts(currentMarkers.slice(0, MAX_PHOTOS).map((m) => ({
        lat: m.lat, lon: m.lon, url: m.bird.sq, color: REGION_COLORS[m.bird.region], marker: m
      })));
      globe.setMarkers(currentMarkers);
    }
  })();
}

function renderCounts(n) {
  const regions = new Set(currentMarkers.map((m) => m.bird.region)).size;
  $('#counts').innerHTML = `<b>${n}</b> ${t('種鳥類')} · <b>${regions}</b> ${t('個大洲')} · ${loc(SEASON_TEXT[season].zh, SEASON_TEXT[season].en)}`;
}

/* ---- audio: real recording via proxy, synth fallback ---- */
let audioEl = null;
function stopBirdAudio() {
  if (audioEl) { try { audioEl.pause(); audioEl.src = ''; } catch (e) { /* ignore */ } audioEl = null; }
  stopSong();
}
let playToken = 0;
function playBird(bird) {
  stopBirdAudio();
  const token = ++playToken;
  setPlayState('loading');
  const a = new Audio();
  a.src = '/api/birdsong?taxon=' + bird.taxonId;
  audioEl = a;
  a.onplaying = () => { if (token === playToken) setPlayState('playing'); };
  a.onended = () => { if (token === playToken) setPlayState('idle'); };
  a.onerror = () => {
    if (token !== playToken) return;
    audioEl = null;
    playGenericBird(bird.taxonId);     // no real recording / offline -> synth chirp
    setPlayState('synth');
  };
  a.play().catch(() => {
    if (token !== playToken) return;
    audioEl = null;
    playGenericBird(bird.taxonId);
    setPlayState('synth');
  });
}
function setPlayState(state) {
  const btn = $('#playBtn');
  if (!btn) return;
  const label = btn.querySelector('span');
  if (state === 'loading') label.textContent = t('載入鳴聲中…');
  else if (state === 'synth') label.textContent = t('合成鳴聲（無實錄）');
  else label.textContent = t('重播鳴聲');
}

/* ---- info card ---- */
let currentMarker = null;
function openCard(m) {
  const b = m.bird;
  const img = $('#cardImg');
  img.src = b.md || b.sq;
  $('#cardName').textContent = loc(b.zh, b.en);
  $('#cardNameEn').textContent = getLang().startsWith('zh') ? (b.en || b.sci) : b.sci;
  $('#cardSci').textContent = b.sci;
  const rc = $('#cardRegionChip');
  rc.textContent = loc(BIRD_REGIONS[b.region].zh, BIRD_REGIONS[b.region].en);
  rc.style.color = REGION_COLORS[b.region]; rc.style.background = REGION_COLORS[b.region] + '22';
  const sc = $('#cardSeasonChip');
  const seasonNames = b.seasons.map((s) => loc(SEASON_TEXT[s].zh, SEASON_TEXT[s].en)).join(getLang().startsWith('zh') ? '、' : ', ');
  sc.textContent = seasonNames;
  sc.style.color = '#7fd0e0'; sc.style.background = '#7fd0e022';
  const regionNames = b.regions.map((r) => loc(BIRD_REGIONS[r].zh, BIRD_REGIONS[r].en)).join(getLang().startsWith('zh') ? '、' : ', ');
  $('#cardDesc').textContent = loc(
    `${b.zh}（${b.sci}）。常見於${regionNames}，${seasonNames}皆可觀察到。`,
    `${b.en} (${b.sci}). Recorded across ${regionNames}; seen in ${seasonNames}.`
  );
  $('#card').hidden = false;
  currentMarker = m;
  playBird(b);
}
function closeCard() {
  $('#card').hidden = true;
  globe.clearSelection();
  stopBirdAudio();
  currentMarker = null;
}
$('#cardClose').onclick = closeCard;
$('#playBtn').onclick = () => { if (currentMarker) playBird(currentMarker.bird); };

/* ---- left panel ---- */
function buildChips() {
  const sWrap = $('#seasonChips'); sWrap.innerHTML = '';
  for (const s of SEASONS) {
    const el = document.createElement('div');
    el.className = 'reg' + (season === s ? ' on' : '');
    el.textContent = loc(SEASON_TEXT[s].zh, SEASON_TEXT[s].en);
    el.onclick = () => { season = s; closeCard(); buildChips(); applyFilter(); };
    sWrap.appendChild(el);
  }
  const rWrap = $('#regionChips'); rWrap.innerHTML = '';
  const mk = (id, label) => {
    const el = document.createElement('div');
    el.className = 'reg' + (activeRegion === id ? ' on' : '');
    el.textContent = label;
    el.onclick = () => { activeRegion = id; buildChips(); applyFilter(); };
    rWrap.appendChild(el);
  };
  mk('all', t('全部'));
  Object.entries(BIRD_REGIONS).forEach(([id, r]) => mk(id, loc(r.zh, r.en)));
}

function buildBirdList(list) {
  const wrap = $('#birdList');
  wrap.innerHTML = '';
  // cap the rendered rows for DOM weight; the count header shows the true total
  const rows = list.slice(0, 300);
  const frag = document.createDocumentFragment();
  for (const b of rows) {
    const m = currentMarkers.find((x) => x.id === b.id);
    const row = document.createElement('div');
    row.className = 'cl-row bird-row';
    const img = document.createElement('img');
    img.className = 'bird-thumb';
    img.loading = 'lazy';
    img.src = b.sq;
    img.alt = '';
    const name = document.createElement('span');
    name.className = 'cl-name';
    name.textContent = loc(b.zh, b.en);
    const reg = document.createElement('span');
    reg.className = 'cl-count';
    reg.textContent = loc(BIRD_REGIONS[b.region].zh, BIRD_REGIONS[b.region].en);
    row.append(img, name, reg);
    row.onclick = () => { if (m) { if (!globe.select(m)) globe.focus(m); openCard(m); } };
    frag.appendChild(row);
  }
  wrap.appendChild(frag);
  if (list.length > rows.length) {
    const more = document.createElement('div');
    more.className = 'cl-more';
    more.textContent = t('… 在地球上探索其餘 {n} 種').replace('{n}', list.length - rows.length);
    wrap.appendChild(more);
  }
}

/* ---- toolbar ---- */
function bindToggle(id, fn) {
  const el = $(id);
  el.onclick = () => { el.classList.toggle('on'); fn(el.classList.contains('on')); };
}
bindToggle('#tbSpin', (on) => globe.setAutospin(on));
bindToggle('#tbLabels', (on) => globe.setHaloVisible(on));

/* ---- search ---- */
$('#search').placeholder = t('搜尋鳥類…');
$('#search').addEventListener('input', (e) => { search = e.target.value; applyFilter(); });

/* ---- i18n / locale sync ---- */
function applyStatic() {
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.getAttribute('data-i18n')); });
  $('#search').placeholder = t('搜尋鳥類…');
  document.documentElement.lang = getLang();
}
function applyLocale(d) {
  const lang = d.language || (d.payload && d.payload.language);
  if (lang && LANGS.indexOf(lang) >= 0 && lang !== getLang()) {
    setLang(lang);
    applyStatic(); buildChips(); applyFilter();
  }
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

/* ---- boot ---- */
applyStatic();
buildChips();
applyFilter();
setTimeout(() => $('#splash').classList.add('hide'), 600);
