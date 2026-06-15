import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadSportsSnapshot,
  mergeSportsEvents,
  normalizeEspnNews,
  normalizeEspnScoreboard,
  normalizeTheSportsDbSchedule
} from '../src/sports/sportsProviders.js';
import type { SportsCompetition, SportsEvent } from '../src/sports/sportsTypes.js';
import {
  loadSportsCenterData,
  readSportsCache,
  writeSportsCache
} from '../src/sports/sportsDataService.js';
import { deriveSideMetrics, nationalTeamRating, parseTeamRecord } from '../src/sports/sportsStrength.js';
import { localizeTeamName } from '../src/sports/sportsTeamNames.js';
import { normalizeEspnRoster, summarizeSquad } from '../src/sports/sportsRoster.js';
import { providerEventId } from '../src/sports/sportsDetail.js';
import { buildPositionMatchups } from '../src/sports/sportsMatchups.js';
import { starPlayerTier } from '../src/sports/sportsPlayerRatings.js';

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

test('widens the ESPN query to a day window so timezone-shifted games are fetched', async () => {
  const requested: string[] = [];
  const snapshot = await loadSportsSnapshot({
    competitions: [competition],
    dateKey: '2026-06-15',
    fallbackEvents: [],
    windowDays: 1,
    now: () => new Date('2026-06-15T00:00:00Z'),
    fetcher: async (url) => {
      requested.push(String(url));
      return { ok: true, json: async () => payload } as unknown as Response;
    }
  });

  assert.equal(requested.length, 1);
  assert.match(requested[0], /dates=20260614-20260616/);
  assert.ok(requested[0].includes('limit='));
  assert.equal(snapshot.mode, 'live');
  assert.ok(snapshot.events.length >= 1);
});

test('derives differentiated strength from a win-loss record', () => {
  assert.equal(parseTeamRecord('')?.winPct, undefined);
  const strong = deriveSideMetrics('60-12');
  const weak = deriveSideMetrics('12-60');
  assert.ok(strong && weak);
  assert.ok(strong!.rating > 1500, 'a winning record should rate above the mean');
  assert.ok(weak!.rating < 1500, 'a losing record should rate below the mean');
  assert.ok(strong!.rating > weak!.rating);
  // 3-part records (W-D-L / W-L-OTL) still parse.
  assert.ok(deriveSideMetrics('53-22-7'));
  assert.equal(deriveSideMetrics('not-a-record'), null);
});

test('strips the competition prefix to the raw provider event id', () => {
  assert.equal(providerEventId('fifa-world-cup:760421'), '760421');
  assert.equal(providerEventId('760421'), '760421');
});

test('national-team table gives large, ordered strength gaps that beat a 1-game record', () => {
  const argentina = nationalTeamRating('Argentina');
  const curacao = nationalTeamRating('Curaçao');
  assert.ok(argentina && curacao && argentina - curacao > 400, 'a giant should outrate a minnow by a lot');
  assert.equal(nationalTeamRating('United States'), nationalTeamRating('USA')); // alias folds in
  assert.equal(nationalTeamRating('Some Club FC'), null); // clubs/unknown fall through
  // A national team that has only played one group game must still anchor on the table.
  const strong = deriveSideMetrics('1-0-0', 'Argentina');
  const weak = deriveSideMetrics('0-0-1', 'Curaçao');
  assert.ok(strong && weak);
  assert.ok(strong!.rating > 2000);
  assert.ok(strong!.rating - weak!.rating > 400, 'mismatched WC sides should not collapse toward 1500');
});

test('star-power table matches accent- and order-insensitively and lifts marquee names', () => {
  const accentForm = starPlayerTier('Vinícius Júnior');
  const asciiForm = starPlayerTier('Vinicius Junior');
  assert.ok(accentForm && asciiForm && accentForm === asciiForm, 'accents should not block a match');
  assert.ok((starPlayerTier('Kylian Mbappe') ?? 0) > (starPlayerTier('Harry Kane') ?? 0));
  assert.equal(starPlayerTier('Some Unknown Reserve'), null);

  // A listed star should out-score an unknown team-mate on the same team.
  const roster = normalizeEspnRoster({
    athletes: [
      { id: 's', displayName: 'Kylian Mbappe', jersey: '10', position: { abbreviation: 'F' }, age: 27 },
      { id: 'u', displayName: 'Anon Reserve', jersey: '24', position: { abbreviation: 'F' }, age: 27 }
    ]
  }, 'home');
  const report = buildPositionMatchups({
    sport: 'football', homeName: 'H', awayName: 'A',
    homeRoster: roster, awayRoster: roster, homeTeamRating: 1900, awayTeamRating: 1900
  });
  const forwards = report.groups.find((group) => group.group === 'FWD')!;
  const star = forwards.pairings.find((pair) => pair.home?.id === 's')?.homeScore ?? 0;
  const anon = forwards.pairings.find((pair) => pair.home?.id === 'u')?.homeScore ?? 0;
  assert.ok(star > anon + 8, 'a star should clearly out-rate an anonymous squad player');
});

test('player matchup scores vary within a squad instead of repeating one number', () => {
  const roster = normalizeEspnRoster({
    athletes: [
      { id: 'a', displayName: 'Teen Forward', jersey: '19', position: { abbreviation: 'F' }, age: 18 },
      { id: 'b', displayName: 'Prime Forward', jersey: '9', position: { abbreviation: 'F' }, age: 27 },
      { id: 'c', displayName: 'Veteran Forward', jersey: '7', position: { abbreviation: 'F' }, age: 35 }
    ]
  }, 'home');
  const report = buildPositionMatchups({
    sport: 'football',
    homeName: 'Home',
    awayName: 'Away',
    homeRoster: roster,
    awayRoster: roster,
    homeTeamRating: 1800,
    awayTeamRating: 1800
  });
  const forwards = report.groups.find((group) => group.group === 'FWD');
  assert.ok(forwards);
  const scores = forwards!.pairings.map((pair) => pair.homeScore);
  assert.ok(new Set(scores).size > 1, 'players in a group should not all share one score');
});

test('localizes known team and country names, falling back to English', () => {
  assert.equal(localizeTeamName('Sweden', 'zh-TW'), '瑞典');
  assert.equal(localizeTeamName('Sweden', 'ja'), 'スウェーデン');
  assert.equal(localizeTeamName('Sweden', 'en'), 'Sweden');
  assert.equal(localizeTeamName('Türkiye', 'zh-TW'), '土耳其');
  assert.equal(localizeTeamName('United States', 'zh-TW'), '美國'); // alias
  assert.equal(localizeTeamName('Nowhere United', 'zh-TW'), 'Nowhere United'); // fallback
});

test('normalizes an ESPN roster into players and a squad summary', () => {
  const roster = normalizeEspnRoster({
    athletes: [
      { id: '1', displayName: 'Keeper One', jersey: '1', position: { abbreviation: 'G' }, age: 30, headshot: { href: 'https://espn.test/1.png' } },
      { id: '2', displayName: 'Back Two', jersey: '4', position: { abbreviation: 'D' }, age: 24 },
      { id: '3', displayName: 'Mid Three', jersey: '8', position: { abbreviation: 'M' }, age: 26 },
      { id: '4', displayName: 'Striker Four', jersey: '9', position: { abbreviation: 'F' }, age: 28 },
      { displayName: '' }
    ]
  }, '628');

  assert.equal(roster.teamId, '628');
  assert.equal(roster.players.length, 4);
  assert.equal(roster.players[0].group, 'GK');
  assert.equal(roster.players[1].group, 'DEF');
  assert.equal(roster.summary.count, 4);
  assert.equal(roster.summary.byGroup.FWD, 1);
  assert.equal(roster.summary.avgAge, 27);
  assert.equal(summarizeSquad([]).avgAge, null);
});

test('normalizes ESPN news into headline links and skips entries without a title', () => {
  const headlines = normalizeEspnNews({
    articles: [
      { headline: 'Walk-off in extra innings', description: 'recap', links: { web: { href: 'https://espn.test/a' } } },
      { description: 'missing headline' },
      { headline: 'Relative link is dropped', links: { web: { href: '/mlb/story' } } }
    ]
  }, 5);

  assert.equal(headlines.length, 2);
  assert.equal(headlines[0].title, 'Walk-off in extra innings');
  assert.equal(headlines[0].url, 'https://espn.test/a');
  assert.equal(headlines[1].url, undefined);
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
