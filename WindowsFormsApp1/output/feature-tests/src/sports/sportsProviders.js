"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeEspnScoreboard = normalizeEspnScoreboard;
exports.normalizeTheSportsDbSchedule = normalizeTheSportsDbSchedule;
exports.mergeSportsEvents = mergeSportsEvents;
exports.loadSportsSnapshot = loadSportsSnapshot;
exports.normalizeEspnNews = normalizeEspnNews;
exports.loadSportsHeadlines = loadSportsHeadlines;
const sportsStrength_js_1 = require("./sportsStrength.js");
const asRecord = (value) => value !== null && typeof value === 'object' ? value : null;
// Shift a `YYYY-MM-DD` calendar key by whole days using UTC math so it never drifts
// across DST. Used to widen provider queries to a small window around the selected day.
const addDaysToCalendarKey = (dateKey, delta) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const shifted = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1) + delta * 86_400_000);
    const yyyy = shifted.getUTCFullYear();
    const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(shifted.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};
const toNumber = (value) => {
    if (value === '' || value === null || value === undefined)
        return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};
const statusFromEspn = (status) => {
    const type = asRecord(status?.type);
    const state = String(type?.state ?? '').toLowerCase();
    const name = `${type?.name ?? ''} ${type?.description ?? ''} ${type?.detail ?? ''}`.toLowerCase();
    if (name.includes('postpon'))
        return 'postponed';
    if (name.includes('cancel'))
        return 'cancelled';
    if (state === 'in')
        return 'live';
    if (state === 'post' || type?.completed === true)
        return 'final';
    return 'scheduled';
};
const normalizeEspnParticipant = (value, index) => {
    const competitor = asRecord(value);
    const team = asRecord(competitor?.team) ?? asRecord(competitor?.athlete);
    const name = String(team?.displayName ??
        team?.shortDisplayName ??
        competitor?.displayName ??
        '').trim();
    if (!competitor || !name)
        return null;
    const sideValue = String(competitor.homeAway ?? '').toLowerCase();
    const side = sideValue === 'home' || sideValue === 'away' ? sideValue : 'neutral';
    const records = Array.isArray(competitor.records) ? competitor.records : [];
    const record = String(asRecord(records[0])?.summary ?? '').trim() || undefined;
    // Turn the win-loss record into real strength inputs so the model and comparison view
    // are differentiated instead of a flat 1500 / 50 / 50 / 50 for every team.
    const metrics = (0, sportsStrength_js_1.deriveSideMetrics)(record);
    return {
        id: String(team?.id ?? competitor.id ?? `${name}-${index}`),
        name,
        shortName: String(team?.shortDisplayName ?? team?.name ?? name),
        abbreviation: String(team?.abbreviation ?? name.slice(0, 3)).toUpperCase(),
        side,
        score: toNumber(competitor.score),
        record,
        logo: String(team?.logo ?? '').trim() || undefined,
        color: String(team?.color ?? '').trim() || undefined,
        winner: Boolean(competitor.winner),
        rating: metrics?.rating ?? 1500,
        offense: metrics?.offense ?? 50,
        defense: metrics?.defense ?? 50,
        form: metrics?.form ?? 50
    };
};
function normalizeEspnScoreboard(payload, competition, updatedAt = new Date().toISOString()) {
    const root = asRecord(payload);
    const rawEvents = Array.isArray(root?.events) ? root.events : [];
    const events = [];
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
            .filter((item) => Boolean(item))
            .sort((a, b) => {
            const order = { home: 0, away: 1, neutral: 2 };
            return order[a.side] - order[b.side];
        });
        if (!event || !event.id || !startTime || participants.length < 1)
            continue;
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
const statusFromTheSportsDb = (value) => {
    const status = String(value ?? '').toLowerCase();
    if (status.includes('postpon'))
        return 'postponed';
    if (status.includes('cancel'))
        return 'cancelled';
    if (status.includes('finish') || status.includes('full time') || status === 'ft')
        return 'final';
    if (status.includes('live') || status.includes('progress'))
        return 'live';
    return 'scheduled';
};
function normalizeTheSportsDbSchedule(payload, competition, updatedAt = new Date().toISOString()) {
    const root = asRecord(payload);
    const rawEvents = Array.isArray(root?.events) ? root.events : [];
    const events = [];
    for (const rawEvent of rawEvents) {
        const event = asRecord(rawEvent);
        if (!event?.idEvent)
            continue;
        const homeName = String(event.strHomeTeam ?? '').trim();
        const awayName = String(event.strAwayTeam ?? '').trim();
        if (!homeName && !awayName)
            continue;
        const timestamp = String(event.strTimestamp ?? '').trim();
        const fallbackTimestamp = `${String(event.dateEvent ?? '').trim()}T${String(event.strTime ?? '00:00:00').trim() || '00:00:00'}Z`;
        const startTime = timestamp || fallbackTimestamp;
        if (!Number.isFinite(Date.parse(startTime)))
            continue;
        const participants = [
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
function mergeSportsEvents(...groups) {
    const merged = new Map();
    for (const event of groups.flat()) {
        const current = merged.get(event.id);
        if (!current || Date.parse(event.sourceUpdatedAt) >= Date.parse(current.sourceUpdatedAt)) {
            merged.set(event.id, event);
        }
    }
    return [...merged.values()].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
}
const fetchJson = async (fetcher, url, timeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetcher(url, { signal: controller.signal });
        if (!response.ok)
            throw new Error(`Sports provider returned HTTP ${response.status}.`);
        return response.json();
    }
    finally {
        clearTimeout(timer);
    }
};
async function loadSportsSnapshot(options) {
    const fetcher = options.fetcher ?? fetch;
    const now = options.now?.() ?? new Date();
    const updatedAt = now.toISOString();
    const windowDays = Math.max(0, Math.min(3, Math.trunc(options.windowDays ?? 1)));
    const dayKeys = Array.from({ length: windowDays * 2 + 1 }, (_unused, index) => addDaysToCalendarKey(options.dateKey, index - windowDays));
    const groups = [];
    const errors = [];
    await Promise.all(options.competitions.map(async (competition) => {
        try {
            if (competition.provider === 'espn' && competition.providerPath) {
                const start = dayKeys[0].replaceAll('-', '');
                const end = dayKeys[dayKeys.length - 1].replaceAll('-', '');
                const range = windowDays > 0 ? `${start}-${end}` : start;
                const url = `https://site.api.espn.com/apis/site/v2/sports/${competition.providerPath}/scoreboard?dates=${range}&limit=300`;
                const payload = await fetchJson(fetcher, url, 9000);
                groups.push(normalizeEspnScoreboard(payload, competition, updatedAt).events);
            }
            else if (competition.provider === 'thesportsdb' && competition.secondarySportName) {
                const sport = encodeURIComponent(competition.secondarySportName);
                // TheSportsDB's free day endpoint accepts one date at a time, so fan the window
                // out and let each day resolve independently.
                const dayGroups = await Promise.all(dayKeys.map(async (day) => {
                    try {
                        const url = `https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${day}&s=${sport}`;
                        const payload = await fetchJson(fetcher, url, 9000);
                        return normalizeTheSportsDbSchedule(payload, competition, updatedAt).events;
                    }
                    catch (reason) {
                        errors.push(reason instanceof Error ? reason.message : 'Sports provider is offline.');
                        return [];
                    }
                }));
                groups.push(dayGroups.flat());
            }
        }
        catch (reason) {
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
function normalizeEspnNews(payload, limit = 5) {
    const root = asRecord(payload);
    const articles = Array.isArray(root?.articles) ? root.articles : [];
    const headlines = [];
    for (const rawArticle of articles) {
        const article = asRecord(rawArticle);
        const title = String(article?.headline ?? article?.title ?? '').trim();
        if (!title)
            continue;
        const web = asRecord(asRecord(article?.links)?.web);
        const url = String(web?.href ?? '').trim();
        const published = String(article?.published ?? article?.lastModified ?? '').trim();
        headlines.push({
            title,
            url: /^https?:\/\//.test(url) ? url : undefined,
            description: String(article?.description ?? '').trim() || undefined,
            publishedAt: published || undefined
        });
        if (headlines.length >= limit)
            break;
    }
    return headlines;
}
// ESPN exposes a public, key-free news feed per league. Used to surface a few recent
// headlines in the inspector; failures are swallowed so the panel simply stays empty.
async function loadSportsHeadlines(options) {
    const fetcher = options.fetcher ?? fetch;
    const url = `https://site.api.espn.com/apis/site/v2/sports/${options.providerPath}/news`;
    const payload = await fetchJson(fetcher, url, options.timeoutMs ?? 8000);
    return normalizeEspnNews(payload, options.limit ?? 5);
}
