"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const sportsDetail_js_1 = require("../src/sports/sportsDetail.js");
const sportsEvidence_js_1 = require("../src/sports/sportsEvidence.js");
const sportsMatchups_js_1 = require("../src/sports/sportsMatchups.js");
const sportsRoster_js_1 = require("../src/sports/sportsRoster.js");
const sportsSimulation_js_1 = require("../src/sports/sportsSimulation.js");
const event = {
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
const roster = (teamId, prefix, injured = false) => (0, sportsRoster_js_1.normalizeEspnRoster)({
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
(0, node_test_1.default)('normalizes ESPN event summary into an event dossier', () => {
    const detail = (0, sportsDetail_js_1.normalizeEspnEventSummary)(summaryPayload, event);
    strict_1.default.equal(detail.eventId, '760428');
    strict_1.default.equal(detail.season, '2026 FIFA World Cup, Group Stage');
    strict_1.default.equal(detail.round, 'FIFA World Cup, Group H');
    strict_1.default.equal(detail.venue?.name, 'Mercedes-Benz Stadium');
    strict_1.default.equal(detail.venue?.city, 'Atlanta, Georgia');
    strict_1.default.equal(detail.neutralSite, true);
    strict_1.default.deepEqual(detail.broadcasts, ['FOX', 'Peacock']);
    strict_1.default.equal(detail.teams[0].recentGames[0].result, 'W');
    strict_1.default.equal(detail.headToHeadGames.length, 1);
    strict_1.default.equal(detail.standings.find((row) => row.teamId === '164')?.rank, 1);
    strict_1.default.equal(detail.rosters[0].players[0].name, 'Home Keeper');
    strict_1.default.ok(detail.coverage.score > 0.5);
});
(0, node_test_1.default)('enriches roster players with biography and availability', () => {
    const result = (0, sportsRoster_js_1.normalizeEspnRoster)(rosterPayload, '164');
    const keeper = result.players[0];
    const defender = result.players[1];
    strict_1.default.equal(keeper.displayHeight, '6 ft 2 in');
    strict_1.default.equal(keeper.displayWeight, '185 lbs');
    strict_1.default.equal(keeper.dateOfBirth, '1996-01-02T00:00:00Z');
    strict_1.default.equal(keeper.profileUrl, 'https://www.espn.com/player/gk');
    strict_1.default.equal(keeper.available, true);
    strict_1.default.equal(defender.available, false);
    strict_1.default.deepEqual(defender.injuries, ['Hamstring']);
    strict_1.default.equal(result.summary.unavailable, 1);
});
(0, node_test_1.default)('builds bounded prediction evidence from form, history, standings, and squads', () => {
    const detail = (0, sportsDetail_js_1.normalizeEspnEventSummary)(summaryPayload, event);
    const evidence = (0, sportsEvidence_js_1.buildPredictionEvidence)({
        event,
        detail,
        homeRoster: roster('164', 'Home'),
        awayRoster: roster('2597', 'Away', true)
    });
    strict_1.default.ok(evidence.factors.some((factor) => factor.id === 'recent-form'));
    strict_1.default.ok(evidence.factors.some((factor) => factor.id === 'head-to-head'));
    strict_1.default.ok(evidence.factors.some((factor) => factor.id === 'standings'));
    strict_1.default.ok(evidence.factors.some((factor) => factor.id === 'availability'));
    strict_1.default.equal(evidence.factors.find((factor) => factor.id === 'venue')?.impact, 0);
    strict_1.default.ok(evidence.homeRatingAdjustment > evidence.awayRatingAdjustment);
    strict_1.default.ok(Math.abs(evidence.homeRatingAdjustment) <= 180);
    strict_1.default.ok(Math.abs(evidence.awayRatingAdjustment) <= 180);
    strict_1.default.ok(evidence.coverage > 0.6 && evidence.coverage <= 1);
});
(0, node_test_1.default)('applies evidence without mutating the base prediction input', () => {
    const base = (0, sportsSimulation_js_1.createPredictionInput)({
        model: 'goals',
        homeName: 'Spain',
        awayName: 'Cape Verde',
        homeRating: 1700,
        awayRating: 1600,
        homeForm: 50,
        awayForm: 50,
        seed: 10
    });
    const evidence = (0, sportsEvidence_js_1.buildPredictionEvidence)({
        event,
        detail: (0, sportsDetail_js_1.normalizeEspnEventSummary)(summaryPayload, event),
        homeRoster: roster('164', 'Home'),
        awayRoster: roster('2597', 'Away', true)
    });
    const enriched = (0, sportsEvidence_js_1.applyPredictionEvidence)(base, evidence);
    strict_1.default.equal(base.home.rating, 1700);
    strict_1.default.ok(enriched.home.rating > base.home.rating);
    strict_1.default.ok(enriched.away.rating <= base.away.rating);
    strict_1.default.equal(enriched.seed, base.seed);
});
(0, node_test_1.default)('builds football position matchups and penalizes unavailable players', () => {
    const matchups = (0, sportsMatchups_js_1.buildPositionMatchups)({
        sport: 'football',
        homeName: 'Spain',
        awayName: 'Cape Verde',
        homeRoster: roster('164', 'Home'),
        awayRoster: roster('2597', 'Away', true),
        homeTeamRating: 1810,
        awayTeamRating: 1590
    });
    strict_1.default.deepEqual(matchups.groups.map((group) => group.group), ['GK', 'DEF', 'MID', 'FWD']);
    const defense = matchups.groups.find((group) => group.group === 'DEF');
    strict_1.default.ok(defense);
    strict_1.default.ok(defense.home.score > defense.away.score);
    strict_1.default.equal(defense.away.unavailable, 1);
    strict_1.default.ok(defense.pairings.length > 0);
    strict_1.default.ok(defense.pairings.every((pair) => pair.homeScore >= 0 && pair.homeScore <= 100 &&
        pair.awayScore >= 0 && pair.awayScore <= 100));
});
(0, node_test_1.default)('returns low-coverage evidence and empty matchups for sparse data', () => {
    const sparseEvent = {
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
    const evidence = (0, sportsEvidence_js_1.buildPredictionEvidence)({ event: sparseEvent, detail: null, homeRoster: null, awayRoster: null });
    const matchups = (0, sportsMatchups_js_1.buildPositionMatchups)({
        sport: 'football',
        homeName: 'A',
        awayName: 'B',
        homeRoster: null,
        awayRoster: null,
        homeTeamRating: 1500,
        awayTeamRating: 1500
    });
    strict_1.default.ok(evidence.coverage < 0.4);
    strict_1.default.equal(evidence.homeRatingAdjustment, 0);
    strict_1.default.equal(evidence.awayRatingAdjustment, 0);
    strict_1.default.deepEqual(matchups.groups, []);
});
