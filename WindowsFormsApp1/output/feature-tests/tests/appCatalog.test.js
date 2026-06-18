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
const sportsText_js_1 = require("../src/sports/sportsText.js");
const neuroText_js_1 = require("../src/neuro/neuroText.js");
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
(0, node_test_1.default)('registers Global Sports Center as a translated data overlay', () => {
    const sports = (0, fusionApps_js_1.getAppById)('sports');
    strict_1.default.equal(sports?.title, '全球體育中心');
    strict_1.default.equal(sports?.subtitle, '即時比分、賽程與 AI 預測');
    strict_1.default.equal(sports?.category, 'data');
    strict_1.default.equal(sports?.launchMode, 'overlay');
    strict_1.default.equal(sports?.featured, true);
    strict_1.default.equal(fusionApps_js_1.APP_CENTER_APPS.some((app) => app.id === 'sports'), true);
});
(0, node_test_1.default)('registers Poetry Cloud as a translated creative overlay', () => {
    const poetry = (0, fusionApps_js_1.getAppById)('poetry');
    strict_1.default.equal(poetry?.title, '詩雲');
    strict_1.default.equal(poetry?.subtitle, '古典詩詞關係宇宙');
    strict_1.default.equal(poetry?.category, 'creative');
    strict_1.default.equal(poetry?.launchMode, 'overlay');
    strict_1.default.equal(poetry?.featured, true);
    strict_1.default.equal(fusionApps_js_1.APP_CENTER_APPS.some((app) => String(app.id) === 'poetry'), true);
    for (const key of ['詩雲', '古典詩詞關係宇宙', '在星雲圖譜中搜尋詩人、詩作、意象與歷史關係。']) {
        const translation = featureTranslations_js_1.FEATURE_TRANSLATIONS[key];
        strict_1.default.ok(translation, `missing Poetry Cloud translation for "${key}"`);
        for (const lang of ['zh-CN', 'en', 'ja', 'ko']) {
            strict_1.default.ok(translation[lang], `missing ${lang} Poetry Cloud translation for "${key}"`);
        }
    }
});
(0, node_test_1.default)('registers MediSphere as a translated medical overlay', () => {
    const medical = (0, fusionApps_js_1.getAppById)('medical');
    strict_1.default.equal(medical?.title, 'MediSphere');
    strict_1.default.equal(medical?.subtitle, '健康行動工作台');
    strict_1.default.equal(medical?.category, 'data');
    strict_1.default.equal(medical?.launchMode, 'overlay');
    strict_1.default.equal(medical?.featured, true);
    strict_1.default.equal(fusionApps_js_1.APP_CENTER_APPS.some((app) => String(app.id) === 'medical'), true);
    for (const key of ['MediSphere', '健康行動工作台', '把生命徵象、影像檢查與門診準備整理成可執行的健康行動。']) {
        const translation = featureTranslations_js_1.FEATURE_TRANSLATIONS[key];
        strict_1.default.ok(translation, `missing MediSphere translation for "${key}"`);
        for (const lang of ['zh-CN', 'en', 'ja', 'ko']) {
            strict_1.default.ok(translation[lang], `missing ${lang} MediSphere translation for "${key}"`);
        }
    }
});
(0, node_test_1.default)('registers SignalForge as an integrated communication systems overlay', () => {
    const signal = (0, fusionApps_js_1.getAppById)('signal');
    strict_1.default.equal(signal?.title, 'SignalForge');
    strict_1.default.equal(signal?.subtitle, '通訊與硬體實驗場');
    strict_1.default.equal(signal?.category, 'development');
    strict_1.default.equal(signal?.launchMode, 'overlay');
    strict_1.default.equal(signal?.featured, true);
    strict_1.default.equal(fusionApps_js_1.APP_CENTER_APPS.some((app) => String(app.id) === 'signal'), true);
    for (const key of ['SignalForge', '通訊與硬體實驗場', '把訊號、位元、處理器與物理通道整合成可操作的系統實驗。']) {
        const translation = featureTranslations_js_1.FEATURE_TRANSLATIONS[key];
        strict_1.default.ok(translation, `missing SignalForge translation for "${key}"`);
        for (const lang of ['zh-CN', 'en', 'ja', 'ko']) {
            strict_1.default.ok(translation[lang], `missing ${lang} SignalForge translation for "${key}"`);
        }
    }
});
(0, node_test_1.default)('registers NeuroFlow AI as a translated online-first neural intelligence studio', () => {
    const neuro = (0, fusionApps_js_1.getAppById)('neuro');
    strict_1.default.equal(neuro?.title, 'NeuroFlow AI');
    strict_1.default.equal(neuro?.subtitle, '智慧推論與神經動態工作室');
    strict_1.default.equal(neuro?.category, 'development');
    strict_1.default.equal(neuro?.launchMode, 'overlay');
    strict_1.default.equal(neuro?.featured, true);
    strict_1.default.equal(fusionApps_js_1.APP_CENTER_APPS.some((app) => app.id === 'neuro'), true);
    for (const key of ['NeuroFlow AI', '智慧推論與神經動態工作室', '把連網檢索、本機推論、Transformer、RL 與液態神經網路整合成可操作的 AI 實驗室。']) {
        const translation = neuroText_js_1.NEURO_TRANSLATIONS[key];
        strict_1.default.ok(translation, `missing NeuroFlow translation for "${key}"`);
        for (const lang of ['zh-CN', 'en', 'ja', 'ko']) {
            strict_1.default.ok(translation[lang], `missing ${lang} NeuroFlow translation for "${key}"`);
        }
    }
});
(0, node_test_1.default)('wires Global Sports Center into the React overlay shell', () => {
    const repositoryRoot = (0, node_path_1.resolve)(process.cwd(), '..');
    const shellSource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/components/SpatialHomeStage.tsx'), 'utf8');
    const entrySource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/main.tsx'), 'utf8');
    strict_1.default.match(shellSource, /FusionSportsCenter/);
    strict_1.default.match(shellSource, /overlayApp === 'sports'/);
    strict_1.default.match(entrySource, /fusionSportsCenter\.css/);
});
(0, node_test_1.default)('wires Poetry Cloud into the React overlay shell', () => {
    const repositoryRoot = (0, node_path_1.resolve)(process.cwd(), '..');
    const shellSource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/components/SpatialHomeStage.tsx'), 'utf8');
    const entrySource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/main.tsx'), 'utf8');
    strict_1.default.match(shellSource, /FusionPoetryCloud/);
    strict_1.default.match(shellSource, /overlayApp === 'poetry'/);
    strict_1.default.match(entrySource, /fusionPoetryCloud\.css/);
});
(0, node_test_1.default)('wires MediSphere into the React overlay shell', () => {
    const repositoryRoot = (0, node_path_1.resolve)(process.cwd(), '..');
    const shellSource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/components/SpatialHomeStage.tsx'), 'utf8');
    const entrySource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/main.tsx'), 'utf8');
    strict_1.default.match(shellSource, /FusionMedicalHub/);
    strict_1.default.match(shellSource, /overlayApp === 'medical'/);
    strict_1.default.match(entrySource, /fusionMedicalHub\.css/);
});
(0, node_test_1.default)('wires SignalForge into the React overlay shell', () => {
    const repositoryRoot = (0, node_path_1.resolve)(process.cwd(), '..');
    const shellSource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/components/SpatialHomeStage.tsx'), 'utf8');
    const entrySource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/main.tsx'), 'utf8');
    strict_1.default.match(shellSource, /FusionSignalForge/);
    strict_1.default.match(shellSource, /overlayApp === 'signal'/);
    strict_1.default.match(entrySource, /fusionSignalForge\.css/);
});
(0, node_test_1.default)('wires NeuroFlow AI and its Three.js visualization into the React overlay shell', () => {
    const repositoryRoot = (0, node_path_1.resolve)(process.cwd(), '..');
    const shellSource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/components/SpatialHomeStage.tsx'), 'utf8');
    const entrySource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/main.tsx'), 'utf8');
    const neuroSource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/components/FusionNeuroFlow.tsx'), 'utf8');
    strict_1.default.match(shellSource, /FusionNeuroFlow/);
    strict_1.default.match(shellSource, /overlayApp === 'neuro'/);
    strict_1.default.match(entrySource, /fusionNeuroFlow\.css/);
    strict_1.default.match(neuroSource, /NeuralFlow3D/);
    strict_1.default.match(neuroSource, /searchPublicKnowledge/);
});
(0, node_test_1.default)('wires event dossiers, prediction evidence, and player matchups into Sports Center', () => {
    const repositoryRoot = (0, node_path_1.resolve)(process.cwd(), '..');
    const sportsSource = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/components/FusionSportsCenter.tsx'), 'utf8');
    strict_1.default.match(sportsSource, /SportsEventDetailDialog/);
    strict_1.default.match(sportsSource, /SportsPredictionEvidence/);
    strict_1.default.match(sportsSource, /SportsPositionMatchups/);
    strict_1.default.match(sportsSource, /onDoubleClick/);
    strict_1.default.match(sportsSource, /loadSportsEventDetail/);
});
(0, node_test_1.default)('translates every Sports Intelligence expansion label', () => {
    const keys = [
        '查看賽事詳情',
        '賽事詳情',
        '總覽',
        '近期狀態與交手',
        '陣容與球員',
        '資料覆蓋率',
        '轉播',
        '場館地址',
        '近五場',
        '歷史交手',
        '賽事排名',
        '世界排名未由資料源提供',
        '預測依據',
        '影響方向',
        '有利主隊',
        '有利客隊',
        '中性',
        '模型評分',
        '賽季戰績',
        '陣容深度',
        '可用球員',
        '場地因素',
        '位置對位',
        '球員對位',
        '比較分數',
        '此分數為可用資料估計，並非官方球員評分。',
        '球員簡介',
        '身高',
        '體重',
        '出生日期',
        '健康狀態',
        '傷病資訊',
        '完整資料',
        '部分資料',
        '暫無詳細資料',
        '讀取賽事詳情中...',
        '隊伍'
    ];
    for (const key of keys) {
        const translation = sportsText_js_1.SPORTS_TRANSLATIONS[key];
        strict_1.default.ok(translation, `missing sports intelligence translation for "${key}"`);
        for (const lang of ['zh-CN', 'en', 'ja', 'ko']) {
            strict_1.default.ok(translation[lang], `missing ${lang} sports intelligence translation for "${key}"`);
        }
    }
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
            const translation = neuroText_js_1.NEURO_TRANSLATIONS[source] ?? sportsText_js_1.SPORTS_TRANSLATIONS[source] ?? styleText_js_1.STYLE_TRANSLATIONS[source] ?? featureTranslations_js_1.FEATURE_TRANSLATIONS[source] ?? strings_js_1.TRANSLATIONS[source];
            strict_1.default.ok(translation, `missing translation entry for "${source}"`);
            for (const lang of ['zh-CN', 'en', 'ja', 'ko']) {
                strict_1.default.ok(translation[lang], `missing ${lang} translation for "${source}"`);
            }
        }
    }
});
