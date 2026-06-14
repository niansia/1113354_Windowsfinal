export type Undertone = 'warm' | 'cool' | 'neutral';
export type BodyPreset = 'petite' | 'balanced' | 'tall';
export type HairStyle = 'bob' | 'waves' | 'bun' | 'updo' | 'ponytail';
export type MakeupFinish = 'matte' | 'satin' | 'glow';
export type EyelinerStyle = 'natural' | 'wing' | 'bold' | 'tightline';
export type StyleView = 'full' | 'face' | 'outfit';

export type TopId = 'none' | 'fitted' | 'relaxed' | 'cropped' | 'blazer' | 'knit' | 'offshoulder';
export type BottomId = 'none' | 'trousers' | 'skirt' | 'shorts' | 'wideleg' | 'maxiskirt' | 'pleated';
export type DressId = 'none' | 'column' | 'flare' | 'aline' | 'cocktail' | 'gown' | 'mermaid';
export type ShoesId = 'sneakers' | 'boots' | 'heels' | 'flats';
export type AccessoryId = 'none' | 'earrings' | 'necklace' | 'set' | 'tiara';
export type WardrobeSlot = 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory';
export type StyleColorRole = 'lip' | 'eye' | 'blush' | 'top' | 'bottom' | 'dress' | 'shoes';

export interface WardrobePieceBySlot {
  top: TopId;
  bottom: BottomId;
  dress: DressId;
  shoes: ShoesId;
  accessory: AccessoryId;
}

export interface AvatarStyle {
  skinTone: string;
  undertone: Undertone;
  body: BodyPreset;
  hairStyle: HairStyle;
  hairColor: string;
}

export interface MakeupStyle {
  eyeshadowColor: string;
  eyeshadowIntensity: number;
  eyeshadowFinish: MakeupFinish;
  blushColor: string;
  blushIntensity: number;
  lipstickColor: string;
  lipstickIntensity: number;
  lipstickFinish: MakeupFinish;
  eyelinerEnabled: boolean;
  eyelinerIntensity: number;
  eyelinerStyle: EyelinerStyle;
  // ── detailed features (landmark-driven) ──
  foundationIntensity: number;
  contourIntensity: number;
  highlightIntensity: number;
  lashIntensity: number;
  aegyoIntensity: number;
  browColor: string;
  browIntensity: number;
}

export interface WardrobeStyle {
  top: TopId;
  topColor: string;
  bottom: BottomId;
  bottomColor: string;
  dress: DressId;
  dressColor: string;
  shoes: ShoesId;
  shoesColor: string;
  accessory: AccessoryId;
  accessoryColor: string;
}

export interface StyleLook {
  version: 1;
  id: string;
  name: string;
  createdAt: string;
  /** Selected real-photo face model for the makeup simulator. */
  modelId?: string;
  /** Selected real-photo outfit look from the lookbook. */
  outfitId?: string;
  avatar: AvatarStyle;
  makeup: MakeupStyle;
  wardrobe: WardrobeStyle;
}

/** A facial feature region, normalized 0..1 over the photo (x→width, y→height). */
export interface FeatureEllipse {
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** rotation in degrees */
  angle?: number;
}

export interface FaceLandmarks {
  leftEye: FeatureEllipse;
  rightEye: FeatureEllipse;
  lips: FeatureEllipse;
  leftCheek: FeatureEllipse;
  rightCheek: FeatureEllipse;
}

/** A real front-facing portrait used as the makeup-simulation canvas. */
export interface FaceModel {
  id: string;
  /** zh-TW source string (also the i18n key). */
  name: string;
  toneLabel: string;
  photo: string;
  credit: string;
  /** intrinsic width / height of the photo, for stage framing */
  aspect: number;
  landmarks: FaceLandmarks;
}

/** A curated complete look represented by a real outfit photo + a makeup palette. */
export interface OutfitLook {
  id: string;
  name: string;
  mood: string;
  formal?: boolean;
  photo: string;
  credit: string;
  palette: {
    lipstickColor: string;
    lipstickFinish: MakeupFinish;
    eyeshadowColor: string;
    eyeshadowFinish: MakeupFinish;
    blushColor: string;
    eyelinerEnabled: boolean;
  };
}

export interface StyleColor {
  id: string;
  name: string;
  hex: string;
  undertones: Undertone[];
  roles: StyleColorRole[];
}

export interface ColorRecommendation extends StyleColor {
  score: number;
  reasons: string[];
}

export interface NamedStylePreset<T extends string> {
  id: T;
  name: string;
  description: string;
}

export interface SkinTonePreset {
  id: string;
  name: string;
  hex: string;
  undertone: Undertone;
}
