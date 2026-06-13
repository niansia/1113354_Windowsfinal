import { createDefaultLook } from './styleCatalog.js';
import type {
  AccessoryId,
  BodyPreset,
  BottomId,
  DressId,
  HairStyle,
  MakeupFinish,
  ShoesId,
  StyleLook,
  TopId,
  Undertone
} from './styleTypes.js';

export const STYLE_LOOKS_STORAGE_KEY = 'fusion-style-studio-looks-v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isHex = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

const asString = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : fallback;

const asNumber = (value: unknown, fallback: number, min = 0, max = 1) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

const asEnum = <T extends string>(value: unknown, values: readonly T[], fallback: T): T =>
  typeof value === 'string' && values.includes(value as T) ? value as T : fallback;

const UNDERTONES: Undertone[] = ['warm', 'cool', 'neutral'];
const BODY_PRESETS: BodyPreset[] = ['petite', 'balanced', 'tall'];
const HAIR_STYLES: HairStyle[] = ['bob', 'waves', 'bun', 'updo', 'ponytail'];
const FINISHES: MakeupFinish[] = ['matte', 'satin', 'glow'];
const TOPS: TopId[] = ['none', 'fitted', 'relaxed', 'cropped', 'blazer', 'knit', 'offshoulder'];
const BOTTOMS: BottomId[] = ['none', 'trousers', 'skirt', 'shorts', 'wideleg', 'maxiskirt', 'pleated'];
const DRESSES: DressId[] = ['none', 'column', 'flare', 'aline', 'cocktail', 'gown', 'mermaid'];
const SHOES: ShoesId[] = ['sneakers', 'boots', 'heels', 'flats'];
const ACCESSORIES: AccessoryId[] = ['none', 'earrings', 'necklace', 'set', 'tiara'];

const normalizeLook = (value: unknown): StyleLook | null => {
  if (!isRecord(value) || value.version !== 1 || typeof value.id !== 'string') return null;
  if (!isRecord(value.avatar) || !isRecord(value.makeup) || !isRecord(value.wardrobe)) return null;

  const fallback = createDefaultLook();
  const createdAt = typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
    ? new Date(value.createdAt).toISOString()
    : fallback.createdAt;

  const avatar = value.avatar;
  const makeup = value.makeup;
  const wardrobe = value.wardrobe;

  const top = asEnum(wardrobe.top, TOPS, fallback.wardrobe.top);
  const bottom = asEnum(wardrobe.bottom, BOTTOMS, fallback.wardrobe.bottom);
  const dress = asEnum(wardrobe.dress, DRESSES, fallback.wardrobe.dress);
  const normalizedDress = dress !== 'none' ? dress : 'none';

  return {
    version: 1,
    id: asString(value.id, fallback.id),
    name: asString(value.name, fallback.name),
    createdAt,
    modelId: typeof value.modelId === 'string' ? value.modelId.slice(0, 40) : fallback.modelId,
    outfitId: typeof value.outfitId === 'string' ? value.outfitId.slice(0, 40) : undefined,
    avatar: {
      skinTone: isHex(avatar.skinTone) ? avatar.skinTone : fallback.avatar.skinTone,
      undertone: asEnum(avatar.undertone, UNDERTONES, fallback.avatar.undertone),
      body: asEnum(avatar.body, BODY_PRESETS, fallback.avatar.body),
      hairStyle: asEnum(avatar.hairStyle, HAIR_STYLES, fallback.avatar.hairStyle),
      hairColor: isHex(avatar.hairColor) ? avatar.hairColor : fallback.avatar.hairColor
    },
    makeup: {
      eyeshadowColor: isHex(makeup.eyeshadowColor) ? makeup.eyeshadowColor : fallback.makeup.eyeshadowColor,
      eyeshadowIntensity: asNumber(makeup.eyeshadowIntensity, fallback.makeup.eyeshadowIntensity),
      eyeshadowFinish: asEnum(makeup.eyeshadowFinish, FINISHES, fallback.makeup.eyeshadowFinish),
      blushColor: isHex(makeup.blushColor) ? makeup.blushColor : fallback.makeup.blushColor,
      blushIntensity: asNumber(makeup.blushIntensity, fallback.makeup.blushIntensity),
      lipstickColor: isHex(makeup.lipstickColor) ? makeup.lipstickColor : fallback.makeup.lipstickColor,
      lipstickIntensity: asNumber(makeup.lipstickIntensity, fallback.makeup.lipstickIntensity),
      lipstickFinish: asEnum(makeup.lipstickFinish, FINISHES, fallback.makeup.lipstickFinish),
      eyelinerEnabled: typeof makeup.eyelinerEnabled === 'boolean'
        ? makeup.eyelinerEnabled
        : fallback.makeup.eyelinerEnabled,
      eyelinerIntensity: asNumber(makeup.eyelinerIntensity, fallback.makeup.eyelinerIntensity)
    },
    wardrobe: {
      top: normalizedDress !== 'none' ? 'none' : top,
      topColor: isHex(wardrobe.topColor) ? wardrobe.topColor : fallback.wardrobe.topColor,
      bottom: normalizedDress !== 'none' ? 'none' : bottom,
      bottomColor: isHex(wardrobe.bottomColor) ? wardrobe.bottomColor : fallback.wardrobe.bottomColor,
      dress: normalizedDress,
      dressColor: isHex(wardrobe.dressColor) ? wardrobe.dressColor : fallback.wardrobe.dressColor,
      shoes: asEnum(wardrobe.shoes, SHOES, fallback.wardrobe.shoes),
      shoesColor: isHex(wardrobe.shoesColor) ? wardrobe.shoesColor : fallback.wardrobe.shoesColor,
      accessory: asEnum(wardrobe.accessory, ACCESSORIES, fallback.wardrobe.accessory),
      accessoryColor: isHex(wardrobe.accessoryColor) ? wardrobe.accessoryColor : fallback.wardrobe.accessoryColor
    }
  };
};

export const parseSavedLooks = (source: string | null): StyleLook[] => {
  if (!source) return [];
  try {
    const parsed: unknown = JSON.parse(source);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeLook).filter((look): look is StyleLook => look !== null).slice(0, 24);
  } catch {
    return [];
  }
};

export const loadSavedLooks = (storage: StorageLike = window.localStorage): StyleLook[] =>
  parseSavedLooks(storage.getItem(STYLE_LOOKS_STORAGE_KEY));

export const saveSavedLooks = (
  looks: StyleLook[],
  storage: StorageLike = window.localStorage
): StyleLook[] => {
  const normalized = parseSavedLooks(JSON.stringify(looks));
  storage.setItem(STYLE_LOOKS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const upsertSavedLook = (
  looks: StyleLook[],
  look: StyleLook,
  storage?: StorageLike
): StyleLook[] => {
  const next = [look, ...looks.filter((item) => item.id !== look.id)].slice(0, 24);
  return storage ? saveSavedLooks(next, storage) : parseSavedLooks(JSON.stringify(next));
};

export const removeSavedLook = (
  looks: StyleLook[],
  id: string,
  storage?: StorageLike
): StyleLook[] => {
  const next = looks.filter((look) => look.id !== id);
  return storage ? saveSavedLooks(next, storage) : next;
};

