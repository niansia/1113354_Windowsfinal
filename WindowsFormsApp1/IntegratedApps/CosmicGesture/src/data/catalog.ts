import type { BodyId } from "../types";
import { deriveGeneratedEntries } from "./derive";

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
  | "cluster"
  | "messier";

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

// Nebula morphology — drives which volumetric particle generator is used.
export type NebulaKind = "emission" | "planetary" | "snr" | "dark" | "reflection";

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
  nebulaKind?: NebulaKind; // optional override; otherwise inferred from subtype/tags
  ra?: number; // right ascension in degrees (0..360) — for the all-sky map
  dec?: number; // declination in degrees (-90..90)
  magnitude?: number; // apparent visual magnitude (lower = brighter)
  source?: "curated" | "opengnc" | "exoplanet"; // provenance for generated entries
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
  { id: "cluster", name: "星團", englishName: "Clusters", glyph: "✸" },
  { id: "messier", name: "梅西耶", englishName: "Messier", glyph: "M" }
];

const NASA_PLANETS: SourceLink = { label: "NASA Planetary Fact Sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/" };
const NASA_SCIENCE: SourceLink = { label: "NASA Science", url: "https://science.nasa.gov/" };

// Hand-curated, richly-described "featured" objects. The full catalog below is
// this set merged with the auto-fetched OpenNGC / NASA universe data.
const CURATED: CatalogEntry[] = [
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
  deep("pleiades", "昴宿星團 (M45)", "Pleiades", "cluster", "疏散星團", "cluster", "約 444 光年", "約 17 光年跨度", "約 800 太陽質量", "藍白色高溫恆星", "—", "—", "金牛座", "昴宿星團(七姊妹)是夜空中最亮的疏散星團，由年輕的藍白色恆星與周圍的反射星雲組成。", ["肉眼通常可見 6–7 顆亮星", "成員恆星僅約一億歲，相當年輕"], ["許多文化都以它作為季節與神話的象徵"], ["星團", "疏散星團", "金牛座"], [{ label: "NASA / Pleiades", url: "https://science.nasa.gov/" }], ["#cfe4ff", "#9ec2ff", "#ffffff"], "#cfe4ff", 9333),

  // ===================== Extended catalog =====================
  // -- Dwarf planets --
  q({ id: "haumea", name: "妊神星", englishName: "Haumea", category: "dwarf", subtype: "矮行星 (古柏帶)", render: "rocky", distance: "43.1 AU", radius: "約 816 km(長軸)", system: "古柏帶", description: "妊神星是一顆高速自轉、外形呈橢球狀的矮行星，擁有環與兩顆衛星。", facts: ["自轉僅約 4 小時，是太陽系自轉最快的大天體之一"], funFacts: ["快速自轉把它拉成橄欖球形狀"], tags: ["矮行星", "古柏帶"], palette: ["#e7e2d6", "#b9b0a0", "#807463"], accent: "#e7e2d6" }),
  q({ id: "makemake", name: "鳥神星", englishName: "Makemake", category: "dwarf", subtype: "矮行星 (古柏帶)", render: "rocky", distance: "45.8 AU", radius: "約 715 km", system: "古柏帶", description: "鳥神星是古柏帶中第二亮的矮行星，表面覆蓋甲烷與乙烷冰。", facts: ["以復活節島的造物神命名"], funFacts: ["表面可能是紅褐色的甲烷霜"], tags: ["矮行星", "古柏帶"], palette: ["#e3c9a8", "#b58f63", "#6e4f33"], accent: "#e3c9a8" }),

  // -- Moons --
  q({ id: "io", name: "木衛一", englishName: "Io", category: "moon", subtype: "火山衛星", render: "rocky", distance: "421,700 km(距木星)", radius: "1,821.6 km", system: "木星系統", description: "埃歐是太陽系火山活動最劇烈的天體，表面遍布硫磺火山。", facts: ["有數百座活火山，噴發高達數百公里"], funFacts: ["木星潮汐把它的內部不斷揉捏加熱"], tags: ["衛星", "木星", "火山"], palette: ["#ffe08a", "#e0a23a", "#8a4a1a"], accent: "#ffe08a" }),
  q({ id: "ganymede", name: "木衛三", englishName: "Ganymede", category: "moon", subtype: "最大衛星", render: "rocky", distance: "1,070,400 km(距木星)", radius: "2,634.1 km", system: "木星系統", description: "蓋尼米德是太陽系最大的衛星，比水星還大，並擁有自己的磁場。", facts: ["唯一擁有磁場的衛星", "冰殼下可能有鹹水海洋"], funFacts: ["比行星水星還要大"], tags: ["衛星", "木星", "最大"], palette: ["#cdbfa8", "#9a8e7a", "#5e5544"], accent: "#cdbfa8" }),
  q({ id: "callisto", name: "木衛四", englishName: "Callisto", category: "moon", subtype: "撞擊衛星", render: "rocky", distance: "1,882,700 km(距木星)", radius: "2,410.3 km", system: "木星系統", description: "卡利斯多是太陽系撞擊坑最密集的天體之一，表面非常古老。", facts: ["幾乎沒有地質活動，保留古老地貌"], funFacts: ["是探索木星系統的理想基地候選"], tags: ["衛星", "木星"], palette: ["#b9b2a4", "#857d6e", "#4d4639"], accent: "#b9b2a4" }),
  q({ id: "enceladus", name: "土衛二", englishName: "Enceladus", category: "moon", subtype: "冰噴泉衛星", render: "rocky", distance: "238,000 km(距土星)", radius: "252.1 km", system: "土星系統", description: "恩克拉多斯從南極裂縫噴出水冰羽流，地下海洋是尋找生命的熱點。", facts: ["南極虎紋裂縫噴發水冰", "羽流為土星 E 環補給物質"], funFacts: ["卡西尼號曾直接飛穿它的噴泉"], tags: ["衛星", "土星", "海洋世界"], palette: ["#eaf6ff", "#bcd6e8", "#7f9bb3"], accent: "#eaf6ff" }),
  q({ id: "triton", name: "海衛一", englishName: "Triton", category: "moon", subtype: "逆行衛星", render: "rocky", distance: "354,800 km(距海王星)", radius: "1,353.4 km", system: "海王星系統", description: "崔頓以逆行軌道繞海王星，表面有氮冰火山與噴泉，可能是被捕獲的古柏帶天體。", facts: ["逆行軌道暗示它是被捕獲的", "有活躍的氮間歇泉"], funFacts: ["未來可能因軌道衰減被海王星撕裂"], tags: ["衛星", "海王星", "逆行"], palette: ["#ffd9c0", "#d0a890", "#8a6450"], accent: "#ffd9c0" }),

  // -- Stars --
  q({ id: "vega", name: "織女星", englishName: "Vega", category: "star", subtype: "A 型主序星", render: "star", distance: "25 光年", temperature: "約 9,600°C", system: "天琴座", description: "織女星是夏季大三角的成員，曾是天文校準星等的標準，周圍有碎屑盤。", facts: ["視星等接近 0，是校準基準"], funFacts: ["約 12,000 年後將成為北極星"], tags: ["恆星", "天琴座"], palette: ["#dff0ff", "#a9d4ff", "#6fa8ff"], accent: "#cfe6ff", spectralType: "A0V" }),
  q({ id: "rigel", name: "參宿七", englishName: "Rigel", category: "star", subtype: "藍超巨星", render: "star", distance: "約 860 光年", temperature: "約 12,100°C", system: "獵戶座", description: "參宿七是獵戶座最亮的藍白色超巨星，光度是太陽的數萬倍。", facts: ["光度約太陽的 12 萬倍"], funFacts: ["是獵戶的左腳"], tags: ["恆星", "獵戶座", "超巨星"], palette: ["#dbe8ff", "#9fc0ff", "#6f93ff"], accent: "#cfe0ff", spectralType: "B8 Ia" }),
  q({ id: "polaris", name: "北極星", englishName: "Polaris", category: "star", subtype: "造父變星", render: "star", distance: "約 433 光年", temperature: "約 6,000°C", system: "小熊座", description: "北極星位於天球北極附近，是航海與定向的重要指標，本身是一組三合星。", facts: ["幾乎不隨地球自轉移動"], funFacts: ["數千年前的北極星其實是別顆星"], tags: ["恆星", "小熊座", "導航"], palette: ["#fff4d8", "#ffe3a8", "#e6c074"], accent: "#ffe3a8", spectralType: "F7 Ib" }),
  q({ id: "alpha-centauri", name: "南門二", englishName: "Alpha Centauri", category: "star", subtype: "三合星系統", render: "star", distance: "4.37 光年", temperature: "約 5,800°C", system: "半人馬座", description: "南門二是離太陽最近的恆星系統，由 A、B 兩顆類太陽星與比鄰星組成。", facts: ["最近的恆星系統，含三顆星"], funFacts: ["是星際探測計畫的首選目標"], tags: ["恆星", "半人馬座", "最近"], palette: ["#fff1d0", "#ffd9a0", "#e0a86a"], accent: "#ffe3b0", spectralType: "G2V + K1V" }),
  q({ id: "barnard", name: "巴納德星", englishName: "Barnard's Star", category: "star", subtype: "紅矮星", render: "star", distance: "5.96 光年", temperature: "約 2,900°C", system: "蛇夫座", description: "巴納德星是夜空中自行運動最快的恆星，是距離我們第二近的恆星系統。", facts: ["自行運動全天最快"], funFacts: ["約一萬年後會比比鄰星更近"], tags: ["恆星", "紅矮星"], palette: ["#ff9a6a", "#e0663a", "#9c3a20"], accent: "#ffb38a", spectralType: "M4V" }),
  q({ id: "arcturus", name: "大角星", englishName: "Arcturus", category: "star", subtype: "紅巨星", render: "star", distance: "36.7 光年", temperature: "約 4,300°C", system: "牧夫座", description: "大角星是北半球夜空最亮的恆星之一，一顆年老的橘紅色巨星。", facts: ["北天最亮的恆星之一"], funFacts: ["1933 年世博會曾用它的光開幕"], tags: ["恆星", "牧夫座", "紅巨星"], palette: ["#ffd9a0", "#ff9a5a", "#c0552a"], accent: "#ffc88a", spectralType: "K0 III" }),
  q({ id: "antares", name: "心宿二", englishName: "Antares", category: "star", subtype: "紅超巨星", render: "star", distance: "約 550 光年", temperature: "約 3,400°C", system: "天蠍座", description: "心宿二是天蠍座的心臟，一顆巨大的紅超巨星，名字意為「火星的對手」。", facts: ["直徑約太陽的 700 倍"], funFacts: ["顏色與亮度常被誤認為火星"], tags: ["恆星", "天蠍座", "超巨星"], palette: ["#ff8a6a", "#e0563a", "#9c2e1c"], accent: "#ff9a7a", spectralType: "M1.5 Iab" }),
  q({ id: "aldebaran", name: "畢宿五", englishName: "Aldebaran", category: "star", subtype: "紅巨星", render: "star", distance: "65 光年", temperature: "約 3,900°C", system: "金牛座", description: "畢宿五是金牛座的橘紅色巨星，宛如金牛的眼睛，是冬季亮星之一。", facts: ["看似在畢宿星團中，其實在更近處"], funFacts: ["先鋒 10 號正朝它的方向飛去"], tags: ["恆星", "金牛座"], palette: ["#ffcaa0", "#ff8a5a", "#b85a2a"], accent: "#ffb890", spectralType: "K5 III" }),

  // -- Constellations --
  q({ id: "ursa-minor", name: "小熊座", englishName: "Ursa Minor", category: "constellation", subtype: "拱極星座", render: "constellation", system: "小熊座", description: "小熊座尾端是北極星，整個星座宛如小北斗，是定位北方的關鍵。", facts: ["尾端為北極星"], funFacts: ["俗稱小北斗"], tags: ["星座", "拱極", "導航"], palette: ["#cfe0ff", "#9ab8ff", "#ffffff"], accent: "#cfe0ff" }),
  q({ id: "lyra", name: "天琴座", englishName: "Lyra", category: "constellation", subtype: "夏季星座", render: "constellation", system: "天琴座", description: "天琴座以亮星織女星與環狀星雲 M57 聞名，是夏季大三角的一角。", facts: ["主星為織女星"], funFacts: ["內含著名的環狀星雲"], tags: ["星座", "夏季"], palette: ["#cfe6ff", "#9fc0ff", "#ffffff"], accent: "#cfe6ff" }),
  q({ id: "cygnus", name: "天鵝座", englishName: "Cygnus", category: "constellation", subtype: "夏季星座", render: "constellation", system: "天鵝座", description: "天鵝座又稱北十字，沿著銀河延展，含天津四與黑洞 Cygnus X-1。", facts: ["主星天津四是夏季大三角之一"], funFacts: ["又名北十字"], tags: ["星座", "銀河"], palette: ["#cfe0ff", "#9ab8ff", "#ffffff"], accent: "#cfe0ff" }),
  q({ id: "cassiopeia", name: "仙后座", englishName: "Cassiopeia", category: "constellation", subtype: "拱極星座", render: "constellation", system: "仙后座", description: "仙后座的五顆亮星排成 W 形，是北天容易辨認的拱極星座。", facts: ["W 或 M 形排列"], funFacts: ["可用來反向尋找北極星"], tags: ["星座", "拱極"], palette: ["#ffe0e0", "#ffb0c0", "#ffffff"], accent: "#ffd0d8" }),
  q({ id: "andromeda-con", name: "仙女座", englishName: "Andromeda", category: "constellation", subtype: "秋季星座", render: "constellation", system: "仙女座", description: "仙女座是秋季星座，內含肉眼可見的仙女座星系 M31。", facts: ["含最近的大型螺旋星系"], funFacts: ["神話中被鎖在岩石上的公主"], tags: ["星座", "秋季"], palette: ["#cdd6ff", "#9aa8ff", "#ffffff"], accent: "#cdd6ff" }),
  q({ id: "pegasus", name: "飛馬座", englishName: "Pegasus", category: "constellation", subtype: "秋季星座", render: "constellation", system: "飛馬座", description: "飛馬座的四顆亮星構成著名的秋季四邊形(飛馬大四方)。", facts: ["秋季四邊形地標"], funFacts: ["神話中的天馬"], tags: ["星座", "秋季"], palette: ["#cfe0ff", "#9ab8ff", "#ffffff"], accent: "#cfe0ff" }),
  q({ id: "draco", name: "天龍座", englishName: "Draco", category: "constellation", subtype: "拱極星座", render: "constellation", system: "天龍座", description: "天龍座蜿蜒於大小熊座之間，曾經的北極星右樞就在其中。", facts: ["曾擁有古代的北極星"], funFacts: ["環繞北天極的巨龍"], tags: ["星座", "拱極"], palette: ["#cfe6df", "#9fcfc0", "#ffffff"], accent: "#bfe6d8" }),
  q({ id: "leo", name: "獅子座", englishName: "Leo", category: "constellation", subtype: "黃道星座", render: "constellation", system: "獅子座", description: "獅子座是春季黃道星座，主星軒轅十四明亮，獅子頭呈反問號狀。", facts: ["主星為軒轅十四"], funFacts: ["獅子座流星雨的輻射點"], tags: ["星座", "黃道", "春季"], palette: ["#ffe7b6", "#ffc878", "#ffffff"], accent: "#ffd98a" }),
  q({ id: "gemini", name: "雙子座", englishName: "Gemini", category: "constellation", subtype: "黃道星座", render: "constellation", system: "雙子座", description: "雙子座有兩顆亮星北河二與北河三，象徵神話中的雙胞胎兄弟。", facts: ["雙星北河二、北河三"], funFacts: ["雙子座流星雨年度最佳之一"], tags: ["星座", "黃道", "冬季"], palette: ["#cfe0ff", "#9ab8ff", "#ffffff"], accent: "#cfe0ff" }),
  q({ id: "taurus", name: "金牛座", englishName: "Taurus", category: "constellation", subtype: "黃道星座", render: "constellation", system: "金牛座", description: "金牛座含畢宿星團與昴宿星團，紅巨星畢宿五是公牛的眼睛。", facts: ["含畢宿與昴宿兩星團"], funFacts: ["蟹狀星雲也在其牛角附近"], tags: ["星座", "黃道", "冬季"], palette: ["#ffd9a0", "#ff9a5a", "#ffffff"], accent: "#ffc88a" }),
  q({ id: "sagittarius", name: "射手座", englishName: "Sagittarius", category: "constellation", subtype: "黃道星座", render: "constellation", system: "射手座", description: "射手座朝向銀河系中心方向，星雲與星團密集，含茶壺星群。", facts: ["指向銀河系中心"], funFacts: ["著名的茶壺形星群"], tags: ["星座", "黃道", "銀河中心"], palette: ["#ffd0b0", "#ff9a7a", "#ffffff"], accent: "#ffc0a0" }),

  // -- Nebulae --
  q({ id: "eagle", name: "鷹狀星雲 (M16)", englishName: "Eagle Nebula", category: "nebula", subtype: "發射星雲", render: "nebula", distance: "約 7,000 光年", system: "巨蛇座", description: "M16 含著名的「創生之柱」，是哈伯望遠鏡最具代表性的影像之一。", facts: ["創生之柱在此誕生新星"], funFacts: ["哈伯的招牌影像來源"], tags: ["星雲", "Messier", "創生之柱"], palette: ["#7bdfff", "#ffb05a", "#ff7bd0"], accent: "#7bdfff" }),
  q({ id: "lagoon", name: "礁湖星雲 (M8)", englishName: "Lagoon Nebula", category: "nebula", subtype: "發射星雲", render: "nebula", distance: "約 4,100 光年", system: "射手座", description: "礁湖星雲是少數肉眼可見的恆星形成區，內有沙漏狀的高能結構。", facts: ["肉眼可見的巨大恆星育嬰房"], funFacts: ["中央有沙漏狀湍流"], tags: ["星雲", "Messier", "射手座"], palette: ["#ff7bd0", "#9b6bff", "#5ad6ff"], accent: "#ff8ac4" }),
  q({ id: "trifid", name: "三裂星雲 (M20)", englishName: "Trifid Nebula", category: "nebula", subtype: "混合星雲", render: "nebula", distance: "約 5,200 光年", system: "射手座", description: "三裂星雲因暗塵帶把發光氣體分成三瓣而得名，兼具發射與反射星雲。", facts: ["塵帶把它分成三瓣"], funFacts: ["紅藍雙色一次看見兩種星雲"], tags: ["星雲", "Messier", "射手座"], palette: ["#ff6ba6", "#7b6bff", "#3ad1ff"], accent: "#ff8ac4" }),
  q({ id: "horsehead", name: "馬頭星雲", englishName: "Horsehead Nebula", category: "nebula", subtype: "暗星雲", render: "nebula", distance: "約 1,500 光年", system: "獵戶座", description: "馬頭星雲是一團暗塵雲，在背景紅色發射星雲映襯下宛如馬頭剪影。", facts: ["暗塵雲遮擋背景光"], funFacts: ["最具代表性的暗星雲輪廓"], tags: ["星雲", "獵戶座", "暗星雲"], palette: ["#ff5a7b", "#6a3a8a", "#2a2050"], accent: "#ff7b9a" }),
  q({ id: "ring", name: "環狀星雲 (M57)", englishName: "Ring Nebula", category: "nebula", subtype: "行星狀星雲", render: "nebula", distance: "約 2,300 光年", system: "天琴座", description: "環狀星雲是類太陽恆星death後拋出的氣殼，宛如天空中的煙圈。", facts: ["中央白矮星照亮氣環"], funFacts: ["太陽未來也會變成這樣"], tags: ["星雲", "Messier", "行星狀星雲"], palette: ["#7bdfff", "#9bff9b", "#ff9a5a"], accent: "#7bdfff" }),
  q({ id: "helix", name: "螺旋星雲", englishName: "Helix Nebula", category: "nebula", subtype: "行星狀星雲", render: "nebula", distance: "約 650 光年", system: "寶瓶座", description: "螺旋星雲是離地球最近的行星狀星雲之一，常被稱為「上帝之眼」。", facts: ["最近的行星狀星雲之一"], funFacts: ["俗稱上帝之眼"], tags: ["星雲", "行星狀星雲"], palette: ["#5ad6ff", "#ff7b9a", "#9bff9b"], accent: "#7bdfff" }),
  q({ id: "carina", name: "船底座星雲", englishName: "Carina Nebula", category: "nebula", subtype: "發射星雲", render: "nebula", distance: "約 7,500 光年", system: "船底座", description: "船底座星雲是巨大的恆星形成區，含不穩定的超巨星海山二。", facts: ["含可能將爆發的海山二"], funFacts: ["詹姆斯韋伯的首批影像之一"], tags: ["星雲", "船底座"], palette: ["#ff9a6a", "#ff6ba6", "#7b8bff"], accent: "#ff9a7a" }),
  q({ id: "veil", name: "面紗星雲", englishName: "Veil Nebula", category: "nebula", subtype: "超新星殘骸", render: "nebula", distance: "約 2,400 光年", system: "天鵝座", description: "面紗星雲是數千年前超新星爆發留下的纖細絲狀殘骸。", facts: ["古老超新星的絲狀殘骸"], funFacts: ["絲帶橫跨約六個滿月寬"], tags: ["星雲", "超新星殘骸"], palette: ["#7bdfff", "#9bffd0", "#ff7b9a"], accent: "#7bdfff" }),

  // -- Galaxies --
  q({ id: "triangulum", name: "三角座星系 (M33)", englishName: "Triangulum Galaxy", category: "galaxy", subtype: "螺旋星系", render: "galaxySpiral", distance: "約 270 萬光年", system: "本星系群", description: "M33 是本星系群第三大星系，結構鬆散、恆星形成活躍。", facts: ["本星系群第三大成員"], funFacts: ["極黑天空下肉眼可見"], tags: ["星系", "Messier", "本星系群"], palette: ["#bcd0ff", "#8a9cff", "#ffd0a0"], accent: "#bcd0ff" }),
  q({ id: "sombrero", name: "草帽星系 (M104)", englishName: "Sombrero Galaxy", category: "galaxy", subtype: "透鏡狀星系", render: "galaxyElliptical", distance: "約 2,950 萬光年", system: "室女座", description: "草帽星系有明亮的核球與一圈厚實的暗塵帶，外形像墨西哥草帽。", facts: ["醒目的暗塵環"], funFacts: ["中心藏有超大質量黑洞"], tags: ["星系", "Messier", "室女座"], palette: ["#ffe0c0", "#c0a070", "#5a4a3a"], accent: "#ffe0c0" }),
  q({ id: "lmc", name: "大麥哲倫星系", englishName: "Large Magellanic Cloud", category: "galaxy", subtype: "不規則星系", render: "galaxySpiral", distance: "約 16 萬光年", system: "本星系群", description: "大麥哲倫雲是銀河系的衛星星系，含劇烈恆星形成的蜘蛛星雲。", facts: ["銀河系最大的衛星星系", "1987A 超新星在此爆發"], funFacts: ["南半球肉眼可見的雲狀天體"], tags: ["星系", "本星系群", "南天"], palette: ["#cfe0ff", "#9ab8ff", "#ffd0a0"], accent: "#cfe0ff" }),
  q({ id: "smc", name: "小麥哲倫星系", englishName: "Small Magellanic Cloud", category: "galaxy", subtype: "不規則星系", render: "galaxySpiral", distance: "約 20 萬光年", system: "本星系群", description: "小麥哲倫雲是銀河系另一個衛星星系，與大麥哲倫雲以麥哲倫流相連。", facts: ["協助校準宇宙距離尺"], funFacts: ["與大麥哲倫雲是天空中的一對"], tags: ["星系", "本星系群", "南天"], palette: ["#cfe0ff", "#9ab8ff", "#ffffff"], accent: "#cfe0ff" }),
  q({ id: "ngc1300", name: "NGC 1300", englishName: "NGC 1300", category: "galaxy", subtype: "棒旋星系", render: "galaxySpiral", distance: "約 6,100 萬光年", system: "波江座", description: "NGC 1300 是棒旋星系的典範，明顯的中央棒延伸出對稱旋臂。", facts: ["教科書級的棒旋結構"], funFacts: ["棒長約 10 萬光年"], tags: ["星系", "棒旋"], palette: ["#bcd0ff", "#8a78ff", "#ffc0a0"], accent: "#bcd0ff" }),
  q({ id: "centaurus-a", name: "半人馬座 A", englishName: "Centaurus A", category: "galaxy", subtype: "活躍星系", render: "galaxyElliptical", distance: "約 1,300 萬光年", system: "半人馬座", description: "半人馬座 A 是最近的活躍星系之一，核心黑洞噴出強烈電波噴流。", facts: ["最近的電波星系之一"], funFacts: ["被一條塵帶橫腰穿過"], tags: ["星系", "活躍星系"], palette: ["#ffd0a0", "#a0788a", "#3a2a3a"], accent: "#ffd0a0" }),
  q({ id: "m82", name: "雪茄星系 (M82)", englishName: "Cigar Galaxy", category: "galaxy", subtype: "星暴星系", render: "galaxySpiral", distance: "約 1,200 萬光年", system: "大熊座", description: "M82 是劇烈的星暴星系，中心爆發出紅色的氫氣外流。", facts: ["恆星形成速率極高"], funFacts: ["中央噴出壯觀的紅色氣流"], tags: ["星系", "Messier", "星暴"], palette: ["#ff9a7a", "#ffd0a0", "#7b8bff"], accent: "#ff9a7a" }),
  q({ id: "m101", name: "風車星系 (M101)", englishName: "Pinwheel Galaxy", category: "galaxy", subtype: "螺旋星系", render: "galaxySpiral", distance: "約 2,100 萬光年", system: "大熊座", description: "M101 是一個面向我們的巨大螺旋星系，旋臂上點綴著眾多恆星形成區。", facts: ["直徑約銀河系兩倍"], funFacts: ["旋臂略不對稱，可能受伴星系擾動"], tags: ["星系", "Messier", "大熊座"], palette: ["#cfe0ff", "#9ab8ff", "#ffd0a0"], accent: "#cfe0ff" }),
  q({ id: "m81", name: "波德星系 (M81)", englishName: "Bode's Galaxy", category: "galaxy", subtype: "螺旋星系", render: "galaxySpiral", distance: "約 1,200 萬光年", system: "大熊座", description: "M81 是一個結構優美的大設計螺旋星系，與 M82 構成互動星系對。", facts: ["與 M82 引力互動"], funFacts: ["業餘望遠鏡的熱門目標"], tags: ["星系", "Messier", "大熊座"], palette: ["#bcd0ff", "#8a9cff", "#ffd0a0"], accent: "#bcd0ff" }),
  q({ id: "m63", name: "向日葵星系 (M63)", englishName: "Sunflower Galaxy", category: "galaxy", subtype: "絮狀螺旋星系", render: "galaxySpiral", distance: "約 2,700 萬光年", system: "獵犬座", description: "M63 的旋臂呈現許多短而蓬鬆的片段，宛如向日葵花瓣。", facts: ["絮狀旋臂結構"], funFacts: ["花瓣狀的旋臂得名向日葵"], tags: ["星系", "Messier", "獵犬座"], palette: ["#ffe0b0", "#cfa86a", "#7b8bff"], accent: "#ffe0b0" }),
  q({ id: "m106", name: "M106 星系", englishName: "Messier 106", category: "galaxy", subtype: "活躍螺旋星系", render: "galaxySpiral", distance: "約 2,400 萬光年", system: "獵犬座", description: "M106 擁有活躍星系核，並有由黑洞噴流激發的異常旋臂。", facts: ["核心藏有活躍黑洞"], funFacts: ["有兩條由氣體構成的異常臂"], tags: ["星系", "Messier", "獵犬座"], palette: ["#bcd0ff", "#8a78ff", "#ffc0a0"], accent: "#bcd0ff" }),
  q({ id: "m110", name: "M110 星系", englishName: "Messier 110", category: "galaxy", subtype: "矮橢圓星系", render: "galaxyElliptical", distance: "約 270 萬光年", system: "本星系群", description: "M110 是仙女座星系的衛星星系，一個平滑的矮橢圓星系。", facts: ["仙女座星系的伴星系"], funFacts: ["梅西耶星表的最後一個天體"], tags: ["星系", "Messier", "本星系群"], palette: ["#d0d8ff", "#9aa8d0", "#ffffff"], accent: "#d0d8ff" }),

  // -- Black holes / high-energy --
  q({ id: "cygnus-x1", name: "天鵝座 X-1", englishName: "Cygnus X-1", category: "blackhole", subtype: "恆星級黑洞", render: "blackhole", distance: "約 7,200 光年", mass: "約 21 太陽質量", system: "天鵝座", description: "天鵝座 X-1 是人類確認的第一個黑洞候選，從伴星吸積物質發出強烈 X 射線。", facts: ["第一個被廣泛接受的黑洞", "霍金曾為它打過賭"], funFacts: ["從藍超巨星伴星吞食氣體"], tags: ["黑洞", "X射線", "天鵝座"], palette: ["#ffd27a", "#ff7a3a", "#7a2aff"], accent: "#ffd27a" }),
  q({ id: "v404-cygni", name: "V404 Cygni", englishName: "V404 Cygni", category: "blackhole", subtype: "微類星體", render: "blackhole", distance: "約 7,800 光年", mass: "約 9 太陽質量", system: "天鵝座", description: "V404 Cygni 是一個會週期性爆發的黑洞 X 射線雙星，2015 年曾劇烈活動。", facts: ["會突然爆發 X 射線"], funFacts: ["2015 年的爆發被全球望遠鏡追蹤"], tags: ["黑洞", "X射線雙星"], palette: ["#ffca8a", "#ff7a4a", "#a23aff"], accent: "#ffca8a" }),
  q({ id: "ton618", name: "TON 618", englishName: "TON 618", category: "blackhole", subtype: "極超大質量黑洞", render: "blackhole", distance: "約 104 億光年", mass: "約 660 億太陽質量", system: "獵犬座", description: "TON 618 是已知質量最大的黑洞之一，位於一個遙遠的明亮類星體中心。", facts: ["質量約 660 億倍太陽，名列最大黑洞之一"], funFacts: ["事件視界比整個太陽系還大數十倍"], tags: ["黑洞", "類星體", "極大質量"], palette: ["#ffd27a", "#ff7a3a", "#a23aff"], accent: "#ffd27a" }),
  q({ id: "gw150914", name: "GW150914 重力波事件", englishName: "GW150914", category: "blackhole", subtype: "黑洞合併事件", render: "blackhole", distance: "約 13 億光年", system: "南天", description: "GW150914 是 2015 年 LIGO 首次直接偵測到的重力波，來自兩個黑洞的合併。", facts: ["人類首次直接偵測重力波", "由 36 與 29 太陽質量黑洞合併"], funFacts: ["合併瞬間釋放 3 個太陽質量的能量"], tags: ["黑洞", "重力波", "LIGO"], palette: ["#a0c0ff", "#7a8aff", "#ff7adf"], accent: "#a0c0ff" }),
  q({ id: "crab-pulsar", name: "蟹狀星雲脈衝星", englishName: "Crab Pulsar", category: "blackhole", subtype: "中子星 / 脈衝星", render: "star", distance: "約 6,500 光年", mass: "約 1.4 太陽質量", system: "金牛座", description: "蟹狀脈衝星是 1054 年超新星留下的中子星，每秒自轉約 30 次並掃出射束。", facts: ["每秒自轉約 30 圈"], funFacts: ["像宇宙燈塔般規律閃爍"], tags: ["中子星", "脈衝星", "金牛座"], palette: ["#bfe0ff", "#7bb0ff", "#ffffff"], accent: "#bfe0ff" }),

  // -- Star clusters --
  q({ id: "m13", name: "武仙座大星團 (M13)", englishName: "Hercules Cluster", category: "cluster", subtype: "球狀星團", render: "cluster", distance: "約 22,200 光年", system: "武仙座", description: "M13 是北半球最壯觀的球狀星團，含數十萬顆古老恆星。", facts: ["約含 30 萬顆恆星"], funFacts: ["1974 年曾向它發送阿雷西博訊息"], tags: ["星團", "Messier", "球狀星團"], palette: ["#ffe7c0", "#cfb088", "#ffffff"], accent: "#ffe7c0" }),
  q({ id: "hyades", name: "畢宿星團", englishName: "Hyades", category: "cluster", subtype: "疏散星團", render: "cluster", distance: "約 153 光年", system: "金牛座", description: "畢宿星團是離地球最近的疏散星團，構成金牛臉部的 V 形。", facts: ["最近的疏散星團"], funFacts: ["V 形畢宿與畢宿五同框"], tags: ["星團", "疏散星團", "金牛座"], palette: ["#cfe4ff", "#9ec2ff", "#ffffff"], accent: "#cfe4ff" }),
  q({ id: "omega-centauri", name: "半人馬座 ω", englishName: "Omega Centauri", category: "cluster", subtype: "球狀星團", render: "cluster", distance: "約 17,000 光年", system: "半人馬座", description: "半人馬座 ω 是銀河系最大最亮的球狀星團，可能是矮星系的殘核。", facts: ["銀河系最大的球狀星團", "含約一千萬顆恆星"], funFacts: ["也許是被吞併的矮星系核心"], tags: ["星團", "球狀星團", "南天"], palette: ["#ffe7c0", "#cfb088", "#ffffff"], accent: "#ffe7c0" }),
  q({ id: "m4", name: "M4 球狀星團", englishName: "Messier 4", category: "cluster", subtype: "球狀星團", render: "cluster", distance: "約 7,200 光年", system: "天蠍座", description: "M4 是離地球最近的球狀星團之一，位於亮星心宿二旁，含古老白矮星。", facts: ["最近的球狀星團之一"], funFacts: ["藏有上百億歲的白矮星"], tags: ["星團", "Messier", "天蠍座"], palette: ["#ffe7c0", "#cfb088", "#ffffff"], accent: "#ffe7c0" })
];

// ===================== Curated + auto-fetched universe merge =====================
// Build de-dup keys from the curated set so the generated catalogue never
// duplicates a hand-authored object (matched by Messier number or common name).
const normKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const curatedMessier = new Set<string>();
const curatedNames = new Set<string>();
for (const e of CURATED) {
  const mm = /M\s?(\d+)/i.exec(e.name) || /M\s?(\d+)/i.exec(e.englishName);
  if (mm) curatedMessier.add(mm[1]);
  curatedNames.add(normKey(e.englishName));
  curatedNames.add(normKey(e.englishName.split(" · ")[0]));
  curatedNames.add(normKey(e.name));
}

// Auto-derived entries from OpenNGC + NASA Exoplanet Archive (particle-ized on demand).
export const generatedEntries: CatalogEntry[] = deriveGeneratedEntries({ messier: curatedMessier, names: curatedNames });

// The full catalog: featured curated objects first, then the wider universe.
export const catalog: CatalogEntry[] = [...CURATED, ...generatedEntries];

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

// Compact builder for the extended catalog — fills sensible defaults so each entry
// only needs the fields that matter. Function declaration is hoisted, so it can be
// referenced inside the catalog array above.
function q(p: Partial<CatalogEntry> & { id: string; name: string; englishName: string; category: CatalogCategory; render: RenderKind }): CatalogEntry {
  return {
    subtype: "",
    distance: "—",
    radius: "—",
    mass: "—",
    temperature: "—",
    rotationPeriod: "—",
    orbitalPeriod: "—",
    system: "—",
    description: "",
    facts: [],
    funFacts: [],
    tags: [],
    sources: [NASA_SCIENCE],
    palette: ["#88aaff", "#5a7aff", "#ffffff"],
    accent: "#88aaff",
    seed: hashSeed(p.id),
    ...p
  } as CatalogEntry;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 90000 + 1000;
}

const MESSIER_RE = /M\s?\d+/i;

export const catalogById: Record<string, CatalogEntry> = Object.fromEntries(catalog.map((e) => [e.id, e]));

export function entriesByCategory(category: CatalogCategory): CatalogEntry[] {
  if (category === "messier") {
    return catalog.filter((e) => MESSIER_RE.test(e.name) || MESSIER_RE.test(e.englishName) || e.tags.includes("Messier"));
  }
  return catalog.filter((e) => e.category === category);
}

export function categoryOf(id: string): CatalogCategory | null {
  return catalogById[id]?.category ?? null;
}

// Free-text search across name / english / tags / category / system / Messier id.
export function searchCatalog(query: string): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return catalog.filter((e) => {
    const hay = [e.name, e.englishName, e.category, e.subtype, e.system, ...e.tags].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
