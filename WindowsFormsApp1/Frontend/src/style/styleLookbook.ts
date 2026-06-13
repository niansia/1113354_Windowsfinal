import type { OutfitLook } from './styleTypes.js';

const pexels = (id: number, w = 700) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

/**
 * Curated complete looks, each represented by a real outfit photo (Pexels,
 * free license) plus a recommended makeup palette that can be applied to the
 * selected face model. Several are red-carpet gowns (禮服).
 */
export const STYLE_LOOKBOOK: OutfitLook[] = [
  {
    id: 'red-carpet',
    name: '紅毯女神',
    mood: '正式紅毯',
    formal: true,
    photo: pexels(36707016),
    credit: 'ramyphotographer · Pexels',
    palette: {
      lipstickColor: '#6E2438', lipstickFinish: 'satin',
      eyeshadowColor: '#B87043', eyeshadowFinish: 'glow',
      blushColor: '#E66F6A', eyelinerEnabled: true
    }
  },
  {
    id: 'emerald-mermaid',
    name: '祖母綠晚宴',
    mood: '晚宴',
    formal: true,
    photo: pexels(18457620),
    credit: 'pittrom · Pexels',
    palette: {
      lipstickColor: '#A94362', lipstickFinish: 'glow',
      eyeshadowColor: '#1F6B52', eyeshadowFinish: 'satin',
      blushColor: '#C76F73', eyelinerEnabled: true
    }
  },
  {
    id: 'rose-couture',
    name: '粉霧高訂',
    mood: '紅毯',
    formal: true,
    photo: pexels(31604282),
    credit: 'Carlos Misael · Pexels',
    palette: {
      lipstickColor: '#E66F6A', lipstickFinish: 'glow',
      eyeshadowColor: '#E7A8C7', eyeshadowFinish: 'glow',
      blushColor: '#E88FA0', eyelinerEnabled: true
    }
  },
  {
    id: 'magenta-mermaid',
    name: '晶緻魚尾',
    mood: '晚宴',
    formal: true,
    photo: pexels(16612607),
    credit: 'dandu · Pexels',
    palette: {
      lipstickColor: '#9C4E7A', lipstickFinish: 'satin',
      eyeshadowColor: '#9A74B8', eyeshadowFinish: 'satin',
      blushColor: '#C9606B', eyelinerEnabled: true
    }
  },
  {
    id: 'golden-sequin',
    name: '流金晚宴',
    mood: '派對',
    formal: true,
    photo: pexels(18718948),
    credit: 'oluwakoreimage · Pexels',
    palette: {
      lipstickColor: '#6E2438', lipstickFinish: 'glow',
      eyeshadowColor: '#C9A24B', eyeshadowFinish: 'glow',
      blushColor: '#D97C7C', eyelinerEnabled: true
    }
  },
  {
    id: 'city-chic',
    name: '都會通勤',
    mood: '通勤',
    photo: pexels(3827700),
    credit: 'Umid Yakubov · Pexels',
    palette: {
      lipstickColor: '#A94362', lipstickFinish: 'satin',
      eyeshadowColor: '#B87043', eyeshadowFinish: 'matte',
      blushColor: '#D98A86', eyelinerEnabled: true
    }
  },
  {
    id: 'denim-cool',
    name: '率性丹寧',
    mood: '日常',
    photo: pexels(4219913),
    credit: 'Vinicius Wiesehofer · Pexels',
    palette: {
      lipstickColor: '#E8A178', lipstickFinish: 'satin',
      eyeshadowColor: '#E8A178', eyeshadowFinish: 'satin',
      blushColor: '#E0998C', eyelinerEnabled: false
    }
  },
  {
    id: 'soft-everyday',
    name: '柔軟日常',
    mood: '日常',
    photo: pexels(4005038),
    credit: 'Gustavo Fring · Pexels',
    palette: {
      lipstickColor: '#E8A178', lipstickFinish: 'satin',
      eyeshadowColor: '#D8BE8B', eyeshadowFinish: 'satin',
      blushColor: '#E0998C', eyelinerEnabled: false
    }
  },
  {
    id: 'power-suit',
    name: '氣場西裝',
    mood: '時尚',
    photo: pexels(7000913),
    credit: 'Sushantphotographyy · Pexels',
    palette: {
      lipstickColor: '#6E2438', lipstickFinish: 'matte',
      eyeshadowColor: '#34345F', eyeshadowFinish: 'satin',
      blushColor: '#C76F73', eyelinerEnabled: true
    }
  }
];
