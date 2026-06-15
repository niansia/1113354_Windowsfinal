"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPositionMatchups = buildPositionMatchups;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
const GROUPS_BY_SPORT = {
    football: ['GK', 'DEF', 'MID', 'FWD'],
    basketball: ['OTHER'],
    baseball: ['OTHER'],
    'american-football': ['OTHER'],
    'ice-hockey': ['OTHER']
};
const ageAdjustment = (age) => {
    if (age === undefined)
        return 0;
    if (age >= 23 && age <= 29)
        return 5;
    if (age >= 20 && age <= 32)
        return 2;
    if (age < 19 || age > 35)
        return -4;
    return -1;
};
const playerScore = (player, teamRating, groupDepth) => {
    if (!player)
        return 0;
    const baseline = 50 + (teamRating - 1500) / 20;
    const availability = player.available ? 4 : -18;
    const depth = clamp(groupDepth - 1, 0, 5) * 1.2;
    return Math.round(clamp(baseline + ageAdjustment(player.age) + availability + depth, 0, 100));
};
const summarize = (players, teamRating) => {
    const available = players.filter((player) => player.available).length;
    const ages = players.flatMap((player) => typeof player.age === 'number' ? [player.age] : []);
    const scores = players.map((player) => playerScore(player, teamRating, players.length));
    return {
        score: scores.length
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : 0,
        count: players.length,
        available,
        unavailable: players.length - available,
        avgAge: ages.length
            ? Math.round((ages.reduce((sum, age) => sum + age, 0) / ages.length) * 10) / 10
            : null
    };
};
const pairPlayers = (homePlayers, awayPlayers, homeTeamRating, awayTeamRating) => {
    const home = [...homePlayers].sort((left, right) => playerScore(right, homeTeamRating, homePlayers.length) -
        playerScore(left, homeTeamRating, homePlayers.length));
    const away = [...awayPlayers].sort((left, right) => playerScore(right, awayTeamRating, awayPlayers.length) -
        playerScore(left, awayTeamRating, awayPlayers.length));
    const count = Math.max(home.length, away.length);
    return Array.from({ length: count }, (_unused, index) => {
        const homePlayer = home[index] ?? null;
        const awayPlayer = away[index] ?? null;
        return {
            home: homePlayer,
            away: awayPlayer,
            homeScore: playerScore(homePlayer, homeTeamRating, homePlayers.length),
            awayScore: playerScore(awayPlayer, awayTeamRating, awayPlayers.length)
        };
    });
};
function buildPositionMatchups(options) {
    if (!options.homeRoster && !options.awayRoster) {
        return { homeName: options.homeName, awayName: options.awayName, groups: [] };
    }
    const configuredGroups = GROUPS_BY_SPORT[options.sport] ?? ['OTHER'];
    const groups = configuredGroups.flatMap((group) => {
        const homePlayers = options.homeRoster?.players.filter((player) => configuredGroups.length === 1 ? true : player.group === group) ?? [];
        const awayPlayers = options.awayRoster?.players.filter((player) => configuredGroups.length === 1 ? true : player.group === group) ?? [];
        if (!homePlayers.length && !awayPlayers.length)
            return [];
        const home = summarize(homePlayers, options.homeTeamRating);
        const away = summarize(awayPlayers, options.awayTeamRating);
        const difference = home.score - away.score;
        return [{
                group,
                home,
                away,
                advantage: Math.abs(difference) < 2 ? 'even' : difference > 0 ? 'home' : 'away',
                pairings: pairPlayers(homePlayers, awayPlayers, options.homeTeamRating, options.awayTeamRating)
            }];
    });
    return { homeName: options.homeName, awayName: options.awayName, groups };
}
