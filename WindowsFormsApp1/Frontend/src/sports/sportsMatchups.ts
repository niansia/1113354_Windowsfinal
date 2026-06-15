import { marketValueTier, starPlayerTier } from './sportsPlayerRatings.js';
import type {
  SportId,
  SquadGroup,
  TeamRoster,
  RosterPlayer
} from './sportsTypes.js';

export interface MatchupSideSummary {
  score: number;
  count: number;
  available: number;
  unavailable: number;
  avgAge: number | null;
}

export interface PlayerMatchupPair {
  home: RosterPlayer | null;
  away: RosterPlayer | null;
  homeScore: number;
  awayScore: number;
}

export interface PositionGroupMatchup {
  group: SquadGroup;
  home: MatchupSideSummary;
  away: MatchupSideSummary;
  advantage: 'home' | 'away' | 'even';
  pairings: PlayerMatchupPair[];
}

export interface PositionMatchupReport {
  homeName: string;
  awayName: string;
  groups: PositionGroupMatchup[];
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

const GROUPS_BY_SPORT: Partial<Record<SportId, SquadGroup[]>> = {
  football: ['GK', 'DEF', 'MID', 'FWD'],
  basketball: ['OTHER'],
  baseball: ['OTHER'],
  'american-football': ['OTHER'],
  'ice-hockey': ['OTHER']
};

// Continuous "peak at 27" curve so each age maps to a distinct value instead of a bucket.
const ageCurve = (age: number | undefined) => {
  if (age === undefined) return 0;
  const delta = age - 27;
  return clamp(7 - delta * delta * 0.16, -16, 7);
};

// Squad numbers carry a (weak, but real) signal: 1-11 tend to be first choice, high
// numbers tend to be fringe/youth. Used only as a light nudge.
const jerseyAdjustment = (jersey: string | undefined) => {
  const number = Number(jersey);
  if (!Number.isFinite(number) || number <= 0) return 0;
  if (number <= 11) return 4.5 - (number - 1) * 0.25;
  if (number <= 23) return -1.5;
  return -3.5;
};

// Deterministic ±1.5 jitter keyed on the player id, so two players with identical age /
// jersey / availability still read as distinct rather than a copy-pasted column.
const microVariance = (id: string) => {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000 * 3 - 1.5;
};

const playerScore = (player: RosterPlayer | null, teamRating: number) => {
  if (!player) return 0;
  // Composite estimate: team strength sets a modest floor; an individual quality tier does
  // most of the lifting so marquee names clear the squad even on a weaker side, while an
  // ordinary player on a great team is NOT pinned to the ceiling. The tier prefers a REAL
  // Transfermarkt market value (Layer 3, whole squad) and falls back to the curated star
  // table. Age/role/availability fine-tune; for a rated player age weighs less.
  const base = 38 + (teamRating - 1500) / 26;
  const tier = marketValueTier(player.marketValue) ?? starPlayerTier(player.name);
  const tierBump = tier != null ? clamp((tier - 62) * 0.95, 0, 38) : 0;
  const ageWeight = tier != null ? 0.45 : 1;
  const availability = player.available ? 3 : -20;
  return Math.round(clamp(
    base
      + tierBump
      + ageCurve(player.age) * ageWeight
      + jerseyAdjustment(player.jersey)
      + availability
      + microVariance(player.id),
    1,
    99
  ));
};

const summarize = (
  players: readonly RosterPlayer[],
  teamRating: number
): MatchupSideSummary => {
  const available = players.filter((player) => player.available).length;
  const ages = players.flatMap((player) => typeof player.age === 'number' ? [player.age] : []);
  const scores = players.map((player) => playerScore(player, teamRating));
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

const pairPlayers = (
  homePlayers: readonly RosterPlayer[],
  awayPlayers: readonly RosterPlayer[],
  homeTeamRating: number,
  awayTeamRating: number
): PlayerMatchupPair[] => {
  const home = [...homePlayers].sort((left, right) =>
    playerScore(right, homeTeamRating) - playerScore(left, homeTeamRating)
  );
  const away = [...awayPlayers].sort((left, right) =>
    playerScore(right, awayTeamRating) - playerScore(left, awayTeamRating)
  );
  const count = Math.max(home.length, away.length);
  return Array.from({ length: count }, (_unused, index) => {
    const homePlayer = home[index] ?? null;
    const awayPlayer = away[index] ?? null;
    return {
      home: homePlayer,
      away: awayPlayer,
      homeScore: playerScore(homePlayer, homeTeamRating),
      awayScore: playerScore(awayPlayer, awayTeamRating)
    };
  });
};

export function buildPositionMatchups(options: {
  sport: SportId;
  homeName: string;
  awayName: string;
  homeRoster: TeamRoster | null;
  awayRoster: TeamRoster | null;
  homeTeamRating: number;
  awayTeamRating: number;
}): PositionMatchupReport {
  if (!options.homeRoster && !options.awayRoster) {
    return { homeName: options.homeName, awayName: options.awayName, groups: [] };
  }
  const configuredGroups = GROUPS_BY_SPORT[options.sport] ?? ['OTHER'];
  const groups = configuredGroups.flatMap((group): PositionGroupMatchup[] => {
    const homePlayers = options.homeRoster?.players.filter((player) =>
      configuredGroups.length === 1 ? true : player.group === group
    ) ?? [];
    const awayPlayers = options.awayRoster?.players.filter((player) =>
      configuredGroups.length === 1 ? true : player.group === group
    ) ?? [];
    if (!homePlayers.length && !awayPlayers.length) return [];
    const home = summarize(homePlayers, options.homeTeamRating);
    const away = summarize(awayPlayers, options.awayTeamRating);
    const difference = home.score - away.score;
    return [{
      group,
      home,
      away,
      advantage: Math.abs(difference) < 2 ? 'even' : difference > 0 ? 'home' : 'away',
      pairings: pairPlayers(
        homePlayers,
        awayPlayers,
        options.homeTeamRating,
        options.awayTeamRating
      )
    }];
  });
  return { homeName: options.homeName, awayName: options.awayName, groups };
}

