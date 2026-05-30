import { Color } from "three";

// Shared Earth geography model used by both the particle globe and the solid
// "Earth Explore" mode. Continents are unions of lat/lon ellipses placed at real
// coordinates so the seven continents are recognisable.
// [centerLat, centerLon, radiusLat(deg), radiusLon(deg)]
const CONTINENTS: [number, number, number, number][] = [
  [50, -100, 20, 28], [60, -95, 12, 34], [63, -150, 9, 16], [40, -80, 15, 13],
  [72, -42, 11, 15],
  [14, -89, 7, 12],
  [-6, -60, 15, 15], [-30, -65, 16, 9],
  [16, 12, 17, 24], [-12, 24, 18, 13], [7, 40, 9, 9],
  [52, 16, 12, 22], [63, 18, 8, 12],
  [52, 90, 22, 52], [66, 110, 11, 50], [30, 46, 12, 15], [24, 80, 13, 9], [14, 103, 11, 11],
  [-2, 118, 7, 20], [38, 138, 8, 5],
  [-25, 134, 12, 20], [-42, 172, 6, 4]
];

const DESERTS: [number, number, number, number][] = [
  [22, 14, 12, 26], [23, 47, 11, 14], [40, 95, 10, 20], [-25, 130, 10, 18], [-25, 20, 9, 10], [34, -110, 7, 10]
];

function inEllipses(lat: number, lon: number, regions: [number, number, number, number][], grow: number): boolean {
  for (const [clat, clon, rlat, rlon] of regions) {
    let dlon = Math.abs(lon - clon);
    if (dlon > 180) dlon = 360 - dlon;
    const a = (lat - clat) / (rlat * grow);
    const b = dlon / (rlon * grow);
    if (a * a + b * b <= 1) return true;
  }
  return false;
}

export function earthLand(lat: number, lon: number, grow = 1): boolean {
  if (lat < -62) return true; // Antarctica
  return inEllipses(lat, lon, CONTINENTS, grow);
}

// Solid-globe (lit) colouring — brighter than the additive particle palette.
export function earthClimateColor(lat: number, lon: number, seed = 0.5): Color {
  if (lat > 72 || lat < -62) {
    return new Color("#f0f6ff").multiplyScalar(0.92 + seed * 0.08);
  }
  if (!earthLand(lat, lon)) {
    const wave = 0.4 + 0.45 * Math.abs(Math.sin(lat * 0.2 + seed * 3));
    let c = new Color("#0c3f8a").lerp(new Color("#1f74c8"), wave);
    if (earthLand(lat, lon, 1.7)) c = c.lerp(new Color("#2ba6d8"), 0.55);
    return c.multiplyScalar(0.92 + seed * 0.12);
  }
  const a = Math.abs(lat);
  let c: Color;
  if (a > 60) c = new Color("#dfeaf0").lerp(new Color("#6f8f63"), 0.4);
  else if (inEllipses(lat, lon, DESERTS, 1)) c = new Color("#dcb87e");
  else if (a < 12) c = new Color("#1f8a3c");
  else c = new Color("#2f8a48");
  return c.multiplyScalar(0.86 + seed * 0.18 + Math.sin(lon * 0.5 + lat * 0.3) * 0.05);
}

export function latLonToVec3(latDeg: number, lonDeg: number, r: number): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return [Math.cos(lat) * Math.cos(lon) * r, Math.sin(lat) * r, Math.cos(lat) * Math.sin(lon) * r];
}

export interface EarthRegion {
  id: string;
  name: string;
  en: string;
  lat: number;
  lon: number;
  blurb: string;
  // Placeholder for future biodiversity / endemic-species layers.
  flora: string;
}

export const EARTH_REGIONS: EarthRegion[] = [
  { id: "east-asia", name: "東亞", en: "East Asia", lat: 35, lon: 110, blurb: "季風氣候、溫帶與亞熱帶森林交會。", flora: "待擴充：特有種與植被分布" },
  { id: "southeast-asia", name: "東南亞", en: "Southeast Asia", lat: 5, lon: 110, blurb: "熱帶雨林與群島生態，生物多樣性極高。", flora: "待擴充：熱帶雨林物種" },
  { id: "south-asia", name: "南亞", en: "South Asia", lat: 22, lon: 79, blurb: "喜馬拉雅到德干高原的多樣地形。", flora: "待擴充：季風林與高山植被" },
  { id: "middle-east", name: "中東", en: "Middle East", lat: 29, lon: 45, blurb: "乾旱與半乾旱帶，綠洲生態。", flora: "待擴充：旱生植物" },
  { id: "europe", name: "歐洲", en: "Europe", lat: 50, lon: 15, blurb: "溫帶落葉林與地中海植被。", flora: "待擴充：溫帶林物種" },
  { id: "north-africa", name: "北非 / 撒哈拉", en: "North Africa", lat: 22, lon: 15, blurb: "世界最大熱沙漠撒哈拉。", flora: "待擴充：沙漠耐旱植物" },
  { id: "central-africa", name: "中非雨林", en: "Central Africa", lat: -2, lon: 22, blurb: "剛果盆地熱帶雨林。", flora: "待擴充：雨林特有種" },
  { id: "southern-africa", name: "南部非洲", en: "Southern Africa", lat: -26, lon: 24, blurb: "莽原與開普植物區，特有種豐富。", flora: "待擴充：開普植物界" },
  { id: "north-america", name: "北美", en: "North America", lat: 45, lon: -100, blurb: "從苔原、針葉林到大平原。", flora: "待擴充：溫帶與寒帶植被" },
  { id: "amazon", name: "亞馬遜", en: "Amazonia", lat: -5, lon: -62, blurb: "地球最大熱帶雨林，物種寶庫。", flora: "待擴充：亞馬遜特有種" },
  { id: "patagonia", name: "南美南部 / 巴塔哥尼亞", en: "Patagonia", lat: -42, lon: -68, blurb: "草原、冰原與南方山毛櫸林。", flora: "待擴充：寒溫帶植被" },
  { id: "australia", name: "澳洲", en: "Australia", lat: -25, lon: 134, blurb: "乾旱內陸與獨特的有袋類生態。", flora: "待擴充：尤加利與旱生特有種" },
  { id: "siberia", name: "西伯利亞", en: "Siberia", lat: 64, lon: 100, blurb: "世界最大的針葉林(泰加林)。", flora: "待擴充：泰加林物種" },
  { id: "greenland", name: "格陵蘭", en: "Greenland", lat: 72, lon: -42, blurb: "巨大冰原與苔原邊緣。", flora: "待擴充：極地苔原" },
  { id: "antarctica", name: "南極", en: "Antarctica", lat: -80, lon: 0, blurb: "冰封大陸，極端生態。", flora: "待擴充：極地藻類與地衣" }
];

export function nearestRegion(lat: number, lon: number): EarthRegion {
  let best = EARTH_REGIONS[0];
  let bestD = Infinity;
  for (const r of EARTH_REGIONS) {
    let dlon = Math.abs(lon - r.lon);
    if (dlon > 180) dlon = 360 - dlon;
    const d = (lat - r.lat) * (lat - r.lat) + dlon * dlon;
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}
