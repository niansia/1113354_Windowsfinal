// Generate IMAGES.md -- the list of every marker image the user can supply, with a
// suggested search term, grouped by region. Run:  node tools/gen_manifest.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { COUNTRIES, CATEGORIES, REGIONS } from '../web/data.js';

const here = dirname(fileURLToPath(import.meta.url));
const catName = Object.fromEntries(CATEGORIES.map((c) => [c.id, `${c.zh} ${c.en}`]));

let total = 0;
const out = [
  '# Cultura — 圖片清單 / Image manifest',
  '',
  '把圖片放進 `web/images/`，檔名用下面列的名稱，重新開啟應用即可顯示在地球上對應位置。',
  'Drop images into `web/images/` using the filenames below; restart the app to see them on the globe.',
  '',
  '- `<id>.jpg` = 該國主圖標 (hero) ; `<id>-N.jpg` = 該國的第 N 個文化條目。',
  '- 格式 / formats: .jpg .jpeg .png .webp ；建議橫向、約 600×400 以上。',
  ''
];

const byRegion = {};
for (const co of COUNTRIES) (byRegion[co.region] ||= []).push(co);

for (const [rid, r] of Object.entries(REGIONS)) {
  const list = byRegion[rid] || [];
  if (!list.length) continue;
  out.push(`\n## ${r.zh} / ${r.en}  (${list.length})`);
  for (const co of list) {
    out.push(`\n### ${co.zh} / ${co.en}  \`${co.id}\``);
    out.push(`- \`${co.id}.jpg\` — 主圖標 hero. 搜尋/Search: "${co.en} iconic landmark"`);
    total += 1;
    co.items.forEach((it, i) => {
      out.push(`- \`${co.id}-${i + 1}.jpg\` — ${it.zh} / ${it.en} (${catName[it.cat]}). 搜尋/Search: "${co.en} ${it.en}"`);
      total += 1;
    });
  }
}

out.splice(7, 0, `共 **${total}** 個可選圖片（${COUNTRIES.length} 國）。Total **${total}** optional images across ${COUNTRIES.length} countries.`, '');

writeFileSync(join(here, '..', 'IMAGES.md'), out.join('\n') + '\n', 'utf-8');
console.log(`wrote IMAGES.md (${total} images, ${COUNTRIES.length} countries)`);
