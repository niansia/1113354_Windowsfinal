import type {
  RosterPlayer,
  SportId,
  SquadGroup,
  SquadSummary,
  TeamRoster
} from './sportsTypes.js';

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const asRecord = (value: unknown): Record<string, any> | null =>
  value !== null && typeof value === 'object' ? value as Record<string, any> : null;

// Sports where ESPN exposes a per-team roster we can compare. Tennis / golf / motorsport
// / combat are individual events with no team squad, so we never ask for them.
export const ROSTER_SPORTS: ReadonlySet<SportId> = new Set<SportId>([
  'football',
  'basketball',
  'baseball',
  'american-football',
  'ice-hockey'
]);

const groupForPosition = (abbreviation: string): SquadGroup => {
  const code = abbreviation.toUpperCase();
  if (/^(G|GK)$/.test(code)) return 'GK';
  if (/^(D|DF|CB|LB|RB|LWB|RWB|DEF)$/.test(code)) return 'DEF';
  if (/^(M|MF|CM|DM|AM|LM|RM|MID)$/.test(code)) return 'MID';
  if (/^(F|FW|ST|CF|LW|RW|SS|FWD|W)$/.test(code)) return 'FWD';
  return 'OTHER';
};

const normalizeAthlete = (value: unknown): RosterPlayer | null => {
  const athlete = asRecord(value);
  const name = String(athlete?.displayName ?? athlete?.fullName ?? '').trim();
  if (!athlete || !name) return null;
  const position = String(asRecord(athlete.position)?.abbreviation ?? '').trim();
  const ageValue = Number(athlete.age);
  const headshot = String(asRecord(athlete.headshot)?.href ?? '').trim();
  const citizenship = String(athlete.citizenship ?? asRecord(athlete.birthPlace)?.country ?? '').trim();
  const statusRecord = asRecord(athlete.status);
  const status = String(statusRecord?.name ?? statusRecord?.type ?? '').trim();
  const injuries = (Array.isArray(athlete.injuries) ? athlete.injuries : [])
    .map((item) => {
      const injury = asRecord(item);
      const details = asRecord(injury?.details);
      return String(details?.type ?? injury?.type ?? injury?.status ?? '').trim();
    })
    .filter(Boolean);
  const normalizedStatus = String(statusRecord?.type ?? status).toLowerCase();
  const unavailableStatus = /out|inactive|injured|questionable|doubtful|suspended/.test(normalizedStatus);
  const links = Array.isArray(athlete.links) ? athlete.links : [];
  const profileUrl = links
    .map(asRecord)
    .find((link) => {
      const rel = Array.isArray(link?.rel) ? link.rel.map(String) : [];
      return rel.includes('playercard') || rel.includes('overview') || rel.includes('bio');
    });
  const profileHref = String(profileUrl?.href ?? '').trim();
  return {
    id: String(athlete.id ?? name),
    name,
    jersey: String(athlete.jersey ?? '').trim() || undefined,
    position: position || undefined,
    group: position ? groupForPosition(position) : 'OTHER',
    age: Number.isFinite(ageValue) && ageValue > 0 ? ageValue : undefined,
    headshot: /^https?:\/\//.test(headshot) ? headshot : undefined,
    country: citizenship || undefined,
    displayHeight: String(athlete.displayHeight ?? '').trim() || undefined,
    displayWeight: String(athlete.displayWeight ?? '').trim() || undefined,
    dateOfBirth: String(athlete.dateOfBirth ?? '').trim() || undefined,
    status: status || undefined,
    available: !unavailableStatus && injuries.length === 0,
    injuries,
    profileUrl: /^https?:\/\//.test(profileHref) ? profileHref : undefined
  };
};

const flattenAthletes = (athletes: unknown): unknown[] => {
  if (!Array.isArray(athletes)) return [];
  // ESPN returns either a flat array of athletes or an array of position groups that each
  // carry an `items` array. Support both.
  const flat: unknown[] = [];
  for (const entry of athletes) {
    const record = asRecord(entry);
    if (record && Array.isArray(record.items)) flat.push(...record.items);
    else flat.push(entry);
  }
  return flat;
};

export function summarizeSquad(players: readonly RosterPlayer[]): SquadSummary {
  const byGroup: Record<SquadGroup, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0, OTHER: 0 };
  let ageSum = 0;
  let ageCount = 0;
  let available = 0;
  for (const player of players) {
    byGroup[player.group] += 1;
    if (player.available) available += 1;
    if (typeof player.age === 'number') {
      ageSum += player.age;
      ageCount += 1;
    }
  }
  return {
    count: players.length,
    avgAge: ageCount ? Math.round((ageSum / ageCount) * 10) / 10 : null,
    byGroup,
    available,
    unavailable: players.length - available
  };
}

export function normalizeEspnRoster(payload: unknown, teamId: string): TeamRoster {
  const root = asRecord(payload);
  const athletes = flattenAthletes(root?.athletes ?? asRecord(root?.team)?.athletes);
  const players = athletes
    .map(normalizeAthlete)
    .filter((player): player is RosterPlayer => Boolean(player));
  return { teamId, players, summary: summarizeSquad(players) };
}

const fetchJson = async (fetcher: Fetcher, url: string, timeoutMs: number): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Roster provider returned HTTP ${response.status}.`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
};

// Fetches one team's roster from ESPN's public, key-free endpoint.
export async function loadTeamRoster(options: {
  providerPath: string;
  teamId: string;
  fetcher?: Fetcher;
  timeoutMs?: number;
}): Promise<TeamRoster> {
  const fetcher = options.fetcher ?? fetch;
  const url = `https://site.api.espn.com/apis/site/v2/sports/${options.providerPath}/teams/${options.teamId}/roster`;
  const payload = await fetchJson(fetcher, url, options.timeoutMs ?? 9000);
  return normalizeEspnRoster(payload, options.teamId);
}
