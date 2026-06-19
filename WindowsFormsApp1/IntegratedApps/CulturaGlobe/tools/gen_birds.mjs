// Build-time bird dataset from iNaturalist (real photos + real names). This is the
// "automated import" approach -- no hand-placed images, no hand-drawn art. For each
// continent x season it pulls the top observed bird species (species_counts), dedupes
// across the whole grid, keeps the ~1100 most-observed, and writes
// web/birds.generated.js with each species' Chinese/English/scientific name, its real
// iNat photo URLs (open CDN, hot-linked at runtime), the regions+seasons it appears
// in, and a deterministic globe position inside its continent. Bird songs are NOT
// downloaded here -- they stream at runtime via the server /api/birdsong proxy.
//
// Run:  node tools/gen_birds.mjs            (needs internet; ~2-3 min, rate-limited)
//       node tools/gen_birds.mjs --max 600  (smaller set for a quick build)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const argMax = (() => { const i = process.argv.indexOf('--max'); return i > 0 ? parseInt(process.argv[i + 1], 10) : 1100; })();

const UA = 'CulturaGlobe/1.0 (educational globe; contact: student project)';
const AVES = 3;                         // iNat taxon_id for class Aves (birds)

// continent -> iNat place_id + a rough lat/lon box to scatter species within
const REGIONS = {
  asia:     { placeId: 97395, zh: '亞洲', en: 'Asia',        box: [8, 52, 62, 138] },
  europe:   { placeId: 97391, zh: '歐洲', en: 'Europe',      box: [40, 62, -8, 38] },
  africa:   { placeId: 97392, zh: '非洲', en: 'Africa',      box: [-32, 32, -14, 48] },
  namerica: { placeId: 97394, zh: '北美洲', en: 'N. America', box: [20, 60, -122, -72] },
  samerica: { placeId: 97389, zh: '南美洲', en: 'S. America', box: [-44, 8, -76, -42] },
  oceania:  { placeId: 97393, zh: '大洋洲', en: 'Oceania',    box: [-42, -10, 114, 176] },
  polar:    { placeId: 206462, zh: '極地', en: 'Polar',       box: [-74, -62, -58, 58] }
};
// polar is sparse via continent places, so it is ALSO seeded from the penguin family
// (global) + a real Arctic place, and force-kept past the observation-count cap.
const PENGUIN_FAMILY = 3806;
const SEASONS = {
  spring: '3,4,5',
  summer: '6,7,8',
  autumn: '9,10,11',
  winter: '12,1,2'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, tries = 3) {
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (r.status === 429) { await sleep(4000); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (attempt === tries - 1) throw e;
      await sleep(1500);
    }
  }
  return null;
}

function speciesCountsURL(placeId, months, locale, perPage = 200) {
  return `https://api.inaturalist.org/v1/observations/species_counts`
    + `?taxon_id=${AVES}&place_id=${placeId}&month=${months}`
    + `&per_page=${perPage}&locale=${locale}&verifiable=true&hrank=species`;
}

// hash a taxon id to a stable point inside a region box
function posInBox(box, taxonId) {
  const [latMin, latMax, lonMin, lonMax] = box;
  let h = (taxonId * 2654435761) >>> 0;
  const a = ((h & 0xffff) / 0xffff);
  h = (h ^ (h >>> 13)) >>> 0;
  const b = ((h & 0xffff) / 0xffff);
  return [
    +(latMin + a * (latMax - latMin)).toFixed(3),
    +(lonMin + b * (lonMax - lonMin)).toFixed(3)
  ];
}

const birds = new Map();   // taxonId -> record

async function harvest() {
  let call = 0;
  for (const [rid, region] of Object.entries(REGIONS)) {
    for (const [sid, months] of Object.entries(SEASONS)) {
      // zh pass
      const zh = await getJSON(speciesCountsURL(region.placeId, months, 'zh-TW'));
      call++;
      await sleep(1100);
      // en pass (for the english common name)
      const en = await getJSON(speciesCountsURL(region.placeId, months, 'en'));
      call++;
      await sleep(1100);
      const enName = new Map();
      for (const row of (en?.results || [])) enName.set(row.taxon.id, row.taxon.preferred_common_name || '');
      for (const row of (zh?.results || [])) {
        const tx = row.taxon;
        if (!tx || !tx.default_photo) continue;
        let rec = birds.get(tx.id);
        if (!rec) {
          rec = {
            taxonId: tx.id,
            sci: tx.name,
            zh: tx.preferred_common_name || '',
            en: enName.get(tx.id) || '',
            sq: tx.default_photo.square_url || tx.default_photo.url || '',
            md: tx.default_photo.medium_url || tx.default_photo.url || '',
            count: 0,
            regions: new Set(),
            seasons: new Set()
          };
          birds.set(tx.id, rec);
        }
        if (!rec.en && enName.get(tx.id)) rec.en = enName.get(tx.id);
        rec.count += row.count;
        rec.regions.add(rid);
        rec.seasons.add(sid);
      }
      process.stdout.write(`  [${call}] ${rid}/${sid}: ${zh?.results?.length || 0} species, total unique ${birds.size}\n`);
    }
  }

  // ---- polar enrichment: penguins + true Antarctic birds, tagged polar. (We do NOT
  // pull a generic Arctic place -- it returns common continental birds like Canada
  // Goose that then pollute the 極地 filter; northern cold-climate birds still appear
  // under their own continents.) ----
  const polarSources = [
    `https://api.inaturalist.org/v1/observations/species_counts?taxon_id=${PENGUIN_FAMILY}&per_page=100&locale=zh-TW&verifiable=true&hrank=species`,
    speciesCountsURL(REGIONS.polar.placeId, '1,2,3,4,5,6,7,8,9,10,11,12', 'zh-TW', 100)
  ];
  const polarEn = [
    `https://api.inaturalist.org/v1/observations/species_counts?taxon_id=${PENGUIN_FAMILY}&per_page=100&locale=en&verifiable=true&hrank=species`,
    speciesCountsURL(REGIONS.polar.placeId, '1,2,3,4,5,6,7,8,9,10,11,12', 'en', 100)
  ];
  for (let i = 0; i < polarSources.length; i++) {
    const zh = await getJSON(polarSources[i]); await sleep(1100);
    const en = await getJSON(polarEn[i]); await sleep(1100);
    const enName = new Map();
    for (const row of (en?.results || [])) enName.set(row.taxon.id, row.taxon.preferred_common_name || '');
    for (const row of (zh?.results || [])) {
      const tx = row.taxon;
      if (!tx || !tx.default_photo) continue;
      let rec = birds.get(tx.id);
      if (!rec) {
        rec = { taxonId: tx.id, sci: tx.name, zh: tx.preferred_common_name || '', en: enName.get(tx.id) || '',
          sq: tx.default_photo.square_url || tx.default_photo.url || '', md: tx.default_photo.medium_url || tx.default_photo.url || '',
          count: 0, regions: new Set(), seasons: new Set() };
        birds.set(tx.id, rec);
      }
      if (!rec.en && enName.get(tx.id)) rec.en = enName.get(tx.id);
      rec.count += row.count;
      rec.polar = true;                 // force-keep
      rec.regions.add('polar');
      ['spring', 'summer', 'autumn', 'winter'].forEach((s) => rec.seasons.add(s));
    }
    process.stdout.write(`  [polar+] source ${i + 1}: ${zh?.results?.length || 0} species, total unique ${birds.size}\n`);
  }
}

function finish() {
  // keep the most-observed up to the cap, but ALWAYS keep polar species (else the
  // continent-place sparsity drops penguins/arctic birds off the bottom). Then sort
  // the kept set by observation count so the catalog leads with familiar birds.
  const all = [...birds.values()];
  const polar = all.filter((r) => r.polar || r.regions.has('polar'));
  const rest = all.filter((r) => !(r.polar || r.regions.has('polar'))).sort((a, b) => b.count - a.count);
  const keep = new Set([...polar, ...rest.slice(0, Math.max(0, argMax - polar.length))]);
  const list = [...keep].sort((a, b) => b.count - a.count);
  const out = list.map((r) => {
    // a bird's PRIMARY region (label + globe position) is its continent; polar is a
    // primary only for species that live nowhere else (e.g. true Antarctic seabirds).
    const primary = [...r.regions].find((x) => x !== 'polar') || 'polar';
    const [lat, lon] = posInBox(REGIONS[primary].box, r.taxonId);
    return {
      id: 't' + r.taxonId,
      taxonId: r.taxonId,
      zh: r.zh || r.en || r.sci,
      en: r.en || r.sci,
      sci: r.sci,
      region: primary,
      regions: [...r.regions],
      seasons: [...r.seasons].sort((a, b) => ['spring', 'summer', 'autumn', 'winter'].indexOf(a) - ['spring', 'summer', 'autumn', 'winter'].indexOf(b)),
      lat, lon,
      sq: r.sq,
      md: r.md
    };
  });

  const regionsLit = Object.fromEntries(Object.entries(REGIONS).map(([k, v]) => [k, { zh: v.zh, en: v.en }]));
  const body =
    '// AUTO-GENERATED by tools/gen_birds.mjs from iNaturalist species_counts.\n'
    + '// Real photos (hot-linked iNat CDN) + real zh/en names; songs stream via /api/birdsong.\n'
    + '// Do not edit by hand -- re-run the generator.\n'
    + 'export const SEASONS = ["spring","summer","autumn","winter"];\n'
    + 'export const BIRD_REGIONS = ' + JSON.stringify(regionsLit, null, 0) + ';\n'
    + 'export const BIRDS = [\n'
    + out.map((b) => '  ' + JSON.stringify(b)).join(',\n')
    + '\n];\n';
  writeFileSync(join(here, '..', 'web', 'birds.generated.js'), body, 'utf-8');
  console.log(`\nwrote birds.generated.js: ${out.length} species (from ${birds.size} unique harvested)`);
}

(async () => {
  console.log('Harvesting iNaturalist bird species across 7 continents x 4 seasons...');
  await harvest();
  finish();
})();
