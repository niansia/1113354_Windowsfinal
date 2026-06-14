"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompetition = exports.BUNDLED_SPORTS_EVENTS = exports.SPORT_LABELS = exports.SPORTS_COMPETITIONS = void 0;
exports.SPORTS_COMPETITIONS = [
    { id: 'fifa-world-cup', sport: 'football', name: 'FIFA 世界盃', shortName: '世界盃', provider: 'espn', providerPath: 'soccer/fifa.world', model: 'goals', featured: true },
    { id: 'premier-league', sport: 'football', name: '英格蘭超級聯賽', shortName: '英超', provider: 'espn', providerPath: 'soccer/eng.1', model: 'goals' },
    { id: 'la-liga', sport: 'football', name: '西班牙甲級聯賽', shortName: '西甲', provider: 'espn', providerPath: 'soccer/esp.1', model: 'goals' },
    { id: 'bundesliga', sport: 'football', name: '德國甲級聯賽', shortName: '德甲', provider: 'espn', providerPath: 'soccer/ger.1', model: 'goals' },
    { id: 'serie-a', sport: 'football', name: '義大利甲級聯賽', shortName: '義甲', provider: 'espn', providerPath: 'soccer/ita.1', model: 'goals' },
    { id: 'ligue-1', sport: 'football', name: '法國甲級聯賽', shortName: '法甲', provider: 'espn', providerPath: 'soccer/fra.1', model: 'goals' },
    { id: 'champions-league', sport: 'football', name: '歐洲冠軍聯賽', shortName: '歐冠', provider: 'espn', providerPath: 'soccer/uefa.champions', model: 'goals' },
    { id: 'nba', sport: 'basketball', name: 'NBA', shortName: 'NBA', provider: 'espn', providerPath: 'basketball/nba', model: 'points', featured: true },
    { id: 'wnba', sport: 'basketball', name: 'WNBA', shortName: 'WNBA', provider: 'espn', providerPath: 'basketball/wnba', model: 'points' },
    { id: 'mlb', sport: 'baseball', name: 'MLB', shortName: 'MLB', provider: 'espn', providerPath: 'baseball/mlb', model: 'points', featured: true },
    { id: 'nfl', sport: 'american-football', name: 'NFL', shortName: 'NFL', provider: 'espn', providerPath: 'football/nfl', model: 'points' },
    { id: 'nhl', sport: 'ice-hockey', name: 'NHL', shortName: 'NHL', provider: 'espn', providerPath: 'hockey/nhl', model: 'goals' },
    { id: 'f1', sport: 'motorsport', name: 'Formula 1', shortName: 'F1', provider: 'espn', providerPath: 'racing/f1', model: 'generic', featured: true },
    { id: 'atp', sport: 'tennis', name: 'ATP 網球巡迴賽', shortName: 'ATP', provider: 'espn', providerPath: 'tennis/atp', model: 'sets' },
    { id: 'wta', sport: 'tennis', name: 'WTA 網球巡迴賽', shortName: 'WTA', provider: 'espn', providerPath: 'tennis/wta', model: 'sets' },
    { id: 'badminton', sport: 'badminton', name: '國際羽球賽事', shortName: '羽球', provider: 'thesportsdb', secondarySportName: 'Badminton', model: 'sets' },
    { id: 'table-tennis', sport: 'table-tennis', name: '國際桌球賽事', shortName: '桌球', provider: 'thesportsdb', secondarySportName: 'Table Tennis', model: 'sets' },
    { id: 'volleyball', sport: 'volleyball', name: '國際排球賽事', shortName: '排球', provider: 'thesportsdb', secondarySportName: 'Volleyball', model: 'sets' },
    { id: 'pga', sport: 'golf', name: 'PGA Tour', shortName: 'PGA', provider: 'espn', providerPath: 'golf/pga', model: 'generic' },
    { id: 'ufc', sport: 'combat', name: 'UFC', shortName: 'UFC', provider: 'espn', providerPath: 'mma/ufc', model: 'generic' }
];
exports.SPORT_LABELS = {
    football: '足球',
    basketball: '籃球',
    baseball: '棒球',
    'american-football': '美式足球',
    'ice-hockey': '冰球',
    motorsport: '賽車',
    tennis: '網球',
    badminton: '羽球',
    'table-tennis': '桌球',
    volleyball: '排球',
    golf: '高爾夫',
    combat: '格鬥'
};
const participant = (id, name, abbreviation, side, rating, score = null) => ({
    id,
    name,
    shortName: name,
    abbreviation,
    side,
    score,
    rating,
    offense: 50,
    defense: 50,
    form: 50
});
exports.BUNDLED_SPORTS_EVENTS = [
    {
        id: 'fallback-world-cup-ned-jpn',
        sport: 'football',
        competitionId: 'fifa-world-cup',
        competitionName: 'FIFA 世界盃',
        headline: '荷蘭 vs 日本',
        startTime: '2026-06-14T20:00:00Z',
        status: 'scheduled',
        statusText: '小組賽',
        participants: [
            participant('ned', '荷蘭', 'NED', 'home', 1850),
            participant('jpn', '日本', 'JPN', 'away', 1775)
        ],
        venue: 'AT&T Stadium',
        round: '小組賽',
        source: '內建賽程',
        sourceUpdatedAt: '2026-06-14T00:00:00Z'
    },
    {
        id: 'fallback-mlb-ny-bos',
        sport: 'baseball',
        competitionId: 'mlb',
        competitionName: 'MLB',
        headline: 'New York vs Boston',
        startTime: '2026-06-14T23:10:00Z',
        status: 'scheduled',
        statusText: 'Regular Season',
        participants: [
            participant('nyy', 'New York', 'NYY', 'home', 1690),
            participant('bos', 'Boston', 'BOS', 'away', 1640)
        ],
        source: '內建賽程',
        sourceUpdatedAt: '2026-06-14T00:00:00Z'
    },
    {
        id: 'fallback-atp-final',
        sport: 'tennis',
        competitionId: 'atp',
        competitionName: 'ATP 網球巡迴賽',
        headline: 'J. Sinner vs C. Alcaraz',
        startTime: '2026-06-14T15:00:00Z',
        status: 'scheduled',
        statusText: 'Final',
        participants: [
            participant('sinner', 'J. Sinner', 'SIN', 'home', 1940),
            participant('alcaraz', 'C. Alcaraz', 'ALC', 'away', 1930)
        ],
        source: '內建賽程',
        sourceUpdatedAt: '2026-06-14T00:00:00Z'
    },
    {
        id: 'fallback-badminton',
        sport: 'badminton',
        competitionId: 'badminton',
        competitionName: '國際羽球賽事',
        headline: '男子單打焦點賽',
        startTime: '2026-06-15T06:30:00Z',
        status: 'scheduled',
        statusText: 'Round of 16',
        participants: [
            participant('badminton-a', '世界排名第 3', 'WR3', 'home', 1810),
            participant('badminton-b', '世界排名第 8', 'WR8', 'away', 1725)
        ],
        source: '內建賽程',
        sourceUpdatedAt: '2026-06-14T00:00:00Z'
    },
    {
        id: 'fallback-f1',
        sport: 'motorsport',
        competitionId: 'f1',
        competitionName: 'Formula 1',
        headline: '加拿大大獎賽',
        startTime: '2026-06-14T18:00:00Z',
        status: 'scheduled',
        statusText: 'Race',
        participants: [
            participant('driver-a', 'Championship Leader', 'P1', 'home', 1900),
            participant('driver-b', 'Closest Challenger', 'P2', 'away', 1840)
        ],
        venue: 'Circuit Gilles Villeneuve',
        source: '內建賽程',
        sourceUpdatedAt: '2026-06-14T00:00:00Z'
    }
];
const getCompetition = (id) => exports.SPORTS_COMPETITIONS.find((competition) => competition.id === id);
exports.getCompetition = getCompetition;
