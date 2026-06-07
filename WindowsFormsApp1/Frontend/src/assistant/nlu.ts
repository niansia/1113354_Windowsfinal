import type { AppId } from '../types';
import type { Lang } from '../i18n/strings';

// A small, dependency-free, multilingual intent parser. It recognises the most common
// assistant commands across all five Fusion OS languages by keyword matching, so the
// assistant works fully offline with no model download. When the optional Ollama/Gemma
// integration is enabled it takes over; this stays as the always-available fallback.

export type IntentKind =
  | 'open_app'
  | 'weather'
  | 'time'
  | 'date'
  | 'setting'
  | 'search'
  | 'help'
  | 'greeting'
  | 'thanks'
  | 'identity'
  | 'joke'
  | 'unknown';

export type SettingTarget =
  | 'theme'
  | 'night'
  | 'brightness'
  | 'volume'
  | 'transparency'
  | 'animations'
  | 'contrast'
  | 'wallpaper'
  | 'language';

export interface ParsedIntent {
  kind: IntentKind;
  appId?: AppId;
  setTarget?: SettingTarget;
  // 'dark'|'light' for theme · 'on'|'off' for toggles · 'up'|'down' for steppers ·
  // a number for volume · a Lang code for language.
  setValue?: string | number;
  query?: string;
}

const norm = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
const hasAny = (text: string, words: string[]) => words.some((w) => w && text.includes(w));

// ---- app keyword table (multilingual aliases) ----
const APP_ALIASES: Array<{ id: AppId; words: string[] }> = [
  { id: 'set', words: ['系統設定', '系统设置', '設定', '设置', 'settings', 'setting', 'preferences', '設定を', '설정', '환경설정'] },
  { id: 'tool', words: ['應用程式中心', '应用程序中心', 'app center', 'appcenter', '所有應用', '所有应用', 'アプリセンター', '앱 센터', '앱센터', 'launcher'] },
  { id: 'pc', words: ['本機', '本机', 'this pc', '工作區', '工作区', 'workspace', 'この pc', '내 pc'] },
  { id: 'dir', words: ['專案檔案', '项目文件', '檔案總管', '文件管理', '資料夾', '文件夹', 'files', 'file manager', 'explorer', 'ファイル', '파일', '폴더'] },
  { id: 'web', words: ['網頁區', '网页区', '瀏覽器', '浏览器', 'browser', 'web zone', '上網', '网页', 'ブラウザ', 'ウェブ', '브라우저', '웹'] },
  { id: 'game', words: ['fusion rpg', '遊戲', '游戏', 'game', 'rpg', '櫻花', '樱花', 'ゲーム', '게임'] },
  { id: 'circuit', words: ['電路工作室', '电路工作室', '電路', '电路', 'circuit', '回路', '회로'] },
  { id: 'piano', words: ['鋼琴工作室', '钢琴工作室', '鋼琴', '钢琴', 'piano', '音樂', '音乐', 'ピアノ', 'ピアノスタジオ', '피아노'] },
  { id: 'media', words: ['影音中心', 'aurora', '影音', '影片', '媒體', '媒体', '電影', '影院', 'media', 'video', 'movie', 'cinema', '映像', 'メディア', '미디어', '영화'] },
  { id: 'wav', words: ['音訊工作室', '音频工作室', '音訊', '音频', 'wav', 'audio', 'waveform', 'オーディオ', '오디오'] },
  { id: 'cosmic', words: ['宇宙手勢', '宇宙手势', '宇宙', '星空', '星圖', 'cosmic', 'gesture', 'コズミック', '코스믹', '우주'] },
  { id: 'metro', words: ['metropulse', '智慧交通', '交通', '地圖', '地图', '捷運', 'map', 'metro', 'traffic', 'マップ', '交通', '교통', '지도'] },
  { id: 'iot', words: ['物聯網', '物联网', '物聯網中樞', '智慧建築', '智能建筑', 'iot', 'nexus', 'mqtt', '感測器', '传感器', 'sensor', 'モノのインターネット', 'スマートビル', '사물인터넷', '스마트 빌딩'] },
  { id: 'verify', words: ['真偽', '真伪', '假新聞', '假新闻', '鑑識', '鉴识', '查證', '查证', 'verilens', 'verify', 'fake news', 'fakenews', 'misinformation', 'yolo', '偽ニュース', 'フェイク', '가짜뉴스', '팩트체크'] },
  { id: 'dev', words: ['開發實驗室', '开发实验室', '開發', '开发', 'dev', 'code', 'ide', '程式碼', '代码', '開発', '개발', '코드'] },
  { id: 'db', words: ['資料庫', '数据库', 'database', 'sql', 'データベース', '데이터베이스'] },
  { id: 'toolbox', words: ['工具箱', '工具', 'toolbox', 'tools', '計算機', '计算器', 'calculator', 'ツール', '도구함', '계산기'] },
  { id: 'cmd', words: ['終端機', '终端', '終端', 'terminal', 'command line', 'console', 'cmd', 'ターミナル', '터미널'] },
  { id: 'user', words: ['使用者空間', '用户空间', '使用者', '用户', 'user space', 'ユーザースペース', '사용자'] },
  { id: 'add', words: ['匯入專案', '导入项目', '匯入', '导入', 'import project', 'インポート', '가져오기'] }
];

const OPEN_VERBS = ['打開', '開啟', '啟動', '執行', '進入', '開一下', '幫我開', '叫出', '呼叫', '打开', '开启', '启动', '运行', 'open', 'launch', 'start', 'run', 'go to', 'show me', '開いて', '起動', 'ひらいて', '立ち上げ', '열어', '켜', '실행', '시작', '띄워'];

const ON_WORDS = ['打開', '開啟', '開', '啟用', '打开', '开启', '开', '启用', 'on', 'enable', 'turn on', 'オン', 'つけて', 'オンに', '켜', '활성', '켜줘'];
const OFF_WORDS = ['關閉', '關掉', '關', '取消', '停用', '別', '不要', '关闭', '关掉', '关', '停用', 'off', 'disable', 'turn off', 'オフ', '切って', 'オフに', '꺼', '끄', '비활성', '해제'];

const LANG_TARGETS: Array<{ lang: Lang; words: string[] }> = [
  { lang: 'en', words: ['english', '英文', '英語', '英语', 'えいご', '영어'] },
  { lang: 'ja', words: ['japanese', '日文', '日語', '日语', '日本語', 'にほんご', '일본어'] },
  { lang: 'ko', words: ['korean', '韓文', '韓語', '韩文', '韩语', '한국어', '한국말'] },
  { lang: 'zh-CN', words: ['simplified', '简体', '簡體中文', '简体中文'] },
  { lang: 'zh-TW', words: ['traditional', '繁體', '繁体', '繁體中文', '繁中'] }
];
const LANG_SWITCH_CONTEXT = ['語言', '语言', 'language', '言語', '언어', '切換', '切换', 'switch', 'change', '改成', '改為', '設為', 'set to', '變更', '换成', '換成', '전환', '바꿔', 'に切り替え', '切り替え'];

function matchApp(text: string): AppId | undefined {
  let best: { id: AppId; score: number } | null = null;
  for (const app of APP_ALIASES) {
    for (const word of app.words) {
      const w = word.toLowerCase();
      if (text.includes(w) && (!best || w.length > best.score)) {
        best = { id: app.id, score: w.length };
      }
    }
  }
  return best?.id;
}

function pickNumber(text: string): number | undefined {
  const match = text.match(/(\d{1,3})\s*%?/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : undefined;
}

function parseSetting(text: string): ParsedIntent | null {
  // brightness (check before light/dark theme so "調亮" isn't read as "light theme")
  if (hasAny(text, ['調亮', '更亮', '亮一點', '亮一点', '变亮', '調高亮度', 'brighter', 'brighten', 'brightness up', '明るく', '밝게', '밝히'])) {
    return { kind: 'setting', setTarget: 'brightness', setValue: 'up' };
  }
  if (hasAny(text, ['調暗', '更暗', '暗一點', '暗一点', '变暗', '降低亮度', 'dimmer', 'darken', 'brightness down', '暗く', '어둡게', '어둡'])) {
    return { kind: 'setting', setTarget: 'brightness', setValue: 'down' };
  }

  // volume
  if (hasAny(text, ['靜音', '静音', 'mute', 'ミュート', '음소거']) && !hasAny(text, ['取消', 'unmute', '解除', '해제'])) {
    return { kind: 'setting', setTarget: 'volume', setValue: 'mute' };
  }
  if (hasAny(text, ['取消靜音', '取消静音', 'unmute', 'ミュート解除', '음소거 해제', '음소거 해제'])) {
    return { kind: 'setting', setTarget: 'volume', setValue: 'unmute' };
  }
  if (hasAny(text, ['音量', '聲音', '声音', 'volume', 'sound', '音量', '볼륨', '소리'])) {
    const num = pickNumber(text);
    if (num !== undefined) return { kind: 'setting', setTarget: 'volume', setValue: num };
    if (hasAny(text, ['大聲', '大声', '調大', '调大', '更大', 'louder', 'up', '大きく', '크게', '높여'])) return { kind: 'setting', setTarget: 'volume', setValue: 'up' };
    if (hasAny(text, ['小聲', '小声', '調小', '调小', '更小', 'quieter', 'down', '小さく', '작게', '낮춰'])) return { kind: 'setting', setTarget: 'volume', setValue: 'down' };
  }

  // night light (枚 before generic theme so "夜間模式" isn't swallowed)
  if (hasAny(text, ['夜間', '夜间', '護眼', '护眼', 'night light', 'night mode', 'ナイトモード', '야간', '나이트'])) {
    const off = hasAny(text, OFF_WORDS) && !hasAny(text, ['開夜間', '开夜间']);
    return { kind: 'setting', setTarget: 'night', setValue: off ? 'off' : hasAny(text, ON_WORDS) ? 'on' : 'toggle' };
  }

  // theme dark / light
  if (hasAny(text, ['深色', '暗色', '黑暗模式', 'dark mode', 'dark theme', 'ダークモード', 'ダーク', '다크', '어두운 모드'])) {
    return { kind: 'setting', setTarget: 'theme', setValue: 'dark' };
  }
  if (hasAny(text, ['淺色', '浅色', '亮色模式', 'light mode', 'light theme', 'ライトモード', 'ライト', '라이트', '밝은 모드'])) {
    return { kind: 'setting', setTarget: 'theme', setValue: 'light' };
  }

  // transparency
  if (hasAny(text, ['透明', 'transparency', 'transparent', '透過', '半透明', '투명'])) {
    const off = hasAny(text, OFF_WORDS);
    return { kind: 'setting', setTarget: 'transparency', setValue: off ? 'off' : hasAny(text, ON_WORDS) ? 'on' : 'toggle' };
  }

  // animations
  if (hasAny(text, ['動畫', '动画', 'animation', 'animations', 'アニメーション', '애니메이션'])) {
    const off = hasAny(text, OFF_WORDS);
    return { kind: 'setting', setTarget: 'animations', setValue: off ? 'off' : hasAny(text, ON_WORDS) ? 'on' : 'toggle' };
  }

  // high contrast
  if (hasAny(text, ['高對比', '高对比', 'high contrast', 'ハイコントラスト', '고대비'])) {
    const off = hasAny(text, OFF_WORDS);
    return { kind: 'setting', setTarget: 'contrast', setValue: off ? 'off' : hasAny(text, ON_WORDS) ? 'on' : 'toggle' };
  }

  // wallpaper
  if (hasAny(text, ['桌布', '壁紙', '壁纸', 'wallpaper', 'background image', '背景圖', '배경화면', '바탕화면'])) {
    return { kind: 'setting', setTarget: 'wallpaper' };
  }

  // language
  const langTarget = LANG_TARGETS.find((t) => hasAny(text, t.words.map((w) => w.toLowerCase())));
  if (langTarget && hasAny(text, LANG_SWITCH_CONTEXT.map((w) => w.toLowerCase()))) {
    return { kind: 'setting', setTarget: 'language', setValue: langTarget.lang };
  }

  return null;
}

// City extraction for weather, e.g. "台北的天氣" / "weather in Tokyo" / "東京の天気".
function extractCity(raw: string): string | undefined {
  let s = raw
    .replace(/(今天|今日|現在|现在|目前|請問|请问|查詢|查询|幫我|帮我|的|今|な|の|today|current|what.?s|what is|how is|how's|please|tell me|check)/gi, ' ')
    .replace(/(天氣|天气|weather|天気|날씨|氣溫|气温|temperature|溫度|温度)/gi, ' ')
    .replace(/\b(in|at|for|the|a|an|of|like|right now|now)\b/gi, ' ')
    .replace(/(에서|이|가|는|은)/g, ' ')
    .replace(/[?？。．.,，!！]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return undefined;
  // keep it short — a city name, not a sentence
  if (s.length > 24) return undefined;
  return s;
}

export function parseIntent(raw: string): ParsedIntent {
  const text = norm(raw);
  if (!text) return { kind: 'unknown' };

  // help / capabilities
  if (hasAny(text, ['你會做什麼', '你会做什么', '能做什麼', '能做什么', '有什麼功能', '有什么功能', 'what can you do', 'help', 'capabilities', '使い方', '何ができ', '도와줘', '뭘 할 수', '기능'])) {
    return { kind: 'help' };
  }
  // identity
  if (hasAny(text, ['你是誰', '你是谁', '你叫什麼', '你叫什么', '你是什麼', 'who are you', 'what are you', 'your name', '誰', 'あなたは誰', '누구', '이름이'])) {
    return { kind: 'identity' };
  }
  // thanks
  if (hasAny(text, ['謝謝', '谢谢', '感謝', '感谢', 'thank', 'thanks', 'ありがとう', '감사', '고마워'])) {
    return { kind: 'thanks' };
  }
  // joke
  if (hasAny(text, ['笑話', '笑话', '講個笑話', '讲个笑话', 'joke', 'make me laugh', 'ジョーク', '冗談', '농담', '웃긴'])) {
    return { kind: 'joke' };
  }
  // weather
  if (hasAny(text, ['天氣', '天气', 'weather', '天気', '날씨', '氣溫', '气温', '溫度幾度', '气温多少'])) {
    return { kind: 'weather', query: extractCity(raw) };
  }
  // time
  if (hasAny(text, ['幾點', '几点', '現在時間', '现在时间', '時間', '时间', 'what time', 'the time', 'time now', '何時', '今何時', '몇 시', '시간'])) {
    return { kind: 'time' };
  }
  // date
  if (hasAny(text, ['幾號', '几号', '日期', '今天星期', '今天禮拜', '星期幾', '礼拜几', 'what day', 'date today', "today's date", '何日', '何曜日', '날짜', '며칠', '무슨 요일'])) {
    return { kind: 'date' };
  }

  // settings
  const setting = parseSetting(text);
  if (setting) return setting;

  // web search
  if (hasAny(text, ['搜尋', '搜索', '查一下', 'search for', 'search', 'google', 'look up', '検索', '調べて', '검색', '찾아'])) {
    const query = raw
      .replace(/(搜尋|搜索|查一下|幫我搜|帮我搜|search for|search|google|look up|検索して|検索|調べて|검색해줘|검색|찾아줘|찾아)/gi, ' ')
      .replace(/[?？。．]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { kind: 'search', query: query || undefined };
  }

  // open app (verb + app, or a clear app name on its own)
  const appId = matchApp(text);
  if (appId) {
    return { kind: 'open_app', appId };
  }
  // verb present but no app matched → still likely a launch attempt the user can refine
  if (hasAny(text, OPEN_VERBS)) {
    return { kind: 'open_app' };
  }

  // greeting (after launch checks so "你好，打開設定" still opens settings)
  if (hasAny(text, ['你好', '哈囉', '哈罗', '嗨', '早安', '午安', '晚安', 'hello', 'hi', 'hey', 'こんにちは', 'おはよう', 'やあ', '안녕', '하이'])) {
    return { kind: 'greeting' };
  }

  return { kind: 'unknown', query: raw.trim() };
}
