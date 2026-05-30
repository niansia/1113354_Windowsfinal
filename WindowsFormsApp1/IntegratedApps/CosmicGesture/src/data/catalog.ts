import type { BodyId } from "../types";

// Extensible cosmic catalog: the menu, info cards and deep-space visuals are all
// data-driven from here. Adding a new object = appending one entry below.

export type CatalogCategory =
  | "planet"
  | "dwarf"
  | "moon"
  | "star"
  | "constellation"
  | "nebula"
  | "galaxy"
  | "blackhole"
  | "cluster";

// How the 3D layer should render the entry.
//  - "solar": handled by the existing particle SolarSystemScene via bodyId.
//  - everything else: handled by DeepSpaceScene's procedural generators.
export type RenderKind =
  | "solar"
  | "galaxySpiral"
  | "galaxyElliptical"
  | "nebula"
  | "blackhole"
  | "star"
  | "constellation"
  | "cluster"
  | "rocky";

export interface SourceLink {
  label: string;
  url: string;
}

export interface CatalogEntry {
  id: string;
  name: string; // Chinese
  englishName: string;
  category: CatalogCategory;
  subtype: string; // human readable sub-classification (中文)
  render: RenderKind;
  bodyId?: BodyId; // present when render === "solar"
  distance: string;
  radius: string;
  mass: string;
  temperature: string;
  rotationPeriod: string;
  orbitalPeriod: string;
  spectralType?: string;
  system: string; // 所屬系統 / 星座
  description: string;
  facts: string[]; // 詳細科學資料
  funFacts: string[]; // 趣味知識
  tags: string[];
  sources: SourceLink[];
  palette: string[]; // colours that drive the deep-space visual
  accent: string;
  seed: number;
}

export interface CategoryMeta {
  id: CatalogCategory;
  name: string;
  englishName: string;
  glyph: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "planet", name: "行星", englishName: "Planets", glyph: "☉" },
  { id: "dwarf", name: "矮行星", englishName: "Dwarf Planets", glyph: "◐" },
  { id: "moon", name: "衛星", englishName: "Moons", glyph: "☾" },
  { id: "star", name: "恆星", englishName: "Stars", glyph: "✦" },
  { id: "constellation", name: "星座", englishName: "Constellations", glyph: "⋆" },
  { id: "nebula", name: "星雲", englishName: "Nebulae", glyph: "❄" },
  { id: "galaxy", name: "星系", englishName: "Galaxies", glyph: "✺" },
  { id: "blackhole", name: "黑洞", englishName: "Black Holes", glyph: "●" },
  { id: "cluster", name: "星團", englishName: "Clusters", glyph: "✸" }
];

const NASA_PLANETS: SourceLink = { label: "NASA Planetary Fact Sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/" };
const NASA_SCIENCE: SourceLink = { label: "NASA Science", url: "https://science.nasa.gov/" };

export const catalog: CatalogEntry[] = [
  // ---------------- Solar system planets (rendered by particle scene) ----------------
  {
    id: "sun", name: "太陽", englishName: "Sun", category: "star", subtype: "G 型主序星 (恆星)",
    render: "solar", bodyId: "sun",
    distance: "0 (中心天體)", radius: "696,340 km", mass: "1.989×10³⁰ kg", temperature: "表面 ~5,500°C / 核心 ~1500萬°C",
    rotationPeriod: "約 25–35 地球日", orbitalPeriod: "繞銀心約 2.25 億年", spectralType: "G2V",
    system: "太陽系",
    description: "太陽是太陽系的中心恆星，佔太陽系總質量的 99.86%，以核融合將氫融合成氦並釋放光與熱。",
    facts: ["核心每秒把約 6 億噸氫轉換成氦", "由電漿組成，主要是氫(73%)與氦(25%)", "日冕溫度高達百萬度，遠高於表面"],
    funFacts: ["太陽光抵達地球約需 8 分 20 秒", "一百萬顆地球才能填滿太陽"],
    tags: ["恆星", "核融合", "太陽系核心"],
    sources: [{ label: "NASA Sun Facts", url: "https://science.nasa.gov/sun/facts/" }, NASA_SCIENCE],
    palette: ["#fff8c9", "#ffd966", "#ff9f2e", "#ff5a1f"], accent: "#ffd166", seed: 1101
  },
  planet("mercury", "水星", "Mercury", "類地行星", "57.9 百萬 km (0.39 AU)", "2,439.7 km", "3.30×10²³ kg", "-173°C ~ 427°C", "58.6 地球日", "88 地球日", "水星沒有真正的大氣層，晝夜溫差是太陽系最大之一。", ["最靠近太陽的行星", "表面遍布隕石坑，類似月球"], ["一天(自轉)比一年(公轉)還長"], ["#f1e4ce", "#aeb3bd", "#6d717b"], "#cfd7e5", 2202),
  planet("venus", "金星", "Venus", "類地行星", "108.2 百萬 km (0.72 AU)", "6,051.8 km", "4.87×10²⁴ kg", "約 464°C (最熱行星)", "243 地球日 (逆轉)", "225 地球日", "金星擁有濃厚的二氧化碳大氣與硫酸雲，溫室效應使其成為最熱的行星。", ["自轉方向與多數行星相反", "表面氣壓是地球的 92 倍"], ["在地球上是天空第三亮的天體"], ["#fff1c4", "#f6ce82", "#d99b4d"], "#ffd37a", 3303),
  planet("earth", "地球", "Earth", "類地行星 / 生命搖籃", "149.6 百萬 km (1 AU)", "6,371 km", "5.97×10²⁴ kg", "平均 15°C", "23.9 小時", "365.25 地球日", "地球是目前已知唯一存在生命的行星，擁有液態水與保護性磁場。", ["71% 表面被海洋覆蓋", "磁場保護地表免受太陽風侵襲"], ["地球並非完美球體，而是赤道略鼓"], ["#1e88ff", "#43e39a", "#f7fbff"], "#7dfff0", 4404),
  planet("mars", "火星", "Mars", "類地行星", "227.9 百萬 km (1.52 AU)", "3,389.5 km", "6.42×10²³ kg", "-153°C ~ 20°C", "24.6 小時", "687 地球日", "火星是紅色的沙漠行星，擁有太陽系最高的火山與最深的峽谷，是人類探索的熱點。", ["奧林帕斯山高約 22 km，是太陽系最高火山", "兩顆小衛星：火衛一與火衛二"], ["過去可能有流動的液態水"], ["#ff9c5b", "#d94b2d", "#8f251e"], "#ff7043", 5505),
  planet("jupiter", "木星", "Jupiter", "氣態巨行星", "778.5 百萬 km (5.20 AU)", "69,911 km", "1.90×10²⁷ kg", "雲頂 約 -145°C", "9.9 小時", "11.9 地球年", "木星是太陽系最大的行星，巨大的大紅斑是一個持續數百年的風暴。", ["質量是其餘行星總和的 2.5 倍", "已知有 95 顆以上衛星"], ["大紅斑大到可以裝下整個地球"], ["#ffe7b6", "#c98c58", "#8f5f42"], "#ffb36b", 6606),
  planet("saturn", "土星", "Saturn", "氣態巨行星 (環系)", "1,434 百萬 km (9.58 AU)", "58,232 km", "5.68×10²⁶ kg", "雲頂 約 -178°C", "10.7 小時", "29.4 地球年", "土星以壯麗的環系聞名，環主要由冰與岩石碎屑組成。", ["平均密度比水還低", "環厚度僅約 10 公尺至 1 公里"], ["如果有夠大的水池，土星會浮起來"], ["#fff1bf", "#e4bf73", "#a9783f"], "#ffe29b", 7707),
  planet("uranus", "天王星", "Uranus", "冰巨行星", "2,871 百萬 km (19.2 AU)", "25,362 km", "8.68×10²⁵ kg", "約 -224°C", "17.2 小時 (側躺自轉)", "84 地球年", "天王星幾乎是側躺著自轉，自轉軸傾斜約 98 度，是太陽系最冷的行星大氣之一。", ["自轉軸近乎躺平，季節極端", "甲烷使其呈現藍綠色"], ["在 1986 年才被航海家二號近距離造訪"], ["#b9fff3", "#75e4ef", "#3bb8d5"], "#8affee", 8808),
  planet("neptune", "海王星", "Neptune", "冰巨行星", "4,495 百萬 km (30.07 AU)", "24,622 km", "1.02×10²⁶ kg", "約 -214°C", "16.1 小時", "164.8 地球年", "海王星是最遠的行星，擁有太陽系最強的風暴，風速可達每小時 2,100 公里。", ["以數學預測後才被觀測到", "深藍色來自大氣中的甲烷"], ["自發現以來才剛繞太陽一圈(2011)"], ["#8ed2ff", "#246fff", "#18206d"], "#5db8ff", 9909),

  // ---------------- Dwarf planets ----------------
  deep("pluto", "冥王星", "Pluto", "dwarf", "矮行星 (古柏帶)", "rocky", "5,906 百萬 km (39.5 AU)", "1,188.3 km", "1.31×10²² kg", "約 -229°C", "6.4 地球日", "248 地球年", "古柏帶", "冥王星於 2006 年被重新分類為矮行星，其表面有一塊心形的氮冰平原。", ["有五顆已知衛星，最大為冥衛一", "與海王星形成 3:2 軌道共振"], ["新視野號在 2015 年首次拍到它的清晰面貌"], ["矮行星", "古柏帶", "冰世界"], [{ label: "NASA Pluto", url: "https://science.nasa.gov/dwarf-planets/pluto/" }], ["#d8c9b0", "#a98e74", "#6b5440"], "#f0d9b5", 3111),
  deep("ceres", "穀神星", "Ceres", "dwarf", "矮行星 (小行星帶)", "rocky", "413 百萬 km (2.77 AU)", "473 km", "9.39×10²⁰ kg", "約 -105°C", "9 小時", "4.6 地球年", "小行星帶", "穀神星是小行星帶中最大的天體，也是內太陽系唯一的矮行星，可能含有地下水冰。", ["占小行星帶總質量約三分之一", "表面有神秘的明亮鹽斑"], ["由曙光號探測器於 2015 年詳細觀測"], ["矮行星", "小行星帶"], [{ label: "NASA Ceres", url: "https://science.nasa.gov/dwarf-planets/ceres/" }], ["#cfd2d6", "#9aa0a6", "#5f6469"], "#dfe4ea", 3222),
  deep("eris", "鬩神星", "Eris", "dwarf", "矮行星 (離散盤)", "rocky", "10,100 百萬 km (67.8 AU)", "1,163 km", "1.66×10²² kg", "約 -243°C", "25.9 小時", "558 地球年", "離散盤", "鬩神星的發現直接促成了冥王星被重新分類，是已知質量最大的矮行星。", ["質量比冥王星略大", "表面被甲烷冰覆蓋，反照率極高"], ["其名來自希臘紛爭女神，恰如其引發的爭議"], ["矮行星", "離散盤"], [NASA_SCIENCE], ["#e6e9ee", "#b7bdc6", "#7d828c"], "#eef1f5", 3333),

  // ---------------- Moons ----------------
  deep("moon", "月球", "Moon", "moon", "天然衛星", "rocky", "384,400 km (距地球)", "1,737.4 km", "7.35×10²² kg", "-173°C ~ 127°C", "27.3 地球日", "27.3 地球日 (同步)", "地月系統", "月球是地球唯一的天然衛星，潮汐鎖定使我們永遠只看到同一面。", ["影響地球潮汐與自轉穩定", "表面覆蓋細微的月壤"], ["人類於 1969 年首度登陸"], ["衛星", "地球", "潮汐鎖定"], [{ label: "NASA Moon", url: "https://science.nasa.gov/moon/" }], ["#d6d6d6", "#9a9a9a", "#5c5c5c"], "#e8e8e8", 4111),
  deep("europa", "木衛二", "Europa", "moon", "冰衛星", "rocky", "671,000 km (距木星)", "1,560.8 km", "4.80×10²² kg", "約 -160°C", "3.5 地球日", "3.5 地球日", "木星系統", "歐羅巴的冰殼下可能藏著比地球更多水量的全球海洋，是尋找地外生命的首要目標。", ["冰下海洋可能適合生命", "表面是太陽系最平滑的之一"], ["NASA 歐羅巴快船將前往探測"], ["衛星", "木星", "海洋世界"], [{ label: "NASA Europa", url: "https://science.nasa.gov/jupiter/moons/europa/" }], ["#f3ead8", "#cdb89a", "#8f9bb3"], "#dfe9ff", 4222),
  deep("titan", "土衛六", "Titan", "moon", "巨型衛星", "rocky", "1,222,000 km (距土星)", "2,574.7 km", "1.35×10²³ kg", "約 -179°C", "15.9 地球日", "15.9 地球日", "土星系統", "泰坦是唯一擁有濃厚大氣的衛星，地表有由液態甲烷構成的湖泊與河流。", ["大氣比地球更濃厚，主要成分為氮", "有液態甲烷的「水文」循環"], ["惠更斯號曾成功降落其表面"], ["衛星", "土星", "甲烷湖"], [{ label: "NASA Titan", url: "https://science.nasa.gov/saturn/moons/titan/" }], ["#ffd98a", "#d99a4a", "#8a5a2a"], "#ffce7a", 4333),

  // ---------------- Stars ----------------
  deep("sirius", "天狼星", "Sirius", "star", "主序雙星 (全天最亮)", "star", "8.6 光年", "1.71 太陽半徑", "2.06 太陽質量", "約 9,940°C", "—", "—", "大犬座", "天狼星是夜空中最亮的恆星，其實是由一顆 A 型主序星與一顆白矮星組成的雙星系統。", ["視星等 -1.46，全天最亮", "伴星天狼星 B 是一顆白矮星"], ["古埃及以它的偕日升判斷尼羅河氾濫"], ["恆星", "雙星", "大犬座"], [NASA_SCIENCE], ["#dff0ff", "#a9d4ff", "#6fa8ff"], "#cfe6ff", 5111, "A1V"),
  deep("betelgeuse", "參宿四", "Betelgeuse", "star", "紅超巨星", "star", "約 642 光年", "約 764 太陽半徑", "約 16.5 太陽質量", "約 3,300°C", "—", "—", "獵戶座", "參宿四是獵戶座的紅色亮星，一顆即將走到生命盡頭的紅超巨星，未來可能以超新星爆發。", ["體積大到可吞沒木星軌道", "亮度會不規則變化"], ["2019–2020 的大變暗事件曾引發超新星猜測"], ["恆星", "紅超巨星", "獵戶座"], [NASA_SCIENCE], ["#ff7b4a", "#ff5a2a", "#c0331a"], "#ff8a5a", 5222, "M1-2 Ia"),
  deep("proxima", "比鄰星", "Proxima Centauri", "star", "紅矮星", "star", "4.24 光年 (最近恆星)", "0.15 太陽半徑", "0.12 太陽質量", "約 2,800°C", "—", "—", "半人馬座", "比鄰星是離太陽最近的恆星，擁有一顆位於適居帶的系外行星比鄰星 b。", ["距離太陽最近的恆星", "擁有可能適居的系外行星 Proxima b"], ["即使最近，光也要走 4 年多才到"], ["恆星", "紅矮星", "系外行星"], [{ label: "NASA Exoplanets", url: "https://science.nasa.gov/exoplanets/" }], ["#ff9a6a", "#e0663a", "#9c3a20"], "#ffb38a", 5333, "M5.5Ve"),

  // ---------------- Constellations ----------------
  deep("orion", "獵戶座", "Orion", "constellation", "星座 (赤道帶)", "constellation", "多顆成員恆星不一", "—", "—", "—", "—", "—", "獵戶座", "獵戶座是最容易辨認的星座之一，腰帶三星與獵戶座大星雲都是著名的觀測目標。", ["包含參宿四與參宿七兩顆亮星", "腰帶三星幾乎排成一直線"], ["幾乎全球都能看見，是冬季的指標星座"], ["星座", "冬季", "獵人"], [NASA_SCIENCE], ["#bcd4ff", "#88aaff", "#ffffff"], "#bcd4ff", 6111),
  deep("ursa-major", "大熊座 / 北斗七星", "Ursa Major", "constellation", "星座 (拱極)", "constellation", "成員恆星 60–120 光年", "—", "—", "—", "—", "—", "大熊座", "北斗七星是大熊座的一部分，七顆亮星構成杓子形狀，可用來尋找北極星。", ["杓口兩星指向北極星", "中文稱為北斗七星"], ["許多文化都以它作為方向指引"], ["星座", "北斗", "導航"], [NASA_SCIENCE], ["#cfe0ff", "#9ab8ff", "#ffffff"], "#cfe0ff", 6222),
  deep("scorpius", "天蠍座", "Scorpius", "constellation", "星座 (黃道)", "constellation", "心宿二約 550 光年", "—", "—", "—", "—", "—", "天蠍座", "天蠍座是黃道星座，紅色的心宿二(Antares)是它的心臟，外型宛如一隻翹尾的蠍子。", ["主星心宿二是一顆紅超巨星", "位於銀河中心方向，星場濃密"], ["夏季南方天空的代表星座"], ["星座", "黃道", "夏季"], [NASA_SCIENCE], ["#ff9a8a", "#ff6a5a", "#ffd0c0"], "#ff9a8a", 6333),

  // ---------------- Nebulae ----------------
  deep("orion-nebula", "獵戶座大星雲 (M42)", "Orion Nebula", "nebula", "發射星雲 (恆星育嬰房)", "nebula", "約 1,344 光年", "約 24 光年跨度", "約 2,000 太陽質量", "—", "—", "—", "獵戶座", "M42 是離地球最近的大型恆星形成區，肉眼即可見，內部正誕生著大量新恆星。", ["獵戶座腰帶下方肉眼可見", "內部的獵戶四邊形照亮整片氣體"], ["是天文攝影最熱門的目標之一"], ["星雲", "Messier", "恆星形成"], [{ label: "NASA / Hubble M42", url: "https://science.nasa.gov/mission/hubble/" }], ["#ff6ba6", "#7b6bff", "#3ad1ff"], "#ff8ac4", 7111),
  deep("crab", "蟹狀星雲 (M1)", "Crab Nebula", "nebula", "超新星殘骸", "nebula", "約 6,500 光年", "約 11 光年跨度", "—", "—", "—", "—", "金牛座", "蟹狀星雲是 1054 年超新星爆發的殘骸，中心有一顆每秒自轉 30 次的中子星(脈衝星)。", ["源自史料記載的 1054 年超新星", "中心脈衝星每秒旋轉約 30 次"], ["中國宋代天文學家曾記錄這次「客星」"], ["星雲", "超新星殘骸", "脈衝星"], [NASA_SCIENCE], ["#7bdfff", "#ffb05a", "#ff5a7b"], "#7bdfff", 7222),

  // ---------------- Galaxies ----------------
  deep("andromeda", "仙女座星系 (M31)", "Andromeda Galaxy", "galaxy", "棒旋星系", "galaxySpiral", "約 250 萬光年", "約 22 萬光年跨度", "約 1.5×10¹² 太陽質量", "—", "—", "—", "本星系群", "仙女座星系是離銀河系最近的大型螺旋星系，約 45 億年後將與銀河系合併。", ["包含約一兆顆恆星", "正以每秒約 110 km 朝銀河系接近"], ["是肉眼可見最遠的天體之一"], ["星系", "螺旋", "本星系群"], [{ label: "NASA Andromeda", url: "https://science.nasa.gov/" }], ["#bcd0ff", "#8a78ff", "#ff9ad0"], "#bcd0ff", 8111),
  deep("m96", "M96 星系", "Messier 96", "galaxy", "中介螺旋星系", "galaxySpiral", "約 3,100 萬光年", "約 6.6 萬光年跨度", "—", "—", "—", "—", "獅子座 (M96 星系群)", "M96 是獅子座 M96 星系群的主要成員，是一個不對稱的螺旋星系，核心明亮。", ["M96 星系群的領頭星系", "螺旋臂略顯不對稱"], ["可用中型望遠鏡在獅子座找到"], ["星系", "Messier", "獅子座"], [{ label: "NASA / ESA Hubble M96", url: "https://esahubble.org/" }], ["#cdbcff", "#7a8aff", "#ffc0a0"], "#cdbcff", 8222),
  deep("whirlpool", "渦狀星系 (M51)", "Whirlpool Galaxy", "galaxy", "大設計螺旋星系", "galaxySpiral", "約 2,300 萬光年", "約 7.6 萬光年跨度", "—", "—", "—", "—", "獵犬座", "M51 是教科書級的螺旋星系，正與伴星系 NGC 5195 互動，螺旋臂結構清晰壯麗。", ["與伴星系的引力互動激發旋臂", "是第一個被辨認出螺旋結構的星系"], ["小望遠鏡也能看見它的旋渦輪廓"], ["星系", "螺旋", "互動星系"], [{ label: "NASA / Hubble M51", url: "https://science.nasa.gov/mission/hubble/" }], ["#bce0ff", "#8a9cff", "#ffd0a0"], "#bce0ff", 8333),

  // ---------------- Black holes ----------------
  deep("sagittarius-a", "人馬座 A*", "Sagittarius A*", "blackhole", "超大質量黑洞 (銀河中心)", "blackhole", "約 26,000 光年", "事件視界 ~1,200 萬 km", "約 430 萬太陽質量", "吸積盤可達數百萬度", "—", "—", "人馬座 / 銀河系中心", "人馬座 A* 是位於銀河系中心的超大質量黑洞，2022 年由事件視界望遠鏡拍下其影像。", ["銀河系所有恆星都繞它公轉", "2022 年 EHT 公布其陰影影像"], ["它的質量是太陽的四百多萬倍，卻只有水星軌道大小"], ["黑洞", "銀河中心", "EHT"], [{ label: "NASA Black Holes", url: "https://science.nasa.gov/universe/black-holes/" }], ["#ffd27a", "#ff7a3a", "#7a2aff"], "#ffd27a", 9111),
  deep("m87", "M87*", "Messier 87 Black Hole", "blackhole", "超大質量黑洞", "blackhole", "約 5,500 萬光年", "事件視界 ~380 億 km", "約 65 億太陽質量", "吸積盤極高溫", "—", "—", "室女座 M87 星系", "M87* 是人類拍下的第一張黑洞照片(2019)，位於巨橢圓星系 M87 的中心，並噴出壯觀的相對論性噴流。", ["2019 年第一張黑洞影像的主角", "噴流長達數千光年"], ["它的質量是人馬座 A* 的上千倍"], ["黑洞", "M87", "第一張黑洞照片"], [{ label: "NASA EHT M87", url: "https://science.nasa.gov/universe/black-holes/" }], ["#ffcaa0", "#ff7a4a", "#a23aff"], "#ffcaa0", 9222),

  // ---------------- Clusters ----------------
  deep("pleiades", "昴宿星團 (M45)", "Pleiades", "cluster", "疏散星團", "cluster", "約 444 光年", "約 17 光年跨度", "約 800 太陽質量", "藍白色高溫恆星", "—", "—", "金牛座", "昴宿星團(七姊妹)是夜空中最亮的疏散星團，由年輕的藍白色恆星與周圍的反射星雲組成。", ["肉眼通常可見 6–7 顆亮星", "成員恆星僅約一億歲，相當年輕"], ["許多文化都以它作為季節與神話的象徵"], ["星團", "疏散星團", "金牛座"], [{ label: "NASA / Pleiades", url: "https://science.nasa.gov/" }], ["#cfe4ff", "#9ec2ff", "#ffffff"], "#cfe4ff", 9333)
];

// ---- helpers ----
function planet(
  id: BodyId, name: string, en: string, subtype: string, distance: string, radius: string, mass: string,
  temperature: string, rotationPeriod: string, orbitalPeriod: string, description: string,
  facts: string[], funFacts: string[], palette: string[], accent: string, seed: number
): CatalogEntry {
  return {
    id, name, englishName: en, category: "planet", subtype, render: "solar", bodyId: id,
    distance, radius, mass, temperature, rotationPeriod, orbitalPeriod, system: "太陽系",
    description, facts, funFacts, tags: ["行星", "太陽系", subtype], sources: [NASA_PLANETS, NASA_SCIENCE],
    palette, accent, seed
  };
}

function deep(
  id: string, name: string, en: string, category: CatalogCategory, subtype: string, render: RenderKind,
  distance: string, radius: string, mass: string, temperature: string, rotationPeriod: string, orbitalPeriod: string,
  system: string, description: string, facts: string[], funFacts: string[], tags: string[], sources: SourceLink[],
  palette: string[], accent: string, seed: number, spectralType?: string
): CatalogEntry {
  return {
    id, name, englishName: en, category, subtype, render, distance, radius, mass, temperature,
    rotationPeriod, orbitalPeriod, spectralType, system, description, facts, funFacts, tags, sources,
    palette, accent, seed
  };
}

export const catalogById: Record<string, CatalogEntry> = Object.fromEntries(catalog.map((e) => [e.id, e]));

export function entriesByCategory(category: CatalogCategory): CatalogEntry[] {
  return catalog.filter((e) => e.category === category);
}

export function categoryOf(id: string): CatalogCategory | null {
  return catalogById[id]?.category ?? null;
}
