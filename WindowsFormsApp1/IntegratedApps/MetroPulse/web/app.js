(function () {
  const params = new URLSearchParams(location.search);
  const state = {
    lang: params.get('lang') || 'zh-TW',
    timezone: params.get('timezone') || 'Asia/Taipei',
    clock24: params.get('clock24') !== 'false',
    report: window.METROPULSE_REPORT || null,
    locating: false
  };

  const dict = {
    'zh-TW': {
      productLabel: '智慧城市交通中樞',
      useLocation: '使用目前位置',
      headline: '即時路網、天氣與事故調度整合',
      subhead: '定位後會結合開放資料與本機原生模擬核心，產生目前地區的交通決策視圖。',
      waiting: '等待定位',
      locating: '定位中',
      live: '即時資料已連線',
      fallback: '使用本地備援',
      nativeCore: '原生模擬核心',
      broker: 'Python 即時資料 broker',
      mapLabel: '城市脈流圖',
      eta: '醫療優先路徑',
      etaHint: '即時壅塞權重後的 ETA',
      pressure: '路網壓力',
      pressureHint: '天氣、空氣與道路密度加權',
      air: '空氣品質',
      roads: '附近道路',
      roadsHint: 'OSM Overpass 即時摘要',
      route: '最佳路徑',
      signals: '號誌策略',
      adaptive: '自適應週期',
      incident: '事故調度',
      forecast: '兩小時流量預測',
      forecastHint: '由即時壓力驅動的離散模擬',
      minutes: '分鐘',
      seconds: '秒',
      cycle: '週期',
      green: '綠燈',
      flow: '流量',
      risk: '風險',
      speed: '速度',
      denied: '定位未授權，使用台北基準點',
      unavailable: '定位不可用，使用台北基準點',
      loading: '載入即時資料',
      error: '即時資料暫時不可用'
    },
    'zh-CN': {
      productLabel: '智慧城市交通中枢',
      useLocation: '使用当前位置',
      headline: '实时路网、天气与事故调度整合',
      subhead: '定位后会结合开放数据与本机原生模拟核心，生成当前地区的交通决策视图。',
      waiting: '等待定位',
      locating: '定位中',
      live: '实时数据已连接',
      fallback: '使用本地备用',
      nativeCore: '原生模拟核心',
      broker: 'Python 实时数据 broker',
      mapLabel: '城市脉流图',
      eta: '医疗优先路径',
      etaHint: '实时拥堵权重后的 ETA',
      pressure: '路网压力',
      pressureHint: '天气、空气与道路密度加权',
      air: '空气质量',
      roads: '附近道路',
      roadsHint: 'OSM Overpass 实时摘要',
      route: '最佳路径',
      signals: '信号灯策略',
      adaptive: '自适应周期',
      incident: '事故调度',
      forecast: '两小时流量预测',
      forecastHint: '由实时压力驱动的离散模拟',
      minutes: '分钟',
      seconds: '秒',
      cycle: '周期',
      green: '绿灯',
      flow: '流量',
      risk: '风险',
      speed: '速度',
      denied: '定位未授权，使用台北基准点',
      unavailable: '定位不可用，使用台北基准点',
      loading: '加载实时数据',
      error: '实时数据暂时不可用'
    },
    en: {
      productLabel: 'Smart City Traffic Command',
      useLocation: 'Use Current Location',
      headline: 'Live road, weather, and incident orchestration',
      subhead: 'After location access, MetroPulse merges open data with a native simulation core to generate a traffic decision view for the current area.',
      waiting: 'Waiting for location',
      locating: 'Locating',
      live: 'Live data linked',
      fallback: 'Local fallback',
      nativeCore: 'Native simulation core',
      broker: 'Python realtime broker',
      mapLabel: 'City flow map',
      eta: 'Medical priority route',
      etaHint: 'ETA after live congestion weighting',
      pressure: 'Network pressure',
      pressureHint: 'Weather, air, and road density weighted',
      air: 'Air quality',
      roads: 'Nearby roads',
      roadsHint: 'OSM Overpass realtime summary',
      route: 'Optimized route',
      signals: 'Signal strategy',
      adaptive: 'Adaptive cycle',
      incident: 'Incident response',
      forecast: 'Two-hour flow forecast',
      forecastHint: 'Discrete simulation driven by live pressure',
      minutes: 'min',
      seconds: 'sec',
      cycle: 'cycle',
      green: 'green',
      flow: 'flow',
      risk: 'risk',
      speed: 'speed',
      denied: 'Location denied, using Taipei baseline',
      unavailable: 'Location unavailable, using Taipei baseline',
      loading: 'Loading realtime data',
      error: 'Realtime data unavailable'
    },
    ja: {
      productLabel: 'スマートシティ交通中枢',
      useLocation: '現在地を使用',
      headline: 'リアルタイム道路、天気、事故対応の統合',
      subhead: '位置情報の許可後、オープンデータとネイティブシミュレーションコアを統合して現在地域の交通判断を生成します。',
      waiting: '位置情報待機',
      locating: '測位中',
      live: 'リアルタイム接続済み',
      fallback: 'ローカル代替',
      nativeCore: 'ネイティブシミュレーションコア',
      broker: 'Python リアルタイム broker',
      mapLabel: '都市フローマップ',
      eta: '医療優先ルート',
      etaHint: 'リアルタイム混雑重み付き ETA',
      pressure: '道路網圧力',
      pressureHint: '天気、空気、道路密度の重み付け',
      air: '空気品質',
      roads: '周辺道路',
      roadsHint: 'OSM Overpass リアルタイム概要',
      route: '最適ルート',
      signals: '信号戦略',
      adaptive: '適応サイクル',
      incident: '事故対応',
      forecast: '2時間交通流予測',
      forecastHint: 'リアルタイム圧力による離散シミュレーション',
      minutes: '分',
      seconds: '秒',
      cycle: '周期',
      green: '青信号',
      flow: '流量',
      risk: 'リスク',
      speed: '速度',
      denied: '位置情報が拒否されました。台北基準点を使用します',
      unavailable: '位置情報が利用できません。台北基準点を使用します',
      loading: 'リアルタイムデータを読み込み中',
      error: 'リアルタイムデータを利用できません'
    },
    ko: {
      productLabel: '스마트시티 교통 관제',
      useLocation: '현재 위치 사용',
      headline: '실시간 도로, 날씨, 사고 대응 통합',
      subhead: '위치 권한 후 공개 데이터와 네이티브 시뮬레이션 코어를 결합해 현재 지역의 교통 의사결정 화면을 생성합니다.',
      waiting: '위치 대기',
      locating: '위치 확인 중',
      live: '실시간 데이터 연결됨',
      fallback: '로컬 대체 사용',
      nativeCore: '네이티브 시뮬레이션 코어',
      broker: 'Python 실시간 broker',
      mapLabel: '도시 흐름 지도',
      eta: '의료 우선 경로',
      etaHint: '실시간 혼잡 가중 ETA',
      pressure: '도로망 압력',
      pressureHint: '날씨, 공기, 도로 밀도 가중',
      air: '대기질',
      roads: '주변 도로',
      roadsHint: 'OSM Overpass 실시간 요약',
      route: '최적 경로',
      signals: '신호 전략',
      adaptive: '적응 주기',
      incident: '사고 대응',
      forecast: '2시간 흐름 예측',
      forecastHint: '실시간 압력 기반 이산 시뮬레이션',
      minutes: '분',
      seconds: '초',
      cycle: '주기',
      green: '녹색',
      flow: '흐름',
      risk: '위험',
      speed: '속도',
      denied: '위치 권한이 거부되어 타이베이 기준점을 사용합니다',
      unavailable: '위치를 사용할 수 없어 타이베이 기준점을 사용합니다',
      loading: '실시간 데이터 로드 중',
      error: '실시간 데이터를 사용할 수 없습니다'
    }
  };

  function t(key) {
    return (dict[state.lang] && dict[state.lang][key]) || dict['zh-TW'][key] || key;
  }

  function applyI18n() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
    render();
  }

  function setBadge(key) {
    const badge = document.getElementById('liveBadge');
    if (badge) badge.textContent = t(key);
  }

  function updateClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    try {
      el.textContent = new Intl.DateTimeFormat(state.lang, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: !state.clock24,
        timeZone: state.timezone
      }).format(new Date());
    } catch {
      el.textContent = new Date().toLocaleTimeString();
    }
  }

  function requestLocation() {
    if (state.locating) return;
    state.locating = true;
    setBadge('locating');
    if (!navigator.geolocation) {
      loadReport({ latitude: 25.033, longitude: 121.5654 }, t('unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => loadReport(pos.coords, null),
      (err) => loadReport({ latitude: 25.033, longitude: 121.5654 }, err && err.code === 1 ? t('denied') : t('unavailable')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  }

  async function loadReport(coords, fallbackMessage) {
    state.locating = false;
    setBadge('loading');
    const lat = Number(coords.latitude || 25.033);
    const lon = Number(coords.longitude || 121.5654);
    const query = new URLSearchParams({
      lat: lat.toFixed(5),
      lon: lon.toFixed(5),
      lang: state.lang,
      timezone: state.timezone,
      clock24: String(state.clock24),
      place: fallbackMessage || 'Current district'
    });
    try {
      const res = await fetch(`/api/report?${query.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      state.report = data;
      setBadge(data.broker && data.broker.realtimeLive ? 'live' : 'fallback');
    } catch {
      if (!state.report) state.report = fallbackReport(lat, lon, fallbackMessage || t('error'));
      setBadge('fallback');
    }
    render();
  }

  function fallbackReport(lat, lon, label) {
    return {
      city: 'fusion-harbor',
      language: state.lang,
      generatedAt: new Date().toISOString(),
      location: { label, lat, lon },
      realtime: { pressure: 1.1, pm25: 8, aqi: 32, roadCount: 42, roadKm: 15, temperature: 27, wind: 8, precipitation: 0 },
      optimizedRoute: {
        etaMinutes: 13.8,
        nodes: ['Current Position', 'Civic Market', 'Central Station', 'Medical District'],
        segments: [
          { from: 'Current Position', to: 'Civic Market', minutes: 3.8, congestion: 0.86 },
          { from: 'Civic Market', to: 'Central Station', minutes: 5.2, congestion: 1.02 },
          { from: 'Central Station', to: 'Medical District', minutes: 4.8, congestion: 1.08 }
        ]
      },
      signalPlan: [
        { intersection: 'Central Station', greenSeconds: 55, cycleSeconds: 116, load: 0.68 },
        { intersection: 'Civic Market', greenSeconds: 51, cycleSeconds: 112, load: 0.62 },
        { intersection: 'Medical District', greenSeconds: 58, cycleSeconds: 114, load: 0.71 }
      ],
      incidentResponse: {
        incident: 'Harbor freight slowdown',
        etaMinutes: 8.4,
        units: [
          { name: 'Medical drone relay', etaMinutes: 5.4 },
          { name: 'Signal override team', etaMinutes: 6.6 }
        ]
      },
      districts: [
        { id: 'user', name: 'Current Position', x: 0.12, y: 0.74, flow: 0.52, safety: 0.67, type: 'origin' },
        { id: 'market', name: 'Civic Market', x: 0.34, y: 0.76, flow: 0.64, safety: 0.54, type: 'commerce' },
        { id: 'station', name: 'Central Station', x: 0.42, y: 0.5, flow: 0.78, safety: 0.48, type: 'transit' },
        { id: 'hospital', name: 'Medical District', x: 0.68, y: 0.42, flow: 0.72, safety: 0.55, type: 'priority' },
        { id: 'campus', name: 'University Campus', x: 0.6, y: 0.72, flow: 0.46, safety: 0.72, type: 'education' }
      ],
      simulationFrames: Array.from({ length: 13 }, (_, i) => ({ minute: i * 10, flow: 0.48 + Math.sin(i / 12 * Math.PI) * 0.28, speed: 42 - i * 0.6, risk: 0.28 + i * 0.025 }))
    };
  }

  function formatMinutes(value) {
    return `${Number(value || 0).toFixed(1)} ${t('minutes')}`;
  }

  function render() {
    updateClock();
    const report = state.report;
    if (!report) return;
    const realtime = report.realtime || {};
    document.getElementById('locationLabel').textContent = `${report.location?.label || '--'} ${Number(report.location?.lat || 0).toFixed(3)}, ${Number(report.location?.lon || 0).toFixed(3)}`;
    document.getElementById('generatedAt').textContent = report.generatedAt || '--';
    document.getElementById('etaValue').textContent = formatMinutes(report.optimizedRoute?.etaMinutes);
    document.getElementById('pressureValue').textContent = Number(realtime.pressure || 0).toFixed(2);
    document.getElementById('airValue').textContent = `${Number(realtime.pm25 || 0).toFixed(1)} / ${realtime.aqi || '--'}`;
    document.getElementById('roadValue').textContent = `${realtime.roadCount || 0} / ${Number(realtime.roadKm || 0).toFixed(1)} km`;
    document.getElementById('routeNodes').textContent = (report.optimizedRoute?.nodes || []).join(' > ');
    document.getElementById('incidentEta').textContent = formatMinutes(report.incidentResponse?.etaMinutes);
    renderRows('segments', report.optimizedRoute?.segments || [], (item) => [`${item.from} -> ${item.to}`, `${Number(item.congestion).toFixed(2)} ${t('pressure')}`, formatMinutes(item.minutes)]);
    renderRows('signals', report.signalPlan || [], (item) => [item.intersection, `${t('green')} ${item.greenSeconds}${t('seconds')} / ${t('cycle')} ${item.cycleSeconds}${t('seconds')}`, `${Math.round(item.load * 100)}%`]);
    renderRows('units', report.incidentResponse?.units || [], (item) => [item.name, report.incidentResponse.incident, formatMinutes(item.etaMinutes)]);
    drawCity(report);
    drawTrend(report.simulationFrames || []);
  }

  function renderRows(id, rows, shape) {
    const root = document.getElementById(id);
    root.innerHTML = '';
    rows.forEach((row) => {
      const parts = shape(row);
      const item = document.createElement('div');
      item.className = 'row-item';
      item.innerHTML = `<div><strong></strong><span></span></div><div class="value-pill"></div>`;
      item.querySelector('strong').textContent = parts[0];
      item.querySelector('span').textContent = parts[1];
      item.querySelector('.value-pill').textContent = parts[2];
      root.appendChild(item);
    });
  }

  function drawCity(report) {
    const canvas = document.getElementById('cityCanvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#061226');
    gradient.addColorStop(1, '#091c39');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(120,190,255,.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 48, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 58) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y - 26);
      ctx.stroke();
    }

    const districts = report.districts || [];
    const byName = new Map(districts.map((d) => [d.name, d]));
    const segments = report.optimizedRoute?.segments || [];
    segments.forEach((seg) => {
      const a = byName.get(seg.from);
      const b = byName.get(seg.to);
      if (!a || !b) return;
      drawLine(ctx, a, b, w, h, '#39d9f5', 9, 0.26);
      drawLine(ctx, a, b, w, h, '#9ff5ff', 3, 0.92);
    });

    districts.forEach((d) => {
      const x = d.x * w;
      const y = d.y * h;
      const radius = 18 + d.flow * 18;
      const color = d.safety < 0.52 ? '#ff6f9f' : d.flow > 0.7 ? '#f7c86a' : '#5ee0b8';
      const glow = ctx.createRadialGradient(x, y, 4, x, y, radius * 2.6);
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#061226';
      ctx.beginPath();
      ctx.arc(x, y, Math.max(8, radius * 0.45), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e9fbff';
      ctx.font = 'bold 18px "Segoe UI"';
      ctx.fillText(d.name, x + radius + 10, y + 6);
    });
  }

  function drawLine(ctx, a, b, w, h, color, width, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.bezierCurveTo((a.x + 0.08) * w, (a.y - 0.12) * h, (b.x - 0.08) * w, (b.y + 0.12) * h, b.x * w, b.y * h);
    ctx.stroke();
    ctx.restore();
  }

  function drawTrend(frames) {
    const canvas = document.getElementById('trendCanvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#061226';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,190,255,.16)';
    for (let y = 36; y < h; y += 42) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(w - 30, y);
      ctx.stroke();
    }
    drawSeries(ctx, frames, 'flow', '#39d9f5', w, h);
    drawSeries(ctx, frames, 'risk', '#ff6f9f', w, h);
    ctx.fillStyle = '#d7eeff';
    ctx.font = 'bold 15px "Segoe UI"';
    ctx.fillText(`${t('flow')} / ${t('risk')} / ${t('speed')}`, 28, 26);
  }

  function drawSeries(ctx, frames, key, color, w, h) {
    if (!frames.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    frames.forEach((f, index) => {
      const x = 34 + (index / Math.max(1, frames.length - 1)) * (w - 68);
      const value = key === 'speed' ? Number(f[key]) / 70 : Number(f[key]);
      const y = h - 28 - Math.max(0, Math.min(1, value)) * (h - 62);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  window.addEventListener('message', (event) => {
    let data = event.data || {};
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { data = {}; }
    }
    if (data.type !== 'FUSION_LOCALE_CHANGED') return;
    state.lang = data.language || state.lang;
    state.timezone = data.timezone || state.timezone;
    state.clock24 = data.clock24 !== undefined ? Boolean(data.clock24) : state.clock24;
    applyI18n();
  });

  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.addEventListener('message', (event) => {
      window.dispatchEvent(new MessageEvent('message', { data: event.data }));
    });
  }

  document.getElementById('locateBtn').addEventListener('click', requestLocation);
  setInterval(updateClock, 1000);
  applyI18n();
  requestLocation();
})();
