"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeSportsCache = writeSportsCache;
exports.readSportsCache = readSportsCache;
exports.loadSportsCenterData = loadSportsCenterData;
const sportsProviders_js_1 = require("./sportsProviders.js");
const readStored = (storage, cacheKey) => {
    if (!storage)
        return null;
    try {
        const raw = storage.getItem(cacheKey);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (parsed.version !== 1 ||
            !Number.isFinite(parsed.savedAt) ||
            !parsed.snapshot ||
            !Array.isArray(parsed.snapshot.events)) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
};
function writeSportsCache(storage, cacheKey, snapshot, savedAt = Date.now()) {
    if (!storage)
        return;
    try {
        storage.setItem(cacheKey, JSON.stringify({
            version: 1,
            savedAt,
            snapshot
        }));
    }
    catch {
        // Cache availability must never block scores or predictions.
    }
}
function readSportsCache(storage, cacheKey, nowMs = Date.now(), ttlMs = 45_000) {
    const stored = readStored(storage, cacheKey);
    if (!stored || nowMs - stored.savedAt > ttlMs)
        return null;
    return {
        ...stored.snapshot,
        mode: 'cache'
    };
}
async function loadSportsCenterData(options) {
    const nowMs = options.nowMs ?? Date.now();
    const ttlMs = options.ttlMs ?? 45_000;
    const fresh = readSportsCache(options.storage, options.cacheKey, nowMs, ttlMs);
    if (fresh && !options.force)
        return fresh;
    const stale = readStored(options.storage, options.cacheKey)?.snapshot ?? null;
    const snapshot = await (0, sportsProviders_js_1.loadSportsSnapshot)({
        competitions: options.competitions,
        dateKey: options.dateKey,
        fallbackEvents: options.fallbackEvents,
        fetcher: options.fetcher,
        now: () => new Date(nowMs),
        windowDays: options.windowDays
    });
    if (snapshot.mode === 'live') {
        writeSportsCache(options.storage, options.cacheKey, snapshot, nowMs);
        return snapshot;
    }
    if (!snapshot.events.length && stale?.events.length) {
        return {
            ...stale,
            mode: 'cache',
            warning: '遠端更新失敗，顯示快取資料。'
        };
    }
    return snapshot;
}
