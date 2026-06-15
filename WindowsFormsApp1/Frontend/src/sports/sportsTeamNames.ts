import type { Lang } from '../i18n/strings.js';

// ESPN returns team / national-team names in English. This module translates the names
// we are likely to see (World Cup nations + the major North-American leagues + the big
// European clubs) into the four non-English Fusion languages. Anything not listed falls
// back to the original English name, so the UI is never broken — only partially
// localized while the table grows. Keyed by ESPN's English `displayName`.

type TeamNameEntry = Record<Exclude<Lang, 'en'>, string>;

const tn = (zhTW: string, zhCN: string, ja: string, ko: string): TeamNameEntry => ({
  'zh-TW': zhTW,
  'zh-CN': zhCN,
  ja,
  ko
});

// Common ESPN spelling variants → canonical key used in TEAM_NAMES.
const NAME_ALIASES: Record<string, string> = {
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'Korea DPR': 'North Korea',
  'Czech Republic': 'Czechia',
  Turkey: 'Türkiye',
  'IR Iran': 'Iran',
  'Côte d’Ivoire': 'Ivory Coast',
  "Côte d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde',
  Holland: 'Netherlands'
};

const TEAM_NAMES: Record<string, TeamNameEntry> = {
  // ---- Football national teams (World Cup & confederations) ----
  Argentina: tn('阿根廷', '阿根廷', 'アルゼンチン', '아르헨티나'),
  Brazil: tn('巴西', '巴西', 'ブラジル', '브라질'),
  France: tn('法國', '法国', 'フランス', '프랑스'),
  Germany: tn('德國', '德国', 'ドイツ', '독일'),
  Spain: tn('西班牙', '西班牙', 'スペイン', '스페인'),
  England: tn('英格蘭', '英格兰', 'イングランド', '잉글랜드'),
  Portugal: tn('葡萄牙', '葡萄牙', 'ポルトガル', '포르투갈'),
  Netherlands: tn('荷蘭', '荷兰', 'オランダ', '네덜란드'),
  Italy: tn('義大利', '意大利', 'イタリア', '이탈리아'),
  Belgium: tn('比利時', '比利时', 'ベルギー', '벨기에'),
  Croatia: tn('克羅埃西亞', '克罗地亚', 'クロアチア', '크로아티아'),
  Uruguay: tn('烏拉圭', '乌拉圭', 'ウルグアイ', '우루과이'),
  Mexico: tn('墨西哥', '墨西哥', 'メキシコ', '멕시코'),
  USA: tn('美國', '美国', 'アメリカ', '미국'),
  Japan: tn('日本', '日本', '日本', '일본'),
  'South Korea': tn('南韓', '韩国', '韓国', '대한민국'),
  'North Korea': tn('北韓', '朝鲜', '北朝鮮', '북한'),
  Australia: tn('澳洲', '澳大利亚', 'オーストラリア', '호주'),
  Canada: tn('加拿大', '加拿大', 'カナダ', '캐나다'),
  Morocco: tn('摩洛哥', '摩洛哥', 'モロッコ', '모로코'),
  Senegal: tn('塞內加爾', '塞内加尔', 'セネガル', '세네갈'),
  Switzerland: tn('瑞士', '瑞士', 'スイス', '스위스'),
  Denmark: tn('丹麥', '丹麦', 'デンマーク', '덴마크'),
  Sweden: tn('瑞典', '瑞典', 'スウェーデン', '스웨덴'),
  Poland: tn('波蘭', '波兰', 'ポーランド', '폴란드'),
  Tunisia: tn('突尼西亞', '突尼斯', 'チュニジア', '튀니지'),
  Türkiye: tn('土耳其', '土耳其', 'トルコ', '튀르키예'),
  Ghana: tn('迦納', '加纳', 'ガーナ', '가나'),
  Nigeria: tn('奈及利亞', '尼日利亚', 'ナイジェリア', '나이지리아'),
  Cameroon: tn('喀麥隆', '喀麦隆', 'カメルーン', '카메룬'),
  'Ivory Coast': tn('象牙海岸', '科特迪瓦', 'コートジボワール', '코트디부아르'),
  Ecuador: tn('厄瓜多', '厄瓜多尔', 'エクアドル', '에콰도르'),
  Colombia: tn('哥倫比亞', '哥伦比亚', 'コロンビア', '콜롬비아'),
  Chile: tn('智利', '智利', 'チリ', '칠레'),
  Peru: tn('秘魯', '秘鲁', 'ペルー', '페루'),
  Paraguay: tn('巴拉圭', '巴拉圭', 'パラグアイ', '파라과이'),
  Bolivia: tn('玻利維亞', '玻利维亚', 'ボリビア', '볼리비아'),
  Venezuela: tn('委內瑞拉', '委内瑞拉', 'ベネズエラ', '베네수엘라'),
  Curaçao: tn('古拉索', '库拉索', 'キュラソー', '쿠라사오'),
  'Saudi Arabia': tn('沙烏地阿拉伯', '沙特阿拉伯', 'サウジアラビア', '사우디아라비아'),
  Qatar: tn('卡達', '卡塔尔', 'カタール', '카타르'),
  Iran: tn('伊朗', '伊朗', 'イラン', '이란'),
  Iraq: tn('伊拉克', '伊拉克', 'イラク', '이라크'),
  Egypt: tn('埃及', '埃及', 'エジプト', '이집트'),
  Algeria: tn('阿爾及利亞', '阿尔及利亚', 'アルジェリア', '알제리'),
  Serbia: tn('塞爾維亞', '塞尔维亚', 'セルビア', '세르비아'),
  Austria: tn('奧地利', '奥地利', 'オーストリア', '오스트리아'),
  Scotland: tn('蘇格蘭', '苏格兰', 'スコットランド', '스코틀랜드'),
  Wales: tn('威爾斯', '威尔士', 'ウェールズ', '웨일스'),
  Norway: tn('挪威', '挪威', 'ノルウェー', '노르웨이'),
  Greece: tn('希臘', '希腊', 'ギリシャ', '그리스'),
  Czechia: tn('捷克', '捷克', 'チェコ', '체코'),
  Ukraine: tn('烏克蘭', '乌克兰', 'ウクライナ', '우크라이나'),
  Hungary: tn('匈牙利', '匈牙利', 'ハンガリー', '헝가리'),
  Romania: tn('羅馬尼亞', '罗马尼亚', 'ルーマニア', '루마니아'),
  Russia: tn('俄羅斯', '俄罗斯', 'ロシア', '러시아'),
  Slovakia: tn('斯洛伐克', '斯洛伐克', 'スロバキア', '슬로바키아'),
  Slovenia: tn('斯洛維尼亞', '斯洛文尼亚', 'スロベニア', '슬로베니아'),
  'New Zealand': tn('紐西蘭', '新西兰', 'ニュージーランド', '뉴질랜드'),
  'Costa Rica': tn('哥斯大黎加', '哥斯达黎加', 'コスタリカ', '코스타리카'),
  Panama: tn('巴拿馬', '巴拿马', 'パナマ', '파나마'),
  Jamaica: tn('牙買加', '牙买加', 'ジャマイカ', '자메이카'),
  Honduras: tn('宏都拉斯', '洪都拉斯', 'ホンジュラス', '온두라스'),
  'South Africa': tn('南非', '南非', '南アフリカ', '남아프리카공화국'),
  Mali: tn('馬利', '马里', 'マリ', '말리'),
  China: tn('中國', '中国', '中国', '중국'),
  'Cape Verde': tn('維德角', '佛得角', 'カーボベルデ', '카보베르데'),
  Uzbekistan: tn('烏茲別克', '乌兹别克斯坦', 'ウズベキスタン', '우즈베키스탄'),
  Jordan: tn('約旦', '约旦', 'ヨルダン', '요르단'),

  // ---- NBA ----
  'Boston Celtics': tn('波士頓塞爾提克', '波士顿凯尔特人', 'ボストン・セルティックス', '보스턴 셀틱스'),
  'Los Angeles Lakers': tn('洛杉磯湖人', '洛杉矶湖人', 'ロサンゼルス・レイカーズ', '로스앤젤레스 레이커스'),
  'Golden State Warriors': tn('金州勇士', '金州勇士', 'ゴールデンステート・ウォリアーズ', '골든스테이트 워리어스'),
  'Denver Nuggets': tn('丹佛金塊', '丹佛掘金', 'デンバー・ナゲッツ', '덴버 너기츠'),
  'Milwaukee Bucks': tn('密爾瓦基公鹿', '密尔沃基雄鹿', 'ミルウォーキー・バックス', '밀워키 벅스'),
  'Miami Heat': tn('邁阿密熱火', '迈阿密热火', 'マイアミ・ヒート', '마이애미 히트'),
  'Dallas Mavericks': tn('達拉斯獨行俠', '达拉斯独行侠', 'ダラス・マーベリックス', '댈러스 매버릭스'),
  'Phoenix Suns': tn('鳳凰城太陽', '菲尼克斯太阳', 'フェニックス・サンズ', '피닉스 선즈'),
  'New York Knicks': tn('紐約尼克', '纽约尼克斯', 'ニューヨーク・ニックス', '뉴욕 닉스'),
  'Oklahoma City Thunder': tn('奧克拉荷馬雷霆', '俄克拉荷马雷霆', 'オクラホマシティ・サンダー', '오클라호마시티 썬더'),

  // ---- MLB ----
  'New York Yankees': tn('紐約洋基', '纽约扬基', 'ニューヨーク・ヤンキース', '뉴욕 양키스'),
  'Boston Red Sox': tn('波士頓紅襪', '波士顿红袜', 'ボストン・レッドソックス', '보스턴 레드삭스'),
  'Los Angeles Dodgers': tn('洛杉磯道奇', '洛杉矶道奇', 'ロサンゼルス・ドジャース', '로스앤젤레스 다저스'),
  'Texas Rangers': tn('德州遊騎兵', '德州游骑兵', 'テキサス・レンジャーズ', '텍사스 레인저스'),
  'Tampa Bay Rays': tn('坦帕灣光芒', '坦帕湾光芒', 'タンパベイ・レイズ', '탬파베이 레이스'),
  'Los Angeles Angels': tn('洛杉磯天使', '洛杉矶天使', 'ロサンゼルス・エンゼルス', '로스앤젤레스 에인절스'),
  'San Diego Padres': tn('聖地牙哥教士', '圣地亚哥教士', 'サンディエゴ・パドレス', '샌디에이고 파드리스'),
  'Baltimore Orioles': tn('巴爾的摩金鶯', '巴尔的摩金莺', 'ボルチモア・オリオールズ', '볼티모어 오리올스'),
  'Seattle Mariners': tn('西雅圖水手', '西雅图水手', 'シアトル・マリナーズ', '시애틀 매리너스'),
  'Pittsburgh Pirates': tn('匹茲堡海盜', '匹兹堡海盗', 'ピッツバーグ・パイレーツ', '피츠버그 파이리츠'),
  'Miami Marlins': tn('邁阿密馬林魚', '迈阿密马林鱼', 'マイアミ・マーリンズ', '마이애미 말린스'),

  // ---- NHL ----
  'Vegas Golden Knights': tn('維加斯金騎士', '维加斯金骑士', 'ベガス・ゴールデンナイツ', '베이거스 골든나이츠'),
  'Carolina Hurricanes': tn('卡羅萊納颶風', '卡罗莱纳飓风', 'カロライナ・ハリケーンズ', '캐롤라이나 허리케인스'),

  // ---- Major European clubs ----
  'Real Madrid': tn('皇家馬德里', '皇家马德里', 'レアル・マドリード', '레알 마드리드'),
  Barcelona: tn('巴塞隆納', '巴塞罗那', 'バルセロナ', '바르셀로나'),
  'Manchester City': tn('曼徹斯特城', '曼城', 'マンチェスター・シティ', '맨체스터 시티'),
  'Manchester United': tn('曼徹斯特聯', '曼联', 'マンチェスター・ユナイテッド', '맨체스터 유나이티드'),
  Liverpool: tn('利物浦', '利物浦', 'リバプール', '리버풀'),
  Arsenal: tn('兵工廠', '阿森纳', 'アーセナル', '아스널'),
  Chelsea: tn('切爾西', '切尔西', 'チェルシー', '첼시'),
  'Bayern Munich': tn('拜仁慕尼黑', '拜仁慕尼黑', 'バイエルン・ミュンヘン', '바이에른 뮌헨'),
  'Paris Saint-Germain': tn('巴黎聖日耳曼', '巴黎圣日耳曼', 'パリ・サンジェルマン', '파리 생제르맹'),
  Juventus: tn('尤文圖斯', '尤文图斯', 'ユヴェントス', '유벤투스'),
  'Inter Milan': tn('國際米蘭', '国际米兰', 'インテル・ミラノ', '인터 밀란'),
  'AC Milan': tn('AC米蘭', 'AC米兰', 'ACミラン', 'AC 밀란')
};

export function localizeTeamName(name: string | undefined | null, lang: Lang): string {
  const raw = (name ?? '').trim();
  if (!raw || lang === 'en') return raw;
  const entry = TEAM_NAMES[raw] ?? TEAM_NAMES[NAME_ALIASES[raw] ?? ''];
  return entry ? entry[lang] : raw;
}
