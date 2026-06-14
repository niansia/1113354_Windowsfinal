import type {
  SportsCompetition,
  SportsDataSnapshot,
  SportsEvent,
  SportsEventStatus,
  SportsParticipant
} from './sportsTypes.js';

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const asRecord = (value: unknown): Record<string, any> | null =>
  value !== null && typeof value === 'object' ? value as Record<string, any> : null;

const toNumber = (value: unknown): number | null => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const statusFromEspn = (status: Record<string, any> | null): SportsEventStatus => {
  const type = asRecord(status?.type);
  const state = String(type?.state ?? '').toLowerCase();
  const name = `${type?.name ?? ''} ${type?.description ?? ''} ${type?.detail ?? ''}`.toLowerCase();
  if (name.includes('postpon')) return 'postponed';
  if (name.includes('cancel')) return 'cancelled';
  if (state === 'in') return 'live';
  if (state === 'post' || type?.completed === true) return 'final';
  return 'scheduled';
};

const normalizeEspnParticipant = (
  value: unknown,
  index: number
): SportsParticipant | null => {
  const competitor = asRecord(value);
  const team = asRecord(competitor?.team) ?? asRecord(competitor?.athlete);
  const name = String(
    team?.displayName ??
    team?.shortDisplayName ??
    competitor?.displayName ??
    ''
  ).trim();
  if (!competitor || !name) return null;

  const sideValue = String(competitor.homeAway ?? '').toLowerCase();
  const side = sideValue === 'home' || sideValue === 'away' ? sideValue : 'neutral';
  const records = Array.isArray(competitor.records) ? competitor.records : [];
  return {
    id: String(team?.id ?? competitor.id ?? `${name}-${index}`),
    name,
    shortName: String(team?.shortDisplayName ?? team?.name ?? name),
    abbreviation: String(team?.abbreviation ?? name.slice(0, 3)).toUpperCase(),
    side,
    score: toNumber(competitor.score),
    record: String(asRecord(records[0])?.summary ?? '').trim() || undefined,
    logo: String(team?.logo ?? '').trim() || undefined,
    color: String(team?.color ?? '').trim() || undefined,
    winner: Boolean(competitor.winner),
    rating: 1500,
    offense: 50,
    defense: 50,
    form: 50
  };
};

export function normalizeEspnScoreboard(
  payload: unknown,
  competition: SportsCompetition,
  updatedAt = new Date().toISOString()
): SportsDataSnapshot {
  const root = asRecord(payload);
  const rawEvents = Array.isArray(root?.events) ? root.events : [];
  const events: SportsEvent[] = [];

  for (const rawEvent of rawEvents) {
    const event = asRecord(rawEvent);
    const competitions = Array.isArray(event?.competitions) ? event.competitions : [];
    const eventCompetition = asRecord(competitions[0]);
    const startTime = String(event?.date ?? eventCompetition?.date ?? '');
    const rawParticipants = Array.isArray(eventCompetition?.competitors)
      ? eventCompetition.competitors
      : [];
    const participants = rawParticipants
      .map(normalizeEspnParticipant)
      .filter((item): item is SportsParticipant => Boolean(item))
      .sort((a, b) => {
        const order = { home: 0, away: 1, neutral: 2 };
        return order[a.side] - order[b.side];
      });

    if (!event || !event.id || !startTime || participants.length < 1) continue;
    const status = asRecord(event.status);
    const type = asRecord(status?.type);
    const statusText = String(type?.shortDetail ?? type?.detail ?? type?.description ?? '').trim();
    const venue = asRecord(eventCompetition?.venue);
    const notes = Array.isArray(eventCompetition?.notes) ? eventCompetition.notes : [];

    events.push({
      id: `${competition.id}:${String(event.id)}`,
      sport: competition.sport,
      competitionId: competition.id,
      competitionName: competition.name,
      headline: String(event.name ?? event.shortName ?? participants.map((item) => item.name).join(' vs ')),
      startTime,
      status: statusFromEspn(status),
      statusText: statusText || 'Scheduled',
      participants,
      venue: String(venue?.fullName ?? '').trim() || undefined,
      round: String(asRecord(notes[0])?.headline ?? '').trim() || undefined,
      source: 'ESPN 公開比分',
      sourceUpdatedAt: updatedAt
    });
  }

  return {
    events,
    source: 'ESPN 公開比分',
    updatedAt,
    mode: 'live'
  };
}

const statusFromTheSportsDb = (value: unknown): SportsEventStatus => {
  const status = String(value ?? '').toLowerCase();
  if (status.includes('postpon')) return 'postponed';
  if (status.includes('cancel')) return 'cancelled';
  if (status.includes('finish') || status.includes('full time') || status === 'ft') return 'final';
  if (status.includes('live') || status.includes('progress')) return 'live';
  return 'scheduled';
};

export function normalizeTheSportsDbSchedule(
  payload: unknown,
  competition: SportsCompetition,
  updatedAt = new Date().toISOString()
): SportsDataSnapshot {
  const root = asRecord(payload);
  const rawEvents = Array.isArray(root?.events) ? root.events : [];
  const events: SportsEvent[] = [];

  for (const rawEvent of rawEvents) {
    const event = asRecord(rawEvent);
    if (!event?.idEvent) continue;
    const homeName = String(event.strHomeTeam ?? '').trim();
    const awayName = String(event.strAwayTeam ?? '').trim();
    if (!homeName && !awayName) continue;
    const timestamp = String(event.strTimestamp ?? '').trim();
    const fallbackTimestamp = `${String(event.dateEvent ?? '').trim()}T${String(event.strTime ?? '00:00:00').trim() || '00:00:00'}Z`;
    const startTime = timestamp || fallbackTimestamp;
    if (!Number.isFinite(Date.parse(startTime))) continue;
    const participants: SportsParticipant[] = [
      {
        id: String(event.idHomeTeam ?? `${event.idEvent}-home`),
        name: homeName || 'Participant A',
        shortName: homeName || 'Participant A',
        abbreviation: (homeName || 'A').slice(0, 3).toUpperCase(),
        side: 'home',
        score: toNumber(event.intHomeScore),
        rating: 1500,
        offense: 50,
        defense: 50,
        form: 50
      },
      {
        id: String(event.idAwayTeam ?? `${event.idEvent}-away`),
        name: awayName || 'Participant B',
        shortName: awayName || 'Participant B',
        abbreviation: (awayName || 'B').slice(0, 3).toUpperCase(),
        side: 'away',
        score: toNumber(event.intAwayScore),
        rating: 1500,
        offense: 50,
        defense: 50,
        form: 50
      }
    ];

    events.push({
      id: `${competition.id}:${String(event.idEvent)}`,
      sport: competition.sport,
      competitionId: competition.id,
      competitionName: String(event.strLeague ?? competition.name),
      headline: String(event.strEvent ?? `${homeName} vs ${awayName}`),
      startTime,
      status: statusFromTheSportsDb(event.strStatus),
      statusText: String(event.strStatus ?? event.strRound ?? 'Scheduled'),
      participants,
      venue: String(event.strVenue ?? '').trim() || undefined,
      round: String(event.strRound ?? '').trim() || undefined,
      source: 'TheSportsDB 公開賽程',
      sourceUpdatedAt: updatedAt
    });
  }

  return {
    events,
    source: 'TheSportsDB 公開賽程',
    updatedAt,
    mode: 'live'
  };
}

export function mergeSportsEvents(...groups: ReadonlyArray<readonly SportsEvent[]>): SportsEvent[] {
  const merged = new Map<string, SportsEvent>();
  for (const event of groups.flat()) {
    const current = merged.get(event.id);
    if (!current || Date.parse(event.sourceUpdatedAt) >= Date.parse(current.sourceUpdatedAt)) {
      merged.set(event.id, event);
    }
  }
  return [...merged.values()].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
}

const fetchJson = async (
  fetcher: Fetcher,
  url: string,
  timeoutMs: number
): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Sports provider returned HTTP ${response.status}.`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
};

export async function loadSportsSnapshot(options: {
  competitions: readonly SportsCompetition[];
  dateKey: string;
  fallbackEvents: readonly SportsEvent[];
  fetcher?: Fetcher;
  now?: () => Date;
}): Promise<SportsDataSnapshot> {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now?.() ?? new Date();
  const updatedAt = now.toISOString();
  const groups: SportsEvent[][] = [];
  const errors: string[] = [];

  await Promise.all(options.competitions.map(async (competition) => {
    try {
      if (competition.provider === 'espn' && competition.providerPath) {
        const date = options.dateKey.replaceAll('-', '');
        const url = `https://site.api.espn.com/apis/site/v2/sports/${competition.providerPath}/scoreboard?dates=${date}`;
        const payload = await fetchJson(fetcher, url, 9000);
        groups.push(normalizeEspnScoreboard(payload, competition, updatedAt).events);
      } else if (competition.provider === 'thesportsdb' && competition.secondarySportName) {
        const sport = encodeURIComponent(competition.secondarySportName);
        const url = `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${options.dateKey}&s=${sport}`;
        const payload = await fetchJson(fetcher, url, 9000);
        groups.push(normalizeTheSportsDbSchedule(payload, competition, updatedAt).events);
      }
    } catch (reason) {
      errors.push(reason instanceof Error ? reason.message : 'Sports provider is offline.');
    }
  }));

  const events = mergeSportsEvents(...groups);
  if (events.length) {
    return {
      events,
      source: 'ESPN 公開比分',
      updatedAt,
      mode: 'live',
      warning: errors.length ? '部分賽事來源暫時無法更新。' : undefined
    };
  }

  return {
    events: mergeSportsEvents(options.fallbackEvents),
    source: '內建賽程',
    updatedAt,
    mode: 'fallback',
    warning: '資料更新失敗，已顯示可用內容。'
  };
}
