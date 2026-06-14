"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const sportsProviders_js_1 = require("../src/sports/sportsProviders.js");
const sportsDataService_js_1 = require("../src/sports/sportsDataService.js");
const competition = {
    id: 'fifa-world-cup',
    sport: 'football',
    name: 'FIFA 世界盃',
    shortName: '世界盃',
    provider: 'espn',
    providerPath: 'soccer/fifa.world',
    model: 'goals',
    featured: true
};
const payload = {
    events: [{
            id: '401999001',
            name: 'Japan at Netherlands',
            date: '2026-06-14T20:00:00Z',
            status: {
                type: {
                    state: 'in',
                    completed: false,
                    shortDetail: '63\'',
                    detail: '63\''
                }
            },
            competitions: [{
                    venue: { fullName: 'AT&T Stadium' },
                    competitors: [
                        {
                            id: 'home',
                            homeAway: 'home',
                            score: '2',
                            records: [{ summary: '4-1-0' }],
                            team: {
                                id: 'ned',
                                displayName: 'Netherlands',
                                shortDisplayName: 'Netherlands',
                                abbreviation: 'NED',
                                logo: 'https://example.test/ned.png',
                                color: 'f97316'
                            }
                        },
                        {
                            id: 'away',
                            homeAway: 'away',
                            score: '1',
                            records: [{ summary: '3-2-0' }],
                            team: {
                                id: 'jpn',
                                displayName: 'Japan',
                                shortDisplayName: 'Japan',
                                abbreviation: 'JPN',
                                logo: 'https://example.test/jpn.png',
                                color: '2563eb'
                            }
                        }
                    ]
                }]
        }]
};
(0, node_test_1.default)('normalizes an ESPN scoreboard into provider-independent events', () => {
    const snapshot = (0, sportsProviders_js_1.normalizeEspnScoreboard)(payload, competition, '2026-06-14T20:01:00Z');
    const event = snapshot.events[0];
    strict_1.default.equal(snapshot.source, 'ESPN 公開比分');
    strict_1.default.equal(event.status, 'live');
    strict_1.default.equal(event.statusText, '63\'');
    strict_1.default.equal(event.venue, 'AT&T Stadium');
    strict_1.default.equal(event.participants[0].side, 'home');
    strict_1.default.equal(event.participants[0].score, 2);
    strict_1.default.equal(event.participants[1].name, 'Japan');
    strict_1.default.equal(event.participants[1].record, '3-2-0');
});
(0, node_test_1.default)('merges duplicate events and keeps the freshest provider copy', () => {
    const base = (0, sportsProviders_js_1.normalizeEspnScoreboard)(payload, competition, '2026-06-14T20:01:00Z').events[0];
    const stale = {
        ...base,
        status: 'scheduled',
        statusText: 'Scheduled',
        sourceUpdatedAt: '2026-06-14T19:00:00Z'
    };
    const merged = (0, sportsProviders_js_1.mergeSportsEvents)([stale], [base]);
    strict_1.default.equal(merged.length, 1);
    strict_1.default.equal(merged[0].status, 'live');
});
(0, node_test_1.default)('falls back to bundled events when every remote provider fails', async () => {
    const fallback = (0, sportsProviders_js_1.normalizeEspnScoreboard)(payload, competition, '2026-06-14T20:01:00Z').events;
    const snapshot = await (0, sportsProviders_js_1.loadSportsSnapshot)({
        competitions: [competition],
        dateKey: '2026-06-14',
        fallbackEvents: fallback,
        fetcher: async () => {
            throw new Error('offline');
        },
        now: () => new Date('2026-06-14T20:02:00Z')
    });
    strict_1.default.equal(snapshot.mode, 'fallback');
    strict_1.default.equal(snapshot.events.length, 1);
    strict_1.default.match(snapshot.warning ?? '', /offline|fallback|更新失敗/i);
});
(0, node_test_1.default)('ignores malformed provider events instead of rejecting the snapshot', () => {
    const snapshot = (0, sportsProviders_js_1.normalizeEspnScoreboard)({ events: [{ id: 'bad' }, null] }, competition, '2026-06-14T20:01:00Z');
    strict_1.default.deepEqual(snapshot.events, []);
});
(0, node_test_1.default)('normalizes TheSportsDB schedules for niche sports without a user key', () => {
    const badmintonCompetition = {
        id: 'badminton',
        sport: 'badminton',
        name: '國際羽球賽事',
        shortName: '羽球',
        provider: 'thesportsdb',
        secondarySportName: 'Badminton',
        model: 'sets'
    };
    const snapshot = (0, sportsProviders_js_1.normalizeTheSportsDbSchedule)({
        events: [{
                idEvent: 'tsdb-1',
                strEvent: 'Player A vs Player B',
                strTimestamp: '2026-06-14T08:00:00Z',
                strStatus: 'Not Started',
                strHomeTeam: 'Player A',
                strAwayTeam: 'Player B',
                idHomeTeam: 'a',
                idAwayTeam: 'b',
                intHomeScore: null,
                intAwayScore: null,
                strVenue: 'Arena One',
                strRound: 'Round of 16'
            }]
    }, badmintonCompetition, '2026-06-14T07:00:00Z');
    strict_1.default.equal(snapshot.events.length, 1);
    strict_1.default.equal(snapshot.events[0].sport, 'badminton');
    strict_1.default.equal(snapshot.events[0].participants[0].name, 'Player A');
    strict_1.default.equal(snapshot.events[0].venue, 'Arena One');
    strict_1.default.equal(snapshot.source, 'TheSportsDB 公開賽程');
});
(0, node_test_1.default)('uses a fresh cached snapshot without calling the network', async () => {
    const memory = new Map();
    const storage = {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => memory.set(key, value)
    };
    const snapshot = (0, sportsProviders_js_1.normalizeEspnScoreboard)(payload, competition, '2026-06-14T20:01:00Z');
    (0, sportsDataService_js_1.writeSportsCache)(storage, 'sports:test', snapshot, 1000);
    let calls = 0;
    const result = await (0, sportsDataService_js_1.loadSportsCenterData)({
        cacheKey: 'sports:test',
        storage,
        nowMs: 1000 + 30_000,
        ttlMs: 45_000,
        competitions: [competition],
        dateKey: '2026-06-14',
        fallbackEvents: [],
        fetcher: async () => {
            calls += 1;
            throw new Error('should not run');
        }
    });
    strict_1.default.equal(calls, 0);
    strict_1.default.equal(result.mode, 'cache');
    strict_1.default.equal(result.events[0].status, 'live');
});
(0, node_test_1.default)('keeps stale cached data when refresh and bundled fallback are empty', async () => {
    const memory = new Map();
    const storage = {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => memory.set(key, value)
    };
    const snapshot = (0, sportsProviders_js_1.normalizeEspnScoreboard)(payload, competition, '2026-06-14T20:01:00Z');
    (0, sportsDataService_js_1.writeSportsCache)(storage, 'sports:stale', snapshot, 1000);
    const result = await (0, sportsDataService_js_1.loadSportsCenterData)({
        cacheKey: 'sports:stale',
        storage,
        nowMs: 1000 + 90_000,
        ttlMs: 45_000,
        competitions: [competition],
        dateKey: '2026-06-14',
        fallbackEvents: [],
        fetcher: async () => {
            throw new Error('offline');
        }
    });
    strict_1.default.equal((0, sportsDataService_js_1.readSportsCache)(storage, 'sports:stale', 91_000, 45_000), null);
    strict_1.default.equal(result.mode, 'cache');
    strict_1.default.equal(result.events.length, 1);
    strict_1.default.match(result.warning ?? '', /cached|快取/i);
});
