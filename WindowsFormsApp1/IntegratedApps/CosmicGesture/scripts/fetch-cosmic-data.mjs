#!/usr/bin/env node
// ============================================================================
//  Cosmic Gesture — universe data fetcher
//
//  Pulls REAL astronomical catalogues from public space-agency / open sources
//  and bakes a compact dataset the app turns into particle visuals on demand:
//
//    • OpenNGC  — the full NGC/IC deep-sky catalogue (galaxies, nebulae,
//                 clusters) with real coordinates, magnitudes, sizes,
//                 Messier numbers and common names.  (mattiaverga/OpenNGC)
//    • NASA Exoplanet Archive — confirmed exoplanet host-star systems.
//
//  Output: src/data/generated/deepSky.generated.json  (+ manifest.json)
//
//  Each record is just the *parameters* (type, position, brightness, seed) —
//  the renderer particle-izes it procedurally, so adding the whole sky costs
//  almost nothing on disk and only one heavy object is ever simulated at once.
//
//  Run:  npm run fetch-data        (online; safe to re-run, falls back to the
//                                   existing baked file if a source is down)
// ============================================================================

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../src/data/generated");
const OUT_FILE = resolve(OUT_DIR, "deepSky.generated.json");
const MANIFEST = resolve(OUT_DIR, "manifest.json");

const OPENNGC_URL = "https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv";
const EXO_URL =
  "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=" +
  encodeURIComponent(
    "select hostname,ra,dec,sy_dist,st_spectype,st_teff,sy_pnum from ps where default_flag=1 and sy_dist is not null order by sy_dist asc"
  ) +
  "&format=csv";

const TIMEOUT_MS = 45000;

async function getText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "FusionOS-CosmicGesture/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// --- coordinate helpers -----------------------------------------------------
function hmsToDeg(hms) {
  // "HH:MM:SS.ss" -> degrees
  const [h, m, s] = hms.split(":").map(Number);
  if ([h, m, s].some((v) => Number.isNaN(v))) return null;
  return (h + m / 60 + s / 3600) * 15;
}
function dmsToDeg(dms) {
  // "+DD:MM:SS.s" -> degrees
  const sign = dms.trim().startsWith("-") ? -1 : 1;
  const [d, m, s] = dms.replace("+", "").split(":").map((v) => Math.abs(Number(v)));
  if ([d, m, s].some((v) => Number.isNaN(v))) return null;
  return sign * (d + m / 60 + s / 3600);
}

// Which OpenNGC object types we keep, and the bar each must clear.
const KEEP_TYPES = new Set([
  "G", "GPair", "GTrpl", "GGroup", // galaxies
  "OCl", "GCl", "*Ass",            // clusters
  "PN", "SNR", "EmN", "RfN", "HII", "Neb", "Cl+N", "DrkN" // nebulae
]);

function magnitudeBar(type) {
  if (type.startsWith("G")) return 12.0;     // galaxies: brightest few hundred
  if (type === "OCl" || type === "*Ass") return 9.0;
  return Infinity;                            // keep all nebulae + globulars
}

async function parseOpenNgc() {
  let csv;
  try {
    csv = await getText(OPENNGC_URL);
  } catch (err) {
    console.warn("⚠ OpenNGC fetch failed:", err.message);
    return null;
  }
  const lines = csv.split(/\r?\n/);
  const header = lines[0].split(";");
  const col = (name) => header.indexOf(name);
  const C = {
    name: col("Name"), type: col("Type"), ra: col("RA"), dec: col("Dec"), constName: col("Const"),
    maj: col("MajAx"), bmag: col("B-Mag"), vmag: col("V-Mag"), hubble: col("Hubble"),
    redshift: col("Redshift"), m: col("M"), ngc: col("NGC"), ic: col("IC"), common: col("Common names")
  };

  const out = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const f = line.split(";");
    const type = (f[C.type] || "").trim();
    if (!KEEP_TYPES.has(type)) continue;

    const ra = f[C.ra] ? hmsToDeg(f[C.ra]) : null;
    const dec = f[C.dec] ? dmsToDeg(f[C.dec]) : null;
    if (ra == null || dec == null) continue;

    const vmag = parseFloat(f[C.vmag]);
    const bmag = parseFloat(f[C.bmag]);
    const mag = Number.isFinite(vmag) ? vmag : Number.isFinite(bmag) ? bmag : null;
    const m = (f[C.m] || "").trim();
    const common = (f[C.common] || "").trim().split(",")[0];

    // Filter to a rich-but-bounded set: always keep Messier or named objects,
    // otherwise require the type's brightness bar.
    const interesting = m || common || (mag != null && mag <= magnitudeBar(type));
    if (!interesting) continue;

    const redshift = parseFloat(f[C.redshift]);
    out.push({
      desig: (f[C.name] || "").trim(),
      common: common || null,
      m: m || null,
      type,
      ra: round(ra, 4),
      dec: round(dec, 4),
      mag: mag != null ? round(mag, 2) : null,
      maj: round(parseFloat(f[C.maj]) || 0, 3) || null,
      hubble: (f[C.hubble] || "").trim() || null,
      const: (f[C.constName] || "").trim() || null,
      z: Number.isFinite(redshift) ? round(redshift, 6) : null
    });
  }
  return out;
}

async function parseExoplanets() {
  let csv;
  try {
    csv = await getText(EXO_URL);
  } catch (err) {
    console.warn("⚠ Exoplanet Archive fetch failed:", err.message);
    return [];
  }
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const idx = (n) => header.indexOf(n);
  const seen = new Set();
  const out = [];
  for (let i = 1; i < lines.length && out.length < 220; i += 1) {
    const f = splitCsv(lines[i]);
    const host = f[idx("hostname")];
    if (!host || seen.has(host)) continue;
    seen.add(host);
    const ra = parseFloat(f[idx("ra")]);
    const dec = parseFloat(f[idx("dec")]);
    const dist = parseFloat(f[idx("sy_dist")]);
    if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue;
    out.push({
      host,
      ra: round(ra, 4),
      dec: round(dec, 4),
      distPc: Number.isFinite(dist) ? round(dist, 2) : null,
      spectype: (f[idx("st_spectype")] || "").trim() || null,
      teff: Number.isFinite(parseFloat(f[idx("st_teff")])) ? round(parseFloat(f[idx("st_teff")]), 0) : null,
      planets: Number.isFinite(parseFloat(f[idx("sy_pnum")])) ? parseInt(f[idx("sy_pnum")], 10) : null
    });
  }
  return out;
}

// CSV splitter that respects quoted fields (Exoplanet Archive quotes some values).
function splitCsv(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') q = !q;
    else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function round(v, d) {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

async function main() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  console.log("→ Fetching OpenNGC deep-sky catalogue …");
  const deepSky = await parseOpenNgc();
  console.log("→ Fetching NASA Exoplanet Archive host stars …");
  const exoplanets = await parseExoplanets();

  if (!deepSky) {
    if (existsSync(OUT_FILE)) {
      console.warn("✗ Keeping previously baked dataset (OpenNGC unavailable).");
      return;
    }
    throw new Error("OpenNGC unavailable and no baked dataset exists.");
  }

  // Light de-dup by designation, brightest first so the menu leads with the
  // most recognisable objects.
  const byMag = [...deepSky].sort((a, b) => (a.mag ?? 99) - (b.mag ?? 99));
  const typeCounts = {};
  for (const d of deepSky) typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;

  const payload = { deepSky: byMag, exoplanets };
  await writeFile(OUT_FILE, JSON.stringify(payload));
  const manifest = {
    generatedAt: new Date().toISOString(),
    sources: [
      { name: "OpenNGC", url: OPENNGC_URL, license: "CC-BY-SA-4.0" },
      { name: "NASA Exoplanet Archive", url: "https://exoplanetarchive.ipac.caltech.edu/", license: "Public domain" }
    ],
    counts: { deepSky: deepSky.length, exoplanets: exoplanets.length, byType: typeCounts }
  };
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));

  console.log(`✓ Baked ${deepSky.length} deep-sky objects + ${exoplanets.length} exo host stars`);
  console.log("  by type:", typeCounts);
  console.log(`  → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("fetch-cosmic-data failed:", err);
  process.exit(1);
});
