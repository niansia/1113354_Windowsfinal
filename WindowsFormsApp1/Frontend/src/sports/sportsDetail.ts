import { normalizeEspnRoster } from './sportsRoster.js';
import type {
  SportsDetailTeam,
  SportsEvent,
  SportsEventDetail,
  SportsGameResult,
  SportsRecentGame,
  SportsStandingRow,
  TeamRoster
} from './sportsTypes.js';

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const DETAIL_SECTIONS = ['venue', 'broadcasts', 'recent-form', 'head-to-head', 'standings', 'rosters'] as const;

const asRecord = (value: unknown): Record<string, any> | null =>
  value !== null && typeof value === 'object' ? value as Record<string, any> : null;

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const text = (value: unknown): string => String(value ?? '').trim();

const numberValue = (value: unknown): number | undefined => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const normalizeResult = (value: unknown): SportsGameResult => {
  const result = text(value).toUpperCase();
  if (result === 'W' || result === 'D' || result === 'L') return result;
  return 'N';
};

const normalizeRecentGame = (
  value: unknown,
  teamId?: string
): SportsRecentGame | null => {
  const game = asRecord(value);
  if (!game) return null;
  const opponent = asRecord(game.opponent);
  const id = text(game.id);
  const opponentName = text(opponent?.displayName ?? opponent?.name);
  if (!id && !opponentName) return null;
  return {
    id: id || `${teamId ?? 'team'}-${text(game.gameDate)}-${opponentName}`,
    teamId,
    date: text(game.gameDate ?? game.date) || undefined,
    opponentId: text(opponent?.id) || undefined,
    opponentName: opponentName || 'Unknown',
    opponentLogo: text(game.opponentLogo ?? opponent?.logo) || undefined,
    score: text(game.score) || undefined,
    result: normalizeResult(game.gameResult ?? game.result),
    competition: text(game.competitionName ?? game.leagueName) || undefined,
    round: text(game.roundName) || undefined
  };
};

const normalizeDetailTeams = (value: unknown): SportsDetailTeam[] =>
  asArray(value).map((rawGroup) => {
    const group = asRecord(rawGroup);
    const team = asRecord(group?.team);
    const teamId = text(team?.id);
    const recentGames = asArray(group?.events)
      .map((game) => normalizeRecentGame(game, teamId))
      .filter((game): game is SportsRecentGame => Boolean(game));
    return {
      teamId,
      name: text(team?.displayName ?? team?.name) || 'Unknown',
      abbreviation: text(team?.abbreviation) || undefined,
      logo: text(team?.logo) || undefined,
      form: text(team?.form) || undefined,
      recentGames
    };
  }).filter((team) => team.teamId || team.recentGames.length > 0);

const normalizeHeadToHead = (value: unknown): SportsRecentGame[] => {
  const seen = new Set<string>();
  const games: SportsRecentGame[] = [];
  for (const rawGroup of asArray(value)) {
    const group = asRecord(rawGroup);
    const teamId = text(asRecord(group?.team)?.id);
    for (const rawGame of asArray(group?.events)) {
      const game = normalizeRecentGame(rawGame, teamId);
      if (!game || seen.has(game.id)) continue;
      seen.add(game.id);
      games.push(game);
    }
  }
  return games;
};

const statisticMap = (value: unknown): Map<string, Record<string, any>> => {
  const map = new Map<string, Record<string, any>>();
  for (const rawStat of asArray(value)) {
    const stat = asRecord(rawStat);
    if (!stat) continue;
    const key = text(stat.name ?? stat.type).toLowerCase();
    if (key) map.set(key, stat);
  }
  return map;
};

const statNumber = (stats: Map<string, Record<string, any>>, ...keys: string[]) => {
  for (const key of keys) {
    const stat = stats.get(key.toLowerCase());
    const value = numberValue(stat?.value);
    if (value !== undefined) return value;
  }
  return undefined;
};

const normalizeStandings = (value: unknown): SportsStandingRow[] => {
  const standings = asRecord(value);
  const rows: SportsStandingRow[] = [];
  for (const rawGroup of asArray(standings?.groups)) {
    const group = asRecord(rawGroup);
    const entries = asArray(asRecord(group?.standings)?.entries);
    for (const rawEntry of entries) {
      const entry = asRecord(rawEntry);
      if (!entry) continue;
      const stats = statisticMap(entry.stats);
      const record = stats.get('overall') ?? stats.get('total');
      const logos = asArray(entry.logo);
      rows.push({
        teamId: text(entry.id),
        name: text(entry.team) || 'Unknown',
        logo: text(asRecord(logos[0])?.href) || undefined,
        rank: statNumber(stats, 'rank'),
        played: statNumber(stats, 'gamesPlayed', 'gamesplayed'),
        wins: statNumber(stats, 'wins'),
        draws: statNumber(stats, 'ties', 'draws'),
        losses: statNumber(stats, 'losses'),
        points: statNumber(stats, 'points'),
        record: text(record?.displayValue ?? record?.summary) || undefined
      });
    }
  }
  return rows;
};

const normalizeSummaryRosters = (value: unknown): TeamRoster[] =>
  asArray(value).map((rawRoster) => {
    const roster = asRecord(rawRoster);
    const teamId = text(asRecord(roster?.team)?.id);
    const athletes = asArray(roster?.roster).map((entry) => asRecord(entry)?.athlete ?? entry);
    return normalizeEspnRoster({ athletes }, teamId);
  }).filter((roster) => roster.teamId || roster.players.length > 0);

export function normalizeEspnEventSummary(
  payload: unknown,
  event: Pick<SportsEvent, 'id'>
): SportsEventDetail {
  const root = asRecord(payload);
  const header = asRecord(root?.header);
  const headerCompetition = asRecord(asArray(header?.competitions)[0]);
  const venue = asRecord(asRecord(root?.gameInfo)?.venue);
  const address = asRecord(venue?.address);
  const broadcasts = asArray(headerCompetition?.broadcasts)
    .map((item) => text(asRecord(asRecord(item)?.media)?.shortName))
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
  const teams = normalizeDetailTeams(root?.lastFiveGames);
  const headToHeadGames = normalizeHeadToHead(root?.headToHeadGames);
  const standings = normalizeStandings(root?.standings);
  const rosters = normalizeSummaryRosters(root?.rosters);
  const available: string[] = [];
  if (text(venue?.fullName)) available.push('venue');
  if (broadcasts.length) available.push('broadcasts');
  if (teams.some((team) => team.recentGames.length)) available.push('recent-form');
  if (headToHeadGames.length) available.push('head-to-head');
  if (standings.length) available.push('standings');
  if (rosters.some((roster) => roster.players.length)) available.push('rosters');
  const missing = DETAIL_SECTIONS.filter((section) => !available.includes(section));

  return {
    eventId: event.id,
    season: text(asRecord(header?.season)?.name) || undefined,
    round: text(headerCompetition?.altGameNote ?? asRecord(headerCompetition?.groups)?.name) || undefined,
    neutralSite: typeof headerCompetition?.neutralSite === 'boolean'
      ? headerCompetition.neutralSite
      : undefined,
    venue: text(venue?.fullName) ? {
      name: text(venue?.fullName),
      city: text(address?.city) || undefined,
      country: text(address?.country) || undefined
    } : undefined,
    broadcasts,
    teams,
    headToHeadGames,
    standingsHeader: text(asRecord(root?.standings)?.header) || undefined,
    standings,
    rosters,
    coverage: {
      score: available.length / DETAIL_SECTIONS.length,
      available,
      missing
    },
    source: 'ESPN event summary',
    updatedAt: new Date().toISOString()
  };
}

export async function loadSportsEventDetail(options: {
  providerPath: string;
  event: SportsEvent;
  fetcher?: Fetcher;
  timeoutMs?: number;
}): Promise<SportsEventDetail> {
  const fetcher = options.fetcher ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${options.providerPath}/summary?event=${encodeURIComponent(options.event.id)}`;
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Event detail provider returned HTTP ${response.status}.`);
    return normalizeEspnEventSummary(await response.json(), options.event);
  } finally {
    clearTimeout(timer);
  }
}

