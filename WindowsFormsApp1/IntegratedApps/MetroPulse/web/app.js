(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const state = {
    lang: params.get('lang') || 'zh-TW',
    timezone: params.get('timezone') || 'Asia/Taipei',
    clock24: params.get('clock24') !== 'false',
    report: window.METROPULSE_REPORT || null,
    coords: { lat: 25.033, lon: 121.5654 },
    locating: false,
    lastFitKey: '',
    activeTab: 'route',
    view: '2d',
    locSource: '',
    fit3dKey: ''
  };

  // -------------------------------------------------------------- translations
  const dict = {
    'zh-TW': {
      productLabel: '智慧城市交通中樞', useLocation: '使用目前位置',
      headline: '即時路網、預測與事故調度整合',
      subhead: '定位後結合 OpenStreetMap 真實地點、開放天氣資料與本機 C++ 模擬核心，產生目前地區的交通決策視圖。',
      waiting: '等待定位', locating: '定位中', live: '即時資料已連線', fallback: '本地備援',
      nativeCore: 'C++ 原生模擬核心', broker: 'Python 即時資料 broker', mapEngine: 'Leaflet 地圖引擎',
      sourceLive: 'OSM 真實地點', sourceSynthetic: '本地模型',
      mapLabel: '城市路網地圖',
      eta: '醫療優先路徑', etaHint: '即時壅塞權重後的 ETA',
      prediction: '路徑預測', predictionHint: '現在 / +30 / +60 分',
      avgSpeed: '平均車速', avgSpeedHint: '全網行程加權',
      pressure: '路網壓力', pressureHint: '天氣、空氣與道路密度加權',
      reliability: '路網可靠度', reliabilityHint: '行程時間穩定度',
      air: '空氣品質', roads: '附近道路', roadsHint: 'OSM Overpass 即時摘要',
      peak: '尖峰預測', peakHint: '未來兩小時最高負載',
      route: '最佳路徑', bottlenecks: '瓶頸分析', bottleneckHint: '依車輛延誤排序的關鍵路段。',
      accessibility: '可達性', signals: '號誌策略', signalHint: 'Webster 自適應週期最佳化。',
      incident: '事故調度',
      forecast: '兩小時流量預測', forecastHint: '由 C++ 時段需求模型與即時壓力驅動',
      minutes: '分鐘', seconds: '秒', cycle: '週期', green: '綠燈', flow: '流量', risk: '風險', speed: '速度',
      now: '現在', delay: '延誤', reach: '抵達', congestionWord: '壅塞', kmh: 'km/h', vehHr: '車·時',
      denied: '定位未授權，使用台北基準點', unavailable: '定位不可用，使用台北基準點',
      loading: '載入即時資料', error: '即時資料暫時不可用',
      baseDark: '深色地圖', baseLight: '淺色地圖',
      layerNetwork: '路網壅塞', layerRoute: '最佳路徑', layerAccess: '可達性圈', layerHeat: '車流熱力',
      view2d: '2D 平面', view3d: '3D 立體', geoGps: 'GPS 精準定位', geoIp: 'IP 概略定位', geoDefault: '預設位置',
      legendFree: '順暢', legendBusy: '繁忙', legendJam: '壅塞', legendIncident: '事故點', legendOrigin: '目前位置', legendPriority: '醫療節點',
      placesFound: '個真實地點', within15: '15 分鐘可達', within30: '30 分鐘可達',
      type_origin: '起點', type_transit: '轉運站', type_priority: '醫療', type_commerce: '市場',
      type_education: '校園', type_retail: '商場', type_green: '綠地', type_gateway: '門戶',
      type_freight: '物流', type_residential: '住宅',
      n_origin: '目前位置', n_station: '中央車站', n_hospital: '醫療特區', n_market: '城市市場',
      n_campus: '大學校區', n_mall: '河岸商場', n_park: '河濱公園', n_terminal: '天空航廈',
      n_harbor: '港區物流', n_residential: '花園住宅'
    },
    'zh-CN': {
      productLabel: '智慧城市交通中枢', useLocation: '使用当前位置',
      headline: '实时路网、预测与事故调度整合',
      subhead: '定位后结合 OpenStreetMap 真实地点、开放天气数据与本机 C++ 模拟核心，生成当前地区的交通决策视图。',
      waiting: '等待定位', locating: '定位中', live: '实时数据已连接', fallback: '本地备用',
      nativeCore: 'C++ 原生模拟核心', broker: 'Python 实时数据 broker', mapEngine: 'Leaflet 地图引擎',
      sourceLive: 'OSM 真实地点', sourceSynthetic: '本地模型',
      mapLabel: '城市路网地图',
      eta: '医疗优先路径', etaHint: '实时拥堵权重后的 ETA',
      prediction: '路径预测', predictionHint: '现在 / +30 / +60 分',
      avgSpeed: '平均车速', avgSpeedHint: '全网行程加权',
      pressure: '路网压力', pressureHint: '天气、空气与道路密度加权',
      reliability: '路网可靠度', reliabilityHint: '行程时间稳定度',
      air: '空气质量', roads: '附近道路', roadsHint: 'OSM Overpass 实时摘要',
      peak: '高峰预测', peakHint: '未来两小时最高负载',
      route: '最佳路径', bottlenecks: '瓶颈分析', bottleneckHint: '按车辆延误排序的关键路段。',
      accessibility: '可达性', signals: '信号策略', signalHint: 'Webster 自适应周期优化。',
      incident: '事故调度',
      forecast: '两小时流量预测', forecastHint: '由 C++ 时段需求模型与实时压力驱动',
      minutes: '分钟', seconds: '秒', cycle: '周期', green: '绿灯', flow: '流量', risk: '风险', speed: '速度',
      now: '现在', delay: '延误', reach: '到达', congestionWord: '拥堵', kmh: 'km/h', vehHr: '车·时',
      denied: '定位未授权，使用台北基准点', unavailable: '定位不可用，使用台北基准点',
      loading: '加载实时数据', error: '实时数据暂时不可用',
      baseDark: '深色地图', baseLight: '浅色地图',
      layerNetwork: '路网拥堵', layerRoute: '最佳路径', layerAccess: '可达性圈', layerHeat: '车流热力',
      view2d: '2D 平面', view3d: '3D 立体', geoGps: 'GPS 精准定位', geoIp: 'IP 概略定位', geoDefault: '默认位置',
      legendFree: '顺畅', legendBusy: '繁忙', legendJam: '拥堵', legendIncident: '事故点', legendOrigin: '当前位置', legendPriority: '医疗节点',
      placesFound: '个真实地点', within15: '15 分钟可达', within30: '30 分钟可达',
      type_origin: '起点', type_transit: '转运站', type_priority: '医疗', type_commerce: '市场',
      type_education: '校园', type_retail: '商场', type_green: '绿地', type_gateway: '门户',
      type_freight: '物流', type_residential: '住宅',
      n_origin: '当前位置', n_station: '中央车站', n_hospital: '医疗特区', n_market: '城市市场',
      n_campus: '大学校区', n_mall: '河岸商场', n_park: '河滨公园', n_terminal: '天空航厦',
      n_harbor: '港区物流', n_residential: '花园住宅'
    },
    en: {
      productLabel: 'Smart City Traffic Command', useLocation: 'Use Current Location',
      headline: 'Live road, prediction, and incident orchestration',
      subhead: 'After location access, MetroPulse merges real OpenStreetMap places, open weather data, and a native C++ simulation core into a traffic decision view for your area.',
      waiting: 'Waiting for location', locating: 'Locating', live: 'Live data linked', fallback: 'Local fallback',
      nativeCore: 'C++ native simulation core', broker: 'Python realtime broker', mapEngine: 'Leaflet map engine',
      sourceLive: 'Live OSM places', sourceSynthetic: 'Local model',
      mapLabel: 'City road network',
      eta: 'Medical priority route', etaHint: 'ETA after live congestion weighting',
      prediction: 'Route forecast', predictionHint: 'now / +30 / +60 min',
      avgSpeed: 'Average speed', avgSpeedHint: 'Network travel-time weighted',
      pressure: 'Network pressure', pressureHint: 'Weather, air, and road density weighted',
      reliability: 'Reliability', reliabilityHint: 'Travel-time stability',
      air: 'Air quality', roads: 'Nearby roads', roadsHint: 'OSM Overpass live summary',
      peak: 'Peak forecast', peakHint: 'Highest load in the next two hours',
      route: 'Route', bottlenecks: 'Bottlenecks', bottleneckHint: 'Critical links ranked by vehicle-delay.',
      accessibility: 'Access', signals: 'Signals', signalHint: 'Webster adaptive cycle optimisation.',
      incident: 'Incident',
      forecast: 'Two-hour flow forecast', forecastHint: 'Driven by the C++ time-of-day demand model and live pressure',
      minutes: 'min', seconds: 's', cycle: 'cycle', green: 'green', flow: 'flow', risk: 'risk', speed: 'speed',
      now: 'now', delay: 'delay', reach: 'reach', congestionWord: 'congestion', kmh: 'km/h', vehHr: 'veh·h',
      denied: 'Location denied, using Taipei baseline', unavailable: 'Location unavailable, using Taipei baseline',
      loading: 'Loading realtime data', error: 'Realtime data unavailable',
      baseDark: 'Dark map', baseLight: 'Light map',
      layerNetwork: 'Network load', layerRoute: 'Best route', layerAccess: 'Reach rings', layerHeat: 'Flow heat',
      view2d: '2D', view3d: '3D', geoGps: 'GPS fix', geoIp: 'IP region', geoDefault: 'Default',
      legendFree: 'Free', legendBusy: 'Busy', legendJam: 'Jam', legendIncident: 'Incident', legendOrigin: 'You', legendPriority: 'Medical',
      placesFound: 'real places', within15: 'reachable in 15 min', within30: 'reachable in 30 min',
      type_origin: 'Origin', type_transit: 'Transit', type_priority: 'Medical', type_commerce: 'Market',
      type_education: 'Campus', type_retail: 'Mall', type_green: 'Park', type_gateway: 'Gateway',
      type_freight: 'Freight', type_residential: 'Residential',
      n_origin: 'Current Position', n_station: 'Central Station', n_hospital: 'Medical District', n_market: 'Civic Market',
      n_campus: 'University Campus', n_mall: 'Riverside Mall', n_park: 'Riverside Park', n_terminal: 'Sky Terminal',
      n_harbor: 'Harbor Logistics', n_residential: 'Garden Residences'
    },
    ja: {
      productLabel: 'スマートシティ交通中枢', useLocation: '現在地を使用',
      headline: 'リアルタイム道路・予測・事故対応の統合',
      subhead: '位置情報の許可後、OpenStreetMap の実在地点、オープン気象データ、ネイティブ C++ シミュレーションコアを統合します。',
      waiting: '位置情報待機', locating: '測位中', live: 'リアルタイム接続済み', fallback: 'ローカル代替',
      nativeCore: 'C++ ネイティブコア', broker: 'Python リアルタイム broker', mapEngine: 'Leaflet 地図エンジン',
      sourceLive: 'OSM 実在地点', sourceSynthetic: 'ローカルモデル',
      mapLabel: '都市道路ネットワーク',
      eta: '医療優先ルート', etaHint: 'リアルタイム混雑重み付き ETA',
      prediction: 'ルート予測', predictionHint: '現在 / +30 / +60 分',
      avgSpeed: '平均速度', avgSpeedHint: 'ネットワーク所要時間加重',
      pressure: '道路網圧力', pressureHint: '天気・空気・道路密度の加重',
      reliability: '信頼性', reliabilityHint: '所要時間の安定度',
      air: '空気品質', roads: '周辺道路', roadsHint: 'OSM Overpass リアルタイム概要',
      peak: 'ピーク予測', peakHint: '今後2時間の最大負荷',
      route: '最適ルート', bottlenecks: 'ボトルネック', bottleneckHint: '車両遅延順の重要区間。',
      accessibility: '到達性', signals: '信号', signalHint: 'Webster 適応サイクル最適化。',
      incident: '事故対応',
      forecast: '2時間交通流予測', forecastHint: 'C++ 時間帯需要モデルとリアルタイム圧力による',
      minutes: '分', seconds: '秒', cycle: '周期', green: '青', flow: '流量', risk: 'リスク', speed: '速度',
      now: '現在', delay: '遅延', reach: '到達', congestionWord: '混雑', kmh: 'km/h', vehHr: '台·時',
      denied: '位置情報が拒否されました。台北基準点を使用', unavailable: '位置情報が利用できません。台北基準点を使用',
      loading: 'リアルタイムデータ読み込み中', error: 'リアルタイムデータを利用できません',
      baseDark: 'ダーク地図', baseLight: 'ライト地図',
      layerNetwork: '混雑', layerRoute: '最適ルート', layerAccess: '到達圏', layerHeat: '流量ヒート',
      view2d: '2D', view3d: '3D', geoGps: 'GPS 測位', geoIp: 'IP 概算', geoDefault: '既定位置',
      legendFree: '順調', legendBusy: '混雑', legendJam: '渋滞', legendIncident: '事故', legendOrigin: '現在地', legendPriority: '医療',
      placesFound: '件の実在地点', within15: '15分で到達', within30: '30分で到達'
    },
    ko: {
      productLabel: '스마트시티 교통 관제', useLocation: '현재 위치 사용',
      headline: '실시간 도로·예측·사고 대응 통합',
      subhead: '위치 권한 후 OpenStreetMap 실제 장소, 공개 기상 데이터, 네이티브 C++ 시뮬레이션 코어를 결합합니다.',
      waiting: '위치 대기', locating: '위치 확인 중', live: '실시간 연결됨', fallback: '로컬 대체',
      nativeCore: 'C++ 네이티브 코어', broker: 'Python 실시간 broker', mapEngine: 'Leaflet 지도 엔진',
      sourceLive: 'OSM 실제 장소', sourceSynthetic: '로컬 모델',
      mapLabel: '도시 도로망',
      eta: '의료 우선 경로', etaHint: '실시간 혼잡 가중 ETA',
      prediction: '경로 예측', predictionHint: '현재 / +30 / +60 분',
      avgSpeed: '평균 속도', avgSpeedHint: '네트워크 통행시간 가중',
      pressure: '도로망 압력', pressureHint: '날씨·공기·도로 밀도 가중',
      reliability: '신뢰도', reliabilityHint: '통행시간 안정도',
      air: '대기질', roads: '주변 도로', roadsHint: 'OSM Overpass 실시간 요약',
      peak: '피크 예측', peakHint: '향후 2시간 최대 부하',
      route: '최적 경로', bottlenecks: '병목 분석', bottleneckHint: '차량 지연 순 핵심 구간.',
      accessibility: '접근성', signals: '신호 전략', signalHint: 'Webster 적응 주기 최적화.',
      incident: '사고 대응',
      forecast: '2시간 흐름 예측', forecastHint: 'C++ 시간대 수요 모델과 실시간 압력 기반',
      minutes: '분', seconds: '초', cycle: '주기', green: '녹색', flow: '흐름', risk: '위험', speed: '속도',
      now: '현재', delay: '지연', reach: '도달', congestionWord: '혼잡', kmh: 'km/h', vehHr: '대·시',
      denied: '위치 권한 거부, 타이베이 기준점 사용', unavailable: '위치 사용 불가, 타이베이 기준점 사용',
      loading: '실시간 데이터 로드 중', error: '실시간 데이터를 사용할 수 없습니다',
      baseDark: '다크 지도', baseLight: '라이트 지도',
      layerNetwork: '혼잡', layerRoute: '최적 경로', layerAccess: '도달 범위', layerHeat: '흐름 히트',
      view2d: '2D', view3d: '3D', geoGps: 'GPS 측위', geoIp: 'IP 추정', geoDefault: '기본 위치',
      legendFree: '원활', legendBusy: '혼잡', legendJam: '정체', legendIncident: '사고', legendOrigin: '현재 위치', legendPriority: '의료',
      placesFound: '개 실제 장소', within15: '15분 내 도달', within30: '30분 내 도달'
    }
  };

  function t(key) {
    const L = dict[state.lang] || {};
    return (key in L ? L[key] : null) ?? dict.en[key] ?? dict['zh-TW'][key] ?? key;
  }

  function nodeName(node) {
    if (node.nameKey && (dict[state.lang]?.[node.nameKey] || dict.en[node.nameKey])) return t(node.nameKey);
    return node.name || '--';
  }
  function nameByRawName(raw, report) {
    const node = (report.nodes || []).find((n) => n.name === raw);
    return node ? nodeName(node) : raw;
  }
  function typeLabel(type) { return t('type_' + type) || type; }
  function fmtMin(v) { return `${Number(v || 0).toFixed(1)} ${t('minutes')}`; }

  // -------------------------------------------------------------- color scales
  function loadColor(vc) {
    if (vc < 0.55) return '#5ee0b8';
    if (vc < 0.8) return '#7fe3c0';
    if (vc < 1.0) return '#f7c86a';
    if (vc < 1.15) return '#ff9d6b';
    return '#ff6f9f';
  }
  function nodeColor(node) {
    if (node.isOrigin) return '#39d9f5';
    if (node.isPriority) return '#ff6f9f';
    const palette = { transit: '#5b8dff', commerce: '#f7c86a', education: '#9b8cff', retail: '#f7c86a', green: '#5ee0b8', gateway: '#8fe0ff', freight: '#ffa46b', residential: '#9fb6d4' };
    return palette[node.type] || '#5ee0b8';
  }

  // ------------------------------------------------------------------- the map
  let map, baseDark, baseLight, baseOsm, layerControl;
  const groups = {};

  function initMap() {
    map = L.map('map', { zoomControl: true, preferCanvas: true, worldCopyJump: true })
      .setView([state.coords.lat, state.coords.lon], 14);
    baseDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 20, attribution: '&copy; OpenStreetMap, &copy; CARTO' });
    baseLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 20, attribution: '&copy; OpenStreetMap, &copy; CARTO' });
    baseOsm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
    baseDark.addTo(map);

    groups.network = L.layerGroup().addTo(map);
    groups.route = L.layerGroup().addTo(map);
    groups.nodes = L.layerGroup().addTo(map);
    groups.incident = L.layerGroup().addTo(map);
    groups.access = L.layerGroup();
    groups.heat = L.layerGroup();
    buildLayerControl();
  }

  function buildLayerControl() {
    if (layerControl) map.removeControl(layerControl);
    const bases = {}; bases[t('baseDark')] = baseDark; bases[t('baseLight')] = baseLight; bases['OpenStreetMap'] = baseOsm;
    const overlays = {};
    overlays[t('layerNetwork')] = groups.network;
    overlays[t('layerRoute')] = groups.route;
    overlays[t('layerHeat')] = groups.heat;
    overlays[t('layerAccess')] = groups.access;
    layerControl = L.control.layers(bases, overlays, { collapsed: true }).addTo(map);
  }

  function clearGroups() {
    ['network', 'route', 'nodes', 'incident', 'access', 'heat'].forEach((k) => groups[k] && groups[k].clearLayers());
  }

  function drawMap(report) {
    if (!map) return;
    clearGroups();
    const nodes = report.nodes || [];
    const edges = report.edges || [];
    if (!nodes.length) return;

    // network edges colored by load
    edges.forEach((e) => {
      if (!e.coords || e.coords.length < 2) return;
      L.polyline(e.coords, { color: loadColor(e.vc), weight: e.incident ? 5 : 3, opacity: e.incident ? 0.95 : 0.55, lineCap: 'round' })
        .bindTooltip(`${nameByRawName(e.from, report)} ↔ ${nameByRawName(e.to, report)}<br>v/c ${e.vc} · ${e.minutes} ${t('minutes')}`)
        .addTo(groups.network);
    });

    // best route (glow + colored segments)
    const path = (report.optimizedRoute && report.optimizedRoute.path) || [];
    const segs = (report.optimizedRoute && report.optimizedRoute.segments) || [];
    if (path.length >= 2) {
      L.polyline(path, { color: '#39d9f5', weight: 11, opacity: 0.18, lineCap: 'round' }).addTo(groups.route);
      for (let i = 0; i + 1 < path.length; i++) {
        const s = segs[i] || {};
        L.polyline([path[i], path[i + 1]], { color: loadColor(s.vc != null ? s.vc : 0.6), weight: 6, opacity: 0.95, lineCap: 'round' }).addTo(groups.route);
      }
    }

    // nodes
    const latlngs = [];
    nodes.forEach((n) => {
      latlngs.push([n.lat, n.lon]);
      const radius = n.isOrigin ? 10 : 7 + Math.round((n.flow || 0) * 6);
      const marker = L.circleMarker([n.lat, n.lon], {
        radius, color: '#04101f', weight: 2, fillColor: nodeColor(n), fillOpacity: 0.95
      });
      const reach = n.reachMinutes >= 0 ? `<br>${t('reach')}: ${fmtMin(n.reachMinutes)}` : '';
      marker.bindPopup(`<b>${nodeName(n)}</b><br>${typeLabel(n.type)} · ${t('flow')} ${(n.flow * 100 | 0)}%${reach}`);
      marker.bindTooltip(nodeName(n), { permanent: true, direction: 'right', offset: [8, 0], className: 'node-label' });
      marker.addTo(groups.nodes);
    });

    // incident marker
    const inc = report.incidentResponse;
    if (inc && inc.lat) {
      L.circleMarker([inc.lat, inc.lon], { radius: 9, color: '#fff', weight: 2, fillColor: '#ff6f9f', fillOpacity: 0.9 })
        .bindPopup(`<b>⚠ ${nameByRawName(inc.incident, report)}</b><br>${t('incident')} ETA ${fmtMin(inc.etaMinutes)}`)
        .addTo(groups.incident);
    }

    // accessibility reach rings (approximate isochrones from avg speed)
    const avgSpeed = (report.kpis && report.kpis.avgSpeed) || 30;
    const origin = nodes.find((n) => n.isOrigin) || nodes[0];
    [5, 10, 15].forEach((min) => {
      const r = Math.max(150, (avgSpeed * min / 60) * 1000);
      L.circle([origin.lat, origin.lon], { radius: r, color: '#39d9f5', weight: 1, opacity: 0.5, fillColor: '#39d9f5', fillOpacity: 0.04, dashArray: '4 6' })
        .bindTooltip(`${min} ${t('minutes')}`, { sticky: true }).addTo(groups.access);
    });

    // heat layer from node flow + edge load
    if (typeof L.heatLayer === 'function') {
      const pts = nodes.map((n) => [n.lat, n.lon, 0.35 + (n.flow || 0) * 0.65]);
      edges.forEach((e) => { if (e.coords && e.coords.length >= 2) { const m = [(e.coords[0][0] + e.coords[1][0]) / 2, (e.coords[0][1] + e.coords[1][1]) / 2]; pts.push([m[0], m[1], Math.min(1, e.vc)]); } });
      groups.heat.addLayer(L.heatLayer(pts, { radius: 38, blur: 28, maxZoom: 16, gradient: { 0.2: '#1b6', 0.5: '#f7c86a', 0.8: '#ff9d6b', 1: '#ff6f9f' } }));
    }

    // fit bounds only when the area changes (keeps user's zoom on refresh)
    const fitKey = `${origin.lat.toFixed(3)},${origin.lon.toFixed(3)}`;
    if (fitKey !== state.lastFitKey && latlngs.length) {
      map.fitBounds(L.latLngBounds(latlngs).pad(0.18), { animate: false });
      state.lastFitKey = fitKey;
    }
  }

  function renderLegend() {
    const el = document.getElementById('mapLegend');
    if (!el) return;
    const rows = [
      ['#5ee0b8', t('legendFree')], ['#f7c86a', t('legendBusy')], ['#ff6f9f', t('legendJam')],
      ['#39d9f5', t('legendOrigin')], ['#ff6f9f', t('legendPriority')]
    ];
    el.innerHTML = rows.map((r) => `<div class="lg"><i style="background:${r[0]}"></i>${r[1]}</div>`).join('');
  }

  // -------------------------------------------------------- 3D city map (GL)
  // map3d-inspired view: extruded OpenStreetMap buildings on a tilted WebGL
  // basemap, with the same live traffic graph rendered as GL layers.
  let map3d = null, map3dReady = false, pending3d = null;
  const emptyFC = () => ({ type: 'FeatureCollection', features: [] });

  function buildGeo(report) {
    const nodes = report.nodes || [];
    const edges = report.edges || [];
    const edgeF = edges.filter((e) => e.coords && e.coords.length >= 2).map((e) => ({
      type: 'Feature', properties: { color: loadColor(e.vc), incident: !!e.incident },
      geometry: { type: 'LineString', coordinates: e.coords.map((c) => [c[1], c[0]]) }
    }));
    const path = (report.optimizedRoute && report.optimizedRoute.path) || [];
    const segs = (report.optimizedRoute && report.optimizedRoute.segments) || [];
    const routeF = [];
    for (let i = 0; i + 1 < path.length; i++) {
      const s = segs[i] || {};
      routeF.push({ type: 'Feature', properties: { color: loadColor(s.vc != null ? s.vc : 0.6) },
        geometry: { type: 'LineString', coordinates: [[path[i][1], path[i][0]], [path[i + 1][1], path[i + 1][0]]] } });
    }
    const nodeF = nodes.map((n) => ({
      type: 'Feature',
      properties: {
        name: nodeName(n), color: nodeColor(n), flow: n.flow || 0,
        info: `${typeLabel(n.type)} · ${t('flow')} ${(n.flow * 100 | 0)}%` + (n.reachMinutes >= 0 ? ` · ${t('reach')} ${fmtMin(n.reachMinutes)}` : '')
      },
      geometry: { type: 'Point', coordinates: [n.lon, n.lat] }
    }));
    const inc = report.incidentResponse;
    const incF = (inc && inc.lat) ? [{ type: 'Feature', properties: { name: `⚠ ${nameByRawName(inc.incident, report)}` }, geometry: { type: 'Point', coordinates: [inc.lon, inc.lat] } }] : [];
    const origin = nodes.find((n) => n.isOrigin) || nodes[0] || { lat: state.coords.lat, lon: state.coords.lon };
    return {
      edges: { type: 'FeatureCollection', features: edgeF },
      route: { type: 'FeatureCollection', features: routeF },
      nodes: { type: 'FeatureCollection', features: nodeF },
      incident: { type: 'FeatureCollection', features: incF },
      center: [origin.lon, origin.lat]
    };
  }

  function ensure3D() {
    if (map3d || state.no3d || typeof maplibregl === 'undefined') return;
    try {
      map3d = new maplibregl.Map({
        container: 'map3d',
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [state.coords.lon, state.coords.lat],
        zoom: 14, pitch: 55, bearing: -17, antialias: true,
        attributionControl: true,
        localIdeographFontFamily: "'Microsoft JhengHei UI','Microsoft YaHei','Segoe UI',sans-serif"
      });
    } catch (e) {
      map3d = null; state.no3d = true;  // WebGL unavailable: keep the reliable 2D map
      return;
    }
    map3d.on('error', () => { /* swallow tile/source noise */ });
    map3d.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map3d.on('load', () => {
      add3DBuildings();
      add3DDataLayers();
      map3dReady = true;
      if (pending3d) { apply3DGeo(pending3d); pending3d = null; }
    });
  }

  function add3DBuildings() {
    let style;
    try { style = map3d.getStyle(); } catch { return; }
    let vsrc = null;
    for (const [id, s] of Object.entries(style.sources || {})) { if (s.type === 'vector') { vsrc = id; break; } }
    if (!vsrc) return;
    let firstSymbol;
    for (const l of style.layers || []) { if (l.type === 'symbol') { firstSymbol = l.id; break; } }
    try {
      map3d.addLayer({
        id: 'mp-3d-buildings', type: 'fill-extrusion', source: vsrc, 'source-layer': 'building', minzoom: 13,
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
            0, '#13314d', 50, '#1b4870', 150, '#2c6b9e'],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 12],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
          'fill-extrusion-opacity': 0.82
        }
      }, firstSymbol);
    } catch (e) { /* building layer absent in this style: skip silently */ }
  }

  function add3DDataLayers() {
    map3d.addSource('mp-edges', { type: 'geojson', data: emptyFC() });
    map3d.addLayer({ id: 'mp-edges', type: 'line', source: 'mp-edges', layout: { 'line-cap': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'incident'], 5, 3], 'line-opacity': 0.72 } });
    map3d.addSource('mp-route', { type: 'geojson', data: emptyFC() });
    map3d.addLayer({ id: 'mp-route-glow', type: 'line', source: 'mp-route', layout: { 'line-cap': 'round' },
      paint: { 'line-color': '#39d9f5', 'line-width': 13, 'line-opacity': 0.18, 'line-blur': 5 } });
    map3d.addLayer({ id: 'mp-route', type: 'line', source: 'mp-route', layout: { 'line-cap': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 0.95 } });
    map3d.addSource('mp-incident', { type: 'geojson', data: emptyFC() });
    map3d.addLayer({ id: 'mp-incident', type: 'circle', source: 'mp-incident',
      paint: { 'circle-radius': 9, 'circle-color': '#ff6f9f', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
    map3d.addSource('mp-nodes', { type: 'geojson', data: emptyFC() });
    map3d.addLayer({ id: 'mp-nodes', type: 'circle', source: 'mp-nodes',
      paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'flow'], 0, 6, 1, 13], 'circle-color': ['get', 'color'],
        'circle-stroke-color': '#04101f', 'circle-stroke-width': 2, 'circle-opacity': 0.96 } });
    map3d.addLayer({ id: 'mp-node-labels', type: 'symbol', source: 'mp-nodes',
      layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.3], 'text-anchor': 'top' },
      paint: { 'text-color': '#eaf7ff', 'text-halo-color': '#04101f', 'text-halo-width': 1.5 } });
    map3d.on('click', 'mp-nodes', (e) => {
      const f = e.features && e.features[0]; if (!f) return;
      new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<b>${f.properties.name}</b><br>${f.properties.info || ''}`).addTo(map3d);
    });
    map3d.on('mouseenter', 'mp-nodes', () => { map3d.getCanvas().style.cursor = 'pointer'; });
    map3d.on('mouseleave', 'mp-nodes', () => { map3d.getCanvas().style.cursor = ''; });
  }

  function apply3DGeo(geo) {
    if (!map3dReady) { pending3d = geo; return; }
    map3d.getSource('mp-edges').setData(geo.edges);
    map3d.getSource('mp-route').setData(geo.route);
    map3d.getSource('mp-nodes').setData(geo.nodes);
    map3d.getSource('mp-incident').setData(geo.incident);
    const key = `${geo.center[0].toFixed(3)},${geo.center[1].toFixed(3)}`;
    if (key !== state.fit3dKey) { map3d.jumpTo({ center: geo.center, zoom: 14.2, pitch: 55, bearing: -17 }); state.fit3dKey = key; }
  }

  function renderActiveMap() {
    const report = state.report;
    if (!report) return;
    if (state.view === '3d') { ensure3D(); apply3DGeo(buildGeo(report)); }
    else { drawMap(report); }
  }

  function setView(v) {
    if (v === state.view) return;
    if (v === '3d') { ensure3D(); if (!map3d) { setBadge('fallback', 'chip-fallback'); return; } }
    state.view = v;
    document.getElementById('map').style.display = v === '2d' ? 'block' : 'none';
    document.getElementById('map3d').style.display = v === '3d' ? 'block' : 'none';
    document.querySelectorAll('.view-toggle .vt').forEach((b) => b.classList.toggle('active', b.getAttribute('data-view') === v));
    renderActiveMap();
    if (v === '2d' && map) setTimeout(() => map.invalidateSize(), 60);
    if (v === '3d' && map3d) setTimeout(() => map3d.resize(), 60);
  }

  // ------------------------------------------------------------------- panels
  function renderRows(id, rows) {
    const root = document.getElementById(id);
    if (!root) return;
    root.innerHTML = '';
    rows.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'row-item';
      const pillClass = r.tone === 'bad' ? ' bad' : r.tone === 'warn' ? ' warn' : '';
      item.innerHTML = `<div><strong></strong><span></span></div><div class="value-pill${pillClass}"></div>`;
      item.querySelector('strong').textContent = r.title;
      item.querySelector('span').textContent = r.sub;
      item.querySelector('.value-pill').textContent = r.pill;
      root.appendChild(item);
    });
  }

  function toneForVc(vc) { return vc >= 1.15 ? 'bad' : vc >= 0.95 ? 'warn' : 'ok'; }

  function render() {
    updateClock();
    const report = state.report;
    if (!report) return;
    const rt = report.realtime || {};
    const k = report.kpis || {};
    const route = report.optimizedRoute || {};
    const pred = report.predictedRoute || {};

    const srcKey = state.locSource === 'gps' ? 'geoGps' : state.locSource === 'ip' ? 'geoIp' : state.locSource === 'default' ? 'geoDefault' : '';
    document.getElementById('locationLabel').textContent =
      `${report.location?.label || '--'} · ${Number(report.location?.lat || 0).toFixed(3)}, ${Number(report.location?.lon || 0).toFixed(3)}` + (srcKey ? ` · ${t(srcKey)}` : '');
    document.getElementById('generatedAt').textContent = report.generatedAt || '--';

    // source badge
    const sb = document.getElementById('sourceBadge');
    const live = report.graphSource === 'live-osm';
    sb.textContent = live ? t('sourceLive') : t('sourceSynthetic');
    sb.className = 'chip ' + (live ? 'chip-osm' : 'chip-muted');

    // KPI cards
    setText('etaValue', fmtMin(route.etaMinutes));
    document.getElementById('etaSub').textContent = `${nameByRawName(route.from, report)} → ${nameByRawName(route.to, report)} · ${Number(route.distanceKm || 0).toFixed(1)} km`;
    setText('predictValue', `${Number(pred.now || 0).toFixed(0)}/${Number(pred.in30 || 0).toFixed(0)}/${Number(pred.in60 || 0).toFixed(0)}`);
    setText('speedValue', `${Number(k.avgSpeed || 0).toFixed(0)} ${t('kmh')}`);
    setText('pressureValue', Number(k.networkPressure || rt.pressure || 0).toFixed(2));
    setText('reliabilityValue', `${Math.round((k.reliability || 0) * 100)}%`);
    setText('airValue', `${Number(rt.pm25 || 0).toFixed(0)} / ${rt.aqi || '--'}`);
    setText('roadValue', `${rt.roadCount || 0} / ${Number(rt.roadKm || 0).toFixed(1)} km`);
    setText('peakValue', `${k.peakClock || '--'} · ${Math.round((k.peakFlow || 0) * 100)}%`);

    // route segments
    setText('routeNodes', (route.nodes || []).map((n) => nameByRawName(n, report)).join('  ›  '));
    renderRows('segments', (route.segments || []).map((s) => ({
      title: `${nameByRawName(s.from, report)} → ${nameByRawName(s.to, report)}`,
      sub: `v/c ${Number(s.vc).toFixed(2)} · ${t('congestionWord')} ×${Number(s.congestion).toFixed(2)}`,
      pill: fmtMin(s.minutes), tone: toneForVc(s.vc)
    })));

    // bottlenecks
    renderRows('bottlenecks', (report.bottlenecks || []).map((b) => ({
      title: `${nameByRawName(b.from, report)} ↔ ${nameByRawName(b.to, report)}${b.incident ? '  ⚠' : ''}`,
      sub: `v/c ${Number(b.vc).toFixed(2)} · ${t('congestionWord')} ×${Number(b.congestion).toFixed(2)}`,
      pill: `+${Number(b.delayMin).toFixed(1)} ${t('minutes')}`, tone: toneForVc(b.vc)
    })));

    // accessibility
    const acc = report.accessibility || {};
    setText('accessSummary', `${acc.reach15 || 0} ${t('within15')} · ${acc.reach30 || 0} ${t('within30')}`);
    renderRows('accessibility', (acc.ranking || []).map((r) => ({
      title: nameByRawName(r.name, report) || (r.nameKey ? t(r.nameKey) : r.name),
      sub: typeLabel(r.type),
      pill: fmtMin(r.minutes)
    })));

    // signals
    renderRows('signals', (report.signalPlan || []).map((s) => ({
      title: nameByRawName(s.intersection, report),
      sub: `${t('green')} ${s.greenSeconds}${t('seconds')} / ${t('cycle')} ${s.cycleSeconds}${t('seconds')}`,
      pill: `${Math.round(s.load * 100)}%`, tone: s.load >= 0.85 ? 'bad' : s.load >= 0.7 ? 'warn' : 'ok'
    })));

    // incident
    const inc = report.incidentResponse || {};
    setText('incidentTitle', `${nameByRawName(inc.incident, report)} · ETA ${fmtMin(inc.etaMinutes)}`);
    renderRows('units', (inc.units || []).map((u) => ({
      title: u.name, sub: t('incident'), pill: fmtMin(u.etaMinutes)
    })));

    renderActiveMap();
    renderLegend();
    drawTrend(report.forecast || []);
  }

  function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }

  // ------------------------------------------------------------- forecast chart
  function drawTrend(frames) {
    const canvas = document.getElementById('trendCanvas');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 1280;
    const cssH = 280;
    canvas.width = cssW * dpr; canvas.height = cssH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = cssW, h = cssH;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#050b1a'; ctx.fillRect(0, 0, w, h);
    const padL = 38, padR = 18, padT = 30, padB = 28;
    const plotW = w - padL - padR, plotH = h - padT - padB;

    ctx.strokeStyle = 'rgba(120,190,255,.14)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = padT + (plotH * i) / 4; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke(); }
    if (!frames.length) return;

    const xAt = (i) => padL + (i / Math.max(1, frames.length - 1)) * plotW;
    const yAt = (v) => padT + (1 - Math.max(0, Math.min(1, v))) * plotH;

    // "now" marker (offset 0)
    const nowIdx = frames.findIndex((f) => f.offset === 0);
    if (nowIdx >= 0) {
      const x = xAt(nowIdx);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, h - padB); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#cfe6ff'; ctx.font = '11px "Segoe UI"'; ctx.fillText(t('now'), x + 4, padT + 11);
    }

    const series = [
      { key: 'flow', color: '#39d9f5', scale: (v) => v },
      { key: 'risk', color: '#ff6f9f', scale: (v) => v },
      { key: 'speed', color: '#5ee0b8', scale: (v) => v / 70 }
    ];
    series.forEach((s) => {
      ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      frames.forEach((f, i) => { const x = xAt(i), y = yAt(s.scale(Number(f[s.key]))); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
    });

    // x labels (clock) every ~3 frames
    ctx.fillStyle = '#7e96b8'; ctx.font = '11px "Segoe UI"';
    frames.forEach((f, i) => { if (i % 3 === 0 || i === frames.length - 1) { const x = xAt(i); ctx.fillText(f.clock, x - 14, h - 9); } });

    // legend
    ctx.font = 'bold 12px "Segoe UI"';
    const items = [[t('flow'), '#39d9f5'], [t('risk'), '#ff6f9f'], [t('speed'), '#5ee0b8']];
    let lx = padL;
    items.forEach((it) => { ctx.fillStyle = it[1]; ctx.fillRect(lx, 12, 12, 4); ctx.fillStyle = '#d7eeff'; ctx.fillText(it[0], lx + 17, 17); lx += ctx.measureText(it[0]).width + 42; });
  }

  // --------------------------------------------------------------- data + geo
  function setBadge(key, cls) {
    const badge = document.getElementById('liveBadge');
    if (!badge) return;
    badge.textContent = t(key);
    badge.className = 'chip' + (cls ? ' ' + cls : '');
  }

  function updateClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    try {
      el.textContent = new Intl.DateTimeFormat(state.lang, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !state.clock24, timeZone: state.timezone }).format(new Date());
    } catch { el.textContent = new Date().toLocaleTimeString(); }
  }

  // Precise browser/WebView geolocation, wrapped with our own hard timeout so a
  // silently-hanging provider cannot block the IP fallback.
  function tryBrowserGeo(timeoutMs) {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const timer = setTimeout(() => finish(null), timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (pos) => { clearTimeout(timer); finish({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'gps' }); },
        () => { clearTimeout(timer); finish(null); },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
      );
    });
  }

  // Server-side IP geolocation: always reflects the region the app is actually
  // running in (never a hard-coded city), used when GPS is denied/unavailable.
  async function ipLocate() {
    try {
      const res = await fetch('/api/locate', { cache: 'no-store' });
      const d = await res.json();
      if (d && d.lat != null) return { lat: Number(d.lat), lon: Number(d.lon), source: d.source || 'ip', label: d.label };
    } catch { /* ignore */ }
    return null;
  }

  async function requestLocation() {
    if (state.locating) return;
    state.locating = true;
    setBadge('locating');
    let loc = await tryBrowserGeo(9000);
    if (!loc) { setBadge('locating'); loc = await ipLocate(); }
    if (!loc) loc = { lat: 25.033, lon: 121.5654, source: 'default' };
    state.locSource = loc.source;
    await loadReport(loc);
  }

  async function loadReport(loc) {
    state.locating = false;
    setBadge('loading');
    const lat = Number(loc.lat != null ? loc.lat : 25.033);
    const lon = Number(loc.lon != null ? loc.lon : 121.5654);
    state.coords = { lat, lon };
    const query = new URLSearchParams({
      lat: lat.toFixed(5), lon: lon.toFixed(5), lang: state.lang,
      timezone: state.timezone, clock24: String(state.clock24),
      place: loc.label || 'Current district'
    });
    try {
      const res = await fetch(`/api/report?${query.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data && data.nodes) {
        state.report = data;
        const isLive = data.broker && data.broker.realtimeLive;
        setBadge(isLive ? 'live' : 'fallback', isLive ? 'chip-live' : 'chip-fallback');
      } else { throw new Error('no graph'); }
    } catch {
      if (!state.report) state.report = window.METROPULSE_REPORT;
      setBadge('fallback', 'chip-fallback');
    }
    render();
  }

  // ----------------------------------------------------------------- tabs + i18n
  function setupTabs() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.getAttribute('data-tab');
        state.activeTab = name;
        document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === tab));
        document.querySelectorAll('.tab-pane').forEach((p) => p.classList.toggle('active', p.getAttribute('data-pane') === name));
      });
    });
  }

  function applyI18n() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.getAttribute('data-i18n')); });
    if (map) buildLayerControl();
    render();
  }

  window.addEventListener('message', (event) => {
    let data = event.data || {};
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
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

  // ----------------------------------------------------------------------- boot
  document.getElementById('locateBtn').addEventListener('click', requestLocation);
  document.querySelectorAll('.view-toggle .vt').forEach((b) => b.addEventListener('click', () => setView(b.getAttribute('data-view'))));
  setupTabs();
  initMap();
  applyI18n();
  setInterval(updateClock, 1000);
  // gentle auto-refresh keeps the forecast and clock "live" without hammering OSM
  setInterval(() => { if (!state.locating) loadReport({ lat: state.coords.lat, lon: state.coords.lon, source: state.locSource }); }, 180000);
  requestLocation();
  setTimeout(() => { if (map) map.invalidateSize(); }, 300);
})();
