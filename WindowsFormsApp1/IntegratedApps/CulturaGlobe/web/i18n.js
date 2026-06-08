// Cultura globe -- source-as-key i18n (ES module, system-driven, default zh-TW).
const DICT = {
  '世界文化星球': { 'zh-CN': '世界文化星球', en: 'Cultura — World Cultures', ja: '世界文化プラネット', ko: '세계 문화 행성' },
  '探索世界各國的文化、音樂與語言': { 'zh-CN': '探索世界各国的文化、音乐与语言', en: 'Explore the cultures, music and languages of the world', ja: '世界の文化・音楽・言語を探索', ko: '세계의 문화·음악·언어 탐험' },
  '個文化標記': { 'zh-CN': '个文化标记', en: 'cultural markers', ja: '件の文化マーカー', ko: '개 문화 마커' },
  '個國家／地區': { 'zh-CN': '个国家／地区', en: 'countries / regions', ja: 'の国・地域', ko: '개 국가/지역' },
  '搜尋國家或文化…': { 'zh-CN': '搜索国家或文化…', en: 'Search a country or culture…', ja: '国や文化を検索…', ko: '국가/문화 검색…' },
  '全部': { 'zh-CN': '全部', en: 'All', ja: 'すべて', ko: '전체' },
  '類別': { 'zh-CN': '类别', en: 'Categories', ja: 'カテゴリ', ko: '카테고리' },
  '地區': { 'zh-CN': '地区', en: 'Regions', ja: '地域', ko: '지역' },
  '點擊地球上的標記，聆聽各地文化的聲音': { 'zh-CN': '点击地球上的标记，聆听各地文化的声音', en: 'Click a marker on the globe to hear a culture come alive', ja: '地球上のマーカーをクリックして文化の音を聴く', ko: '지구의 마커를 클릭해 문화의 소리를 들어보세요' },
  '拖曳旋轉地球 · 滾輪縮放': { 'zh-CN': '拖曳旋转地球 · 滚轮缩放', en: 'Drag to rotate · scroll to zoom', ja: 'ドラッグで回転 · ホイールでズーム', ko: '드래그 회전 · 휠 확대' },
  '聆聽問候': { 'zh-CN': '聆听问候', en: 'Hear the greeting', ja: '挨拶を聴く', ko: '인사 듣기' },
  '播放音訊': { 'zh-CN': '播放音频', en: 'Play audio', ja: '音を再生', ko: '오디오 재생' },
  '重新播放': { 'zh-CN': '重新播放', en: 'Replay', ja: '再生', ko: '다시 재생' },
  '關閉': { 'zh-CN': '关闭', en: 'Close', ja: '閉じる', ko: '닫기' },
  '音訊由程式即時合成（Web Audio）': { 'zh-CN': '音频由程序实时合成（Web Audio）', en: 'Audio is synthesised live in-browser (Web Audio)', ja: '音はブラウザでリアルタイム合成（Web Audio）', ko: '오디오는 브라우저에서 실시간 합성 (Web Audio)' },
  '此地文化': { 'zh-CN': '此地文化', en: 'Cultural highlight', ja: '文化ハイライト', ko: '문화 하이라이트' },
  '探索中': { 'zh-CN': '探索中', en: 'Exploring', ja: '探索中', ko: '탐색 중' },
  '載入中…': { 'zh-CN': '加载中…', en: 'Loading…', ja: '読込中…', ko: '로딩 중…' }
};

const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'];
let current = 'zh-TW';

export function setLang(l) { if (LANGS.indexOf(l) >= 0) current = l; }
export function getLang() { return current; }
export function t(zh) { if (current === 'zh-TW') return zh; const e = DICT[zh]; return (e && e[current]) || zh; }
export function tf(zh, ...a) { return t(zh).replace(/\{(\d+)\}/g, (m, i) => (a[i] !== undefined ? a[i] : m)); }
// pick a localized field from a data object that has {zh, en} (+ optional dZh/dEn via keys)
export function loc(zhVal, enVal) {
  if (current === 'zh-TW' || current === 'zh-CN') return zhVal;
  return enVal || zhVal;
}
export { LANGS };
