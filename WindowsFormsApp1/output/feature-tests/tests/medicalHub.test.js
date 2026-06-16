"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const medicalCatalog_js_1 = require("../src/medical/medicalCatalog.js");
const medicalImaging_js_1 = require("../src/medical/medicalImaging.js");
const medicalText_js_1 = require("../src/medical/medicalText.js");
const medicalVitals_js_1 = require("../src/medical/medicalVitals.js");
(0, node_test_1.default)('organizes the requested medical course areas into a searchable curriculum', () => {
    const titles = medicalCatalog_js_1.MEDICAL_COURSES.map((course) => course.title);
    strict_1.default.ok(titles.includes('醫學與健康'));
    strict_1.default.ok(titles.includes('醫學影像概論（一）'));
    strict_1.default.ok(titles.includes('醫學影像概論（二）'));
    strict_1.default.ok(titles.includes('醫學工程概論（二）'));
    strict_1.default.ok(titles.includes('醫學概論'));
    strict_1.default.ok((0, medicalCatalog_js_1.filterMedicalCourses)('影像', 'imaging').every((course) => course.track === 'imaging'));
});
(0, node_test_1.default)('evaluates vital signs conservatively without pretending to diagnose', () => {
    const normal = (0, medicalVitals_js_1.evaluateVitals)({
        temperatureC: 36.8,
        systolic: 118,
        diastolic: 76,
        pulse: 72,
        respiration: 16,
        spo2: 98
    });
    const urgent = (0, medicalVitals_js_1.evaluateVitals)({
        temperatureC: 39.4,
        systolic: 184,
        diastolic: 122,
        pulse: 132,
        respiration: 28,
        spo2: 91
    });
    strict_1.default.equal(normal.overallLevel, 'steady');
    strict_1.default.equal(urgent.overallLevel, 'urgent');
    strict_1.default.ok(urgent.summary.includes('請儘快尋求專業醫療協助'));
    strict_1.default.ok(urgent.flags.every((flag) => !flag.explanation.includes('診斷為')));
});
(0, node_test_1.default)('builds imaging preparation guidance for modality-specific safety questions', () => {
    const mri = (0, medicalImaging_js_1.getImagingPrep)('mri', { hasMetalImplant: true, pregnant: false, kidneyDisease: false });
    const ct = (0, medicalImaging_js_1.getImagingPrep)('ct', { hasMetalImplant: false, pregnant: true, kidneyDisease: true });
    strict_1.default.equal(mri.level, 'review');
    strict_1.default.ok(mri.questions.some((question) => question.includes('金屬')));
    strict_1.default.ok(ct.questions.some((question) => question.includes('懷孕')));
    strict_1.default.ok(ct.questions.some((question) => question.includes('腎臟')));
    strict_1.default.ok(ct.notes.some((note) => note.includes('放射線')));
});
(0, node_test_1.default)('provides complete medical translations for supported system languages', () => {
    for (const key of ['MediSphere', '醫療學習與健康導航', '生命徵象整理', '醫學影像導覽', '就醫準備清單']) {
        const translation = medicalText_js_1.MEDICAL_TRANSLATIONS[key];
        strict_1.default.ok(translation, `missing translation for ${key}`);
        for (const lang of ['zh-CN', 'en', 'ja', 'ko']) {
            strict_1.default.ok(translation[lang], `missing ${lang} translation for ${key}`);
        }
    }
});
(0, node_test_1.default)('keeps the medical hub background as designed CSS instead of image assets', () => {
    const repositoryRoot = (0, node_path_1.resolve)(process.cwd(), '..');
    const css = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(repositoryRoot, 'Frontend/src/styles/fusionMedicalHub.css'), 'utf8');
    strict_1.default.doesNotMatch(css, /url\(/i);
    strict_1.default.match(css, /radial-gradient/i);
    strict_1.default.match(css, /linear-gradient/i);
});
