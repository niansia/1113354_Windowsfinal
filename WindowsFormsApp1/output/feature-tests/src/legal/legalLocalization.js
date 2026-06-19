"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legalArticleLabel = exports.localizedLegalSummaryKey = exports.genericLegalActions = exports.genericLegalEvidence = void 0;
const DOMAIN_SUMMARY_KEYS = {
    employment: '勞動與職場相關條文摘要',
    consumer: '消費交易相關條文摘要',
    housing: '居住與財產相關條文摘要',
    contracts: '契約與損害相關條文摘要',
    privacy: '個資與數位相關條文摘要',
    family: '家庭安全相關條文摘要',
    criminal: '刑事風險相關條文摘要',
    procedure: '程序與證據相關條文摘要',
    traffic: '交通事故相關條文摘要'
};
exports.genericLegalEvidence = [
    '保留原始文件、訊息與檔案中繼資料',
    '依時間順序整理事件與聯絡紀錄',
    '保存契約、收據、照片與相關證明'
];
exports.genericLegalActions = [
    '開啟官方法規確認現行條文與例外',
    '以可保存的書面方式提出要求或通知',
    '視情況洽詢主管機關、法律扶助或律師'
];
const localizedLegalSummaryKey = (domain) => DOMAIN_SUMMARY_KEYS[domain];
exports.localizedLegalSummaryKey = localizedLegalSummaryKey;
const legalArticleLabel = (article, lang) => {
    const number = article.match(/\d+(?:-\d+)?/)?.[0] ?? article;
    if (lang === 'en')
        return `Article ${number}`;
    if (lang === 'ja')
        return `第${number}条`;
    if (lang === 'ko')
        return `제${number}조`;
    if (lang === 'zh-CN')
        return `第 ${number} 条`;
    return article;
};
exports.legalArticleLabel = legalArticleLabel;
