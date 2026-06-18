"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPublicKnowledge = exports.parseWikipediaResponse = exports.buildWikipediaSearchUrl = exports.buildKnowledgeSearchQuery = void 0;
const WIKI_LANGUAGE = {
    'zh-TW': 'zh',
    'zh-CN': 'zh',
    en: 'en',
    ja: 'ja',
    ko: 'ko'
};
const ENGLISH_STOP_WORDS = new Set([
    'a', 'an', 'the', 'please', 'explain', 'describe', 'show', 'tell', 'me', 'simply',
    'how', 'what', 'why', 'does', 'do', 'is', 'are', 'can', 'could', 'would', 'to'
]);
const buildKnowledgeSearchQuery = (query, lang) => {
    const compact = query.trim().replace(/[？?！!。,.，:：;；"“”'‘’()（）]/g, ' ');
    if (lang === 'en') {
        const terms = compact.split(/\s+/).filter((term) => term && !ENGLISH_STOP_WORDS.has(term.toLocaleLowerCase()));
        return terms.slice(0, 8).join(' ') || query.trim();
    }
    const phrases = lang === 'zh-TW'
        ? ['用簡單方式', '請幫我', '可以', '解釋', '說明', '如何', '產生答案', '有什麼差異', '是什麼', '答案', '什麼', '和']
        : lang === 'zh-CN'
            ? ['用简单方式', '请帮我', '可以', '解释', '说明', '如何', '生成答案', '有什么差异', '是什么', '答案', '什么', '和']
            : lang === 'ja'
                ? ['簡単に', '説明して', 'どのように', 'とは', 'ですか']
                : ['쉽게', '설명해', '어떻게', '무엇인가요', '무엇'];
    let focused = compact;
    phrases.forEach((phrase) => { focused = focused.split(phrase).join(' '); });
    focused = focused.replace(/\s+/g, ' ').trim();
    return focused.slice(0, 80) || query.trim();
};
exports.buildKnowledgeSearchQuery = buildKnowledgeSearchQuery;
const buildWikipediaSearchUrl = (query, lang, limit = 3) => {
    const code = WIKI_LANGUAGE[lang];
    const params = new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: query,
        gsrlimit: String(Math.max(1, Math.min(6, limit))),
        prop: 'extracts',
        exintro: '1',
        explaintext: '1',
        exsentences: '4',
        format: 'json',
        origin: '*'
    });
    if (lang === 'zh-TW') {
        params.set('variant', 'zh-tw');
        params.set('uselang', 'zh-tw');
    }
    if (lang === 'zh-CN') {
        params.set('variant', 'zh-cn');
        params.set('uselang', 'zh-cn');
    }
    return `https://${code}.wikipedia.org/w/api.php?${params.toString()}`;
};
exports.buildWikipediaSearchUrl = buildWikipediaSearchUrl;
const parseWikipediaResponse = (payload, lang) => {
    const code = WIKI_LANGUAGE[lang];
    const query = payload && typeof payload === 'object' ? payload.query : undefined;
    const pages = query && typeof query === 'object' ? query.pages : undefined;
    if (!pages || typeof pages !== 'object')
        return [];
    return Object.values(pages).flatMap((page, index) => {
        const pageid = typeof page.pageid === 'number' ? page.pageid : Number(page.pageid);
        if (!Number.isFinite(pageid) || typeof page.title !== 'string' || typeof page.extract !== 'string' || !page.extract.trim())
            return [];
        return [{
                id: `wikipedia-${pageid}`,
                title: page.title,
                content: page.extract.trim(),
                url: `https://${code}.wikipedia.org/?curid=${pageid}`,
                source: 'online',
                provider: 'Wikipedia',
                score: Math.max(0.2, 1 - index * 0.12)
            }];
    });
};
exports.parseWikipediaResponse = parseWikipediaResponse;
const searchPublicKnowledge = async (query, lang, options = {}) => {
    const timeoutController = new AbortController();
    const timeout = globalThis.setTimeout(() => timeoutController.abort(), options.timeoutMs ?? 5000);
    const abort = () => timeoutController.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    try {
        const focusedQuery = (0, exports.buildKnowledgeSearchQuery)(query, lang);
        const response = await fetch((0, exports.buildWikipediaSearchUrl)(focusedQuery, lang, options.limit ?? 3), {
            signal: timeoutController.signal,
            headers: { Accept: 'application/json' }
        });
        if (!response.ok)
            throw new Error(`PUBLIC_KNOWLEDGE_${response.status}`);
        return (0, exports.parseWikipediaResponse)(await response.json(), lang);
    }
    finally {
        globalThis.clearTimeout(timeout);
        options.signal?.removeEventListener('abort', abort);
    }
};
exports.searchPublicKnowledge = searchPublicKnowledge;
