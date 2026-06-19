// Generate web/positions.generated.js -- exact, verified positions for every item
// marker. The old app jittered items 2-3.3 degrees around the country anchor, which
// threw small-country items into neighbours (Taiwan -> Fujian) or the sea
// (Bangladesh -> Bay of Bengal). Here each item position is tested against the REAL
// country polygon (Natural Earth 110m, build-time only) and the ring shrinks until
// the point falls inside its own country. Run:  node tools/gen_positions.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { COUNTRIES } from '../web/data.js';

const here = dirname(fileURLToPath(import.meta.url));
const geo = JSON.parse(readFileSync(join(here, 'ne_110m_countries.geojson'), 'utf-8'));

// landmask = raw grayscale of web/textures/earth_specular_2048.jpg (water = bright);
// regenerate with the System.Drawing snippet in the repo history if the texture changes.
// The polygon says "right country", the mask says "on visible land" -- a point must
// satisfy BOTH, because the 110m borders are too coarse along coastlines.
const MASK_W = 2048, MASK_H = 1024;
const mask = readFileSync(join(here, 'landmask_2048x1024.bin'));
function isWater(lat, lon) {
  const x = Math.round((lon + 180) / 360 * (MASK_W - 1));
  const y = Math.round((90 - lat) / 180 * (MASK_H - 1));
  let s = 0, n = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const xx = Math.min(MASK_W - 1, Math.max(0, x + dx));
      const yy = Math.min(MASK_H - 1, Math.max(0, y + dy));
      s += mask[yy * MASK_W + xx]; n += 1;
    }
  }
  return s / n > 115;        // 0-255; specular water is near-white
}

// ---- map our ISO2 ids -> NE feature polygons ------------------------------------
// NE quirk: a few features carry ISO_A2 '-99' (France, Norway...) -> fall back to
// ISO_A2_EH, then to a name match against our English country names.
const polysByIso = new Map();
for (const f of geo.features) {
  const p = f.properties;
  const iso = (p.ISO_A2 && p.ISO_A2 !== '-99' ? p.ISO_A2 : p.ISO_A2_EH || '').toLowerCase();
  if (iso && iso !== '-99' && !polysByIso.has(iso)) polysByIso.set(iso, f);
}
const NAME_FIX = {   // our restcountries en-name -> NE ADMIN name, where they differ
  'United States': 'United States of America', 'Tanzania': 'United Republic of Tanzania',
  'Serbia': 'Republic of Serbia', 'Czechia': 'Czechia', 'North Macedonia': 'North Macedonia',
  'DR Congo': 'Democratic Republic of the Congo', 'Republic of the Congo': 'Republic of the Congo',
  'Eswatini': 'eSwatini', 'Bahamas': 'The Bahamas', 'Ivory Coast': 'Ivory Coast',
  'East Timor': 'East Timor', 'Timor-Leste': 'East Timor'
};
const byName = new Map(geo.features.map((f) => [f.properties.ADMIN.toLowerCase(), f]));
function featureFor(co) {
  if (polysByIso.has(co.id)) return polysByIso.get(co.id);
  const want = (NAME_FIX[co.en] || co.en).toLowerCase();
  return byName.get(want) || null;
}

// ---- point-in-polygon (ray casting, lon/lat planar -- fine at country scale) ----
function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function inFeature(lon, lat, f) {
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) {
    if (inRing(lon, lat, poly[0])) {
      let inHole = false;
      for (let h = 1; h < poly.length; h += 1) if (inRing(lon, lat, poly[h])) { inHole = true; break; }
      if (!inHole) return true;
    }
  }
  return false;
}

// ---- compute every item-marker position ------------------------------------------
// Same golden-angle ring layout the app used, but each candidate must fall INSIDE the
// country polygon; the radius shrinks (then the angle nudges) until it does.
const POS = {};
const stats = { full: 0, shrunk: 0, anchor: 0, coastal: 0, noPoly: [] };
for (const co of COUNTRIES) {
  const f = featureFor(co);
  if (!f) stats.noPoly.push(co.id);
  co.items.forEach((_, i) => {
    const idx = i + 1;
    const id = co.id + '-' + idx;
    const baseRing = 2.0 + (idx % 3) * 1.3;
    const ang = idx * 2.39996;
    if (!f) {        // no 110m polygon (micro-states): tight star around the anchor
      const r = 0.12;
      POS[id] = [+(co.lat + Math.sin(ang) * r).toFixed(4), +(co.lon + Math.cos(ang) * r).toFixed(4)];
      return;
    }
    // pass 1: inside the polygon AND on visible land; pass 2: inside the polygon
    // (coarse-border coastal countries); else: sit at the verified anchor.
    let found = null;
    for (const needLand of [true, false]) {
      outer:
      for (const scale of [1, 0.7, 0.5, 0.35, 0.22, 0.12, 0.06]) {
        for (const dAng of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.4, -2.4, 3.0]) {
          const r = baseRing * scale;
          const a = ang + dAng;
          const lat = co.lat + Math.sin(a) * r;
          const lon = co.lon + (Math.cos(a) * r) / Math.max(0.4, Math.cos(co.lat * Math.PI / 180));
          if (!inFeature(lon, lat, f)) continue;
          if (needLand && isWater(lat, lon)) continue;
          found = { lat, lon, scale, land: !needLand ? !isWater(lat, lon) : true };
          break outer;
        }
      }
      if (found) break;
    }
    if (found) {
      if (found.scale === 1) stats.full += 1; else stats.shrunk += 1;
      if (!found.land) stats.coastal += 1;
      POS[id] = [+found.lat.toFixed(4), +found.lon.toFixed(4)];
    } else {         // polygon smaller than the finest ring: sit at the anchor
      stats.anchor += 1;
      const r = 0.08;
      POS[id] = [+(co.lat + Math.sin(ang) * r).toFixed(4), +(co.lon + Math.cos(ang) * r).toFixed(4)];
    }
  });
}

const lines = Object.entries(POS).map(([id, [lat, lon]]) => `  '${id}': [${lat}, ${lon}]`);
writeFileSync(join(here, '..', 'web', 'positions.generated.js'),
  '// AUTO-GENERATED by tools/gen_positions.mjs -- item-marker positions verified\n'
  + '// against Natural Earth 110m country polygons. Do not edit by hand.\n'
  + 'export const MARKER_POS = {\n' + lines.join(',\n') + '\n};\n', 'utf-8');

console.log(`wrote positions.generated.js: ${lines.length} item positions`);
console.log(`  in-country at full ring: ${stats.full}, shrunk to fit: ${stats.shrunk}, anchor-fallback: ${stats.anchor}, in-polygon-but-coastal: ${stats.coastal}`);
console.log(`  countries without a 110m polygon (anchor star used): ${stats.noPoly.join(' ') || 'none'}`);
