"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPoetry = searchPoetry;
const normalize = (value) => value
    .normalize('NFKC')
    .toLocaleLowerCase('zh-Hant')
    .replace(/[\s・，。！？、；：「」『』（）《》]/g, '');
const tokenize = (value) => value
    .trim()
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);
const poetSearchText = (poet) => normalize([
    poet.name,
    poet.dynasty,
    poet.courtesyName,
    poet.sobriquet,
    poet.bio,
    ...poet.themes,
    ...poet.styles
].filter(Boolean).join(' '));
const poemSearchText = (poem, poet) => normalize([
    poem.title,
    poet?.name,
    poem.dynasty,
    poem.form,
    ...poem.content,
    ...poem.themes,
    ...poem.imagery
].join(' '));
const scoreMatch = (text, tokens) => tokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0);
function searchPoetry(poets, poems, filters) {
    const tokens = tokenize(filters.query);
    const poetById = new Map(poets.map((poet) => [poet.id, poet]));
    const eligiblePoems = poems.filter((poem) => (filters.dynasty === '全部' || poem.dynasty === filters.dynasty) &&
        (filters.form === '全部' || poem.form === filters.form));
    const rankedPoems = eligiblePoems
        .map((poem) => ({ poem, score: scoreMatch(poemSearchText(poem, poetById.get(poem.poetId)), tokens) }))
        .filter(({ score }) => !tokens.length || score === tokens.length)
        .sort((a, b) => b.score - a.score || a.poem.title.localeCompare(b.poem.title, 'zh-Hant'))
        .map(({ poem }) => poem);
    const poemPoetIds = new Set(rankedPoems.map((poem) => poem.poetId));
    const hasStructuralFilters = filters.dynasty !== '全部' || filters.form !== '全部';
    const rankedPoets = poets
        .filter((poet) => filters.dynasty === '全部' || poet.dynasty === filters.dynasty)
        .map((poet) => ({ poet, score: scoreMatch(poetSearchText(poet), tokens) }))
        .filter(({ poet }) => !hasStructuralFilters || poemPoetIds.has(poet.id))
        .filter(({ poet, score }) => !tokens.length ||
        score === tokens.length ||
        poemPoetIds.has(poet.id))
        .sort((a, b) => Number(poemPoetIds.has(b.poet.id)) - Number(poemPoetIds.has(a.poet.id)) ||
        b.score - a.score ||
        b.poet.poemCount - a.poet.poemCount)
        .map(({ poet }) => poet);
    const visiblePoets = filters.mode === '詩作'
        ? rankedPoets.filter((poet) => poemPoetIds.has(poet.id))
        : rankedPoets;
    const visiblePoems = filters.mode === '詩人'
        ? rankedPoems.filter((poem) => visiblePoets.some((poet) => poet.id === poem.poetId))
        : rankedPoems;
    return {
        poets: visiblePoets,
        poems: visiblePoems,
        total: filters.mode === '詩人' ? visiblePoets.length : visiblePoems.length,
        matchedTerms: tokens
    };
}
