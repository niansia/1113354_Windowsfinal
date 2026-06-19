"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendColors = exports.setWardrobePiece = void 0;
const styleCatalog_js_1 = require("./styleCatalog.js");
const parseHex = (hex) => {
    const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '808080';
    return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16)
    };
};
const relativeLuminance = (hex) => {
    const { r, g, b } = parseHex(hex);
    const channels = [r, g, b].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const colorDistance = (left, right) => {
    const a = parseHex(left);
    const b = parseHex(right);
    return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2) / 441.67;
};
const setWardrobePiece = (look, slot, piece) => {
    const wardrobe = { ...look.wardrobe, [slot]: piece };
    if (slot === 'dress' && piece !== 'none') {
        wardrobe.top = 'none';
        wardrobe.bottom = 'none';
    }
    else if ((slot === 'top' || slot === 'bottom') && piece !== 'none') {
        wardrobe.dress = 'none';
    }
    return { ...look, wardrobe };
};
exports.setWardrobePiece = setWardrobePiece;
const recommendColors = (undertone, role, skinColor, anchorColor) => {
    const skinLuminance = relativeLuminance(skinColor);
    return styleCatalog_js_1.STYLE_COLORS
        .filter((color) => color.roles.includes(role))
        .map((color) => {
        const reasons = [];
        let score = 48;
        if (color.undertones.includes(undertone)) {
            score += 28;
            reasons.push(undertone === 'warm'
                ? '呼應暖色膚調'
                : undertone === 'cool'
                    ? '呼應冷色膚調'
                    : '平衡中性膚調');
        }
        else if (color.undertones.includes('neutral')) {
            score += 14;
            reasons.push('提供柔和的中性銜接');
        }
        const contrast = Math.abs(relativeLuminance(color.hex) - skinLuminance);
        const targetContrast = role === 'lip' || role === 'eye' ? 0.28 : 0.42;
        score += Math.max(0, 18 - Math.abs(contrast - targetContrast) * 28);
        if (contrast > 0.2)
            reasons.push('建立清楚但不刺眼的對比');
        else
            reasons.push('維持低對比的柔和層次');
        if (anchorColor) {
            const distance = colorDistance(color.hex, anchorColor);
            score += distance > 0.16 && distance < 0.68 ? 10 : 3;
            reasons.push(distance < 0.32 ? '延續目前造型的色彩節奏' : '加入可辨識的搭配層次');
        }
        return {
            ...color,
            score: Math.round(Math.min(100, score)),
            reasons
        };
    })
        .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, 'zh-Hant'));
};
exports.recommendColors = recommendColors;
