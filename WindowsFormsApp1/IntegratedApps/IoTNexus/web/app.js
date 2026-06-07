/* Fusion IoT Nexus -- dashboard front-end (vanilla JS, no build step). */
(function () {
  const { t, tf, setLang, getLang, LANGS } = window.I18N;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  // ---- host params (lang / timezone / clock24) ----
  const params = new URLSearchParams(location.search);
  // Language, clock format and timezone are governed by the FusionOS system
  // Settings -> 語言與時間: passed in on the launch URL, then kept in sync via the
  // host's FUSION_LOCALE_CHANGED message. The default is Traditional Chinese (the
  // I18N module already initialises to zh-TW), so there is no in-app selector.
  let clock24 = params.get('clock24') !== 'false';
  let timezone = params.get('timezone') || 'Asia/Taipei';
  (function initLang() {
    const l = params.get('lang');
    if (l && LANGS.indexOf(l) >= 0) setLang(l);
  })();

  // ---- device type metadata ----
  const TYPE = {
    hvac:      { glyph: '❄️', noun: '空調' },
    light:     { glyph: '💡', noun: '照明' },
    occupancy: { glyph: '🚶', noun: '人流感測' },
    air:       { glyph: '🌫️', noun: '空氣品質' },
    plug:      { glyph: '🔌', noun: '智慧插座' },
    solar:     { glyph: '☀️', noun: '太陽能陣列' },
    battery:   { glyph: '🔋', noun: '儲能電池' },
    evcharger: { glyph: '🚗', noun: '充電樁' },
    water:     { glyph: '💧', noun: '水流感測' },
    lock:      { glyph: '🔒', noun: '電子鎖' },
    meter:     { glyph: '⚡', noun: '智慧電表' },
    gateway:   { glyph: '📡', noun: '邊緣閘道' },
  };
  const TYPE_ORDER = ['hvac', 'air', 'occupancy', 'light', 'plug', 'meter', 'solar', 'battery', 'evcharger', 'water', 'lock', 'gateway'];

  // ---- state ----
  let snap = null;
  let zoneLabelMap = {};
  let twinMetric = 'temp';
  let fleetFilter = 'all';
  let fleetSearch = '';
  let activeTab = 'events';
  let drawerId = null;
  const chartBuf = [];                 // {power, solar, grid}
  const histById = {};                 // id -> [primary metric values]
  let conn = 'connecting';

  // =====================================================================
  //  connection (WebSocket push, HTTP poll fallback)
  // =====================================================================
  let ws = null, pollTimer = null, reconnectTimer = null;
  function connect() {
    try {
      ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    } catch (e) { startPoll(); return; }
    ws.onopen = () => { conn = 'live'; stopPoll(); };
    ws.onmessage = (ev) => {
      try { const m = JSON.parse(ev.data); if (m.type === 'snapshot') onSnapshot(m.data); } catch (e) {}
    };
    ws.onclose = ws.onerror = () => {
      conn = 'poll'; startPoll();
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 4000);
    };
  }
  function startPoll() {
    if (pollTimer) return;
    const tick = async () => {
      try {
        const r = await fetch('/api/snapshot', { cache: 'no-store' });
        const d = await r.json();
        if (d && d.devices) { if (conn !== 'live') conn = 'poll'; onSnapshot(d); }
      } catch (e) { conn = 'off'; renderConn(); }
    };
    tick(); pollTimer = setInterval(tick, 1500);
  }
  function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  function sendCommand(device, field, value) {
    const msg = { type: 'command', device, field, value };
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
    else fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device, field, value }) });
  }
  function sendConfig(payload) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'config', payload }));
    else fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  }

  // =====================================================================
  //  snapshot handling
  // =====================================================================
  function onSnapshot(data) {
    snap = data;
    zoneLabelMap = {};
    (data.building && data.building.zones || []).forEach(z => { zoneLabelMap[z.id] = z.label; });
    // chart + per-device history buffers
    const en = data.energy || {};
    chartBuf.push({ power: en.grossKw || 0, solar: en.solarKw || 0, grid: en.totalKw || 0 });
    if (chartBuf.length > 150) chartBuf.shift();
    (data.devices || []).forEach(d => {
      const pm = primaryMetric(d);
      if (pm && isFinite(pm.raw)) {
        const a = histById[d.id] || (histById[d.id] = []);
        a.push(pm.raw); if (a.length > 80) a.shift();
      }
    });
    renderAll();
  }

  // =====================================================================
  //  helpers
  // =====================================================================
  const fmt = (n, d = 0) => (n == null || !isFinite(n)) ? '–' : Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  function deviceName(d) {
    const zl = zoneLabelMap[d.zone];
    const noun = (TYPE[d.type] || {}).noun || d.type;
    return (zl ? t(zl) + ' ' : '') + t(noun);
  }
  function clockStr(secs) {
    let h = Math.floor((secs % 86400) / 3600), m = Math.floor((secs % 3600) / 60);
    if (clock24) return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM'; let hh = h % 12; if (hh === 0) hh = 12;
    return hh + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }
  function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
  function mix(c1, c2, f) { return `rgb(${Math.round(lerp(c1[0], c2[0], f))},${Math.round(lerp(c1[1], c2[1], f))},${Math.round(lerp(c1[2], c2[2], f))})`; }
  const COLD = [70, 150, 255], MID = [70, 231, 176], HOT = [255, 106, 125], AMBER = [255, 193, 94], GRAY = [90, 105, 130];
  function scaleColor(metric, v) {
    if (v == null || v < 0 && (metric === 'co2' || metric === 'comfort')) return `rgb(${GRAY.join(',')})`;
    switch (metric) {
      case 'temp': return v <= 23 ? mix(COLD, MID, (v - 18) / 5) : mix(MID, HOT, (v - 23) / 9);
      case 'co2': return v < 800 ? mix(MID, AMBER, (v - 450) / 350) : mix(AMBER, HOT, (v - 800) / 700);
      case 'comfort': return v < 50 ? mix(HOT, AMBER, v / 50) : mix(AMBER, MID, (v - 50) / 50);
      case 'occupancy': return mix([30, 45, 70], [70, 224, 255], Math.min(1, v / 25));
      case 'power': return mix([40, 55, 85], [156, 124, 255], Math.min(1, v / 4));
      default: return `rgb(${GRAY.join(',')})`;
    }
  }
  function zoneMetricVal(z, metric) {
    if (metric === 'temp') return z.climate ? z.temp : null;
    if (metric === 'comfort') return z.climate ? z.comfort : null;
    if (metric === 'co2') return z.co2 >= 0 ? z.co2 : null;
    if (metric === 'occupancy') return z.occupancy;
    if (metric === 'power') return z.power;
    return null;
  }
  // primary metric shown on a fleet card + pushed to history
  function primaryMetric(d) {
    const T = d.telemetry || {};
    switch (d.type) {
      case 'hvac': return { raw: T.temp, label: '溫度', txt: fmt(T.temp, 1), unit: '°C' };
      case 'air': return { raw: T.co2, label: 'CO₂', txt: fmt(T.co2), unit: 'ppm' };
      case 'occupancy': return { raw: T.count, label: '人數', txt: fmt(T.count), unit: t('人數') === '人數' ? '人' : '' };
      case 'light': return { raw: T.bright, label: '亮度', txt: fmt(T.bright), unit: '%' };
      case 'plug': return { raw: T.power, label: '功率', txt: fmt(T.power), unit: 'W' };
      case 'meter': return { raw: T.power / 1000, label: '功率', txt: fmt(T.power / 1000, 1), unit: 'kW' };
      case 'solar': return { raw: T.power / 1000, label: '功率', txt: fmt(T.power / 1000, 1), unit: 'kW' };
      case 'battery': return { raw: T.soc, label: '電量', txt: fmt(T.soc), unit: '%' };
      case 'evcharger': return { raw: T.power / 1000, label: '功率', txt: fmt(T.power / 1000, 1), unit: 'kW' };
      case 'water': return { raw: T.flow, label: '流量', txt: fmt(T.flow, 1), unit: 'L/m' };
      case 'lock': return { raw: T.locked, label: '', txt: T.locked ? t('已上鎖') : t('已解鎖'), unit: '' };
      case 'gateway': return { raw: T.cpu, label: 'CPU', txt: fmt(T.cpu), unit: '%' };
      default: return null;
    }
  }
  function healthOf(id) { return (snap.health || []).find(h => h.id === id); }
  const STATUS_TXT = ['正常', '注意', '衰退', '危急'];
  const STATUS_COL = ['#46e7b0', '#ffc15e', '#ff9d5e', '#ff6a7d'];
  const REASON_TXT = { filter: '濾網需更換', runtime: '運轉時數偏高', battery: '電量偏低', signal: '訊號微弱', offline: '裝置離線', nominal: '運作正常' };

  // =====================================================================
  //  render
  // =====================================================================
  let rafPending = false;
  function renderAll() {
    if (rafPending) return; rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (!snap) return;
      renderHeader(); renderConn(); renderKpis(); renderTwin(); renderChart();
      renderEnergy(); renderFleet(); renderTabs();
      if (drawerId) renderDrawer();
    });
  }

  function renderHeader() {
    const env = snap.environment || {};
    $('#buildingName').textContent = t(snap.building && snap.building.name || 'Fusion Tower');
    $('#simClock').textContent = clockStr(snap.clock || 0);
    $('#outdoorT').textContent = fmt(env.outdoorTemp, 1) + '°';
    $('#gridCarbon').textContent = fmt(env.gridIntensity) + ' g';
    const h = ((snap.clock || 0) / 3600) % 24;
    $('#wxIco').textContent = (h < 6 || h > 19) ? '🌙' : (env.solar > 0.55 ? '☀️' : '⛅');
    const eb = $('#engineBadge');
    eb.textContent = snap.engine === 'native' ? t('原生引擎') : t('Python 引擎');
    eb.title = 'EdgeCore';
  }
  function renderConn() {
    const b = $('#connBadge');
    b.className = 'badge badge-conn' + (conn === 'off' ? ' off' : conn === 'poll' ? ' poll' : '');
    b.textContent = conn === 'live' ? t('即時連線') : conn === 'poll' ? t('輪詢中') : conn === 'off' ? t('已斷線') : t('連線中…');
  }

  function renderKpis() {
    const k = snap.kpi || {}, en = snap.energy || {}, day = snap.daily || {};
    const cards = [
      { cls: '', label: '即時功率', val: fmt(k.powerKw, 1), unit: 'kW', sub: t('尖峰') + ' ' + fmt(day.peakKw, 1) + ' kW' },
      { cls: '', label: '今日用電', val: fmt(day.energyKwh, 1), unit: 'kWh', sub: '$' + fmt(day.costUsd, 1) },
      { cls: 'k-solar', label: '太陽能發電', val: fmt(k.solarKw, 1), unit: 'kW', sub: t('今日') + ' ' + fmt(day.solarKwh, 1) + ' kWh' },
      { cls: 'k-solar', label: '自發自用率', val: fmt(k.selfConsumption), unit: '%', sub: t('太陽能') },
      { cls: 'k-carbon', label: '碳排放', val: fmt(k.carbonKgPerH, 1), unit: 'kg/h', sub: t('今日') + ' ' + fmt(day.carbonKg, 1) + ' kg' },
      { cls: '', label: '線上裝置', val: fmt(k.online), unit: '/ ' + fmt(k.total), sub: 'MQTT ' + ((snap.broker || {}).clientCount || 0) },
      { cls: 'k-comfort', label: '平均舒適度', val: fmt(k.comfortAvg), unit: '%', sub: '' },
      { cls: '', label: '平均 CO₂', val: fmt(k.co2Avg), unit: 'ppm', sub: '' },
      { cls: 'k-alert', label: '使用中告警', val: fmt(k.anomalies), unit: '', sub: '' },
    ];
    const strip = $('#kpiStrip'); strip.innerHTML = '';
    cards.forEach(c => {
      const e = el('div', 'kpi ' + c.cls);
      e.appendChild(el('div', 'kpi-label', t(c.label)));
      const v = el('div', 'kpi-value'); v.innerHTML = c.val + ' <small>' + c.unit + '</small>'; e.appendChild(v);
      if (c.sub) e.appendChild(el('div', 'kpi-sub', c.sub));
      strip.appendChild(e);
    });
  }

  // ---- digital twin floor plan ----
  function renderTwin() {
    // metric segmented control (once)
    const seg = $('#twinMetricSeg');
    if (!seg.dataset.built) {
      [['temp', '溫度'], ['co2', 'CO₂'], ['occupancy', '佔用'], ['power', '功率'], ['comfort', '舒適度']].forEach(([m, lbl]) => {
        const b = el('button', m === twinMetric ? 'on' : '', lbl === 'CO₂' ? 'CO₂' : t(lbl)); b.dataset.m = m;
        b.onclick = () => { twinMetric = m; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.m === m)); renderTwin(); };
        seg.appendChild(b);
      });
      seg.dataset.built = '1';
    }
    const zones = (snap.twin && snap.twin.zones) || [];
    const zmap = {}; zones.forEach(z => zmap[z.zone] = z);
    const meta = (snap.building && snap.building.zones) || [];
    const byFloor = {};
    meta.forEach(z => { if (z.floor === '--') return; (byFloor[z.floor] || (byFloor[z.floor] = [])).push(z); });
    const order = ['RF', 'L3', 'L2', 'L1', 'B1'].filter(f => byFloor[f]);
    const devByZone = {};
    (snap.devices || []).forEach(d => { (devByZone[d.zone] || (devByZone[d.zone] = [])).push(d); });

    const fp = $('#floorPlan'); fp.innerHTML = '';
    order.forEach(floor => {
      const fl = el('div', 'floor');
      fl.appendChild(el('div', 'floor-label', floor));
      const fz = el('div', 'floor-zones');
      byFloor[floor].forEach(zm => {
        const z = zmap[zm.id] || {};
        const v = zoneMetricVal(z, twinMetric);
        const zone = el('div', 'zone');
        zone.style.left = (zm.x * 100) + '%'; zone.style.top = (zm.y * 100) + '%';
        zone.style.width = (zm.w * 100) + '%'; zone.style.height = (zm.h * 100) + '%';
        const col = scaleColor(twinMetric, v);
        zone.style.background = `linear-gradient(160deg, ${col}33, ${col}14)`;
        zone.style.borderColor = col + '66';
        zone.appendChild(el('div', 'zone-name', t(zm.label)));
        const valTxt = v == null ? '—' : twinMetric === 'temp' ? fmt(v, 1) + '°'
          : twinMetric === 'co2' ? fmt(v) : twinMetric === 'occupancy' ? fmt(v)
          : twinMetric === 'power' ? fmt(v, 1) + 'kW' : fmt(v) + '%';
        const vEl = el('div', 'zone-val', valTxt); vEl.style.color = v == null ? '#7f93b5' : '#fff'; zone.appendChild(vEl);
        if (z.occupancy > 0) { const o = el('div', 'zone-occ', '🚶 ' + fmt(z.occupancy)); zone.appendChild(o); }
        const dots = el('div', 'zone-dots');
        (devByZone[zm.id] || []).slice(0, 8).forEach(d => {
          const dot = el('div', 'zone-dot'); const hh = healthOf(d.id);
          dot.style.color = !d.online ? '#ff6a7d' : hh ? STATUS_COL[hh.status] : '#46e0ff';
          dot.style.background = 'currentColor';
          dot.title = deviceName(d);
          dot.onclick = (e) => { e.stopPropagation(); openDrawer(d.id); };
          dots.appendChild(dot);
        });
        zone.appendChild(dots);
        zone.onclick = () => { fleetFilter = 'zone:' + zm.id; fleetSearch = ''; $('#fleetSearch').value = ''; renderFleet(); $('#fleetGrid').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
        fz.appendChild(zone);
      });
      fl.appendChild(fz);
      fp.appendChild(fl);
    });
    // legend
    const ranges = { temp: ['18°', '32°'], co2: ['400', '1500'], occupancy: ['0', '25'], power: ['0', '4kW'], comfort: ['0%', '100%'] };
    const r = ranges[twinMetric] || ['', ''];
    $('#legendLo').textContent = r[0]; $('#legendHi').textContent = r[1];
    const c0 = scaleColor(twinMetric, twinMetric === 'temp' ? 18 : twinMetric === 'co2' ? 450 : twinMetric === 'comfort' ? 0 : 0);
    const c1 = scaleColor(twinMetric, twinMetric === 'temp' ? 32 : twinMetric === 'co2' ? 1500 : twinMetric === 'comfort' ? 100 : twinMetric === 'occupancy' ? 25 : 4);
    $('#legendBar').style.background = `linear-gradient(90deg, ${c0}, ${c1})`;
  }

  // ---- live load + generation chart ----
  function renderChart() {
    const cv = $('#loadChart'); const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const pad = { l: 34, r: 8, t: 8, b: 14 };
    const data = chartBuf; if (!data.length) return;
    const maxV = Math.max(2, ...data.map(d => Math.max(d.power, d.solar))) * 1.15;
    const X = i => pad.l + (w - pad.l - pad.r) * (i / Math.max(1, data.length - 1));
    const Y = v => h - pad.b - (h - pad.t - pad.b) * (v / maxV);
    // grid
    ctx.strokeStyle = 'rgba(120,170,255,0.10)'; ctx.fillStyle = '#5f7398'; ctx.font = '9px sans-serif'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) { const yy = pad.t + (h - pad.t - pad.b) * g / 4; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke(); ctx.fillText(fmt(maxV * (1 - g / 4), 0), 4, yy + 3); }
    const series = (key, color, fill) => {
      ctx.beginPath(); data.forEach((d, i) => { const x = X(i), y = Y(d[key]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
      if (fill) { ctx.lineTo(X(data.length - 1), h - pad.b); ctx.lineTo(X(0), h - pad.b); ctx.closePath(); const g = ctx.createLinearGradient(0, pad.t, 0, h); g.addColorStop(0, fill); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fill(); }
    };
    series('power', '#46e0ff', 'rgba(70,224,255,0.18)');
    series('solar', '#ffc15e', 'rgba(255,193,94,0.14)');
    series('grid', '#9c7cff', null);
    const lg = $('#chartLegend');
    lg.innerHTML = `<span><i style="background:#46e0ff"></i>${t('總負載')}</span><span><i style="background:#ffc15e"></i>${t('太陽能')}</span><span><i style="background:#9c7cff"></i>${t('市電輸入')}</span>`;
  }

  // ---- energy disaggregation ----
  function renderEnergy() {
    const en = snap.energy || {}, bd = en.breakdown || {};
    const segs = [
      { k: 'hvac', label: '空調', col: '#46e0ff', v: bd.hvac || 0 },
      { k: 'lighting', label: '照明', col: '#ffc15e', v: bd.lighting || 0 },
      { k: 'plug', label: '智慧插座', col: '#9c7cff', v: bd.plug || 0 },
      { k: 'ev', label: '充電樁', col: '#46e7b0', v: bd.ev || 0 },
      { k: 'base', label: '基載', col: '#5aa9ff', v: bd.base || 0 },
      { k: 'other', label: '其他', col: '#7f93b5', v: bd.other || 0 },
    ];
    const total = segs.reduce((s, x) => s + x.v, 0) || 1;
    // donut
    const cv = $('#energyDonut'); const ctx = cv.getContext('2d'); const R = 80, cx = 90, cy = 90; ctx.clearRect(0, 0, 180, 180);
    let a0 = -Math.PI / 2;
    segs.forEach(s => { const a1 = a0 + (s.v / total) * Math.PI * 2; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.arc(cx, cy, R - 22, a1, a0, true); ctx.closePath(); ctx.fillStyle = s.col; ctx.fill(); a0 = a1; });
    ctx.fillStyle = '#e8f0ff'; ctx.font = '700 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(fmt(total, 1), cx, cy - 2); ctx.fillStyle = '#93a6c8'; ctx.font = '11px sans-serif'; ctx.fillText('kW', cx, cy + 15);
    // legend
    const lg = $('#energyLegend'); lg.innerHTML = '';
    segs.forEach(s => { const r = el('div', 'energy-row'); const i = el('i'); i.style.background = s.col; r.appendChild(i); r.appendChild(el('span', 'er-name', t(s.label))); r.appendChild(el('span', 'er-val', fmt(s.v, 2) + ' kW')); lg.appendChild(r); });
    $('#energyTotals').innerHTML = `<span>${t('即時電費')} <b>$${fmt(en.tariffCostPerH, 2)}/h</b></span>`;
  }

  // ---- device fleet ----
  function renderFleet() {
    const seg = $('#fleetFilterSeg');
    if (!seg.dataset.built) {
      const opts = [['all', '全部']].concat(TYPE_ORDER.map(ty => [ty, TYPE[ty].noun]));
      opts.forEach(([v, lbl]) => { const b = el('button', v === fleetFilter ? 'on' : '', t(lbl)); b.dataset.v = v; b.onclick = () => { fleetFilter = v; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === v)); renderFleet(); }; seg.appendChild(b); });
      const s = $('#fleetSearch'); s.placeholder = t('搜尋裝置…'); s.oninput = () => { fleetSearch = s.value.toLowerCase(); renderFleet(); };
      seg.dataset.built = '1';
    }
    const grid = $('#fleetGrid'); grid.innerHTML = '';
    let list = (snap.devices || []).slice();
    if (fleetFilter.startsWith('zone:')) { const z = fleetFilter.slice(5); list = list.filter(d => d.zone === z); }
    else if (fleetFilter !== 'all') list = list.filter(d => d.type === fleetFilter);
    if (fleetSearch) list = list.filter(d => (deviceName(d) + ' ' + d.id + ' ' + d.type).toLowerCase().includes(fleetSearch));
    list.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
    list.forEach(d => grid.appendChild(deviceCard(d)));
    if (!list.length) grid.appendChild(el('div', 'empty', '—'));
  }
  function deviceCard(d) {
    const c = el('div', 'dev-card' + (d.online ? '' : ' offline')); c.onclick = () => openDrawer(d.id);
    const top = el('div', 'dev-top');
    const ico = el('div', 'dev-ico', (TYPE[d.type] || {}).glyph || '•'); top.appendChild(ico);
    const nm = el('div'); nm.appendChild(el('div', 'dev-name', deviceName(d))); nm.appendChild(el('div', 'dev-zone', d.id)); top.appendChild(nm);
    c.appendChild(top);
    const pm = primaryMetric(d) || { txt: '–', unit: '', label: '' };
    const mv = el('div', 'dev-metric'); mv.innerHTML = pm.txt + ' <small>' + pm.unit + '</small>'; c.appendChild(mv);
    const foot = el('div', 'dev-foot');
    const pill = el('span', 'pill ' + (d.online ? 'on' : 'off'), d.online ? t('上線') : t('離線')); foot.appendChild(pill);
    foot.appendChild(sigBars(d.rssi));
    c.appendChild(foot);
    const hh = healthOf(d.id); if (hh) c.appendChild(healthRing(hh.score, STATUS_COL[hh.status]));
    return c;
  }
  function sigBars(rssi) {
    const wrap = el('span', 'sig-bars'); const q = Math.max(0, Math.min(4, Math.round((rssi + 92) / 13)));
    for (let i = 0; i < 4; i++) { const b = el('i', i < q ? 'lit' : ''); b.style.height = (4 + i * 2) + 'px'; wrap.appendChild(b); }
    return wrap;
  }
  function healthRing(score, color) {
    const ns = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('class', 'health-ring'); svg.setAttribute('viewBox', '0 0 36 36');
    const bg = document.createElementNS(ns, 'circle'); bg.setAttribute('cx', 18); bg.setAttribute('cy', 18); bg.setAttribute('r', 15); bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', 'rgba(255,255,255,0.10)'); bg.setAttribute('stroke-width', 3); svg.appendChild(bg);
    const fg = document.createElementNS(ns, 'circle'); const C = 2 * Math.PI * 15; fg.setAttribute('cx', 18); fg.setAttribute('cy', 18); fg.setAttribute('r', 15); fg.setAttribute('fill', 'none'); fg.setAttribute('stroke', color); fg.setAttribute('stroke-width', 3); fg.setAttribute('stroke-linecap', 'round'); fg.setAttribute('stroke-dasharray', `${C * score / 100} ${C}`); fg.setAttribute('transform', 'rotate(-90 18 18)'); svg.appendChild(fg);
    return svg;
  }

  // ---- tabs ----
  function renderTabs() {
    const bar = $('#tabbar');
    const tabs = [
      ['events', '異常與事件流', (snap.events || []).length],
      ['health', '預測性維護', (snap.health || []).filter(h => h.status >= 2).length],
      ['rules', '自動化規則', (snap.rules || []).length],
      ['mqtt', 'MQTT 訊息匯流排', (snap.broker || {}).clientCount || 0],
      ['console', '情境控制台', null],
    ];
    if (!bar.dataset.built) {
      tabs.forEach(([id, lbl]) => { const b = el('button', id === activeTab ? 'on' : ''); b.dataset.id = id; b.onclick = () => { activeTab = id; switchTab(); }; bar.appendChild(b); });
      bar.dataset.built = '1';
    }
    bar.querySelectorAll('button').forEach((b, i) => {
      const [id, lbl, cnt] = tabs[i];
      b.innerHTML = t(lbl) + (cnt != null && cnt > 0 ? ` <span class="tab-count">${cnt}</span>` : '');
      b.classList.toggle('on', id === activeTab);
    });
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === activeTab));
    renderEvents(); renderHealth(); renderRules(); renderMqtt(); renderConsole();
  }
  function switchTab() { renderTabs(); }

  function renderEvents() {
    const box = $('#eventFeed'); box.innerHTML = '';
    const evs = snap.events || [];
    if (!evs.length) { box.appendChild(el('div', 'empty', t('尚無事件'))); return; }
    const KIND = { anomaly: '異常', control: '控制', automation: '自動化', config: '設定', fault: '故障', info: '資訊' };
    evs.forEach(e => {
      const row = el('div', 'event sev-' + (e.severity || 0));
      row.appendChild(el('span', 'ev-kind', t(KIND[e.kind] || e.kind)));
      row.appendChild(el('span', 'ev-msg', e.message));
      row.appendChild(el('span', 'ev-time', clockStr(e.clock || 0)));
      box.appendChild(row);
    });
  }
  function renderHealth() {
    const box = $('#healthList'); box.innerHTML = '';
    const list = (snap.health || []).slice().sort((a, b) => a.score - b.score);
    const devMap = {}; (snap.devices || []).forEach(d => devMap[d.id] = d);
    list.forEach(h => {
      const d = devMap[h.id]; if (!d) return;
      const it = el('div', 'health-item');
      const nm = el('div', 'health-name'); nm.appendChild(document.createTextNode(deviceName(d)));
      nm.appendChild(el('small', '', t(STATUS_TXT[h.status]) + ' · ' + t(REASON_TXT[h.reason] || h.reason)));
      it.appendChild(nm);
      const bar = el('div', 'health-bar'); const fill = el('i'); fill.style.width = h.score + '%'; fill.style.background = STATUS_COL[h.status]; bar.appendChild(fill); it.appendChild(bar);
      it.appendChild(el('div', 'health-score', fmt(h.score)));
      it.onclick = () => openDrawer(h.id); it.style.cursor = 'pointer';
      box.appendChild(it);
    });
  }
  function renderRules() {
    const box = $('#rulesList'); box.innerHTML = '';
    const fired = new Set((snap.automations || {}).triggered || []);
    const devMap = {}; (snap.devices || []).forEach(d => devMap[d.id] = d);
    const nm = id => devMap[id] ? deviceName(devMap[id]) : id;
    (snap.rules || []).forEach(r => {
      const row = el('div', 'rule' + (fired.has(r.id) ? ' fired' : ''));
      const tog = el('div', 'toggle' + (r.enabled ? ' on' : '')); tog.onclick = () => sendConfig({ action: 'rule.toggle', id: r.id }); row.appendChild(tog);
      row.appendChild(el('div', 'rule-name', r.name));
      const logic = el('div', 'rule-logic');
      logic.innerHTML = `${t('若')} <b>${nm(r.mDev)}·${r.metric}</b> ${r.op} ${r.thr} &nbsp;<span class="then">${t('則')} <b>${nm(r.aDev)}·${r.aField}</b> = ${r.aVal}</span>` + (fired.has(r.id) ? ` · ${t('剛剛觸發')}` : '');
      row.appendChild(logic);
      const del = el('button', 'btn', t('刪除')); del.onclick = () => sendConfig({ action: 'rule.delete', id: r.id }); row.appendChild(del);
      box.appendChild(row);
    });
  }
  function renderMqtt() {
    const box = $('#mqttPanel'); const b = snap.broker || {}; const st = b.stats || {};
    box.innerHTML = '';
    const stats = el('div', 'mqtt-stats');
    const stat = (lbl, v) => { const s = el('div', 'mqtt-stat'); s.appendChild(el('div', 'ms-label', lbl)); s.appendChild(el('div', 'ms-val', v)); return s; };
    stats.appendChild(stat(t('訊息匯流排端點'), b.endpoint || '—'));
    stats.appendChild(stat(t('連線客戶端'), String(b.clientCount || 0)));
    stats.appendChild(stat(t('已發布'), fmt(st.published)));
    stats.appendChild(stat(t('已派送'), fmt(st.delivered)));
    stats.appendChild(stat(t('保留訊息'), fmt(b.retained)));
    box.appendChild(stats);
    const cls = el('div', 'mqtt-clients');
    if (!(b.clients || []).length) cls.appendChild(el('div', 'empty', t('尚無外部裝置連線')));
    (b.clients || []).forEach(c => {
      const r = el('div', 'mqtt-client');
      r.appendChild(el('span', 'mc-id', c.id));
      r.appendChild(el('span', 'mc-addr', c.addr));
      r.appendChild(el('span', '', tf('{0} ' + t('訂閱'), c.subs.length) + ' · ↑' + c.tx + ' ↓' + c.rx));
      cls.appendChild(r);
    });
    box.appendChild(cls);
    const tip = el('div', 'mqtt-tip'); tip.innerHTML = t('提示：可用任何 MQTT 用戶端連到此 broker 發布到 fusion/iot/#').replace('fusion/iot/#', '<code>fusion/iot/#</code>'); box.appendChild(tip);
  }
  function renderConsole() {
    const box = $('#consolePanel'); if (box.dataset.built) { syncConsole(); return; }
    box.innerHTML = '';
    // timescale
    const r1 = el('div', 'console-row'); r1.appendChild(el('label', '', t('時間倍率')));
    const ts = el('input'); ts.type = 'range'; ts.min = 1; ts.max = 300; ts.step = 1; ts.id = 'tsRange'; r1.appendChild(ts);
    const tsv = el('span', 'val'); tsv.id = 'tsVal'; r1.appendChild(tsv);
    ts.oninput = () => { $('#tsVal').textContent = ts.value + '×'; }; ts.onchange = () => sendConfig({ action: 'timescale', value: +ts.value }); box.appendChild(r1);
    // cloud
    const r2 = el('div', 'console-row'); r2.appendChild(el('label', '', t('日照係數')));
    const cl = el('input'); cl.type = 'range'; cl.min = 0; cl.max = 100; cl.step = 1; cl.id = 'clRange'; r2.appendChild(cl);
    const clv = el('span', 'val'); clv.id = 'clVal'; r2.appendChild(clv);
    cl.oninput = () => { $('#clVal').textContent = cl.value + '%'; }; cl.onchange = () => sendConfig({ action: 'cloud', value: +cl.value / 100 }); box.appendChild(r2);
    // faults
    const r3 = el('div', 'console-row'); r3.appendChild(el('label', '', t('注入故障')));
    const br = el('div', 'btn-row');
    const mk = (lbl, cls, fn) => { const b = el('button', 'btn ' + (cls || ''), t(lbl)); b.onclick = fn; return b; };
    br.appendChild(mk('濾網阻塞', '', () => sendConfig({ action: 'fault.inject', device: 'hvac-office', kind: 'filter' })));
    br.appendChild(mk('機房漏水', '', () => sendConfig({ action: 'fault.inject', device: 'water-server', kind: 'leak' })));
    br.appendChild(mk('裝置離線測試', '', () => sendConfig({ action: 'fault.inject', device: 'air-cafe', kind: 'offline' })));
    br.appendChild(mk('低電量', '', () => sendConfig({ action: 'fault.inject', device: 'lock-main', kind: 'battery' })));
    r3.appendChild(br); box.appendChild(r3);
    const r4 = el('div', 'console-row'); r4.appendChild(el('label', '', ' '));
    const br2 = el('div', 'btn-row'); br2.appendChild(mk('重設艦隊', 'danger', () => sendConfig({ action: 'reset' }))); r4.appendChild(br2); box.appendChild(r4);
    box.dataset.built = '1'; syncConsole();
  }
  function syncConsole() {
    const ts = $('#tsRange'), cl = $('#clRange'); if (!ts) return;
    if (document.activeElement !== ts) { ts.value = snap.timescale || 60; $('#tsVal').textContent = (snap.timescale || 60) + '×'; }
    if (document.activeElement !== cl) { cl.value = Math.round((snap.cloud != null ? snap.cloud : 1) * 100); $('#clVal').textContent = $('#clRange').value + '%'; }
  }

  // ---- device drawer ----
  function openDrawer(id) { drawerId = id; $('#drawer').classList.add('open'); $('#scrim').classList.add('show'); renderDrawer(); }
  function closeDrawer() { drawerId = null; $('#drawer').classList.remove('open'); $('#scrim').classList.remove('show'); }
  function renderDrawer() {
    const d = (snap.devices || []).find(x => x.id === drawerId); if (!d) { closeDrawer(); return; }
    $('#drawerTitle').textContent = deviceName(d);
    const hh = healthOf(d.id);
    $('#drawerSub').textContent = `${d.id} · ${d.vendor || ''} ${t('韌體')} ${d.firmware || '—'}`;
    const body = $('#drawerBody'); body.innerHTML = '';

    // telemetry section
    const tsec = el('div', 'drawer-section'); tsec.appendChild(el('h4', '', t('即時遙測')));
    const tg = el('div', 'tele-grid');
    teleItems(d).forEach(it => { const c = el('div', 'tele'); c.appendChild(el('div', 't-label', it.label)); const v = el('div', 't-val'); v.innerHTML = it.val + (it.unit ? ' <small>' + it.unit + '</small>' : ''); c.appendChild(v); tg.appendChild(c); });
    tsec.appendChild(tg); body.appendChild(tsec);

    // mini chart
    const hist = histById[d.id] || [];
    if (hist.length > 2) {
      const csec = el('div', 'drawer-section'); const pm = primaryMetric(d);
      csec.appendChild(el('h4', '', (pm && t(pm.label) || '') + ' · ' + t('即時遙測')));
      const cv = el('canvas', 'drawer-chart'); csec.appendChild(cv); body.appendChild(csec);
      requestAnimationFrame(() => drawMini(cv, hist));
    }

    // controls
    const ctl = controlsFor(d);
    if (ctl) { const csec = el('div', 'drawer-section'); csec.appendChild(el('h4', '', t('控制'))); csec.appendChild(ctl); body.appendChild(csec); }

    // health
    if (hh) {
      const hsec = el('div', 'drawer-section'); hsec.appendChild(el('h4', '', t('健康分數')));
      const bar = el('div', 'health-bar'); const fill = el('i'); fill.style.width = hh.score + '%'; fill.style.background = STATUS_COL[hh.status]; bar.appendChild(fill);
      const wrap = el('div'); wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '10px';
      wrap.appendChild(bar); wrap.appendChild(el('b', '', fmt(hh.score)));
      hsec.appendChild(wrap);
      hsec.appendChild(el('div', 'kpi-sub', t(STATUS_TXT[hh.status]) + ' · ' + t(REASON_TXT[hh.reason] || hh.reason)));
      body.appendChild(hsec);
    }

    // mqtt topic
    const topsec = el('div', 'drawer-section'); topsec.appendChild(el('h4', '', t('主題')));
    topsec.appendChild(el('div', 'topic-pill', `fusion/iot/${d.zone}/${d.id}/telemetry`));
    body.appendChild(topsec);
  }
  function teleItems(d) {
    const T = d.telemetry || {}; const out = [];
    const add = (label, val, unit) => { if (val != null && isFinite(val)) out.push({ label: t(label), val: fmt(val, unit === '°C' || unit === 'kW' || unit === 'L/m' ? 1 : 0), unit }); };
    switch (d.type) {
      case 'hvac': add('溫度', T.temp, '°C'); add('設定點', T.setpoint, '°C'); add('功率', T.power, 'W'); add('運轉率', T.duty, '%'); add('濾網健康', T.filter, '%'); break;
      case 'air': add('CO₂', T.co2, 'ppm'); add('PM2.5', T.pm25, 'µg'); add('VOC', T.voc, 'ppb'); add('濕度', T.humidity, '%'); break;
      case 'occupancy': add('人數', T.count, ''); break;
      case 'light': add('亮度', T.bright, '%'); add('功率', T.power, 'W'); add('照度', T.lux, 'lx'); break;
      case 'plug': add('功率', T.power, 'W'); add('運轉率', T.duty, '%'); break;
      case 'meter': add('功率', T.power / 1000, 'kW'); add('電壓', T.voltage, 'V'); add('電流', T.current, 'A'); add('今日用電', T.energy, 'kWh'); break;
      case 'solar': add('功率', T.power / 1000, 'kW'); add('效率', T.efficiency, '%'); add('今日', T.energy, 'kWh'); break;
      case 'battery': add('充電狀態', T.soc, '%'); add('功率', T.power, 'kW'); break;
      case 'evcharger': add('功率', T.power / 1000, 'kW'); add('充電狀態', T.soc, '%'); break;
      case 'water': add('流量', T.flow, 'L/m'); out.push({ label: t('漏水'), val: T.leak ? t('漏水') : '—', unit: '' }); break;
      case 'lock': out.push({ label: t('狀態'), val: T.locked ? t('已上鎖') : t('已解鎖'), unit: '' }); add('電量', T.battery, '%'); break;
      case 'gateway': add('CPU', T.cpu, '%'); break;
    }
    out.push({ label: t('訊號'), val: fmt(d.rssi) + ' dBm', unit: '' });
    return out;
  }
  function controlsFor(d) {
    const wrap = el('div'); const st = d.state || {};
    if (d.type === 'hvac') {
      const row = el('div', 'ctl-row'); row.appendChild(el('label', '', t('設定點')));
      const sl = el('input'); sl.type = 'range'; sl.min = 16; sl.max = 28; sl.step = 0.5; sl.value = st.setpoint != null ? st.setpoint : 23; row.appendChild(sl);
      const v = el('span', 'val', fmt(sl.value, 1) + '°'); row.appendChild(v);
      sl.oninput = () => v.textContent = fmt(sl.value, 1) + '°'; sl.onchange = () => sendCommand(d.id, 'setpoint', +sl.value);
      wrap.appendChild(row);
      const mrow = el('div', 'ctl-row'); mrow.appendChild(el('label', '', t('模式')));
      const seg = el('div', 'seg'); [['1', '製冷'], ['2', '製熱'], ['3', '自動'], ['0', '停止']].forEach(([mv, lbl]) => { const b = el('button', String(st.mode | 0) === mv ? 'on' : '', t(lbl)); b.onclick = () => sendCommand(d.id, 'mode', +mv); seg.appendChild(b); }); mrow.appendChild(seg); wrap.appendChild(mrow);
      return wrap;
    }
    if (d.type === 'light') { return toggleRow('照明', st.on, v => sendCommand(d.id, 'auto', 0) || sendCommand(d.id, 'on', v ? 1 : 0)); }
    if (d.type === 'plug') { return toggleRow('智慧插座', st.on, v => sendCommand(d.id, 'on', v ? 1 : 0)); }
    if (d.type === 'lock') { return toggleRow('已上鎖', st.locked, v => sendCommand(d.id, 'locked', v ? 1 : 0)); }
    if (d.type === 'water') { return toggleRow('水流感測', st.valve, v => sendCommand(d.id, 'valve', v ? 1 : 0)); }
    return null;
  }
  function toggleRow(label, on, fn) {
    const row = el('div', 'ctl-row'); row.appendChild(el('label', '', t(label)));
    const tog = el('div', 'toggle' + (on ? ' on' : '')); tog.onclick = () => { const nv = !tog.classList.contains('on'); tog.classList.toggle('on', nv); fn(nv); }; row.appendChild(tog);
    return row;
  }
  function drawMini(cv, data) {
    const dpr = window.devicePixelRatio || 1; const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
    cv.width = w * dpr; cv.height = h * dpr; const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const min = Math.min(...data), max = Math.max(...data), rng = (max - min) || 1;
    ctx.beginPath(); data.forEach((v, i) => { const x = (w - 8) * i / (data.length - 1) + 4; const y = h - 6 - (h - 12) * (v - min) / rng; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = '#46e0ff'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.lineTo(w - 4, h - 4); ctx.lineTo(4, h - 4); ctx.closePath(); const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(70,224,255,0.25)'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fill();
  }

  // =====================================================================
  //  i18n + chrome
  // =====================================================================
  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.getAttribute('data-i18n')); });
    document.documentElement.lang = getLang();
  }
  function rerenderAfterLang() {
    applyStaticI18n();
    // rebuild segmented controls / tabs whose labels are language-bound
    ['#twinMetricSeg', '#fleetFilterSeg', '#tabbar', '#consolePanel'].forEach(s => { const e = $(s); if (e) { e.innerHTML = ''; delete e.dataset.built; } });
    if (snap) renderAll();
  }
  // The FusionOS host owns language + clock format + timezone (Settings -> 語言與時間).
  // It broadcasts FUSION_LOCALE_CHANGED whenever they change; we follow it so the app
  // stays consistent with the rest of the system. (FUSION_SET_LANGUAGE handled too.)
  function applyLocale(d) {
    if (d.timezone) timezone = d.timezone;
    if (d.clock24 != null) clock24 = !!d.clock24;
    const lang = d.language || (d.payload && d.payload.language);
    if (lang && LANGS.indexOf(lang) >= 0 && lang !== getLang()) { setLang(lang); rerenderAfterLang(); }
    else if (snap) renderAll();
  }
  window.addEventListener('message', (ev) => {
    let d = ev.data; if (!d) return;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
    if (d.type === 'FUSION_LOCALE_CHANGED' || d.type === 'FUSION_SET_LANGUAGE') applyLocale(d);
  });
  // WebView2 delivers host messages on chrome.webview; bridge them to window messages.
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.addEventListener('message', (ev) => {
      window.dispatchEvent(new MessageEvent('message', { data: ev.data }));
    });
  }

  // ---- boot ----
  document.addEventListener('DOMContentLoaded', () => {
    applyStaticI18n();
    $('#drawerClose').onclick = closeDrawer; $('#scrim').onclick = closeDrawer;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    window.addEventListener('resize', () => { if (snap) { renderChart(); renderEnergy(); } });
    connect();
    // safety: if WS hasn't delivered shortly, ensure polling is up
    setTimeout(() => { if (!snap) startPoll(); }, 2500);
  });
})();
