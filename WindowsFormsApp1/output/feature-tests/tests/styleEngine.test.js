"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const styleCatalog_js_1 = require("../src/style/styleCatalog.js");
const styleEngine_js_1 = require("../src/style/styleEngine.js");
const styleStorage_js_1 = require("../src/style/styleStorage.js");
(0, node_test_1.default)('creates a complete neutral default look', () => {
    const look = (0, styleCatalog_js_1.createDefaultLook)(new Date('2026-06-13T12:00:00Z'));
    strict_1.default.equal(look.version, 1);
    strict_1.default.equal(look.createdAt, '2026-06-13T12:00:00.000Z');
    strict_1.default.equal(look.avatar.undertone, 'neutral');
    strict_1.default.equal(look.wardrobe.dress, 'none');
    strict_1.default.equal(look.wardrobe.top, 'fitted');
});
(0, node_test_1.default)('keeps dresses and separates mutually exclusive', () => {
    const dressed = (0, styleEngine_js_1.setWardrobePiece)((0, styleCatalog_js_1.createDefaultLook)(), 'dress', 'flare');
    strict_1.default.equal(dressed.wardrobe.dress, 'flare');
    strict_1.default.equal(dressed.wardrobe.top, 'none');
    strict_1.default.equal(dressed.wardrobe.bottom, 'none');
    const separated = (0, styleEngine_js_1.setWardrobePiece)(dressed, 'top', 'cropped');
    strict_1.default.equal(separated.wardrobe.top, 'cropped');
    strict_1.default.equal(separated.wardrobe.dress, 'none');
});
(0, node_test_1.default)('ranks warm lip colors above cool colors for warm undertones', () => {
    const ranked = (0, styleEngine_js_1.recommendColors)('warm', 'lip', '#D79A72');
    strict_1.default.ok(ranked.length >= 3);
    strict_1.default.equal(ranked[0].undertones.includes('warm'), true);
    strict_1.default.ok(ranked[0].score >= ranked[1].score);
    strict_1.default.ok(ranked[0].reasons.length > 0);
});
(0, node_test_1.default)('round-trips saved looks and ignores malformed entries', () => {
    const look = (0, styleCatalog_js_1.createDefaultLook)(new Date('2026-06-13T12:00:00Z'));
    const parsed = (0, styleStorage_js_1.parseSavedLooks)(JSON.stringify([look, { broken: true }]));
    strict_1.default.equal(parsed.length, 1);
    strict_1.default.equal(parsed[0].id, look.id);
    strict_1.default.equal(parsed[0].createdAt, '2026-06-13T12:00:00.000Z');
});
