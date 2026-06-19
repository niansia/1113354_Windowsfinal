"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const legalCorpus_js_1 = require("../src/legal/legalCorpus.js");
const legalSearch_js_1 = require("../src/legal/legalSearch.js");
const legalText_js_1 = require("../src/legal/legalText.js");
const legalLocalization_js_1 = require("../src/legal/legalLocalization.js");
(0, node_test_1.default)('matches unpaid overtime to Taiwan labor protections', () => {
    const result = (0, legalSearch_js_1.analyzeLegalScenario)('公司每天要求我加班到晚上十點，卻沒有給加班費，也沒有打卡紀錄。');
    strict_1.default.equal(result.primaryDomain, 'employment');
    strict_1.default.ok(result.matches.some((match) => match.provision.lawName === '勞動基準法' && match.provision.article === '第 24 條'));
    strict_1.default.ok(result.evidence.some((item) => item.includes('出勤')));
    strict_1.default.ok(result.actions.length >= 3);
});
(0, node_test_1.default)('matches online purchase cancellation to the seven-day distance-sales rule', () => {
    const result = (0, legalSearch_js_1.analyzeLegalScenario)('我在網路商店買了商品，昨天到貨後想退貨，但賣家說拆箱就不能退。');
    strict_1.default.equal(result.primaryDomain, 'consumer');
    strict_1.default.ok(result.matches.some((match) => match.provision.lawName === '消費者保護法' && match.provision.article === '第 19 條'));
    strict_1.default.ok(result.matches[0].reasons.length > 0);
});
(0, node_test_1.default)('understands common English scenario terms when the system language changes', () => {
    const result = (0, legalSearch_js_1.analyzeLegalScenario)('My employer requires unpaid overtime every night and does not keep attendance records.');
    strict_1.default.equal(result.primaryDomain, 'employment');
    strict_1.default.ok(result.matches.some((match) => match.provision.id === 'labor-24'));
});
(0, node_test_1.default)('raises an urgent safety path for threats or domestic violence without presenting a legal conclusion', () => {
    const result = (0, legalSearch_js_1.analyzeLegalScenario)('伴侶威脅要打我，現在堵在門口不讓我離開。');
    strict_1.default.equal(result.urgency, 'urgent');
    strict_1.default.ok(result.safety.some((item) => item.includes('110')));
    strict_1.default.match(result.disclaimer, /不是法律意見/);
    strict_1.default.ok(result.matches.every((match) => match.label === '可能涉及'));
});
(0, node_test_1.default)('searches the local legal database by law, article, topic, and plain-language terms', () => {
    const byArticle = (0, legalSearch_js_1.searchLegalProvisions)('民法 184');
    const byTopic = (0, legalSearch_js_1.searchLegalProvisions)('個資外洩');
    strict_1.default.ok(byArticle.some((item) => item.lawName === '民法' && item.article === '第 184 條'));
    strict_1.default.ok(byTopic.some((item) => item.lawName === '個人資料保護法'));
});
(0, node_test_1.default)('keeps every legal reference offline and links only to official Taiwan sources', () => {
    strict_1.default.ok(legalCorpus_js_1.LEGAL_PROVISIONS.length >= 18);
    strict_1.default.ok(legalCorpus_js_1.LEGAL_SOURCES.length >= 8);
    strict_1.default.ok(legalCorpus_js_1.LEGAL_PROVISIONS.every((item) => item.sourceUrl.startsWith('https://law.moj.gov.tw/')));
    strict_1.default.ok(legalCorpus_js_1.LEGAL_SOURCES.every((item) => item.url.startsWith('https://law.moj.gov.tw/') || item.url.startsWith('https://www.laf.org.tw/')));
});
(0, node_test_1.default)('provides complete legal navigation translations for all system languages', () => {
    const required = [
        'LexTaiwan 法律導航',
        '情境分析',
        '法規資料庫',
        '案件筆記',
        '可能涉及',
        '這是本機資訊整理，不是法律意見，也不會取代律師或主管機關的判斷。',
        '最後檢核日期',
        ...legalCorpus_js_1.LEGAL_PROVISIONS.map((provision) => provision.title),
        ...legalLocalization_js_1.genericLegalEvidence,
        ...legalLocalization_js_1.genericLegalActions,
        '情境詞與法規主題相符',
        ...['employment', 'consumer', 'housing', 'contracts', 'privacy', 'family', 'criminal', 'procedure', 'traffic'].map(legalLocalization_js_1.localizedLegalSummaryKey)
    ];
    for (const key of required) {
        const translation = legalText_js_1.LEGAL_TRANSLATIONS[key];
        strict_1.default.ok(translation, `missing legal translation for ${key}`);
        for (const lang of ['zh-CN', 'en', 'ja', 'ko']) {
            strict_1.default.ok(translation[lang], `missing ${lang} legal translation for ${key}`);
        }
    }
});
(0, node_test_1.default)('localizes dynamic legal result content without leaking Chinese-only formatting', () => {
    strict_1.default.equal((0, legalLocalization_js_1.legalArticleLabel)('第 24 條', 'en'), 'Article 24');
    strict_1.default.equal((0, legalLocalization_js_1.legalArticleLabel)('第 24 條', 'ja'), '第24条');
    strict_1.default.equal((0, legalLocalization_js_1.legalArticleLabel)('第 24 條', 'ko'), '제24조');
    strict_1.default.equal((0, legalLocalization_js_1.legalArticleLabel)('第 24 條', 'zh-CN'), '第 24 条');
    strict_1.default.equal((0, legalLocalization_js_1.localizedLegalSummaryKey)('employment'), '勞動與職場相關條文摘要');
    strict_1.default.equal(legalLocalization_js_1.genericLegalEvidence.length, 3);
    strict_1.default.equal(legalLocalization_js_1.genericLegalActions.length, 3);
});
