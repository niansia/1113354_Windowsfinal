// Fusion IoT Nexus -- source-as-key i18n (matches the FusionOS convention).
// The Traditional-Chinese string in the code IS the key. zh-TW returns the key;
// other languages look it up here, falling back to the Chinese source.
(function (global) {
  const DICT = {
    // ---- shell / header ----
    '物聯網中樞': { 'zh-CN': '物联网中枢', en: 'IoT Nexus', ja: 'IoT ネクサス', ko: 'IoT 넥서스' },
    '智慧建築物聯網指揮中心': { 'zh-CN': '智慧建筑物联网指挥中心', en: 'Smart-Building IoT Command Center', ja: 'スマートビルIoT指令センター', ko: '스마트 빌딩 IoT 지휘 센터' },
    'Fusion Tower': { 'zh-CN': 'Fusion 大樓', en: 'Fusion Tower', ja: 'フュージョンタワー', ko: '퓨전 타워' },
    '原生引擎': { 'zh-CN': '原生引擎', en: 'Native engine', ja: 'ネイティブエンジン', ko: '네이티브 엔진' },
    'Python 引擎': { 'zh-CN': 'Python 引擎', en: 'Python engine', ja: 'Python エンジン', ko: 'Python 엔진' },
    '即時連線': { 'zh-CN': '实时连线', en: 'Live', ja: 'ライブ', ko: '실시간' },
    '輪詢中': { 'zh-CN': '轮询中', en: 'Polling', ja: 'ポーリング', ko: '폴링' },
    '連線中…': { 'zh-CN': '连接中…', en: 'Connecting…', ja: '接続中…', ko: '연결 중…' },
    '已斷線': { 'zh-CN': '已断线', en: 'Disconnected', ja: '切断', ko: '연결 끊김' },

    // ---- KPI cards ----
    '即時功率': { 'zh-CN': '实时功率', en: 'Live Power', ja: '消費電力', ko: '실시간 전력' },
    '今日用電': { 'zh-CN': '今日用电', en: 'Energy Today', ja: '本日の電力量', ko: '오늘 사용량' },
    '太陽能發電': { 'zh-CN': '太阳能发电', en: 'Solar Output', ja: '太陽光発電', ko: '태양광 발전' },
    '自發自用率': { 'zh-CN': '自发自用率', en: 'Self-Consumption', ja: '自家消費率', ko: '자가소비율' },
    '碳排放': { 'zh-CN': '碳排放', en: 'Carbon', ja: '炭素排出', ko: '탄소 배출' },
    '線上裝置': { 'zh-CN': '在线设备', en: 'Online Devices', ja: 'オンライン機器', ko: '온라인 장치' },
    '平均舒適度': { 'zh-CN': '平均舒适度', en: 'Avg Comfort', ja: '平均快適度', ko: '평균 쾌적도' },
    '平均 CO₂': { 'zh-CN': '平均 CO₂', en: 'Avg CO₂', ja: '平均 CO₂', ko: '평균 CO₂' },
    '使用中告警': { 'zh-CN': '当前告警', en: 'Active Alerts', ja: '発生中のアラート', ko: '활성 경보' },
    '今日': { 'zh-CN': '今日', en: 'today', ja: '本日', ko: '오늘' },
    '尖峰': { 'zh-CN': '峰值', en: 'peak', ja: 'ピーク', ko: '피크' },

    // ---- panels ----
    '數位孿生樓層平面圖': { 'zh-CN': '数字孪生楼层平面图', en: 'Digital-Twin Floor Plan', ja: 'デジタルツイン平面図', ko: '디지털 트윈 평면도' },
    '即時負載與發電': { 'zh-CN': '实时负载与发电', en: 'Live Load & Generation', ja: 'リアルタイム負荷と発電', ko: '실시간 부하 및 발전' },
    '能耗拆分': { 'zh-CN': '能耗拆分', en: 'Energy Disaggregation', ja: 'エネルギー内訳', ko: '에너지 분해' },
    '裝置艦隊': { 'zh-CN': '设备舰队', en: 'Device Fleet', ja: 'デバイスフリート', ko: '장치 플릿' },
    '異常與事件流': { 'zh-CN': '异常与事件流', en: 'Anomalies & Events', ja: '異常とイベント', ko: '이상 및 이벤트' },
    '預測性維護': { 'zh-CN': '预测性维护', en: 'Predictive Maintenance', ja: '予知保全', ko: '예측 정비' },
    '自動化規則': { 'zh-CN': '自动化规则', en: 'Automation Rules', ja: '自動化ルール', ko: '자동화 규칙' },
    'MQTT 訊息匯流排': { 'zh-CN': 'MQTT 消息总线', en: 'MQTT Message Bus', ja: 'MQTT メッセージバス', ko: 'MQTT 메시지 버스' },
    '情境控制台': { 'zh-CN': '情境控制台', en: 'Scenario Console', ja: 'シナリオコンソール', ko: '시나리오 콘솔' },

    // ---- floor-plan metric toggles ----
    '溫度': { 'zh-CN': '温度', en: 'Temperature', ja: '温度', ko: '온도' },
    '濕度': { 'zh-CN': '湿度', en: 'Humidity', ja: '湿度', ko: '습도' },
    '佔用': { 'zh-CN': '占用', en: 'Occupancy', ja: '在室', ko: '재실' },
    '功率': { 'zh-CN': '功率', en: 'Power', ja: '電力', ko: '전력' },
    '舒適度': { 'zh-CN': '舒适度', en: 'Comfort', ja: '快適度', ko: '쾌적도' },
    '照度': { 'zh-CN': '照度', en: 'Illuminance', ja: '照度', ko: '조도' },
    '亮度': { 'zh-CN': '亮度', en: 'Brightness', ja: '明るさ', ko: '밝기' },

    // ---- device type nouns (composed display names) ----
    '空調': { 'zh-CN': '空调', en: 'HVAC', ja: '空調', ko: '공조' },
    '照明': { 'zh-CN': '照明', en: 'Lighting', ja: '照明', ko: '조명' },
    '人流感測': { 'zh-CN': '人流感测', en: 'Occupancy', ja: '人感センサー', ko: '재실 센서' },
    '空氣品質': { 'zh-CN': '空气质量', en: 'Air Quality', ja: '空気質', ko: '공기질' },
    '智慧插座': { 'zh-CN': '智能插座', en: 'Smart Plug', ja: 'スマートプラグ', ko: '스마트 플러그' },
    '太陽能陣列': { 'zh-CN': '太阳能阵列', en: 'Solar Array', ja: '太陽光アレイ', ko: '태양광 어레이' },
    '儲能電池': { 'zh-CN': '储能电池', en: 'Battery ESS', ja: '蓄電池', ko: '에너지 저장' },
    '充電樁': { 'zh-CN': '充电桩', en: 'EV Charger', ja: 'EV充電器', ko: 'EV 충전기' },
    '水流感測': { 'zh-CN': '水流感测', en: 'Water/Leak', ja: '水流・漏水', ko: '누수 감지' },
    '電子鎖': { 'zh-CN': '电子锁', en: 'Smart Lock', ja: 'スマートロック', ko: '스마트 잠금' },
    '智慧電表': { 'zh-CN': '智能电表', en: 'Smart Meter', ja: 'スマートメーター', ko: '스마트 미터' },
    '邊緣閘道': { 'zh-CN': '边缘网关', en: 'Edge Gateway', ja: 'エッジゲートウェイ', ko: '엣지 게이트웨이' },

    // ---- zone labels ----
    '大廳': { 'zh-CN': '大厅', en: 'Lobby', ja: 'ロビー', ko: '로비' },
    '接待區': { 'zh-CN': '接待区', en: 'Reception', ja: '受付', ko: '리셉션' },
    '開放辦公區': { 'zh-CN': '开放办公区', en: 'Open Office', ja: 'オープンオフィス', ko: '오픈 오피스' },
    '會議室 A': { 'zh-CN': '会议室 A', en: 'Meeting A', ja: '会議室 A', ko: '회의실 A' },
    '會議室 B': { 'zh-CN': '会议室 B', en: 'Meeting B', ja: '会議室 B', ko: '회의실 B' },
    '員工餐廳': { 'zh-CN': '员工餐厅', en: 'Cafeteria', ja: '社員食堂', ko: '카페테리아' },
    '研發實驗室': { 'zh-CN': '研发实验室', en: 'R&D Lab', ja: 'R&Dラボ', ko: 'R&D 랩' },
    '機房': { 'zh-CN': '机房', en: 'Server Room', ja: 'サーバー室', ko: '서버실' },
    '地下停車場': { 'zh-CN': '地下停车场', en: 'Parking', ja: '駐車場', ko: '주차장' },
    '頂樓能源區': { 'zh-CN': '顶楼能源区', en: 'Roof Energy', ja: '屋上エネルギー', ko: '옥상 에너지' },
    '全棟': { 'zh-CN': '全栋', en: 'Whole Building', ja: '建物全体', ko: '건물 전체' },

    // ---- metrics / fields ----
    '設定點': { 'zh-CN': '设定点', en: 'Setpoint', ja: '設定値', ko: '설정값' },
    '模式': { 'zh-CN': '模式', en: 'Mode', ja: 'モード', ko: '모드' },
    '狀態': { 'zh-CN': '状态', en: 'Status', ja: '状態', ko: '상태' },
    '運轉率': { 'zh-CN': '运转率', en: 'Duty', ja: '稼働率', ko: '가동률' },
    '濾網健康': { 'zh-CN': '滤网健康', en: 'Filter', ja: 'フィルター', ko: '필터' },
    '電量': { 'zh-CN': '电量', en: 'Battery', ja: 'バッテリー', ko: '배터리' },
    '訊號': { 'zh-CN': '信号', en: 'Signal', ja: '信号', ko: '신호' },
    '充電狀態': { 'zh-CN': '充电状态', en: 'Charge', ja: '充電', ko: '충전' },
    '人數': { 'zh-CN': '人数', en: 'People', ja: '人数', ko: '인원' },
    '流量': { 'zh-CN': '流量', en: 'Flow', ja: '流量', ko: '유량' },
    '電壓': { 'zh-CN': '电压', en: 'Voltage', ja: '電圧', ko: '전압' },
    '電流': { 'zh-CN': '电流', en: 'Current', ja: '電流', ko: '전류' },
    '效率': { 'zh-CN': '效率', en: 'Efficiency', ja: '効率', ko: '효율' },
    '韌體': { 'zh-CN': '固件', en: 'Firmware', ja: 'ファームウェア', ko: '펌웨어' },
    '供電': { 'zh-CN': '供电', en: 'Power source', ja: '電源', ko: '전원' },
    '市電': { 'zh-CN': '市电', en: 'Mains', ja: '商用電源', ko: '상용 전원' },
    '電池供電': { 'zh-CN': '电池供电', en: 'Battery', ja: '電池', ko: '배터리' },

    // ---- statuses ----
    '上線': { 'zh-CN': '在线', en: 'Online', ja: 'オンライン', ko: '온라인' },
    '離線': { 'zh-CN': '离线', en: 'Offline', ja: 'オフライン', ko: '오프라인' },
    '開': { 'zh-CN': '开', en: 'On', ja: 'オン', ko: '켜짐' },
    '關': { 'zh-CN': '关', en: 'Off', ja: 'オフ', ko: '꺼짐' },
    '製冷': { 'zh-CN': '制冷', en: 'Cooling', ja: '冷房', ko: '냉방' },
    '製熱': { 'zh-CN': '制热', en: 'Heating', ja: '暖房', ko: '난방' },
    '自動': { 'zh-CN': '自动', en: 'Auto', ja: '自動', ko: '자동' },
    '停止': { 'zh-CN': '停止', en: 'Off', ja: '停止', ko: '정지' },
    '充電中': { 'zh-CN': '充电中', en: 'Charging', ja: '充電中', ko: '충전 중' },
    '放電中': { 'zh-CN': '放电中', en: 'Discharging', ja: '放電中', ko: '방전 중' },
    '待機': { 'zh-CN': '待机', en: 'Idle', ja: '待機', ko: '대기' },
    '已連接': { 'zh-CN': '已连接', en: 'Plugged in', ja: '接続済み', ko: '연결됨' },
    '未連接': { 'zh-CN': '未连接', en: 'Unplugged', ja: '未接続', ko: '미연결' },
    '已上鎖': { 'zh-CN': '已上锁', en: 'Locked', ja: '施錠', ko: '잠김' },
    '已解鎖': { 'zh-CN': '已解锁', en: 'Unlocked', ja: '解錠', ko: '잠금 해제' },
    '正常': { 'zh-CN': '正常', en: 'Healthy', ja: '正常', ko: '정상' },
    '注意': { 'zh-CN': '注意', en: 'Watch', ja: '注意', ko: '주의' },
    '衰退': { 'zh-CN': '衰退', en: 'Degraded', ja: '劣化', ko: '저하' },
    '危急': { 'zh-CN': '危急', en: 'Critical', ja: '危機的', ko: '위급' },
    '漏水': { 'zh-CN': '漏水', en: 'Leak', ja: '漏水', ko: '누수' },

    // ---- health reasons ----
    '濾網需更換': { 'zh-CN': '滤网需更换', en: 'Filter service due', ja: 'フィルター交換時期', ko: '필터 교체 필요' },
    '運轉時數偏高': { 'zh-CN': '运转时数偏高', en: 'High runtime', ja: '稼働時間が長い', ko: '가동 시간 높음' },
    '電量偏低': { 'zh-CN': '电量偏低', en: 'Low battery', ja: 'バッテリー低下', ko: '배터리 부족' },
    '訊號微弱': { 'zh-CN': '信号微弱', en: 'Weak signal', ja: '信号が弱い', ko: '신호 약함' },
    '裝置離線': { 'zh-CN': '设备离线', en: 'Device offline', ja: 'デバイスオフライン', ko: '장치 오프라인' },
    '運作正常': { 'zh-CN': '运作正常', en: 'Operating normally', ja: '正常稼働', ko: '정상 작동' },

    // ---- anomaly / events ----
    '異常': { 'zh-CN': '异常', en: 'Anomaly', ja: '異常', ko: '이상' },
    '控制': { 'zh-CN': '控制', en: 'Control', ja: '制御', ko: '제어' },
    '自動化': { 'zh-CN': '自动化', en: 'Automation', ja: '自動化', ko: '자동화' },
    '設定': { 'zh-CN': '设置', en: 'Config', ja: '設定', ko: '설정' },
    '故障': { 'zh-CN': '故障', en: 'Fault', ja: '故障', ko: '고장' },
    '資訊': { 'zh-CN': '信息', en: 'Info', ja: '情報', ko: '정보' },
    '尚無事件': { 'zh-CN': '暂无事件', en: 'No events yet', ja: 'イベントなし', ko: '이벤트 없음' },
    '一切正常，無偵測到異常': { 'zh-CN': '一切正常，未检测到异常', en: 'All clear — no anomalies detected', ja: '異常は検出されていません', ko: '이상 없음' },

    // ---- energy breakdown ----
    '基載': { 'zh-CN': '基载', en: 'Base load', ja: 'ベース負荷', ko: '기저 부하' },
    '其他': { 'zh-CN': '其他', en: 'Other', ja: 'その他', ko: '기타' },
    '市電輸入': { 'zh-CN': '市电输入', en: 'Grid import', ja: '系統電力', ko: '계통 수전' },
    '太陽能': { 'zh-CN': '太阳能', en: 'Solar', ja: '太陽光', ko: '태양광' },
    '儲能': { 'zh-CN': '储能', en: 'Battery', ja: '蓄電', ko: '저장' },
    '總負載': { 'zh-CN': '总负载', en: 'Total load', ja: '総負荷', ko: '총 부하' },
    '即時電費': { 'zh-CN': '实时电费', en: 'Live cost', ja: '電気料金', ko: '실시간 요금' },

    // ---- automation editor ----
    '若': { 'zh-CN': '若', en: 'IF', ja: 'もし', ko: '만약' },
    '則': { 'zh-CN': '则', en: 'THEN', ja: 'ならば', ko: '이면' },
    '已啟用': { 'zh-CN': '已启用', en: 'Enabled', ja: '有効', ko: '활성' },
    '已停用': { 'zh-CN': '已停用', en: 'Disabled', ja: '無効', ko: '비활성' },
    '剛剛觸發': { 'zh-CN': '刚刚触发', en: 'just fired', ja: '発火', ko: '방금 실행' },
    '刪除': { 'zh-CN': '删除', en: 'Delete', ja: '削除', ko: '삭제' },

    // ---- MQTT panel ----
    '訊息匯流排端點': { 'zh-CN': '消息总线端点', en: 'Broker endpoint', ja: 'ブローカー', ko: '브로커 엔드포인트' },
    '連線客戶端': { 'zh-CN': '连接客户端', en: 'Connected clients', ja: '接続クライアント', ko: '연결된 클라이언트' },
    '已發布': { 'zh-CN': '已发布', en: 'Published', ja: '発行済み', ko: '발행' },
    '已派送': { 'zh-CN': '已派送', en: 'Delivered', ja: '配信済み', ko: '전달' },
    '保留訊息': { 'zh-CN': '保留消息', en: 'Retained', ja: '保持メッセージ', ko: '보존 메시지' },
    '訂閱': { 'zh-CN': '订阅', en: 'subs', ja: '購読', ko: '구독' },
    '尚無外部裝置連線': { 'zh-CN': '暂无外部设备连接', en: 'No external clients connected', ja: '外部クライアントなし', ko: '외부 클라이언트 없음' },
    '提示：可用任何 MQTT 用戶端連到此 broker 發布到 fusion/iot/#': {
      'zh-CN': '提示：可用任何 MQTT 客户端连到此 broker 发布到 fusion/iot/#',
      en: 'Tip: any MQTT client can connect and publish to fusion/iot/#',
      ja: 'ヒント：任意のMQTTクライアントが fusion/iot/# に発行できます',
      ko: '팁: 모든 MQTT 클라이언트가 fusion/iot/# 에 발행할 수 있습니다' },

    // ---- scenario console ----
    '時間倍率': { 'zh-CN': '时间倍率', en: 'Time scale', ja: '時間倍率', ko: '시간 배율' },
    '日照係數': { 'zh-CN': '日照系数', en: 'Sunlight', ja: '日射係数', ko: '일사 계수' },
    '注入故障': { 'zh-CN': '注入故障', en: 'Inject Fault', ja: '故障注入', ko: '고장 주입' },
    '濾網阻塞': { 'zh-CN': '滤网阻塞', en: 'Clog filter', ja: 'フィルター詰まり', ko: '필터 막힘' },
    '機房漏水': { 'zh-CN': '机房漏水', en: 'Server leak', ja: 'サーバー室漏水', ko: '서버실 누수' },
    '裝置離線測試': { 'zh-CN': '设备离线测试', en: 'Take node offline', ja: 'ノードをオフラインに', ko: '노드 오프라인' },
    '低電量': { 'zh-CN': '低电量', en: 'Drain battery', ja: 'バッテリー消耗', ko: '배터리 소모' },
    '重設艦隊': { 'zh-CN': '重置舰队', en: 'Reset fleet', ja: 'フリートをリセット', ko: '플릿 초기화' },
    '陰天': { 'zh-CN': '阴天', en: 'Overcast', ja: '曇り', ko: '흐림' },
    '晴天': { 'zh-CN': '晴天', en: 'Clear', ja: '晴れ', ko: '맑음' },

    // ---- device detail drawer ----
    '裝置詳情': { 'zh-CN': '设备详情', en: 'Device Detail', ja: 'デバイス詳細', ko: '장치 상세' },
    '即時遙測': { 'zh-CN': '实时遥测', en: 'Live Telemetry', ja: 'リアルタイムテレメトリ', ko: '실시간 텔레메트리' },
    '控制': { 'zh-CN': '控制', en: 'Control', ja: '制御', ko: '제어' },
    '健康分數': { 'zh-CN': '健康分数', en: 'Health', ja: '健全性', ko: '상태 점수' },
    '主題': { 'zh-CN': '主题', en: 'Topic', ja: 'トピック', ko: '토픽' },
    '關閉': { 'zh-CN': '关闭', en: 'Close', ja: '閉じる', ko: '닫기' },
    '全部': { 'zh-CN': '全部', en: 'All', ja: 'すべて', ko: '전체' },
    '搜尋裝置…': { 'zh-CN': '搜索设备…', en: 'Search devices…', ja: 'デバイス検索…', ko: '장치 검색…' },

    // ---- weather ----
    '室外': { 'zh-CN': '室外', en: 'Outdoor', ja: '屋外', ko: '실외' },
    '電網碳強度': { 'zh-CN': '电网碳强度', en: 'Grid carbon', ja: '系統炭素', ko: '계통 탄소' },
  };

  const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'];
  let current = 'zh-TW';

  function setLang(l) {
    if (LANGS.indexOf(l) >= 0) current = l;
  }
  function getLang() { return current; }

  function t(zh) {
    if (current === 'zh-TW') return zh;
    const e = DICT[zh];
    return (e && e[current]) || zh;
  }
  // interpolate {0} {1} ...
  function tf(zh) {
    const args = Array.prototype.slice.call(arguments, 1);
    return t(zh).replace(/\{(\d+)\}/g, (m, i) => (args[i] !== undefined ? args[i] : m));
  }

  global.I18N = { t, tf, setLang, getLang, LANGS, DICT };
})(window);
