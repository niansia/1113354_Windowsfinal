// 詩雲虛空引擎 / Poetry Cloud "void" engine.
//
// After Liu Cixin's 詩云: every point in space encodes a possible poem. Real
// poems are bright stars; the dark space between them is the set of *all
// possible* poems. Clicking the void "fishes" the poem that lives at that
// coordinate — deterministically decoded from the coordinate itself, so the
// same spot always yields the same poem (mostly noise, occasionally uncanny).

export type VoidForm = '五絕' | '七絕' | '五律' | '七律' | '自由';

// frequent characters in classical Chinese verse — keeps fished poems readable
// instead of full of rare/garbled glyphs (the reference's 常用字 idea).
const COMMON =
  '春花秋月夜風雲雨雪山水江河海天地人心情愁思夢酒醉歌詩書劍馬舟車' +
  '日明星光影露霜煙波濤峰崖石松竹梅蘭菊柳桃李梨杏草木林泉溪谷洞庭' +
  '鳥雁燕鶯鶴鴻鴉鵲魚龍虎鹿猿蟬蝶蜂鴛鴦雙飛鳴啼宿棲歸去來還行遊望' +
  '登臨眺賞醉吟詠嘆惜憐愛恨別離逢遇尋訪寄贈懷憶念思鄉客旅愁孤獨寒暖' +
  '紅綠青白黃紫金銀玉珠翠碧丹素清濁淺深高低遠近長短輕重虛實有無生死' +
  '東西南北中上下前後左右古今朝暮晨昏曉夕年歲時節春夏秋冬寒暑陰晴' +
  '君王侯相將兵民家國天下乾坤宇宙陰陽五行仁義禮智信道德文章經史子集' +
  '一二三千萬重九十百層樓臺閣榭亭橋宮殿城郭門戶窗簾帳幕燈燭香爐琴瑟';

const FORM_SHAPE: Record<VoidForm, { lines: number; per: number }> = {
  五絕: { lines: 4, per: 5 },
  七絕: { lines: 4, per: 7 },
  五律: { lines: 8, per: 5 },
  七律: { lines: 8, per: 7 },
  自由: { lines: 0, per: 0 }
};

const hashCoord = (x: number, y: number, z: number, salt: number) => {
  let h = 2166136261 ^ salt;
  const mix = (v: number) => {
    h ^= Math.round(v * 16.7) | 0;
    h = Math.imul(h, 16777619) >>> 0;
  };
  mix(x);
  mix(y);
  mix(z);
  return h >>> 0;
};

const rngFrom = (seed: number) => {
  let v = seed >>> 0 || 1;
  return () => {
    v = (Math.imul(v, 1664525) + 1013904223) >>> 0;
    return v / 4294967296;
  };
};

export interface FishedPoem {
  form: VoidForm;
  lines: string[];
  code: string; // the "全集編號" of this poem
}

/** Decode the poem that lives at a void coordinate, for the given form. */
export function fishFromCoord(x: number, y: number, z: number, form: VoidForm): FishedPoem {
  const seed = hashCoord(x, y, z, form.charCodeAt(0));
  const rnd = rngFrom(seed);
  const shape = FORM_SHAPE[form];
  const lineCount = shape.lines || 2 + Math.floor(rnd() * 4); // 自由: 2–5 lines
  const lines: string[] = [];
  for (let i = 0; i < lineCount; i += 1) {
    const per = shape.per || 4 + Math.floor(rnd() * 5); // 自由: 4–8 chars
    let line = '';
    for (let j = 0; j < per; j += 1) line += COMMON[Math.floor(rnd() * COMMON.length)];
    lines.push(line);
  }
  // a long deterministic "全集編號" derived from the coordinate (flavour)
  let code = '';
  let c = seed;
  for (let i = 0; i < 48; i += 1) {
    c = (Math.imul(c, 1103515245) + 12345) >>> 0;
    code += (c % 10).toString();
  }
  return { form, lines, code };
}

export const VOID_FORMS: VoidForm[] = ['五絕', '七絕', '五律', '七律', '自由'];
