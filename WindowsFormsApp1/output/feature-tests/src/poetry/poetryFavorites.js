"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POETRY_FAVORITES_KEY = void 0;
exports.getFavoriteViewFilters = getFavoriteViewFilters;
exports.parseFavoritePoems = parseFavoritePoems;
exports.serializeFavoritePoems = serializeFavoritePoems;
exports.toggleFavoritePoem = toggleFavoritePoem;
exports.POETRY_FAVORITES_KEY = 'fusion-poetry-cloud-favorites-v1';
function getFavoriteViewFilters() {
    return {
        query: '',
        dynasty: '全部',
        form: '全部',
        mode: '全部'
    };
}
function parseFavoritePoems(value) {
    if (!value)
        return new Set();
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed))
            return new Set();
        return new Set(parsed.filter((item) => typeof item === 'string' && item.length > 0));
    }
    catch {
        return new Set();
    }
}
function serializeFavoritePoems(favorites) {
    return JSON.stringify([...favorites].sort());
}
function toggleFavoritePoem(favorites, poemId) {
    const next = new Set(favorites);
    if (next.has(poemId))
        next.delete(poemId);
    else
        next.add(poemId);
    return next;
}
