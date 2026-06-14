import type {
  AccessoryId,
  BodyPreset,
  BottomId,
  DressId,
  HairStyle,
  NamedStylePreset,
  ShoesId,
  SkinTonePreset,
  StyleColor,
  StyleLook,
  TopId
} from './styleTypes.js';

export const SKIN_TONES: SkinTonePreset[] = [
  { id: 'porcelain-cool', name: '瓷白冷調', hex: '#F4D9D0', undertone: 'cool' },
  { id: 'light-warm', name: '柔亮暖調', hex: '#E8C1A2', undertone: 'warm' },
  { id: 'medium-neutral', name: '自然中性', hex: '#D7A17D', undertone: 'neutral' },
  { id: 'golden-warm', name: '金棕暖調', hex: '#B97952', undertone: 'warm' },
  { id: 'deep-neutral', name: '深棕中性', hex: '#754731', undertone: 'neutral' },
  { id: 'deep-cool', name: '深邃冷調', hex: '#513229', undertone: 'cool' }
];

export const BODY_PRESETS: Array<NamedStylePreset<BodyPreset>> = [
  { id: 'petite', name: '輕巧比例', description: '較短身形與柔和肩線' },
  { id: 'balanced', name: '均衡比例', description: '自然肩寬與標準身形' },
  { id: 'tall', name: '修長比例', description: '較長腿部與俐落輪廓' }
];

export const HAIR_STYLES: Array<NamedStylePreset<HairStyle>> = [
  { id: 'bob', name: '俐落短髮', description: '貼合臉型的圓潤短髮' },
  { id: 'waves', name: '柔波長髮', description: '自然垂落的層次波浪' },
  { id: 'bun', name: '高髮髻', description: '清爽集中視覺焦點' },
  { id: 'updo', name: '法式盤髮', description: '優雅收攏的正式造型' },
  { id: 'ponytail', name: '高馬尾', description: '俐落上揚的活力線條' }
];

export const HAIR_COLORS = [
  { name: '曜石黑', hex: '#17131A' },
  { name: '可可棕', hex: '#4A2C28' },
  { name: '霧感栗棕', hex: '#765047' },
  { name: '冷霧灰', hex: '#6D7180' },
  { name: '莓果紫', hex: '#6C355E' },
  { name: '冰金棕', hex: '#B88F65' }
];

export const TOP_PRESETS: Array<NamedStylePreset<TopId>> = [
  { id: 'none', name: '不穿上衣', description: '清除目前上衣' },
  { id: 'fitted', name: '合身上衣', description: '簡潔貼身的基礎輪廓' },
  { id: 'relaxed', name: '寬鬆上衣', description: '柔和肩線與舒適量感' },
  { id: 'cropped', name: '短版上衣', description: '提高腰線的俐落比例' },
  { id: 'knit', name: '柔軟針織', description: '溫暖貼身的羅紋質感' },
  { id: 'offshoulder', name: '一字領上衣', description: '露出肩線的優雅領口' },
  { id: 'blazer', name: '俐落西裝外套', description: '結構肩線與通勤正式感' }
];

export const BOTTOM_PRESETS: Array<NamedStylePreset<BottomId>> = [
  { id: 'none', name: '不穿下身', description: '清除目前下身' },
  { id: 'trousers', name: '直筒長褲', description: '平衡俐落的直線輪廓' },
  { id: 'wideleg', name: '飄逸寬褲', description: '垂墜流動的俐落量感' },
  { id: 'skirt', name: '柔褶短裙', description: '增加輕盈與流動感' },
  { id: 'pleated', name: '百褶長裙', description: '規律褶線與律動垂感' },
  { id: 'maxiskirt', name: '及地長裙', description: '優雅延伸的落地裙襬' },
  { id: 'shorts', name: '高腰短褲', description: '拉長腿部視覺比例' }
];

export const DRESS_PRESETS: Array<NamedStylePreset<DressId>> = [
  { id: 'none', name: '不穿洋裝', description: '使用上衣與下身搭配' },
  { id: 'column', name: '直筒洋裝', description: '簡約連續的修長線條' },
  { id: 'aline', name: 'A 字洋裝', description: '收腰並自然展開的甜美輪廓' },
  { id: 'flare', name: '傘襬洋裝', description: '收腰並展開柔和裙襬' },
  { id: 'cocktail', name: '派對短洋裝', description: '及膝俐落的雞尾酒造型' },
  { id: 'gown', name: '及地長禮服', description: '紅毯等級的落地禮服' },
  { id: 'mermaid', name: '魚尾禮服', description: '修身收攏並展開魚尾裙襬' }
];

export const SHOES_PRESETS: Array<NamedStylePreset<ShoesId>> = [
  { id: 'flats', name: '柔軟平底鞋', description: '輕巧舒適的日常比例' },
  { id: 'sneakers', name: '簡約球鞋', description: '休閒且穩定的低筒比例' },
  { id: 'boots', name: '都會短靴', description: '增加下身重量與俐落感' },
  { id: 'heels', name: '尖頭高跟鞋', description: '延伸腿部與正式感' }
];

export const ACCESSORY_PRESETS: Array<NamedStylePreset<AccessoryId>> = [
  { id: 'none', name: '不使用配件', description: '保持造型簡潔' },
  { id: 'earrings', name: '光環耳飾', description: '在臉部兩側增加亮點' },
  { id: 'necklace', name: '細鍊項鍊', description: '聚焦頸部與領口' },
  { id: 'set', name: '完整配件組', description: '同時使用耳飾與項鍊' },
  { id: 'tiara', name: '水晶皇冠', description: '為禮服造型加冕的焦點' }
];

export const STYLE_COLORS: StyleColor[] = [
  { id: 'coral-glow', name: '珊瑚晨光', hex: '#E66F6A', undertones: ['warm', 'neutral'], roles: ['lip', 'blush', 'top', 'dress'] },
  { id: 'apricot-silk', name: '杏桃絲緞', hex: '#E8A178', undertones: ['warm'], roles: ['lip', 'blush', 'eye', 'top', 'dress'] },
  { id: 'rosewood', name: '玫瑰木', hex: '#A94362', undertones: ['warm', 'neutral'], roles: ['lip', 'blush', 'dress'] },
  { id: 'berry-veil', name: '莓果薄紗', hex: '#9C4E7A', undertones: ['cool', 'neutral'], roles: ['lip', 'eye', 'dress'] },
  { id: 'orchid-mist', name: '蘭紫薄霧', hex: '#9A74B8', undertones: ['cool'], roles: ['eye', 'top', 'dress'] },
  { id: 'ice-pink', name: '冰晶粉', hex: '#E7A8C7', undertones: ['cool', 'neutral'], roles: ['lip', 'blush', 'top'] },
  { id: 'copper-light', name: '銅金微光', hex: '#B87043', undertones: ['warm'], roles: ['eye', 'top', 'bottom', 'shoes'] },
  { id: 'champagne', name: '香檳金', hex: '#D8BE8B', undertones: ['warm', 'neutral'], roles: ['eye', 'top', 'dress', 'shoes'] },
  { id: 'ocean-blue', name: '深海藍', hex: '#315F9E', undertones: ['cool', 'neutral'], roles: ['eye', 'top', 'bottom', 'dress', 'shoes'] },
  { id: 'fusion-cyan', name: '聚變青', hex: '#54D9EB', undertones: ['cool', 'neutral'], roles: ['eye', 'top', 'dress', 'shoes'] },
  { id: 'indigo-night', name: '靛藍夜色', hex: '#34345F', undertones: ['cool', 'neutral'], roles: ['eye', 'top', 'bottom', 'dress', 'shoes'] },
  { id: 'violet-pulse', name: '脈衝紫', hex: '#7255C7', undertones: ['cool', 'neutral'], roles: ['eye', 'top', 'dress', 'shoes'] },
  { id: 'sage-glass', name: '鼠尾草玻璃', hex: '#71978A', undertones: ['warm', 'neutral'], roles: ['eye', 'top', 'bottom', 'dress'] },
  { id: 'forest-ink', name: '森林墨綠', hex: '#274F48', undertones: ['warm', 'neutral'], roles: ['top', 'bottom', 'dress', 'shoes'] },
  { id: 'cloud-white', name: '雲霧白', hex: '#E8EDF4', undertones: ['warm', 'cool', 'neutral'], roles: ['eye', 'top', 'bottom', 'dress', 'shoes'] },
  { id: 'graphite', name: '石墨黑', hex: '#202333', undertones: ['warm', 'cool', 'neutral'], roles: ['eye', 'top', 'bottom', 'dress', 'shoes'] },
  { id: 'bordeaux', name: '波爾多酒紅', hex: '#6E2438', undertones: ['warm', 'cool', 'neutral'], roles: ['lip', 'top', 'dress', 'shoes'] },
  { id: 'emerald-velvet', name: '祖母綠絲絨', hex: '#1F6B52', undertones: ['cool', 'neutral'], roles: ['eye', 'top', 'dress', 'shoes'] },
  { id: 'royal-gold', name: '皇家鎏金', hex: '#C9A24B', undertones: ['warm', 'neutral'], roles: ['eye', 'top', 'dress', 'shoes'] },
  { id: 'stellar-silver', name: '星辰銀', hex: '#B9C2D0', undertones: ['cool', 'neutral'], roles: ['eye', 'top', 'dress', 'shoes'] }
];

export const createDefaultLook = (now = new Date()): StyleLook => ({
  version: 1,
  id: `look-${now.getTime().toString(36)}`,
  name: 'Untitled Look',
  createdAt: now.toISOString(),
  modelId: 'fair',
  avatar: {
    skinTone: '#D7A17D',
    undertone: 'neutral',
    body: 'balanced',
    hairStyle: 'waves',
    hairColor: '#241A22'
  },
  makeup: {
    eyeshadowColor: '#8E658A',
    eyeshadowIntensity: 0.55,
    eyeshadowFinish: 'satin',
    blushColor: '#D97C8C',
    blushIntensity: 0.42,
    lipstickColor: '#A94362',
    lipstickIntensity: 0.72,
    lipstickFinish: 'satin',
    eyelinerEnabled: true,
    eyelinerIntensity: 0.68,
    eyelinerStyle: 'natural',
    foundationIntensity: 0.3,
    contourIntensity: 0.28,
    highlightIntensity: 0.42,
    lashIntensity: 0.55,
    aegyoIntensity: 0.32,
    browColor: '#5A4636',
    browIntensity: 0.4
  },
  wardrobe: {
    top: 'fitted',
    topColor: '#3B73C8',
    bottom: 'trousers',
    bottomColor: '#151C34',
    dress: 'none',
    dressColor: '#7455C9',
    shoes: 'heels',
    shoesColor: '#161322',
    accessory: 'earrings',
    accessoryColor: '#BFEFFF'
  }
});
