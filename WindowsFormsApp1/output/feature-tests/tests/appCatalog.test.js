"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const fusionApps_js_1 = require("../src/data/fusionApps.js");
const featureTranslations_js_1 = require("../src/i18n/featureTranslations.js");
const strings_js_1 = require("../src/i18n/strings.js");
const styleText_js_1 = require("../src/style/styleText.js");
(0, node_test_1.default)('keeps the primary dock focused on shell-level destinations', () => {
    strict_1.default.deepEqual(fusionApps_js_1.PRIMARY_SHELL_APPS.map((app) => app.id), ['pc', 'dir', 'tool', 'web', 'game', 'set']);
});
(0, node_test_1.default)('moves secondary applications into App Center without losing launch ids', () => {
    const groupedIds = new Set(fusionApps_js_1.APP_CENTER_APPS.map((app) => app.id));
    for (const id of ['piano', 'media', 'wav', 'cosmic', 'metro', 'dev', 'db', 'cmd']) {
        strict_1.default.equal(groupedIds.has(id), true, `${id} should be available in App Center`);
        strict_1.default.equal((0, fusionApps_js_1.getAppById)(id)?.id, id);
    }
});
(0, node_test_1.default)('registers Circuit Studio as a first-class App Center application', () => {
    const circuit = (0, fusionApps_js_1.getAppById)('circuit');
    strict_1.default.equal(circuit?.title, '電路工作室');
    strict_1.default.equal(circuit?.launchMode, 'overlay');
    strict_1.default.equal(fusionApps_js_1.APP_CENTER_APPS.some((app) => app.id === 'circuit'), true);
    strict_1.default.equal(fusionApps_js_1.FUSION_APPS.some((app) => app.id === 'circuit'), true);
});
(0, node_test_1.default)('registers English Flashcards as a translated host application', () => {
    const flashcards = (0, fusionApps_js_1.getAppById)('flashcards');
    strict_1.default.equal(flashcards?.title, '英文單字卡');
    strict_1.default.equal(flashcards?.launchMode, 'host');
    strict_1.default.equal(fusionApps_js_1.APP_CENTER_APPS.some((app) => String(app.id) === 'flashcards'), true);
    const titleTranslation = strings_js_1.TRANSLATIONS['英文單字卡'];
    strict_1.default.ok(titleTranslation);
    for (const lang of ['zh-CN', 'en', 'ja', 'ko']) {
        strict_1.default.ok(titleTranslation[lang], `missing ${lang} translation for English Flashcards`);
    }
});
(0, node_test_1.default)('registers Virtual Style Studio as a translated creative overlay', () => {
    const style = (0, fusionApps_js_1.getAppById)('style');
    strict_1.default.equal(style?.title, '虛擬造型工作室');
    strict_1.default.equal(style?.category, 'creative');
    strict_1.default.equal(style?.launchMode, 'overlay');
    strict_1.default.equal(style?.featured, true);
    strict_1.default.equal(fusionApps_js_1.APP_CENTER_APPS.some((app) => String(app.id) === 'style'), true);
});
(0, node_test_1.default)('registers Development Lab as a data structures and algorithms overlay', () => {
    const developmentLab = (0, fusionApps_js_1.getAppById)('dev');
    strict_1.default.equal(developmentLab?.subtitle, '資料結構與演算法');
    strict_1.default.equal(developmentLab?.launchMode, 'overlay');
    strict_1.default.equal(developmentLab?.category, 'development');
    strict_1.default.equal(developmentLab?.tags.includes('視覺化'), true);
    strict_1.default.equal(fusionApps_js_1.APP_CENTER_APPS.some((app) => app.id === 'dev'), true);
});
(0, node_test_1.default)('wires English Flashcards into the WinForms host build and launch route', () => {
    const repositoryRoot = (0, node_path_1.resolve)(process.cwd(), '..');
    const hostSource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Form1.cs'), 'utf8');
    const projectSource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'WindowsFormsApp1.csproj'), 'utf8');
    strict_1.default.match(hostSource, /LaunchEnglishFlashcards\(\)/);
    strict_1.default.match(hostSource, /lower\.Contains\("\\"flashcards\\""\)/);
    strict_1.default.match(projectSource, /IntegratedApps\\EnglishFlashcards\\\*\*\\\*\.csproj/);
});
(0, node_test_1.default)('uses Traditional Chinese source keys for the default app catalog', () => {
    strict_1.default.equal((0, fusionApps_js_1.getAppById)('pc')?.title, '本機');
    strict_1.default.equal((0, fusionApps_js_1.getAppById)('dir')?.title, '專案檔案');
    strict_1.default.equal((0, fusionApps_js_1.getAppById)('tool')?.title, '應用程式中心');
    strict_1.default.equal((0, fusionApps_js_1.getAppById)('set')?.title, '系統設定');
    strict_1.default.equal((0, fusionApps_js_1.getAppById)('circuit')?.subtitle, '設計與測試電路');
});
(0, node_test_1.default)('provides every app catalog field in all selectable languages', () => {
    for (const app of fusionApps_js_1.FUSION_APPS) {
        for (const source of [app.title, app.subtitle, app.description, app.status, ...app.tags]) {
            const translation = styleText_js_1.STYLE_TRANSLATIONS[source] ?? featureTranslations_js_1.FEATURE_TRANSLATIONS[source] ?? strings_js_1.TRANSLATIONS[source];
            strict_1.default.ok(translation, `missing translation entry for "${source}"`);
            for (const lang of ['zh-CN', 'en', 'ja', 'ko']) {
                strict_1.default.ok(translation[lang], `missing ${lang} translation for "${source}"`);
            }
        }
    }
});
