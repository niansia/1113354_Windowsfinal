import { createGlobe } from './globe.js';
import { speak, speakQueued, speakGreeting, speakOnline, stopAudio, initAudioVoices, hasVoice } from './audio.js';
import { CATEGORIES, REGIONS, COUNTRIES, SPEAK_FALLBACK } from './data.js';
import { NATIVE_GUIDE } from './countries.detail.js';
import { MARKER_POS } from './positions.generated.js';
import { translate } from './online.js';
import { t, loc, setLang, getLang, LANGS } from './i18n.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
(function initLang() { const l = params.get('lang'); if (l && LANGS.indexOf(l) >= 0) setLang(l); })();

const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
function hexRGB(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

// every node has a designed intro (簡介): items carry their curated description, and
// the country hero gets one composed from its curated culture items.
function heroIntro(co) {
  const its = co.items.slice(0, 3);
  const regZh = REGIONS[co.region].zh, regEn = REGIONS[co.region].en;
  if (!its.length) {
    return { zh: `${co.zh}位於${regZh}。`, en: `${co.en} is a country in ${regEn}.` };
  }
  return {
    zh: `${co.zh}位於${regZh}，著名的文化包括${its.map((i) => i.zh).join('、')}。`,
    en: `${co.en} is a country in ${regEn}, known for ${its.map((i) => i.en).join(', ')}.`
  };
}
function introOf(m) {
  return m.isHero ? heroIntro(m.country)
    : { zh: `${m.item.zh}。${m.item.dZh}`, en: `${m.item.en}. ${m.item.dEn}` };
}

// ---- build markers: one "hero" per country + one per curated culture item ----
const ALL = [];
for (const co of COUNTRIES) {
  ALL.push({
    id: co.id + '-0', lat: co.lat, lon: co.lon, category: 'landmark',
    img: co.id + '.jpg', color: hexRGB(CAT.landmark.color), size: 9, tier: 0,
    country: co, item: null, isHero: true
  });
  co.items.forEach((it, i) => {
    const idx = i + 1;
    // exact position verified against the country polygon at build time (the old
    // free jitter threw small-country items into neighbours or the sea)
    const pos = MARKER_POS[co.id + '-' + idx];
    const ring = 2.0 + (idx % 3) * 1.3;
    const ang = idx * 2.39996;
    const lat = pos ? pos[0] : co.lat + Math.sin(ang) * ring;
    const lon = pos ? pos[1] : co.lon + (Math.cos(ang) * ring) / Math.max(0.4, Math.cos(co.lat * Math.PI / 180));
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
  },
  // catalog-row label, "country · item" like the reference (country alone for the hero)
  labelOf(m) {
    const co = loc(m.country.zh, m.country.en);
    return m.isHero ? co : co + ' · ' + loc(m.item.zh, m.item.en);
  }
});

function applyFilter() {
  const vis = visibleMarkers();
  // a node with a supplied photo shows ONLY the clickable tile -- its dot hides
  // (otherwise it reads as "image still missing"); halo labels keep the node.
  vis.forEach((m) => { m.hasImg = presentImages.has(m.img); });
  globe.setMarkers(vis);
  globe.setImageCallouts(
    vis.filter((m) => presentImages.has(m.img))
      .map((m) => ({
        lat: m.lat, lon: m.lon, url: 'images/' + m.img,
        color: (CAT[m.category] || CATEGORIES[0]).color,
        marker: m
      }))
  );
  renderCounts();
  buildCountryList();
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

// ---- info card + local-language narration ----
function openCard(m) {
  const co = m.country;
  const cat = CAT[m.category];
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

  const intro = introOf(m);
  $('#cardTitle').textContent = m.isHero ? loc('文化總覽', 'Cultural overview') : loc(m.item.zh, m.item.en);
  $('#cardDesc').textContent = loc(intro.zh, intro.en);

  const g = co.greeting;
  $('#cardGreet').innerHTML = g
    ? `<div class="g-label">${t('當地語言問候')}</div><div class="g-text">${g.text}</div><div class="g-rom">${g.roman} · ${g.lang}</div>`
    : '';

  const nativeEl = $('#cardNative');
  nativeEl.hidden = true; nativeEl.textContent = '';

  $('#card').hidden = false;
  currentCountry = co; currentMarker = m;

  // narration: the intro, READ ALOUD IN THE COUNTRY'S OWN LANGUAGE, via a chain
  // that was checked per-language: ① a local Windows voice ② Google online TTS
  // (53 languages, each one probed and verified) ③ the SPEAK_FALLBACK second
  // language for tongues with no TTS anywhere (Central Asia -> Russian, Somalia ->
  // Arabic; translated first) ④ English as the very last resort. The greeting
  // speaks instantly when a local voice exists, otherwise it is prepended to the
  // online clip so it is still heard in the local language.
  stopAudio();
  const lang = g && g.lang;
  const localVoice = !!(lang && hasVoice(lang));
  if (localVoice) speakGreeting(co);
  const token = ++guideToken;
  (async () => {
    let native = NATIVE_GUIDE[m.id];
    if (!native && lang) native = await translate(intro.en, lang);
    if (token !== guideToken || $('#card').hidden) return;   // user moved on / closed the card
    if (native) { nativeEl.textContent = native; nativeEl.hidden = false; }
    if (native && localVoice) { speakQueued(native, lang); return; }          // ① local
    if (native && lang) {
      try { await speakOnline((g ? g.text + '. ' : '') + native, lang); return; }  // ② online
      catch (e) { if (token !== guideToken) return; }
    }
    const fb = SPEAK_FALLBACK[(lang || '').split('-')[0]];                    // ③ second language
    if (fb) {
      const fbText = await translate(intro.en, fb);
      if (token !== guideToken || $('#card').hidden) return;
      if (fbText) {
        if (hasVoice(fb)) { speak(fbText, fb); return; }
        try { await speakOnline(fbText, fb); return; } catch (e) { if (token !== guideToken) return; }
      }
    }
    if (hasVoice('en')) speakQueued(intro.en, 'en');                          // ④ English
    else speakOnline(intro.en, 'en').catch(() => { /* offline: text only */ });
  })();
}
function closeCard() { $('#card').hidden = true; globe.clearSelection(); stopAudio(); currentCountry = null; currentMarker = null; guideToken += 1; }
let currentCountry = null; let currentMarker = null; let guideToken = 0;

$('#cardClose').onclick = closeCard;

// ---- left panel: filters + country catalog ----
function buildLegend() {
  const cats = $('#legendCats'); cats.innerHTML = '';
  CATEGORIES.forEach((c) => {
    const el = document.createElement('div');
    el.className = 'leg' + (activeCats.has(c.id) ? '' : ' off');
    el.style.color = c.color;
    el.innerHTML = `<span class="gl">${c.glyph}</span><span class="nm">${loc(c.zh, c.en)}</span>`;
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

function buildCountryList() {
  const wrap = $('#countryList'); if (!wrap) return;
  wrap.innerHTML = '';
  const q = search.trim().toLowerCase();
  const list = COUNTRIES
    .filter((co) => (activeRegion === 'all' || co.region === activeRegion))
    .filter((co) => !q || (co.zh + ' ' + co.en).toLowerCase().includes(q))
    .sort((a, b) => loc(a.zh, a.en).localeCompare(loc(b.zh, b.en), getLang() === 'en' ? 'en' : 'zh-Hant'));
  for (const co of list) {
    const row = document.createElement('div');
    row.className = 'cl-row';
    row.innerHTML = `<span class="cl-name">${loc(co.zh, co.en)}</span>` +
      `<span class="cl-sub">${loc(co.en, co.zh)}</span>` +
      `<span class="cl-count">${co.items.length + 1}</span>`;
    row.onclick = () => openCountry(co);
    wrap.appendChild(row);
  }
}

let currentDetailCountry = null;
function openCountry(co) {
  currentDetailCountry = co;
  $('#panelList').hidden = true;
  $('#panelDetail').hidden = false;
  $('#detailName').textContent = getLang().startsWith('zh') ? `${co.zh} ${co.en}` : co.en;
  $('#statItems').textContent = co.items.length + 1;
  $('#statRegion').textContent = loc(REGIONS[co.region].zh, REGIONS[co.region].en);
  const g = co.greeting;
  $('#detailGreet').innerHTML = g ? `<b>${g.text}</b> · ${g.roman}<br>${t('當地語言問候')} (${g.lang})` : '';
  const items = $('#detailItems'); items.innerHTML = '';
  const mkRow = (marker, name, cat) => {
    const row = document.createElement('div');
    row.className = 'di-row';
    row.innerHTML = `<span class="di-glyph" style="background:${cat.color}">${cat.glyph}</span>` +
      `<span class="di-text"><div class="di-name">${name}</div><div class="di-cat">${loc(cat.zh, cat.en)}</div></span>`;
    row.onclick = () => focusMarker(marker);
    items.appendChild(row);
  };
  const hero = ALL.find((m) => m.id === co.id + '-0');
  if (hero) mkRow(hero, loc('文化總覽', 'Cultural overview'), CAT.landmark);
  co.items.forEach((it, i) => {
    const m = ALL.find((x) => x.id === co.id + '-' + (i + 1));
    if (m) mkRow(m, loc(it.zh, it.en), CAT[it.cat] || CATEGORIES[0]);
  });
  if (hero) focusMarker(hero);
}
function focusMarker(m) {
  // highlight if it's in the current filtered set, otherwise still fly to + narrate it
  if (!globe.select(m)) globe.focus(m);
  openCard(m);
}
$('#detailBack').onclick = () => {
  $('#panelDetail').hidden = true;
  $('#panelList').hidden = false;
  currentDetailCountry = null;
};

// ---- bottom toolbar toggles ----
function bindToggle(id, fn) {
  const el = $(id);
  el.onclick = () => { el.classList.toggle('on'); fn(el.classList.contains('on')); };
}
bindToggle('#tbSpin', (on) => globe.setAutospin(on));
bindToggle('#tbLabels', (on) => globe.setHaloVisible(on));
bindToggle('#tbImages', (on) => globe.setCalloutsVisible(on));

// ---- search ----
$('#search').placeholder = t('搜尋國家或文化…');
$('#search').addEventListener('input', (e) => { search = e.target.value; applyFilter(); });

// ---- i18n / locale sync ----
function applyStatic() {
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.getAttribute('data-i18n')); });
  $('#search').placeholder = t('搜尋國家或文化…');
  document.documentElement.lang = getLang();
}
function rerender() {
  applyStatic(); buildLegend(); renderCounts(); buildCountryList();
  if (currentDetailCountry) openCountrySilent(currentDetailCountry);
  if (currentMarker) openCardSilent(currentMarker);
}
function openCountrySilent(co) {
  $('#detailName').textContent = getLang().startsWith('zh') ? `${co.zh} ${co.en}` : co.en;
  $('#statRegion').textContent = loc(REGIONS[co.region].zh, REGIONS[co.region].en);
}
function openCardSilent(m) { // refresh card text without replaying audio
  if ($('#card').hidden) return;
  const co = m.country; const cat = CAT[m.category];
  $('#cardCountry').textContent = loc(co.zh, co.en);
  $('#cardRegion').textContent = loc(REGIONS[co.region].zh, REGIONS[co.region].en);
  $('#cardCat').textContent = loc(cat.zh, cat.en);
  const intro = introOf(m);
  $('#cardTitle').textContent = m.isHero ? loc('文化總覽', 'Cultural overview') : loc(m.item.zh, m.item.en);
  $('#cardDesc').textContent = loc(intro.zh, intro.en);
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
loadImageList();   // fetches /api/images then applyFilter (markers + sprites + country list)
setTimeout(() => $('#splash').classList.add('hide'), 600);
