"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSavedLook = exports.upsertSavedLook = exports.saveSavedLooks = exports.loadSavedLooks = exports.parseSavedLooks = exports.STYLE_LOOKS_STORAGE_KEY = void 0;
const styleCatalog_js_1 = require("./styleCatalog.js");
exports.STYLE_LOOKS_STORAGE_KEY = 'fusion-style-studio-looks-v1';
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isHex = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const asString = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : fallback;
const asNumber = (value, fallback, min = 0, max = 1) => typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
const asEnum = (value, values, fallback) => typeof value === 'string' && values.includes(value) ? value : fallback;
const UNDERTONES = ['warm', 'cool', 'neutral'];
const BODY_PRESETS = ['petite', 'balanced', 'tall'];
const HAIR_STYLES = ['bob', 'waves', 'bun', 'updo', 'ponytail'];
const FINISHES = ['matte', 'satin', 'glow'];
const TOPS = ['none', 'fitted', 'relaxed', 'cropped', 'blazer', 'knit', 'offshoulder'];
const BOTTOMS = ['none', 'trousers', 'skirt', 'shorts', 'wideleg', 'maxiskirt', 'pleated'];
const DRESSES = ['none', 'column', 'flare', 'aline', 'cocktail', 'gown', 'mermaid'];
const SHOES = ['sneakers', 'boots', 'heels', 'flats'];
const ACCESSORIES = ['none', 'earrings', 'necklace', 'set', 'tiara'];
const normalizeLook = (value) => {
    if (!isRecord(value) || value.version !== 1 || typeof value.id !== 'string')
        return null;
    if (!isRecord(value.avatar) || !isRecord(value.makeup) || !isRecord(value.wardrobe))
        return null;
    const fallback = (0, styleCatalog_js_1.createDefaultLook)();
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
            eyelinerIntensity: asNumber(makeup.eyelinerIntensity, fallback.makeup.eyelinerIntensity),
            eyelinerStyle: asEnum(makeup.eyelinerStyle, ['natural', 'wing', 'bold', 'tightline'], fallback.makeup.eyelinerStyle),
            foundationIntensity: asNumber(makeup.foundationIntensity, fallback.makeup.foundationIntensity),
            contourIntensity: asNumber(makeup.contourIntensity, fallback.makeup.contourIntensity),
            highlightIntensity: asNumber(makeup.highlightIntensity, fallback.makeup.highlightIntensity),
            lashIntensity: asNumber(makeup.lashIntensity, fallback.makeup.lashIntensity),
            aegyoIntensity: asNumber(makeup.aegyoIntensity, fallback.makeup.aegyoIntensity),
            browColor: isHex(makeup.browColor) ? makeup.browColor : fallback.makeup.browColor,
            browIntensity: asNumber(makeup.browIntensity, fallback.makeup.browIntensity)
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
const parseSavedLooks = (source) => {
    if (!source)
        return [];
    try {
        const parsed = JSON.parse(source);
        if (!Array.isArray(parsed))
            return [];
        return parsed.map(normalizeLook).filter((look) => look !== null).slice(0, 24);
    }
    catch {
        return [];
    }
};
exports.parseSavedLooks = parseSavedLooks;
const loadSavedLooks = (storage = window.localStorage) => (0, exports.parseSavedLooks)(storage.getItem(exports.STYLE_LOOKS_STORAGE_KEY));
exports.loadSavedLooks = loadSavedLooks;
const saveSavedLooks = (looks, storage = window.localStorage) => {
    const normalized = (0, exports.parseSavedLooks)(JSON.stringify(looks));
    storage.setItem(exports.STYLE_LOOKS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
};
exports.saveSavedLooks = saveSavedLooks;
const upsertSavedLook = (looks, look, storage) => {
    const next = [look, ...looks.filter((item) => item.id !== look.id)].slice(0, 24);
    return storage ? (0, exports.saveSavedLooks)(next, storage) : (0, exports.parseSavedLooks)(JSON.stringify(next));
};
exports.upsertSavedLook = upsertSavedLook;
const removeSavedLook = (looks, id, storage) => {
    const next = looks.filter((look) => look.id !== id);
    return storage ? (0, exports.saveSavedLooks)(next, storage) : next;
};
exports.removeSavedLook = removeSavedLook;
