// ============================================================================
//  Auto particle-ization layer
//
//  Turns the raw fetched catalogue records (OpenNGC + NASA Exoplanet Archive)
//  into fully-formed CatalogEntry objects WITHOUT any per-object hand authoring.
//  Each object's *class* (galaxy / planetary nebula / globular cluster / …) and
//  measured properties (Hubble type, magnitude, redshift, stellar temperature)
//  are mapped to a render kind + colour palette + seed, so the existing
//  procedural particle engine can visualise the entire sky on demand.
// ============================================================================

import type { CatalogCategory, CatalogEntry, NebulaKind, RenderKind, SourceLink } from "./catalog";
import generated from "./generated/deepSky.generated.json";

interface NgcRecord {
  desig: string;
  common: string | null;
  m: string | null;
  type: string;
  ra: number;
  dec: number;
  mag: number | null;
  maj: number | null;
  hubble: string | null;
  const: string | null;
  z: number | null;
}

interface ExoRecord {
  host: string;
  ra: number;
  dec: number;
  distPc: number | null;
  spectype: string | null;
  teff: number | null;
  planets: number | null;
}

const dataset = generated as { deepSky: NgcRecord[]; exoplanets: ExoRecord[] };

const SRC_OPENNGC: SourceLink = { label: "OpenNGC 深空目錄", url: "https://github.com/mattiaverga/OpenNGC" };
const SRC_NASA: SourceLink = { label: "NASA Science", url: "https://science.nasa.gov/" };
const SRC_EXO: SourceLink = { label: "NASA Exoplanet Archive", url: "https://exoplanetarchive.ipac.caltech.edu/" };

// ---- class -> render mapping (the heart of the auto particle-ization) ------
interface ClassInfo {
  category: CatalogCategory;
  render: RenderKind;
  nebulaKind?: NebulaKind;
  zh: string; // Chinese sub-type name
}

function classify(type: string, hubble: string | null): ClassInfo {
  switch (type) {
    case "G":
    case "GPair":
    case "GTrpl":
    case "GGroup": {
      const h = (hubble || "").toUpperCase();
      const elliptical = h.startsWith("E") || h.startsWith("S0") || h.startsWith("SB0") || h.startsWith("L");
      return {
        category: "galaxy",
        render: elliptical ? "galaxyElliptical" : "galaxySpiral",
        zh: elliptical ? "橢圓 / 透鏡狀星系" : "螺旋星系"
      };
    }
    case "OCl":
      return { category: "cluster", render: "cluster", zh: "疏散星團" };
    case "GCl":
      return { category: "cluster", render: "cluster", zh: "球狀星團" };
    case "*Ass":
      return { category: "cluster", render: "cluster", zh: "星協" };
    case "PN":
      return { category: "nebula", render: "nebula", nebulaKind: "planetary", zh: "行星狀星雲" };
    case "SNR":
      return { category: "nebula", render: "nebula", nebulaKind: "snr", zh: "超新星殘骸" };
    case "RfN":
      return { category: "nebula", render: "nebula", nebulaKind: "reflection", zh: "反射星雲" };
    case "DrkN":
      return { category: "nebula", render: "nebula", nebulaKind: "dark", zh: "暗星雲" };
    case "HII":
      return { category: "nebula", render: "nebula", nebulaKind: "emission", zh: "電離氫區 (恆星育嬰房)" };
    case "Cl+N":
      return { category: "nebula", render: "nebula", nebulaKind: "emission", zh: "星團 + 星雲" };
    case "EmN":
      return { category: "nebula", render: "nebula", nebulaKind: "emission", zh: "發射星雲" };
    case "Neb":
    default:
      return { category: "nebula", render: "nebula", nebulaKind: "emission", zh: "星雲" };
  }
}

// ---- palettes: a few measured-looking variants per class, chosen by hash ----
const PALETTES: Record<string, { palette: string[]; accent: string }[]> = {
  emission: [
    { palette: ["#ff6a8e", "#7b6bff", "#3ad1ff"], accent: "#ff8ac4" },
    { palette: ["#ff8a4a", "#ff5a7b", "#7b8bff"], accent: "#ff9a7a" },
    { palette: ["#ff5a6a", "#ffae5a", "#5ad6ff"], accent: "#ff7b6a" }
  ],
  planetary: [
    { palette: ["#7bdfff", "#9bff9b", "#ff9a5a"], accent: "#7bdfff" },
    { palette: ["#5ad6ff", "#b07bff", "#ff7b9a"], accent: "#8ad0ff" },
    { palette: ["#6affd0", "#7bdfff", "#ffd06a"], accent: "#6affd0" }
  ],
  snr: [
    { palette: ["#7bdfff", "#9bffd0", "#ff7b9a"], accent: "#7bdfff" },
    { palette: ["#5ad6ff", "#ff6a8e", "#ffffff"], accent: "#9ad0ff" }
  ],
  reflection: [
    { palette: ["#9ec2ff", "#cfe0ff", "#7b8bff"], accent: "#bcd4ff" },
    { palette: ["#7bb0ff", "#bcd4ff", "#9a8aff"], accent: "#9ec2ff" }
  ],
  dark: [
    { palette: ["#ff5a7b", "#6a3a8a", "#2a2050"], accent: "#ff7b9a" },
    { palette: ["#e0563a", "#7a2a4a", "#1a1430"], accent: "#ff7b5a" }
  ],
  galaxySpiral: [
    { palette: ["#bcd0ff", "#8a9cff", "#ffd0a0"], accent: "#bcd0ff" },
    { palette: ["#cdd6ff", "#8a78ff", "#ff9ad0"], accent: "#cdd6ff" },
    { palette: ["#bce0ff", "#9aa8ff", "#ffd6b0"], accent: "#bce0ff" }
  ],
  galaxyElliptical: [
    { palette: ["#ffe6c8", "#d8b48a", "#7a5a44"], accent: "#ffe6c8" },
    { palette: ["#ffe0c0", "#c0a070", "#5a4a3a"], accent: "#ffe0c0" }
  ],
  openCluster: [{ palette: ["#cfe4ff", "#9ec2ff", "#ffffff"], accent: "#cfe4ff" }],
  globular: [{ palette: ["#ffe7c0", "#cfb088", "#fff4e0"], accent: "#ffe7c0" }]
};

function paletteFor(info: ClassInfo, type: string, seed: number): { palette: string[]; accent: string } {
  let bucket = "emission";
  if (info.render === "galaxySpiral") bucket = "galaxySpiral";
  else if (info.render === "galaxyElliptical") bucket = "galaxyElliptical";
  else if (info.render === "cluster") bucket = type === "GCl" ? "globular" : "openCluster";
  else if (info.nebulaKind) bucket = info.nebulaKind;
  const variants = PALETTES[bucket] ?? PALETTES.emission;
  return variants[seed % variants.length];
}

// ---- IAU constellation abbreviation -> Chinese (all 88) --------------------
const CONSTELLATIONS: Record<string, string> = {
  And: "仙女座", Ant: "唧筒座", Aps: "天燕座", Aql: "天鷹座", Aqr: "寶瓶座", Ara: "天壇座", Ari: "白羊座", Aur: "御夫座",
  Boo: "牧夫座", Cae: "雕具座", Cam: "鹿豹座", Cnc: "巨蟹座", CVn: "獵犬座", CMa: "大犬座", CMi: "小犬座", Cap: "摩羯座",
  Car: "船底座", Cas: "仙后座", Cen: "半人馬座", Cep: "仙王座", Cet: "鯨魚座", Cha: "蝘蜓座", Cir: "圓規座", Col: "天鴿座",
  Com: "后髮座", CrA: "南冕座", CrB: "北冕座", Crv: "烏鴉座", Crt: "巨爵座", Cru: "南十字座", Cyg: "天鵝座", Del: "海豚座",
  Dor: "劍魚座", Dra: "天龍座", Equ: "小馬座", Eri: "波江座", For: "天爐座", Gem: "雙子座", Gru: "天鶴座", Her: "武仙座",
  Hor: "時鐘座", Hya: "長蛇座", Hyi: "水蛇座", Ind: "印第安座", Lac: "蝎虎座", Leo: "獅子座", LMi: "小獅座", Lep: "天兔座",
  Lib: "天秤座", Lup: "豺狼座", Lyn: "天貓座", Lyr: "天琴座", Men: "山案座", Mic: "顯微鏡座", Mon: "麒麟座", Mus: "蒼蠅座",
  Nor: "矩尺座", Oct: "南極座", Oph: "蛇夫座", Ori: "獵戶座", Pav: "孔雀座", Peg: "飛馬座", Per: "英仙座", Phe: "鳳凰座",
  Pic: "繪架座", Psc: "雙魚座", PsA: "南魚座", Pup: "船尾座", Pyx: "羅盤座", Ret: "網罟座", Sge: "天箭座", Sgr: "人馬座",
  Sco: "天蠍座", Scl: "玉夫座", Sct: "盾牌座", Ser: "巨蛇座", Sex: "六分儀座", Tau: "金牛座", Tel: "望遠鏡座", Tri: "三角座",
  TrA: "南三角座", Tuc: "杜鵑座", UMa: "大熊座", UMi: "小熊座", Vel: "船帆座", Vir: "室女座", Vol: "飛魚座", Vul: "狐狸座"
};

function constellationZh(abbr: string | null): string {
  if (!abbr) return "未知星座";
  return CONSTELLATIONS[abbr] ?? abbr;
}

// ---- distance from redshift (Hubble law, H0 = 70 km/s/Mpc) -----------------
function galaxyDistance(z: number | null): string {
  if (z == null || z <= 0) return "—";
  const mpc = (z * 299792.458) / 70;
  const mly = mpc * 3.262; // million light-years
  if (mly >= 1000) return `約 ${(mly / 1000).toFixed(1)} 十億光年`;
  return `約 ${mly.toFixed(mly < 10 ? 1 : 0)} 百萬光年`;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 900000) + 1000;
}

export function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function messierOf(rec: NgcRecord): string | null {
  return rec.m && rec.m.trim() ? rec.m.trim() : null;
}

// ---- temperature / spectral type -> star colour ----------------------------
function colorFromTeff(teff: number | null, spectype: string | null): { palette: string[]; accent: string } {
  let t = teff ?? 0;
  if (!t && spectype) {
    const c = spectype.trim()[0]?.toUpperCase();
    t = { O: 35000, B: 18000, A: 9000, F: 6800, G: 5600, K: 4300, M: 3100 }[c ?? "G"] ?? 5600;
  }
  if (!t) t = 5600;
  if (t >= 20000) return { palette: ["#ccd9ff", "#9fb6ff", "#6f8bff"], accent: "#bcd0ff" };
  if (t >= 9000) return { palette: ["#e8f0ff", "#cfe0ff", "#a9d4ff"], accent: "#dfeaff" };
  if (t >= 7000) return { palette: ["#fff8f0", "#ffeede", "#ffe3c4"], accent: "#fff3e0" };
  if (t >= 5500) return { palette: ["#fff6d8", "#ffe6a8", "#ffcf70"], accent: "#ffe9b0" };
  if (t >= 4000) return { palette: ["#ffd9a0", "#ff9a5a", "#e0703a"], accent: "#ffc88a" };
  return { palette: ["#ff9a6a", "#e0663a", "#9c3a20"], accent: "#ffb38a" };
}

// ---------------------------------------------------------------------------
//  Build CatalogEntry objects, skipping anything already curated by hand.
// ---------------------------------------------------------------------------
export interface DedupKeys {
  messier: Set<string>;
  names: Set<string>;
}

export function deriveGeneratedEntries(skip: DedupKeys): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  const usedIds = new Set<string>();

  for (const rec of dataset.deepSky) {
    const m = messierOf(rec);
    const commonNorm = rec.common ? normName(rec.common) : null;
    if (m && skip.messier.has(m)) continue;
    if (commonNorm && skip.names.has(commonNorm)) continue;

    let id = `ngc-${rec.desig.toLowerCase()}`;
    if (usedIds.has(id)) id = `${id}-${out.length}`;
    usedIds.add(id);

    const info = classify(rec.type, rec.hubble);
    const seed = hashSeed(rec.desig);
    const pal = paletteFor(info, rec.type, seed);
    const constZh = constellationZh(rec.const);
    const display = rec.common || (m ? `M ${m}` : rec.desig);
    const dist = info.category === "galaxy" ? galaxyDistance(rec.z) : "—";
    const sizeStr = rec.maj ? `約 ${rec.maj}′ (角分)` : "—";
    const magStr = rec.mag != null ? `視星等 ${rec.mag}` : "—";

    const tags = [info.category === "galaxy" ? "星系" : info.category === "nebula" ? "星雲" : "星團", info.zh, constZh, "OpenNGC"];
    if (m) tags.push(`M${m}`, "Messier");

    out.push({
      id,
      name: display,
      englishName: rec.common ? `${rec.common} · ${rec.desig}` : rec.desig,
      category: info.category,
      subtype: info.zh,
      render: info.render,
      nebulaKind: info.nebulaKind,
      distance: dist,
      radius: sizeStr,
      mass: "—",
      temperature: "—",
      rotationPeriod: "—",
      orbitalPeriod: "—",
      system: m ? `${constZh} · 梅西耶 M${m}` : constZh,
      description: `${display} 是位於${constZh}方向的${info.zh}${rec.mag != null ? `，${magStr}` : ""}${dist !== "—" ? `，距離${dist}` : ""}。資料由 OpenNGC 深空目錄自動匯入並以粒子即時重建。`,
      facts: [
        `天體類型：${info.zh} (${rec.type})`,
        rec.maj ? `視直徑：${sizeStr}` : `編號：${rec.desig}`,
        rec.hubble ? `哈伯形態：${rec.hubble}` : `所屬星座：${constZh}`
      ].filter(Boolean),
      funFacts: [
        m ? `本天體收錄於梅西耶星表第 ${m} 號。` : `本天體收錄於 NGC/IC 星表 (${rec.desig})。`,
        rec.mag != null && rec.mag < 6 ? "亮度足以在良好條件下以肉眼或雙筒觀測。" : "建議使用望遠鏡觀測。"
      ],
      tags,
      sources: [SRC_OPENNGC, SRC_NASA],
      palette: pal.palette,
      accent: pal.accent,
      seed,
      ra: rec.ra,
      dec: rec.dec,
      magnitude: rec.mag ?? undefined,
      source: "opengnc"
    });
  }

  // ---- Exoplanet host stars (nearby real star systems) --------------------
  for (const rec of dataset.exoplanets) {
    const nameNorm = normName(rec.host);
    if (skip.names.has(nameNorm)) continue;
    const id = `exo-${rec.host.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    const col = colorFromTeff(rec.teff, rec.spectype);
    const seed = hashSeed(rec.host);
    const distLy = rec.distPc != null ? `約 ${(rec.distPc * 3.262).toFixed(1)} 光年` : "—";
    out.push({
      id,
      name: rec.host,
      englishName: `${rec.host}${rec.spectype ? ` (${rec.spectype})` : ""}`,
      category: "star",
      subtype: "系外行星宿主恆星",
      render: "star",
      distance: distLy,
      radius: "—",
      mass: "—",
      temperature: rec.teff ? `約 ${rec.teff} K` : "—",
      rotationPeriod: "—",
      orbitalPeriod: "—",
      spectralType: rec.spectype ?? undefined,
      system: "系外行星系統",
      description: `${rec.host} 是一個擁有${rec.planets ?? "至少一"}顆已確認系外行星的恆星系統${distLy !== "—" ? `，距離地球${distLy}` : ""}。資料來自 NASA Exoplanet Archive。`,
      facts: [
        rec.planets ? `已知行星數：${rec.planets}` : "至少一顆已確認行星",
        rec.spectype ? `光譜型：${rec.spectype}` : "光譜型：—",
        rec.teff ? `有效溫度：約 ${rec.teff} K` : "有效溫度：—"
      ],
      funFacts: ["這是一個經過確認、真實存在的系外行星系統。", "NASA Exoplanet Archive 持續收錄全宇宙已發現的行星系統。"],
      tags: ["恆星", "系外行星", "NASA"],
      sources: [SRC_EXO, SRC_NASA],
      palette: col.palette,
      accent: col.accent,
      seed,
      ra: rec.ra,
      dec: rec.dec,
      source: "exoplanet"
    });
  }

  return out;
}

export function datasetCounts() {
  return { deepSky: dataset.deepSky.length, exoplanets: dataset.exoplanets.length };
}
