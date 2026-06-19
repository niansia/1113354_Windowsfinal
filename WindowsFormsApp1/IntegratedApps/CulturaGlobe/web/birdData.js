// World-birds dataset -- 48 signature species across 7 regions. Everything is
// self-contained: `art` drives the procedural illustrator (birdArt.js), `song`/`call`
// drive the synth (birdSong.js; song = spring/summer breeding song, call = the
// shorter autumn/winter voice), and migrants carry `seasonPos` so they MOVE with the
// season switcher (the Arctic Tern famously flies pole to pole).

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

export const BIRD_REGIONS = {
  asia: { zh: '亞洲', en: 'Asia' },
  europe: { zh: '歐洲', en: 'Europe' },
  africa: { zh: '非洲', en: 'Africa' },
  namerica: { zh: '北美洲', en: 'N. America' },
  samerica: { zh: '南美洲', en: 'S. America' },
  oceania: { zh: '大洋洲', en: 'Oceania' },
  polar: { zh: '極地', en: 'Polar' }
};

// syllable shorthands
const w = (f0, f1, d, x = {}) => ({ t: 'whistle', f0, f1, d, ...x });
const tr = (f0, depth, d, rate, x = {}) => ({ t: 'trill', f0, f1: depth, d, rate, ...x });
const ch = (f0, f1, d, x = {}) => ({ t: 'chirp', f0, f1, d, ...x });
const ho = (f0, d, x = {}) => ({ t: 'hoot', f0, d, ...x });
const ra = (f0, d, x = {}) => ({ t: 'rasp', f0, d, ...x });
const hk = (f0, d, x = {}) => ({ t: 'honk', f0, d, ...x });
const rest = (d) => ({ t: 'rest', d });

const B = (id, zh, en, region, pos, o) => ({
  id, zh, en, region, pos,
  seasons: o.seasons || SEASONS,
  seasonPos: o.seasonPos || {},
  art: o.art, song: o.song, call: o.call, dZh: o.dZh, dEn: o.dEn
});

export const BIRDS = [
  /* ---------------- 亞洲 ---------------- */
  B('twmagpie', '台灣藍鵲', 'Taiwan Blue Magpie', 'asia', [23.8, 121.0], {
    art: { shape: 'songbird', body: '#1f4d8f', belly: '#2a5ca3', head: '#16161c', wing: '#1a4076', tail: '#1f4d8f', beak: '#c8372d', legs: '#c8372d', tailLenMul: 2.0 },
    song: [ra(1500, 0.1, { n: 4, gap: 0.05 }), ch(1900, 1100, 0.12, { n: 3, gap: 0.08 })],
    dZh: '台灣特有種，寶藍長尾成列飛行，被暱稱「長尾山娘」。',
    dEn: 'A Taiwan endemic; cobalt blue with a sweeping tail, nicknamed the long-tailed mountain lady.'
  }),
  B('crane', '丹頂鶴', 'Red-crowned Crane', 'asia', [46.8, 132.8], {
    seasonPos: { winter: [35.2, 126.5], autumn: [40.5, 124.0] },
    art: { shape: 'crane', body: '#f3efe6', belly: '#ffffff', head: '#f3efe6', neckCol: '#1d1d22', wing: '#23232a', tail: '#23232a', beak: '#9a9456', legs: '#3a3a40', crest: 1, crestCol: '#c8372d' },
    song: [hk(950, 0.3, { n: 2, gap: 0.12 }), hk(700, 0.38)],
    call: [hk(820, 0.25, { n: 2, gap: 0.2 })],
    dZh: '頭頂一點朱紅，東亞濕地的長壽象徵，冬季南遷朝鮮半島。',
    dEn: 'A red cap on snowy plumage; East Asia symbol of longevity, wintering on the Korean peninsula.'
  }),
  B('hoopoe', '戴勝', 'Eurasian Hoopoe', 'asia', [34.5, 108.9], {
    art: { shape: 'songbird', body: '#d8a06a', belly: '#e8c39a', head: '#d8a06a', wing: '#2b2b30', wingBar: '#f3efe6', tail: '#2b2b30', beak: '#5a4a3a', legs: '#7a6a55', crest: 2, crestCol: '#d07a3a', beakLenMul: 1.6 },
    song: [ho(640, 0.14, { n: 3, gap: 0.07 }), rest(0.3), ho(640, 0.14, { n: 3, gap: 0.07 })],
    dZh: '橘色羽冠如摺扇展開，鳴聲「呼-呼-呼」低柔有節。',
    dEn: 'Fans open an orange crest; sings a soft hollow oop-oop-oop.'
  }),
  B('ibis', '朱鹮', 'Crested Ibis', 'asia', [33.5, 107.5], {
    art: { shape: 'crane', body: '#efd0c8', belly: '#f6e4de', head: '#dd5448', neckCol: '#efd0c8', wing: '#e2aea4', tail: '#e2aea4', beak: '#3a3a40', legs: '#c0564a', beakLenMul: 1.5, neckMul: 0.85 },
    song: [ra(520, 0.18, { n: 3, gap: 0.12 })],
    dZh: '曾近滅絕的「東方寶石」，淡粉羽色與緋紅面頰。',
    dEn: 'The oriental gem once nearly extinct; pale rose plumage and a crimson face.'
  }),
  B('mandarin', '鴛鴦', 'Mandarin Duck', 'asia', [40.0, 116.4], {
    seasonPos: { winter: [26.1, 119.3] },
    art: { shape: 'duck', body: '#b4663a', belly: '#e8d9c0', head: '#2c5d4f', patch: '#d8a06a', wing: '#3a5a8f', tail: '#6a4a30', beak: '#c8372d', legs: '#caa64a' },
    song: [w(1900, 1500, 0.18, { n: 2, gap: 0.15 })],
    dZh: '雄鳥彩羽如調色盤，東方文化中的成雙意象。',
    dEn: 'The drake is a living palette; an Eastern emblem of devoted pairs.'
  }),
  B('cuckoo', '大杜鵑', 'Common Cuckoo', 'asia', [45.0, 100.0], {
    seasons: ['spring', 'summer'],
    art: { shape: 'songbird', body: '#8a8f98', belly: '#e8e6e0', head: '#8a8f98', wing: '#6a7078', tail: '#5a6068', beak: '#caa64a', legs: '#caa64a', tailLenMul: 1.3 },
    song: [ho(740, 0.2), ho(590, 0.26), rest(0.35), ho(740, 0.2), ho(590, 0.26)],
    dZh: '春日「布穀、布穀」的二音報時鐘，巢寄生的旅者。',
    dEn: 'The two-note cu-ckoo clock of spring, and a brood-parasitic traveller.'
  }),
  B('kingfisher', '翠鳥', 'Common Kingfisher', 'asia', [30.2, 120.2], {
    art: { shape: 'kingfisher', body: '#1f8fa8', belly: '#d07a3a', head: '#1f8fa8', patch: '#d07a3a', wing: '#16708a', tail: '#1f8fa8', beak: '#2b2b30', legs: '#c8372d' },
    song: [ch(4200, 5600, 0.08, { n: 3, gap: 0.06 })],
    dZh: '河畔的藍色閃電，俯衝入水叼魚的瞬間最是耀眼。',
    dEn: 'A turquoise lightning bolt along the stream, diving for fish.'
  }),
  B('pheasant', '紅腹錦雞', 'Golden Pheasant', 'asia', [33.0, 104.0], {
    art: { shape: 'songbird', body: '#c8372d', belly: '#d24a30', head: '#e8b54a', wing: '#2c5d8f', tail: '#9a7a4a', beak: '#caa64a', legs: '#caa64a', crest: 2, crestCol: '#e8b54a', tailLenMul: 2.2, sizeMul: 1.05 },
    song: [ra(1800, 0.13, { n: 2, gap: 0.1 })],
    dZh: '金冠紅身的山林錦衣，傳說中鳳凰的原型之一。',
    dEn: 'Gold crown over scarlet silk; one origin of the phoenix legend.'
  }),

  /* ---------------- 歐洲 ---------------- */
  B('robin', '歐亞鴝', 'European Robin', 'europe', [51.5, -0.1], {
    art: { shape: 'songbird', body: '#8a7a62', belly: '#e8e2d2', head: '#8a7a62', throat: '#d0603a', patch: '#d0603a', wing: '#74664f', tail: '#74664f', beak: '#4a4038', legs: '#7a6a55' },
    song: [w(2400, 3100, 0.16), w(3300, 2200, 0.2), tr(2800, 300, 0.22, 26), w(2000, 2700, 0.15), rest(0.2), tr(3100, 350, 0.2, 30)],
    call: [ch(4200, 4400, 0.05, { n: 4, gap: 0.12 })],
    dZh: '紅胸的花園歌者，英國人心中的聖誕信使。',
    dEn: 'The red-breasted garden singer, Britain Christmas messenger.'
  }),
  B('nightingale', '夜鶯', 'Common Nightingale', 'europe', [44.5, 11.3], {
    seasons: ['spring', 'summer'],
    art: { shape: 'songbird', body: '#9a8468', belly: '#ddd4c0', head: '#9a8468', wing: '#86735a', tail: '#a06a4a', beak: '#5a4a3a', legs: '#8a7a62' },
    song: [w(2200, 2200, 0.1, { n: 5, gap: 0.07 }), ho(820, 0.12, { n: 4, gap: 0.08 }), tr(3000, 500, 0.3, 24), w(1800, 3400, 0.25), rest(0.2), tr(2600, 400, 0.28, 28)],
    dZh: '入夜後的不眠歌王，樂句千變萬化、徹夜婉轉。',
    dEn: 'The sleepless king of song, fluting endlessly through the dark.'
  }),
  B('greattit', '大山雀', 'Great Tit', 'europe', [48.8, 2.3], {
    art: { shape: 'songbird', body: '#9aa84a', belly: '#e8d54a', head: '#1d1d22', patch: '#f3efe6', wing: '#5a7a9a', tail: '#5a7a9a', beak: '#2b2b30', legs: '#6a7078' },
    song: [w(3800, 3800, 0.11), w(2900, 2900, 0.13), rest(0.06), w(3800, 3800, 0.11), w(2900, 2900, 0.13), rest(0.06), w(3800, 3800, 0.11), w(2900, 2900, 0.13)],
    call: [ch(3600, 4000, 0.06, { n: 3, gap: 0.08 })],
    dZh: '黑頭白頰黃肚，鳴聲像不停喊「老師、老師」。',
    dEn: 'Black cap, white cheeks, yellow belly -- singing tea-cher, tea-cher.'
  }),
  B('stork', '白鸛', 'White Stork', 'europe', [52.5, 13.4], {
    seasonPos: { winter: [-15.0, 25.0], autumn: [30.0, 31.0] },
    art: { shape: 'crane', body: '#f3efe6', belly: '#ffffff', head: '#f3efe6', neckCol: '#f3efe6', wing: '#23232a', tail: '#23232a', beak: '#c8372d', legs: '#c8372d', beakLenMul: 1.2 },
    song: [ra(180, 0.045, { n: 14, gap: 0.03 })],
    dZh: '屋頂築巢的送子鳥，不會鳴叫、以上下喙快速敲擊「嗒嗒」交談。',
    dEn: 'The roof-nesting baby-bringer; voiceless, it talks by clattering its bill.'
  }),
  B('skylark', '雲雀', 'Eurasian Skylark', 'europe', [47.0, 19.0], {
    seasons: ['spring', 'summer', 'autumn'],
    art: { shape: 'songbird', body: '#b09a72', belly: '#e6dcc4', head: '#b09a72', wing: '#96815c', tail: '#7a6a4f', beak: '#8a7a62', legs: '#b09a72', crest: 1, crestCol: '#9a8460', spots: '#8a744f' },
    song: [tr(3400, 500, 0.28, 30), ch(3000, 3800, 0.07, { n: 6, gap: 0.04 }), tr(3800, 420, 0.3, 26), ch(3400, 4200, 0.07, { n: 5, gap: 0.04 })],
    dZh: '直上雲端懸停而歌，田野上空灑落不斷線的音符。',
    dEn: 'Hovers high over the fields, spilling an unbroken thread of song.'
  }),
  B('tawnyowl', '灰林鴞', 'Tawny Owl', 'europe', [54.0, -2.0], {
    art: { shape: 'owl', body: '#a08055', belly: '#d8c8a8', head: '#96764d', wing: '#86684a', tail: '#86684a', beak: '#caa64a', legs: '#b8a888', spots: '#6a563a', eyeRing: '#d8c8a8' },
    song: [ho(380, 0.5), rest(0.5), ho(400, 0.15), rest(0.12), ho(360, 0.85)],
    call: [ch(1300, 1100, 0.18, { n: 2, gap: 0.3 })],
    dZh: '夜林裡的「呼——呼嗚——」，英倫童話的守夜人。',
    dEn: 'The hu-hooo of the night wood, watchman of British tales.'
  }),
  B('blackbird', '烏鶇', 'Eurasian Blackbird', 'europe', [50.1, 8.7], {
    art: { shape: 'songbird', body: '#1d1d22', belly: '#26262c', head: '#1d1d22', wing: '#16161c', tail: '#16161c', beak: '#e8a83a', legs: '#3a3a40', eyeRing: '#e8a83a' },
    song: [w(1700, 2300, 0.24), w(2500, 1900, 0.28), w(2100, 2700, 0.2), tr(2400, 250, 0.2, 14), rest(0.25), w(1900, 2500, 0.26)],
    dZh: '黃喙黑衣的庭園笛手，黃昏屋脊上的圓潤獨奏。',
    dEn: 'Yellow-billed flautist in black, soloing from rooftops at dusk.'
  }),

  /* ---------------- 非洲 ---------------- */
  B('crownedcrane', '灰冠鶴', 'Grey Crowned Crane', 'africa', [0.3, 32.6], {
    art: { shape: 'crane', body: '#7a8088', belly: '#8a9098', head: '#2b2b30', neckCol: '#9aa0a8', wing: '#e8e2d2', tail: '#5a6068', beak: '#3a3a40', legs: '#3a3a40', crest: 2, crestCol: '#e8cf7a', patch: '#c8372d' },
    song: [hk(520, 0.28, { n: 2, gap: 0.2 }), rest(0.25), hk(560, 0.3)],
    dZh: '頭戴金色針冠的草原舞者，烏干達的國鳥。',
    dEn: 'A golden-crowned savanna dancer; national bird of Uganda.'
  }),
  B('greyparrot', '非洲灰鸚鵡', 'African Grey Parrot', 'africa', [0.4, 9.5], {
    art: { shape: 'parrot', body: '#8a8f98', belly: '#a8adb4', head: '#9aa0a8', patch: '#e8e6e0', wing: '#74787f', tail: '#c8372d', beak: '#2b2b30', legs: '#6a7078', tailLenMul: 0.55 },
    song: [w(1500, 2500, 0.18), ch(900, 1800, 0.12, { n: 2, gap: 0.1 }), w(2200, 2200, 0.25, { vib: 6 }), rest(0.2), ch(2400, 1400, 0.15)],
    dZh: '世界最聰明的學舌者，能精準模仿人聲與哨音。',
    dEn: 'The world cleverest mimic, echoing voices and whistles precisely.'
  }),
  B('beeeater', '胭脂蜂虎', 'Southern Carmine Bee-eater', 'africa', [-15.4, 28.3], {
    art: { shape: 'songbird', body: '#c0455a', belly: '#cf5a6a', head: '#1f7a8a', wing: '#a83a4e', tail: '#a83a4e', beak: '#2b2b30', legs: '#7a6a55', tailLenMul: 1.5 },
    song: [ch(1300, 1500, 0.09, { n: 5, gap: 0.1 })],
    dZh: '胭脂紅的掠蜂高手，群聚河岸沙壁鑿洞而居。',
    dEn: 'Carmine acrobats hawking bees, nesting in riverbank colonies.'
  }),
  B('shoebill', '鯨頭鸛', 'Shoebill', 'africa', [-6.0, 29.5], {
    art: { shape: 'crane', body: '#7a8590', belly: '#8a95a0', head: '#7a8590', neckCol: '#7a8590', wing: '#65707b', tail: '#65707b', beak: '#c8a86a', legs: '#3a3a40', beakLenMul: 1.1, neckMul: 0.7, sizeMul: 1.1 },
    song: [ra(140, 0.055, { n: 16, gap: 0.03 })],
    dZh: '木鞋般的巨喙與雕像站姿，沼澤裡的史前臉孔。',
    dEn: 'A clog-sized bill and statue stillness -- a prehistoric face of the marsh.'
  }),
  B('roller', '紫胸佛法僧', 'Lilac-breasted Roller', 'africa', [-2.3, 34.8], {
    art: { shape: 'songbird', body: '#2f8fb0', belly: '#b07ab0', head: '#8fae6a', throat: '#b07ab0', wing: '#2566a0', tail: '#2566a0', beak: '#2b2b30', legs: '#7a6a55', tailLenMul: 1.3 },
    song: [ra(1000, 0.13, { n: 4, gap: 0.08 }), ch(1200, 1600, 0.1, { n: 2, gap: 0.08 })],
    dZh: '紫胸藍翼的草原寶石，求偶時翻滾俯衝如特技。',
    dEn: 'A lilac-and-azure gem, tumbling through aerobatic display dives.'
  }),
  B('fisheagle', '非洲魚鵰', 'African Fish Eagle', 'africa', [-1.3, 36.8], {
    art: { shape: 'raptor', body: '#6a4a30', belly: '#7a5638', head: '#f3efe6', neckCol: '#f3efe6', wing: '#54381f', tail: '#f3efe6', beak: '#e8b54a', legs: '#e8cf7a' },
    song: [w(1200, 800, 0.3), ch(900, 1300, 0.14, { n: 3, gap: 0.09 })],
    dZh: '湖畔仰首長唳，被稱為「非洲之聲」的白頭漁獵者。',
    dEn: 'Head thrown back in a ringing cry -- the very voice of Africa.'
  }),
  B('ostrich', '鴕鳥', 'Common Ostrich', 'africa', [-23.0, 18.0], {
    art: { shape: 'ratite', body: '#2b2b30', belly: '#3a3a40', head: '#d8b89a', neckCol: '#d8b89a', wing: '#3f3f46', tail: '#f3efe6', beak: '#b09a72', legs: '#d8b89a', sizeMul: 1.15 },
    song: [ho(110, 0.5, { n: 3, gap: 0.28 })],
    dZh: '世上最大的鳥，雄鳥夜裡發出獅吼般的低頻轟鳴。',
    dEn: 'The largest living bird; males boom at night like distant lions.'
  }),

  /* ---------------- 北美洲 ---------------- */
  B('cardinal', '北美紅雀', 'Northern Cardinal', 'namerica', [38.6, -90.2], {
    art: { shape: 'songbird', body: '#c0392b', belly: '#cf4a36', head: '#c0392b', patch: '#2b2b30', wing: '#a8301f', tail: '#a8301f', beak: '#e8703a', legs: '#8a7a62', crest: 1, crestCol: '#c0392b' },
    song: [w(2200, 1400, 0.28, { n: 3, gap: 0.12 }), ch(1400, 2400, 0.11, { n: 5, gap: 0.07 })],
    call: [ch(4400, 4600, 0.05, { n: 3, gap: 0.2 })],
    dZh: '雪地裡的一抹烈紅，鳴唱嘹亮的「啾兒、啾兒」。',
    dEn: 'A blaze of red on snow, whistling clear cheer-cheer phrases.'
  }),
  B('bluejay', '藍松鴉', 'Blue Jay', 'namerica', [43.7, -79.4], {
    art: { shape: 'songbird', body: '#3a6ab0', belly: '#e8e6e0', head: '#3a6ab0', throat: '#2b2b30', wing: '#2c558f', wingBar: '#f3efe6', tail: '#2c558f', beak: '#2b2b30', legs: '#3a3a40', crest: 1, crestCol: '#3a6ab0' },
    song: [ra(1100, 0.18, { n: 2, gap: 0.12 }), rest(0.2), w(2000, 2500, 0.18, { n: 2, gap: 0.1 })],
    dZh: '機警聒噪的藍色守望者，會模仿老鷹叫聲嚇走對手。',
    dEn: 'A noisy blue sentinel that mimics hawks to clear the feeder.'
  }),
  B('hummingbird', '紅喉北蜂鳥', 'Ruby-throated Hummingbird', 'namerica', [40.7, -80.0], {
    seasonPos: { winter: [18.0, -94.5], autumn: [28.0, -90.0] },
    art: { shape: 'hummingbird', body: '#3f7a4a', belly: '#dfe2d0', head: '#3f7a4a', throat: '#c0392b', wing: '#35663d', tail: '#2c553a', beak: '#2b2b30', legs: '#3a3a40' },
    song: [ch(4500, 5200, 0.05, { n: 8, gap: 0.04 }), tr(4800, 600, 0.18, 36)],
    dZh: '每秒振翅五十次的紅喉小精靈，秋天獨自飛越墨西哥灣。',
    dEn: 'Fifty wingbeats a second; crosses the Gulf of Mexico alone each fall.'
  }),
  B('baldeagle', '白頭海鵰', 'Bald Eagle', 'namerica', [58.3, -134.4], {
    art: { shape: 'raptor', body: '#4a3826', belly: '#54402c', head: '#f3efe6', neckCol: '#f3efe6', wing: '#3a2c1d', tail: '#f3efe6', beak: '#e8b54a', legs: '#e8cf7a', sizeMul: 1.1 },
    song: [ch(2400, 3200, 0.09, { n: 6, gap: 0.06 })],
    dZh: '美國的國鳥，外型威武、叫聲卻是出乎意料的細碎哨音。',
    dEn: 'The US national bird -- mighty to look at, squeaky to hear.'
  }),
  B('mockingbird', '小嘲鶇', 'Northern Mockingbird', 'namerica', [30.3, -97.7], {
    art: { shape: 'songbird', body: '#9aa0a8', belly: '#dcdcd4', head: '#9aa0a8', wing: '#7a8088', wingBar: '#f3efe6', tail: '#5a6068', beak: '#3a3a40', legs: '#5a6068', tailLenMul: 1.35 },
    song: [w(2500, 3200, 0.14, { n: 3, gap: 0.08 }), tr(2000, 320, 0.18, 18, { n: 3, gap: 0.08 }), ch(1500, 2800, 0.1, { n: 3, gap: 0.07 }), ra(900, 0.1, { n: 2, gap: 0.08 })],
    dZh: '一隻鳥就是一座森林——把鄰居的歌全部學起來連唱三遍。',
    dEn: 'One bird, a whole forest: it steals every neighbour song and sings each thrice.'
  }),
  B('loon', '普通潛鳥', 'Common Loon', 'namerica', [50.5, -90.0], {
    seasonPos: { winter: [30.5, -77.0] },
    art: { shape: 'duck', body: '#23232a', belly: '#e8e6e0', head: '#16161c', throat: '#f3efe6', wing: '#2f2f36', spots: '#e8e6e0', tail: '#23232a', beak: '#2b2b30', legs: '#3a3a40' },
    song: [w(620, 880, 1.0, { vib: 5 }), w(880, 620, 0.7), rest(0.3), w(700, 980, 0.8, { vib: 6 })],
    dZh: '北方湖泊的幽幽長嘯，夏夜裡最孤寂優美的聲音。',
    dEn: 'The haunting wail of northern lakes on a summer night.'
  }),
  B('goldfinch', '美洲金翅雀', 'American Goldfinch', 'namerica', [41.9, -87.7], {
    art: { shape: 'songbird', body: '#e8c83a', belly: '#f0d54a', head: '#e8c83a', patch: '#2b2b30', wing: '#2b2b30', wingBar: '#f3efe6', tail: '#2b2b30', beak: '#d8a06a', legs: '#b09a72', sizeMul: 0.85 },
    song: [ch(2800, 3600, 0.08, { n: 4, gap: 0.05 }), rest(0.15), ch(3200, 2400, 0.1, { n: 3, gap: 0.06 }), tr(3400, 380, 0.2, 24)],
    dZh: '檸檬黃的小太陽，波浪飛行時一路灑下輕快音符。',
    dEn: 'A lemon-bright sunbeam, chipping po-ta-to-chip in bouncing flight.'
  }),

  /* ---------------- 南美洲 ---------------- */
  B('macaw', '緋紅金剛鸚鵡', 'Scarlet Macaw', 'samerica', [-3.5, -62.0], {
    art: { shape: 'parrot', body: '#c0392b', belly: '#cf4a36', head: '#c0392b', patch: '#f3efe6', wing: '#e8b54a', tail: '#c0392b', beak: '#e8e6e0', legs: '#3a3a40', tailLenMul: 1.25, sizeMul: 1.08 },
    song: [ra(800, 0.32, { n: 2, gap: 0.18, g: 0.2 })],
    dZh: '亞馬遜樹冠的紅黃藍三原色，叫聲粗獷響徹雨林。',
    dEn: 'Primary colours over the Amazon canopy, with a raucous jungle screech.'
  }),
  B('toucan', '托哥巨嘴鳥', 'Toco Toucan', 'samerica', [-15.8, -47.9], {
    art: { shape: 'kingfisher', body: '#1d1d22', belly: '#23232a', head: '#1d1d22', throat: '#f3efe6', wing: '#16161c', tail: '#16161c', beak: '#e8861f', legs: '#5a7a9a', beakLenMul: 1.7, eyeRing: '#e8861f' },
    song: [ra(420, 0.2, { n: 6, gap: 0.12 })],
    dZh: '橘色大嘴占了身長三分之一，咕噥如雨林裡的蛙鳴。',
    dEn: 'An orange bill a third of its length, croaking like a frog in the canopy.'
  }),
  B('condor', '安地斯神鷹', 'Andean Condor', 'samerica', [-13.2, -72.5], {
    art: { shape: 'raptor', body: '#1d1d22', belly: '#26262c', head: '#c89a8a', neckCol: '#f3efe6', wing: '#16161c', wingBar: '#e8e6e0', tail: '#16161c', beak: '#d8c8a8', legs: '#7a8088', sizeMul: 1.2 },
    song: [ra(300, 0.4, { g: 0.08 }), rest(0.3), ra(260, 0.3, { g: 0.07 })],
    dZh: '三公尺翼展乘著安地斯氣流，幾乎不需振翅的天空王者。',
    dEn: 'Three metres of wing riding Andean thermals, barely ever flapping.'
  }),
  B('cockrock', '安地斯動冠傘鳥', 'Andean Cock-of-the-rock', 'samerica', [-12.0, -75.0], {
    art: { shape: 'songbird', body: '#e8702a', belly: '#ef7e36', head: '#e8702a', wing: '#26262c', tail: '#26262c', beak: '#e8b54a', legs: '#b09a72', crest: 1, crestCol: '#e8702a' },
    song: [ra(950, 0.2, { n: 2, gap: 0.12 }), ch(1100, 700, 0.22)],
    dZh: '頂著半月形橘冠在崖壁開求偶舞會，秘魯的國鳥。',
    dEn: 'Half-moon crest at cliff-side dance courts; national bird of Peru.'
  }),
  B('hoatzin', '麝雉', 'Hoatzin', 'samerica', [-3.7, -73.2], {
    art: { shape: 'songbird', body: '#8a6a45', belly: '#caa64a', head: '#8a6a45', patch: '#5a7a9a', wing: '#74583a', tail: '#74583a', beak: '#5a4a3a', legs: '#7a6a55', crest: 2, crestCol: '#d8a06a', tailLenMul: 1.5, sizeMul: 1.05 },
    song: [ra(500, 0.16, { n: 4, gap: 0.1 })],
    dZh: '幼鳥翅上有爪、以樹葉發酵為食的「恐龍鳥」。',
    dEn: 'Clawed chicks and a leaf-fermenting crop -- the dinosaur bird.'
  }),
  B('flamingo', '智利紅鸛', 'Chilean Flamingo', 'samerica', [-23.5, -68.0], {
    art: { shape: 'crane', body: '#e89aa0', belly: '#f0aab0', head: '#e89aa0', neckCol: '#e89aa0', wing: '#d8707e', tail: '#d8707e', beak: '#3a3a40', legs: '#c8a0a8', neckMul: 1.15, beakLenMul: 0.8 },
    song: [hk(650, 0.14, { n: 4, gap: 0.08 })],
    dZh: '高原鹽湖上的粉紅長隊，像鵝群一樣此起彼落地鳴叫。',
    dEn: 'Pink ranks on altiplano salt lakes, honking like geese.'
  }),
  B('swordbill', '劍嘴蜂鳥', 'Sword-billed Hummingbird', 'samerica', [0.2, -78.5], {
    art: { shape: 'hummingbird', body: '#3f7a4a', belly: '#9aa86a', head: '#5a8a4a', wing: '#35663d', tail: '#2c553a', beak: '#2b2b30', legs: '#3a3a40', beakLenMul: 1.9 },
    song: [ch(5200, 6000, 0.05, { n: 7, gap: 0.05 })],
    dZh: '世上唯一喙比身體還長的鳥，為深筒花朵量身打造。',
    dEn: 'The only bird with a bill longer than its body, made for deep flowers.'
  }),

  /* ---------------- 大洋洲 ---------------- */
  B('kookaburra', '笑翠鳥', 'Laughing Kookaburra', 'oceania', [-33.9, 151.2], {
    art: { shape: 'kingfisher', body: '#b09a72', belly: '#e8e2d2', head: '#e8e2d2', patch: '#6a563a', wing: '#5a7a9a', tail: '#9a7a4a', beak: '#5a4a3a', legs: '#7a6a55', sizeMul: 1.05 },
    song: [ch(600, 900, 0.12, { n: 4, gap: 0.12 }), ch(900, 1400, 0.1, { n: 6, gap: 0.06 }), ra(700, 0.16, { n: 5, gap: 0.07, g: 0.18 }), ch(1200, 800, 0.14, { n: 3, gap: 0.1 })],
    dZh: '黎明與黃昏放聲大笑的叢林鬧鐘，整群會接力合唱。',
    dEn: 'The bush alarm clock, laughing in chorus at dawn and dusk.'
  }),
  B('lyrebird', '華麗琴鳥', 'Superb Lyrebird', 'oceania', [-37.5, 145.3], {
    art: { shape: 'songbird', body: '#8a6a45', belly: '#a07a52', head: '#8a6a45', wing: '#74583a', tail: '#9a8468', beak: '#5a4a3a', legs: '#5a4a3a', tailLenMul: 2.6, sizeMul: 1.05 },
    song: [w(2000, 3500, 0.28), ra(1200, 0.13, { n: 2, gap: 0.08 }), tr(2600, 420, 0.28, 24), ch(800, 2400, 0.14, { n: 3, gap: 0.08 }), w(3500, 1500, 0.35)],
    dZh: '尾羽如七弦琴，能模仿快門、鏈鋸與整座森林的聲音。',
    dEn: 'A lyre-shaped tail and a repertoire of camera shutters, chainsaws, whole forests.'
  }),
  B('emu', '鴯鶓', 'Emu', 'oceania', [-25.0, 134.0], {
    art: { shape: 'ratite', body: '#74664f', belly: '#86735a', head: '#5a6a7a', neckCol: '#8a9098', wing: '#65583f', tail: '#65583f', beak: '#5a4a3a', legs: '#8a7a62', sizeMul: 1.1 },
    song: [ho(95, 0.3, { n: 5, gap: 0.3 })],
    dZh: '澳洲內陸的長跑者，雌鳥能發出傳得極遠的低頻鼓聲。',
    dEn: 'The outback long-runner; females drum a far-carrying boom.'
  }),
  B('kiwi', '奇異鳥', 'Southern Brown Kiwi', 'oceania', [-45.0, 167.7], {
    art: { shape: 'ratite', body: '#8a744f', belly: '#9a8460', head: '#8a744f', neckCol: '#8a744f', wing: '#7a6645', tail: '#6a563a', beak: '#c8b89a', legs: '#b09a72', sizeMul: 0.62, neckMul: 0.45, beakLenMul: 2.0 },
    song: [w(2400, 3400, 0.22, { n: 6, gap: 0.18 })],
    dZh: '紐西蘭的夜行國寶，毛髮般的羽毛與位於喙尖的鼻孔。',
    dEn: 'New Zealand nocturnal icon -- hair-like feathers, nostrils at the bill tip.'
  }),
  B('lorikeet', '彩虹吸蜜鸚鵡', 'Rainbow Lorikeet', 'oceania', [-27.5, 153.0], {
    art: { shape: 'parrot', body: '#3f8a4a', belly: '#e8861f', head: '#2c558f', throat: '#2c558f', wing: '#35763d', tail: '#3f8a4a', beak: '#d0603a', legs: '#5a6068', tailLenMul: 0.8, sizeMul: 0.9 },
    song: [ch(2800, 3400, 0.07, { n: 6, gap: 0.05 }), ra(2000, 0.09, { n: 2, gap: 0.06 })],
    dZh: '把彩虹穿在身上的花蜜食客，成群掠過時嘰喳震耳。',
    dEn: 'A rainbow in feathers, shrieking through the suburbs in nectar gangs.'
  }),
  B('cockatoo', '葵花鳳頭鸚鵡', 'Sulphur-crested Cockatoo', 'oceania', [-33.5, 150.0], {
    art: { shape: 'parrot', body: '#f3efe6', belly: '#faf7ee', head: '#f3efe6', wing: '#e8e2d2', tail: '#e8e2d2', beak: '#2b2b30', legs: '#5a6068', crest: 2, crestCol: '#e8c83a' },
    song: [ra(1300, 0.35, { n: 2, gap: 0.2, g: 0.2 })],
    dZh: '豎起檸檬黃冠羽的白色大嗓門，能活到八十歲。',
    dEn: 'A white loudmouth with a lemon crest, living to eighty.'
  }),
  B('tui', '圖伊鳥', 'Tui', 'oceania', [-41.3, 174.8], {
    art: { shape: 'songbird', body: '#1d2a26', belly: '#23332c', head: '#1d2a26', throat: '#f3efe6', wing: '#16201c', tail: '#16201c', beak: '#3a3a40', legs: '#3a3a40' },
    song: [ho(900, 0.1), ch(3000, 4200, 0.1), ra(700, 0.07, { n: 2, gap: 0.05 }), w(2200, 2400, 0.28, { vib: 7 }), rest(0.15), ch(3600, 2600, 0.12)],
    dZh: '喉前一簇白絨球，歌聲混合鈴音、咳聲與口哨。',
    dEn: 'A white throat-pouf and a song of bells, coughs and whistles.'
  }),

  /* ---------------- 極地 ---------------- */
  B('emperor', '皇帝企鵝', 'Emperor Penguin', 'polar', [-75.0, 0.0], {
    art: { shape: 'penguin', body: '#23232a', belly: '#f3efe6', head: '#16161c', patch: '#e8c83a', wing: '#2f2f36', tail: '#23232a', beak: '#3a3a40', legs: '#3a3a40', sizeMul: 1.1 },
    song: [tr(700, 200, 0.45, 12, { n: 2, gap: 0.25 })],
    dZh: '在零下六十度的南極寒冬孵蛋，以號角般的顫音呼喚伴侶。',
    dEn: 'Incubates through the minus-sixty Antarctic winter, trumpeting for its mate.'
  }),
  B('snowyowl', '雪鴞', 'Snowy Owl', 'polar', [72.0, -95.0], {
    seasonPos: { winter: [52.0, -100.0], autumn: [62.0, -97.0] },
    art: { shape: 'owl', body: '#f3efe6', belly: '#faf7ee', head: '#f3efe6', wing: '#e8e2d2', tail: '#e8e2d2', beak: '#2b2b30', legs: '#e8e2d2', spots: '#9aa0a8', eyeRing: '#e8c83a' },
    song: [ho(420, 0.3, { n: 3, gap: 0.25 })],
    call: [ra(800, 0.12, { n: 2, gap: 0.15 })],
    dZh: '凍原上的白色獵手，冬季南下尋食、曾因哈利波特聞名。',
    dEn: 'The tundra white hunter, irrupting south in winter; famous via Hedwig.'
  }),
  B('arctictern', '北極燕鷗', 'Arctic Tern', 'polar', [75.0, -20.0], {
    seasonPos: { winter: [-65.0, 60.0], spring: [30.0, -30.0], autumn: [-10.0, 10.0] },
    art: { shape: 'gull', body: '#dcdcd4', belly: '#eeeee6', head: '#1d1d22', wing: '#b8bcc0', tail: '#dcdcd4', beak: '#c8372d', legs: '#c8372d', tailLenMul: 1.3 },
    song: [ch(2600, 1900, 0.14, { n: 3, gap: 0.1 }), ch(3000, 2200, 0.1, { n: 2, gap: 0.08 })],
    dZh: '每年往返南北極七萬公里，一生追著夏天跑的遷徙之王。',
    dEn: 'Seventy thousand kilometres a year, pole to pole -- forever chasing summer.'
  }),
  B('puffin', '北極海鸚', 'Atlantic Puffin', 'polar', [64.1, -18.5], {
    seasonPos: { winter: [55.0, -30.0] },
    art: { shape: 'penguin', body: '#23232a', belly: '#f3efe6', head: '#23232a', patch: '#e8e6e0', wing: '#2f2f36', tail: '#23232a', beak: '#e8703a', legs: '#e8703a', sizeMul: 0.8, beakLenMul: 0.9 },
    song: [ra(280, 0.45, { n: 2, gap: 0.2, g: 0.1 })],
    dZh: '彩色大喙的「海中小丑」，地洞裡發出電鋸般的低吼。',
    dEn: 'The clown-billed seabird, growling like a tiny chainsaw in its burrow.'
  }),
  B('albatross', '漂泊信天翁', 'Wandering Albatross', 'polar', [-50.0, 70.0], {
    art: { shape: 'gull', body: '#f3efe6', belly: '#faf7ee', head: '#f3efe6', wing: '#2b2b30', tail: '#e8e2d2', beak: '#e8b5a0', legs: '#c8b89a', sizeMul: 1.15 },
    song: [w(1100, 1500, 0.45, { vib: 8 }), ch(1600, 1900, 0.1, { n: 3, gap: 0.08 })],
    dZh: '翼展三米半、可繞行南冰洋數月不落地的滑翔大師。',
    dEn: 'A 3.5-metre wingspan gliding the Southern Ocean for months on end.'
  })
];
