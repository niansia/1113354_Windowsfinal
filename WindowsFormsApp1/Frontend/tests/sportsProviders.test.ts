import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadSportsSnapshot,
  mergeSportsEvents,
  normalizeEspnScoreboard,
  normalizeTheSportsDbSchedule
} from '../src/sports/sportsProviders.js';
import type { SportsCompetition, SportsEvent } from '../src/sports/sportsTypes.js';
import {
  loadSportsCenterData,
  readSportsCache,
  writeSportsCache
} from '../src/sports/sportsDataService.js';

const competition: SportsCompetition = {
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

test('normalizes an ESPN scoreboard into provider-independent events', () => {
  const snapshot = normalizeEspnScoreboard(payload, competition, '2026-06-14T20:01:00Z');
  const event = snapshot.events[0];

  assert.equal(snapshot.source, 'ESPN 公開比分');
  assert.equal(event.status, 'live');
  assert.equal(event.statusText, '63\'');
  assert.equal(event.venue, 'AT&T Stadium');
  assert.equal(event.participants[0].side, 'home');
  assert.equal(event.participants[0].score, 2);
  assert.equal(event.participants[1].name, 'Japan');
  assert.equal(event.participants[1].record, '3-2-0');
});

test('merges duplicate events and keeps the freshest provider copy', () => {
  const base = normalizeEspnScoreboard(payload, competition, '2026-06-14T20:01:00Z').events[0];
  const stale: SportsEvent = {
    ...base,
    status: 'scheduled',
    statusText: 'Scheduled',
    sourceUpdatedAt: '2026-06-14T19:00:00Z'
  };

  const merged = mergeSportsEvents([stale], [base]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, 'live');
});

test('falls back to bundled events when every remote provider fails', async () => {
  const fallback = normalizeEspnScoreboard(payload, competition, '2026-06-14T20:01:00Z').events;
  const snapshot = await loadSportsSnapshot({
    competitions: [competition],
    dateKey: '2026-06-14',
    fallbackEvents: fallback,
    fetcher: async () => {
      throw new Error('offline');
    },
    now: () => new Date('2026-06-14T20:02:00Z')
  });

  assert.equal(snapshot.mode, 'fallback');
  assert.equal(snapshot.events.length, 1);
  assert.match(snapshot.warning ?? '', /offline|fallback|更新失敗/i);
});

test('ignores malformed provider events instead of rejecting the snapshot', () => {
  const snapshot = normalizeEspnScoreboard({ events: [{ id: 'bad' }, null] }, competition, '2026-06-14T20:01:00Z');
  assert.deepEqual(snapshot.events, []);
});

test('normalizes TheSportsDB schedules for niche sports without a user key', () => {
  const badmintonCompetition: SportsCompetition = {
    id: 'badminton',
    sport: 'badminton',
    name: '國際羽球賽事',
    shortName: '羽球',
    provider: 'thesportsdb',
    secondarySportName: 'Badminton',
    model: 'sets'
  };
  const snapshot = normalizeTheSportsDbSchedule({
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

  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.events[0].sport, 'badminton');
  assert.equal(snapshot.events[0].participants[0].name, 'Player A');
  assert.equal(snapshot.events[0].venue, 'Arena One');
  assert.equal(snapshot.source, 'TheSportsDB 公開賽程');
});

test('uses a fresh cached snapshot without calling the network', async () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value)
  };
  const snapshot = normalizeEspnScoreboard(payload, competition, '2026-06-14T20:01:00Z');
  writeSportsCache(storage, 'sports:test', snapshot, 1000);
  let calls = 0;

  const result = await loadSportsCenterData({
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

  assert.equal(calls, 0);
  assert.equal(result.mode, 'cache');
  assert.equal(result.events[0].status, 'live');
});

test('keeps stale cached data when refresh and bundled fallback are empty', async () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value)
  };
  const snapshot = normalizeEspnScoreboard(payload, competition, '2026-06-14T20:01:00Z');
  writeSportsCache(storage, 'sports:stale', snapshot, 1000);

  const result = await loadSportsCenterData({
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

  assert.equal(readSportsCache(storage, 'sports:stale', 91_000, 45_000), null);
  assert.equal(result.mode, 'cache');
  assert.equal(result.events.length, 1);
  assert.match(result.warning ?? '', /cached|快取/i);
});
