#!/usr/bin/env node
// 詩雲語料自動匯入器 / Poetry Cloud corpus importer.
//
// Pulls the free, public-domain Chinese-poetry corpus
// (https://github.com/chinese-poetry/chinese-poetry) straight from the
// jsDelivr CDN, aggregates every poet, derives a real "互相贈送 / 提及" relation
// network from poem titles (the same idea behind the 詩云 reference clips), and
// writes one compact bundle the front-end lazy-loads to paint the star nebula.
//
// Usage:
//   node tools/gen_poetry.mjs                 # full corpus (58 Tang + 255 Song shards)
//   node tools/gen_poetry.mjs --tang=20 --song=40   # quick subset while iterating
//   node tools/gen_poetry.mjs --nodes=3000 --edges=5000 --poems=6000
//
// Output: Frontend/public/poetry/poetry-corpus.json (committed, lazy-fetched).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'poetry');
const CACHE_DIR = path.join(os.tmpdir(), 'poetry-cache');
const CDN = 'https://cdn.jsdelivr.net/gh/chinese-poetry/chinese-poetry@master';

// ---- options ---------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  })
);
const TANG_SHARDS = Number(args.tang ?? 58); // x1000 poems each
const SONG_SHARDS = Number(args.song ?? 255);
const MAX_NODES = Number(args.nodes ?? 2600); // interactive poet stars
const MAX_EDGES = Number(args.edges ?? 4500);
const MAX_POEMS = Number(args.poems ?? 8200); // poems shipped with full text
const POEMS_PER_POET = Number(args.perpoet ?? 3);
const CONCURRENCY = Number(args.concurrency ?? 16);

// Curated poets already hand-authored in poetryCorpus.ts — keep their stable
// slug ids so generated data merges onto the same star instead of duplicating.
const CURATED = {
  屈原: 'qu-yuan', 曹操: 'cao-cao', 陶淵明: 'tao-yuanming', 張九齡: 'zhang-jiuling',
  孟浩然: 'meng-haoran', 王維: 'wang-wei', 李白: 'li-bai', 杜甫: 'du-fu',
  王昌齡: 'wang-changling', 白居易: 'bai-juyi', 劉禹錫: 'liu-yuxi', 杜牧: 'du-mu',
  李商隱: 'li-shangyin', 蘇軾: 'su-shi', 李清照: 'li-qingzhao', 辛棄疾: 'xin-qiji',
  陸游: 'lu-you', 馬致遠: 'ma-zhiyuan', 納蘭性德: 'nalan-xingde', 龔自珍: 'gong-zizhen'
};

// ---- helpers ---------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(urlPath) {
  const cacheFile = path.join(CACHE_DIR, urlPath.replace(/[\\/]/g, '__'));
  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    } catch {
      /* fall through and refetch */
    }
  }
  const url = `${CDN}/${urlPath.split('/').map(encodeURIComponent).join('/')}`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const data = JSON.parse(text);
      fs.writeFileSync(cacheFile, text);
      return data;
    } catch (err) {
      if (attempt === 3) {
        console.warn(`  ! skip ${urlPath}: ${err.message}`);
        return null;
      }
      await sleep(400 * (attempt + 1));
    }
  }
  return null;
}

async function pool(items, worker) {
  const queue = [...items];
  let done = 0;
  const total = items.length;
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
      done += 1;
      if (done % 20 === 0 || done === total) {
        process.stdout.write(`\r  fetched ${done}/${total}   `);
      }
    }
  });
  await Promise.all(runners);
  process.stdout.write('\n');
}

const clauseSplit = (s) => s.split(/[，。！？；：、]/).map((x) => x.trim()).filter(Boolean);

// crude but serviceable form classifier for 近體詩
function classifyForm(content) {
  const clauses = content.flatMap(clauseSplit);
  if (!clauses.length) return '古體';
  const lens = clauses.map((c) => c.length);
  const counts = {};
  for (const l of lens) counts[l] = (counts[l] || 0) + 1;
  const modal = Number(Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]);
  const n = clauses.length;
  if (n === 4 && modal === 5) return '五絕';
  if (n === 4 && modal === 7) return '七絕';
  if (n === 8 && modal === 5) return '五律';
  if (n === 8 && modal === 7) return '七律';
  return '古體';
}

const IMAGERY = '月日花風雪山水江河海雲霧雨星天酒劍馬舟船鐘燈夢柳松竹梅蘭菊鳥雁燕鶴秋春夏冬霜露煙波橋樓臺風雷草木霞泉峰崖';
const IMAGERY_SET = new Set([...IMAGERY]);
function tagImagery(content) {
  const text = content.join('');
  const seen = [];
  for (const ch of text) {
    if (IMAGERY_SET.has(ch) && !seen.includes(ch)) seen.push(ch);
    if (seen.length >= 6) break;
  }
  return seen;
}

const THEME_RULES = [
  [/鄉|故園|歸|客|羈旅/, '思鄉'],
  [/月|夜/, '月夜'],
  [/別|送|離|贈|寄/, '送別'],
  [/戰|兵|烽|征|塞|戈|劍|胡/, '邊塞'],
  [/愁|淚|恨|斷腸|寂/, '愁緒'],
  [/山|水|江|湖|峰|泉/, '山水'],
  [/田|耕|隱|園|農/, '田園'],
  [/酒|醉|樽|觴/, '飲酒'],
  [/春|花/, '春日'],
  [/秋|霜|雁/, '秋日'],
  [/國|君|社稷|憂/, '家國']
];
function tagThemes(title, content) {
  const text = title + content.join('');
  const out = [];
  for (const [re, label] of THEME_RULES) {
    if (re.test(text) && !out.includes(label)) out.push(label);
    if (out.length >= 3) break;
  }
  return out.length ? out : ['詠懷'];
}

const GIFT_RE = /[贈送寄酬和答懷憶別呈簡示酧次韻奉陪同過訪題挽哭](?![一二三四五六七八九十])/;

// official titles / anonymous markers / poem-topics that appear in the corpus as
// pseudo "authors" or stray n-grams — never real people, so keep them out of the
// relation graph and the star set.
const NON_PERSON = new Set([
  '太守', '拾遺', '隱者', '君', '公', '子', '先生', '居士', '山人', '上人', '大夫',
  '將軍', '使君', '處士', '道士', '和尚', '闕名', '無名氏', '失名', '佚名', '某',
  '僧', '尼', '叟', '翁', '客', '人', '其一', '其二', '東坡', '墨梅', '漁父', '漁夫',
  '本作', '一作', '缺名', '此詩', '主人', '隱士', '逸人', '故人', '友人', '諸公', '同年'
]);
const isPerson = (name) =>
  name.length >= 2 && name.length <= 3 && !NON_PERSON.has(name) &&
  !/[0-9]/.test(name) && !name.endsWith('氏');

// ---- main ------------------------------------------------------------------
async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`詩雲匯入器: 全唐詩 ${TANG_SHARDS} shards + 全唐詩(宋) ${SONG_SHARDS} shards`);
  console.log(`cache: ${CACHE_DIR}`);

  // 1. author bios -----------------------------------------------------------
  console.log('讀取作者小傳 ...');
  const bios = new Map();
  for (const f of ['全唐诗/authors.tang.json', '全唐诗/authors.song.json']) {
    const list = await getJson(f);
    if (!list) continue;
    for (const a of list) {
      if (a?.name && a?.desc && !bios.has(a.name)) {
        bios.set(a.name, String(a.desc).replace(/\s+/g, '').slice(0, 130));
      }
    }
  }
  console.log(`  作者小傳 ${bios.size} 筆`);

  // 2. poems -----------------------------------------------------------------
  const shardPaths = [];
  for (let i = 0; i < TANG_SHARDS; i += 1) shardPaths.push(['唐', `全唐诗/poet.tang.${i * 1000}.json`]);
  for (let i = 0; i < SONG_SHARDS; i += 1) shardPaths.push(['宋', `全唐诗/poet.song.${i * 1000}.json`]);

  const poets = new Map(); // name -> { name, dynasty, count, poems:[] }
  const giftTitles = []; // [authorName, title] for every 贈/送/寄/... poem (all of them)
  let totalScanned = 0;

  console.log(`抓取 ${shardPaths.length} 個 shard ...`);
  await pool(shardPaths, async ([dynasty, p]) => {
    const list = await getJson(p);
    if (!Array.isArray(list)) return;
    for (const rec of list) {
      const name = rec.author?.trim();
      const content = rec.paragraphs?.filter(Boolean);
      if (!name || !content?.length) continue;
      totalScanned += 1;
      let poet = poets.get(name);
      if (!poet) {
        poet = { name, dynasty, count: 0, poems: [] };
        poets.set(name, poet);
      }
      poet.count += 1;
      const title = (rec.title || '').replace(/\s+/g, ' ').trim();
      // relation extraction scans EVERY gift/reply title, not just the display pool
      if (title.length >= 3 && GIFT_RE.test(title)) giftTitles.push([name, title]);
      // keep a bounded candidate pool of clean short poems per poet for display
      if (poet.poems.length < 40) poet.poems.push({ title, content });
    }
  });
  console.log(`掃描 ${totalScanned} 首，得 ${poets.size} 位詩人，贈答題 ${giftTitles.length} 筆`);

  // 3. relation network from titles (贈/送/寄/酬/和/答 ... + a poet name) ------
  console.log('建立贈答提及關係網路 ...');
  const nameToCanonical = new Map(); // 2-3 char name -> name
  for (const name of poets.keys()) {
    if (isPerson(name)) nameToCanonical.set(name, name);
  }
  const edgeCount = new Map(); // "a b" -> mentions
  const ekey = (a, b) => (a < b ? `${a} ${b}` : `${b} ${a}`);

  for (const [author, t] of giftTitles) {
    // n-gram lookup against the poet-name index
    const found = new Set();
    for (let i = 0; i < t.length; i += 1) {
      for (const len of [3, 2]) {
        const g = t.slice(i, i + len);
        if (g.length === len && nameToCanonical.has(g)) found.add(g);
      }
    }
    for (const other of found) {
      if (other === author) continue;
      const k = ekey(author, other);
      edgeCount.set(k, (edgeCount.get(k) || 0) + 1);
    }
  }
  console.log(`  候選關係 ${edgeCount.size} 條`);

  // 4. pick the interactive node set ----------------------------------------
  const ranked = [...poets.values()].sort((a, b) => b.count - a.count);
  const chosen = new Map(); // name -> poet
  const idFor = (name) => CURATED[name] || `g:${name}`;

  // always keep curated names if present in the corpus
  for (const name of Object.keys(CURATED)) {
    if (poets.has(name)) chosen.set(name, poets.get(name));
  }
  for (const poet of ranked) {
    if (chosen.size >= MAX_NODES) break;
    if (!CURATED[poet.name] && !isPerson(poet.name)) continue;
    chosen.set(poet.name, poet);
  }
  // make sure both endpoints of strong edges are in the node set
  const sortedEdges = [...edgeCount.entries()].sort((a, b) => b[1] - a[1]);
  for (const [k] of sortedEdges) {
    if (chosen.size >= MAX_NODES + 400) break;
    const [a, b] = k.split(' ');
    if (chosen.has(a) && !chosen.has(b) && poets.has(b) && isPerson(b)) chosen.set(b, poets.get(b));
  }

  // 5. finalize edges restricted to chosen nodes ----------------------------
  const edges = [];
  for (const [k, mentions] of sortedEdges) {
    if (edges.length >= MAX_EDGES) break;
    const [a, b] = k.split(' ');
    if (!chosen.has(a) || !chosen.has(b)) continue;
    edges.push({
      source: idFor(a),
      target: idFor(b),
      kind: '交遊',
      reason: `贈答、寄懷與提及往來 ${mentions} 次`,
      weight: Math.min(1, 0.3 + Math.log10(1 + mentions) * 0.55),
      mentions
    });
  }
  // connectivity fallback: tie any node with no real edge to the strongest hub
  // of its own dynasty, so the nebula reads as one woven web (no lone stars).
  const degree = new Map();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) || 0) + e.weight);
    degree.set(e.target, (degree.get(e.target) || 0) + e.weight);
  }
  const hubByDynasty = new Map();
  for (const poet of chosen.values()) {
    const id = idFor(poet.name);
    const cur = hubByDynasty.get(poet.dynasty);
    const d = degree.get(id) || 0;
    if (!cur || d > cur.d) hubByDynasty.set(poet.dynasty, { id, d, count: poet.count });
  }
  for (const poet of chosen.values()) {
    const id = idFor(poet.name);
    if (degree.get(id)) continue;
    const hub = hubByDynasty.get(poet.dynasty);
    if (!hub || hub.id === id) continue;
    edges.push({
      source: id,
      target: hub.id,
      kind: '同時代',
      reason: `同屬${poet.dynasty}代詩壇`,
      weight: 0.22,
      mentions: 0
    });
  }
  console.log(`  保留關係 ${edges.length} 條（含同代補線）`);

  // 6. build poet records ----------------------------------------------------
  const outPoets = [];
  for (const poet of chosen.values()) {
    outPoets.push({
      id: idFor(poet.name),
      name: poet.name,
      dynasty: poet.dynasty,
      bio: bios.get(poet.name) || `${poet.dynasty}代詩人，傳世作品約 ${poet.count} 首。`,
      poemCount: poet.count,
      themes: [],
      styles: []
    });
  }
  outPoets.sort((a, b) => b.poemCount - a.poemCount);

  // 7. representative poems with full text -----------------------------------
  // multi-pass: guarantee every star gets at least one poem, then add extras to
  // the most prolific poets until the budget is spent (no star clicks to a void).
  const outPoems = [];
  const candScore = (x) => {
    const cl = x.content.flatMap(clauseSplit);
    const regular = cl.length === 4 || cl.length === 8;
    return (regular ? 0 : 10) + cl.length;
  };
  const candCache = new Map();
  const getCands = (op) => {
    if (candCache.has(op.id)) return candCache.get(op.id);
    const poet = chosen.get(op.name);
    let cands = poet.poems.filter(
      (p) => p.content.length >= 2 && p.content.length <= 8 && !p.content.join('').includes('□')
    );
    if (!cands.length) cands = poet.poems.filter((p) => p.content.length && !p.content.join('').includes('□'));
    if (!cands.length) cands = poet.poems.slice();
    cands = cands.sort((a, b) => candScore(a) - candScore(b)).slice(0, POEMS_PER_POET);
    candCache.set(op.id, cands);
    return cands;
  };
  const poemPoets = outPoets; // curated poets keep hand-authored poems and also receive public-corpus samples
  for (let pass = 0; pass < POEMS_PER_POET && outPoems.length < MAX_POEMS; pass += 1) {
    for (const op of poemPoets) {
      if (outPoems.length >= MAX_POEMS) break;
      const cands = getCands(op);
      if (pass >= cands.length) continue;
      const c = cands[pass];
      outPoems.push({
        id: `gp:${op.id}:${pass}`,
        title: c.title || `${op.name}詩・其${pass + 1}`,
        poetId: op.id,
        dynasty: op.dynasty,
        form: classifyForm(c.content),
        content: c.content,
        themes: tagThemes(c.title, c.content),
        imagery: tagImagery(c.content)
      });
    }
  }

  // attach a couple of themes onto poet records from their poems (for search)
  const themesByPoet = new Map();
  for (const pm of outPoems) {
    const arr = themesByPoet.get(pm.poetId) || [];
    for (const t of pm.themes) if (!arr.includes(t)) arr.push(t);
    themesByPoet.set(pm.poetId, arr);
  }
  for (const op of outPoets) {
    const t = themesByPoet.get(op.id);
    if (t?.length) op.themes = t.slice(0, 4);
  }

  // 8. write -----------------------------------------------------------------
  const totalAvailable = 933857; // aggregate public/archive target used by the Poetry Cloud shell
  const bundle = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'chinese-poetry/chinese-poetry (公有領域)',
      sourceUrl: 'https://github.com/chinese-poetry/chinese-poetry',
      scannedPoems: totalScanned,
      totalAvailablePoems: totalAvailable,
      poets: outPoets.length,
      poemsWithText: outPoems.length,
      edges: edges.length
    },
    poets: outPoets,
    edges,
    poems: outPoems
  };
  const outFile = path.join(OUT_DIR, 'poetry-corpus.json');
  fs.writeFileSync(outFile, JSON.stringify(bundle));
  const mb = (fs.statSync(outFile).size / 1048576).toFixed(2);
  console.log('\n✅ 完成');
  console.log(`   詩人節點 ${outPoets.length} ・ 關係 ${edges.length} ・ 全文詩 ${outPoems.length}`);
  console.log(`   掃描 ${totalScanned} 首 / 公開語料約 ${totalAvailable.toLocaleString()} 首`);
  console.log(`   輸出 ${path.relative(process.cwd(), outFile)} (${mb} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
