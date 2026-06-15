import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEspnEventSummary } from '../src/sports/sportsDetail.js';
import {
  applyPredictionEvidence,
  buildPredictionEvidence
} from '../src/sports/sportsEvidence.js';
import { buildPositionMatchups } from '../src/sports/sportsMatchups.js';
import { normalizeEspnRoster } from '../src/sports/sportsRoster.js';
import { createPredictionInput } from '../src/sports/sportsSimulation.js';
import type {
  SportsEvent,
  TeamRoster
} from '../src/sports/sportsTypes.js';

const event: SportsEvent = {
  id: '760428',
  sport: 'football',
  competitionId: 'fifa-world-cup',
  competitionName: 'FIFA 世界盃',
  headline: 'Spain vs Cape Verde',
  startTime: '2026-06-15T16:00:00Z',
  status: 'scheduled',
  statusText: 'Scheduled',
  participants: [
    {
      id: '164',
      name: 'Spain',
      shortName: 'Spain',
      abbreviation: 'ESP',
      side: 'home',
      score: null,
      record: '4-0-1',
      rating: 1810,
      offense: 72,
      defense: 74,
      form: 70
    },
    {
      id: '2597',
      name: 'Cape Verde',
      shortName: 'Cape Verde',
      abbreviation: 'CPV',
      side: 'away',
      score: null,
      record: '2-1-2',
      rating: 1590,
      offense: 54,
      defense: 56,
      form: 48
    }
  ],
  venue: 'Mercedes-Benz Stadium',
  round: 'Group H',
  source: 'ESPN 公開比分',
  sourceUpdatedAt: '2026-06-15T08:00:00Z'
};

const summaryPayload = {
  header: {
    season: { year: 2026, name: '2026 FIFA World Cup, Group Stage' },
    competitions: [{
      neutralSite: true,
      altGameNote: 'FIFA World Cup, Group H',
      broadcasts: [
        { media: { shortName: 'FOX' } },
        { media: { shortName: 'Peacock' } }
      ]
    }]
  },
  gameInfo: {
    venue: {
      fullName: 'Mercedes-Benz Stadium',
      address: { city: 'Atlanta, Georgia', country: 'USA' }
    }
  },
  lastFiveGames: [
    {
      team: { id: '164', displayName: 'Spain', abbreviation: 'ESP' },
      events: [
        {
          id: 'spain-1',
          gameDate: '2026-06-09T02:00:00Z',
          score: '3-1',
          gameResult: 'W',
          competitionName: 'International Friendly',
          opponent: { id: '211', displayName: 'Peru', abbreviation: 'PER' }
        },
        {
          id: 'spain-2',
          gameDate: '2026-06-04T19:00:00Z',
          score: '1-1',
          gameResult: 'D',
          competitionName: 'International Friendly',
          opponent: { id: '4375', displayName: 'Iraq', abbreviation: 'IRQ' }
        }
      ]
    },
    {
      team: { id: '2597', displayName: 'Cape Verde', abbreviation: 'CPV' },
      events: [
        {
          id: 'cape-1',
          gameDate: '2026-05-31T15:00:00Z',
          score: '3-0',
          gameResult: 'W',
          competitionName: 'International Friendly',
          opponent: { id: '6757', displayName: 'Serbia', abbreviation: 'SRB' }
        },
        {
          id: 'cape-2',
          gameDate: '2026-03-27T03:00:00Z',
          score: '2-4',
          gameResult: 'L',
          competitionName: 'International Friendly',
          opponent: { id: '207', displayName: 'Chile', abbreviation: 'CHI' }
        }
      ]
    }
  ],
  headToHeadGames: [{
    team: { id: '164', displayName: 'Spain' },
    events: [{
      id: 'h2h-1',
      gameDate: '2013-06-01T12:00:00Z',
      score: '2-0',
      gameResult: 'W',
      competitionName: 'Friendly',
      opponent: { id: '2597', displayName: 'Cape Verde', abbreviation: 'CPV' }
    }]
  }],
  standings: {
    header: 'Group H',
    groups: [{
      standings: {
        entries: [
          {
            id: '164',
            team: 'Spain',
            stats: [
              { name: 'rank', value: 1 },
              { name: 'gamesPlayed', value: 1 },
              { name: 'wins', value: 1 },
              { name: 'ties', value: 0 },
              { name: 'losses', value: 0 },
              { name: 'points', value: 3 }
            ]
          },
          {
            id: '2597',
            team: 'Cape Verde',
            stats: [
              { name: 'rank', value: 4 },
              { name: 'gamesPlayed', value: 1 },
              { name: 'wins', value: 0 },
              { name: 'ties', value: 0 },
              { name: 'losses', value: 1 },
              { name: 'points', value: 0 }
            ]
          }
        ]
      }
    }]
  },
  rosters: [{
    team: { id: '164' },
    roster: [{
      athlete: {
        id: 'gk-home',
        displayName: 'Home Keeper',
        position: { abbreviation: 'G' },
        age: 29,
        displayHeight: '6 ft 2 in',
        displayWeight: '185 lbs',
        status: { name: 'Active' }
      }
    }]
  }]
};

const rosterPayload = {
  athletes: [
    {
      id: 'gk',
      displayName: 'Keeper',
      jersey: '1',
      position: { abbreviation: 'G' },
      age: 29,
      displayHeight: '6 ft 2 in',
      displayWeight: '185 lbs',
      dateOfBirth: '1996-01-02T00:00:00Z',
      status: { name: 'Active', type: 'active' },
      injuries: [],
      links: [{ rel: ['playercard'], href: 'https://www.espn.com/player/gk' }]
    },
    {
      id: 'def',
      displayName: 'Defender',
      jersey: '4',
      position: { abbreviation: 'D' },
      age: 27,
      status: { name: 'Questionable', type: 'questionable' },
      injuries: [{ status: 'Questionable', details: { type: 'Hamstring' } }]
    }
  ]
};

const roster = (teamId: string, prefix: string, injured = false): TeamRoster =>
  normalizeEspnRoster({
    athletes: [
      { id: `${prefix}-gk`, displayName: `${prefix} Keeper`, position: { abbreviation: 'G' }, age: 29, status: { name: 'Active', type: 'active' } },
      { id: `${prefix}-d1`, displayName: `${prefix} Defender 1`, position: { abbreviation: 'D' }, age: 26, status: { name: 'Active', type: 'active' } },
      {
        id: `${prefix}-d2`,
        displayName: `${prefix} Defender 2`,
        position: { abbreviation: 'D' },
        age: 31,
        status: { name: injured ? 'Out' : 'Active', type: injured ? 'out' : 'active' },
        injuries: injured ? [{ status: 'Out', details: { type: 'Knee' } }] : []
      },
      { id: `${prefix}-m1`, displayName: `${prefix} Midfielder`, position: { abbreviation: 'M' }, age: 25, status: { name: 'Active', type: 'active' } },
      { id: `${prefix}-f1`, displayName: `${prefix} Forward`, position: { abbreviation: 'F' }, age: 24, status: { name: 'Active', type: 'active' } }
    ]
  }, teamId);

test('normalizes ESPN event summary into an event dossier', () => {
  const detail = normalizeEspnEventSummary(summaryPayload, event);

  assert.equal(detail.eventId, '760428');
  assert.equal(detail.season, '2026 FIFA World Cup, Group Stage');
  assert.equal(detail.round, 'FIFA World Cup, Group H');
  assert.equal(detail.venue?.name, 'Mercedes-Benz Stadium');
  assert.equal(detail.venue?.city, 'Atlanta, Georgia');
  assert.equal(detail.neutralSite, true);
  assert.deepEqual(detail.broadcasts, ['FOX', 'Peacock']);
  assert.equal(detail.teams[0].recentGames[0].result, 'W');
  assert.equal(detail.headToHeadGames.length, 1);
  assert.equal(detail.standings.find((row) => row.teamId === '164')?.rank, 1);
  assert.equal(detail.rosters[0].players[0].name, 'Home Keeper');
  assert.ok(detail.coverage.score > 0.5);
});

test('enriches roster players with biography and availability', () => {
  const result = normalizeEspnRoster(rosterPayload, '164');
  const keeper = result.players[0];
  const defender = result.players[1];

  assert.equal(keeper.displayHeight, '6 ft 2 in');
  assert.equal(keeper.displayWeight, '185 lbs');
  assert.equal(keeper.dateOfBirth, '1996-01-02T00:00:00Z');
  assert.equal(keeper.profileUrl, 'https://www.espn.com/player/gk');
  assert.equal(keeper.available, true);
  assert.equal(defender.available, false);
  assert.deepEqual(defender.injuries, ['Hamstring']);
  assert.equal(result.summary.unavailable, 1);
});

test('builds bounded prediction evidence from form, history, standings, and squads', () => {
  const detail = normalizeEspnEventSummary(summaryPayload, event);
  const evidence = buildPredictionEvidence({
    event,
    detail,
    homeRoster: roster('164', 'Home'),
    awayRoster: roster('2597', 'Away', true)
  });

  assert.ok(evidence.factors.some((factor) => factor.id === 'recent-form'));
  assert.ok(evidence.factors.some((factor) => factor.id === 'head-to-head'));
  assert.ok(evidence.factors.some((factor) => factor.id === 'standings'));
  assert.ok(evidence.factors.some((factor) => factor.id === 'availability'));
  assert.equal(evidence.factors.find((factor) => factor.id === 'venue')?.impact, 0);
  assert.ok(evidence.homeRatingAdjustment > evidence.awayRatingAdjustment);
  assert.ok(Math.abs(evidence.homeRatingAdjustment) <= 180);
  assert.ok(Math.abs(evidence.awayRatingAdjustment) <= 180);
  assert.ok(evidence.coverage > 0.6 && evidence.coverage <= 1);
});

test('applies evidence without mutating the base prediction input', () => {
  const base = createPredictionInput({
    model: 'goals',
    homeName: 'Spain',
    awayName: 'Cape Verde',
    homeRating: 1700,
    awayRating: 1600,
    homeForm: 50,
    awayForm: 50,
    seed: 10
  });
  const evidence = buildPredictionEvidence({
    event,
    detail: normalizeEspnEventSummary(summaryPayload, event),
    homeRoster: roster('164', 'Home'),
    awayRoster: roster('2597', 'Away', true)
  });
  const enriched = applyPredictionEvidence(base, evidence);

  assert.equal(base.home.rating, 1700);
  assert.ok(enriched.home.rating > base.home.rating);
  assert.ok(enriched.away.rating <= base.away.rating);
  assert.equal(enriched.seed, base.seed);
});

test('builds football position matchups and penalizes unavailable players', () => {
  const matchups = buildPositionMatchups({
    sport: 'football',
    homeName: 'Spain',
    awayName: 'Cape Verde',
    homeRoster: roster('164', 'Home'),
    awayRoster: roster('2597', 'Away', true),
    homeTeamRating: 1810,
    awayTeamRating: 1590
  });

  assert.deepEqual(matchups.groups.map((group) => group.group), ['GK', 'DEF', 'MID', 'FWD']);
  const defense = matchups.groups.find((group) => group.group === 'DEF');
  assert.ok(defense);
  assert.ok(defense!.home.score > defense!.away.score);
  assert.equal(defense!.away.unavailable, 1);
  assert.ok(defense!.pairings.length > 0);
  assert.ok(defense!.pairings.every((pair) =>
    pair.homeScore >= 0 && pair.homeScore <= 100 &&
    pair.awayScore >= 0 && pair.awayScore <= 100
  ));
});

test('returns low-coverage evidence and empty matchups for sparse data', () => {
  const sparseEvent: SportsEvent = {
    ...event,
    participants: event.participants.map((participant) => ({
      ...participant,
      record: undefined,
      rating: undefined,
      offense: undefined,
      defense: undefined,
      form: undefined
    }))
  };
  const evidence = buildPredictionEvidence({ event: sparseEvent, detail: null, homeRoster: null, awayRoster: null });
  const matchups = buildPositionMatchups({
    sport: 'football',
    homeName: 'A',
    awayName: 'B',
    homeRoster: null,
    awayRoster: null,
    homeTeamRating: 1500,
    awayTeamRating: 1500
  });

  assert.ok(evidence.coverage < 0.4);
  assert.equal(evidence.homeRatingAdjustment, 0);
  assert.equal(evidence.awayRatingAdjustment, 0);
  assert.deepEqual(matchups.groups, []);
});

