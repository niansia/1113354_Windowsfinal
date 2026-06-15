"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isScoutAvailable = isScoutAvailable;
exports.loadMatchValues = loadMatchValues;
exports.annotateRosterValues = annotateRosterValues;
// Client for the local SportsScout proxy (Layer 3). The browser cannot scrape Transfermarkt
// cross-origin, so this talks to the optional `python server.py` on :8796, which returns
// real squad market values. Everything degrades gracefully: if the proxy is not running,
// the matchup falls back to the built-in star table.
const SCOUT_BASE = 'http://127.0.0.1:8796';
const normalize = (name) => name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
let healthCache = null;
// Cheap, short-timeout probe (cached 60s) so we never block the UI waiting on an absent proxy.
async function isScoutAvailable(timeoutMs = 1200) {
    if (healthCache && Date.now() - healthCache.at < 60_000)
        return healthCache.ok;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(`${SCOUT_BASE}/health`, { signal: controller.signal });
        clearTimeout(timer);
        healthCache = { ok: response.ok, at: Date.now() };
        return response.ok;
    }
    catch {
        healthCache = { ok: false, at: Date.now() };
        return false;
    }
}
const toSquadValues = (squad) => {
    const record = (squad && typeof squad === 'object' ? squad : {});
    const players = Array.isArray(record.players) ? record.players : [];
    const values = new Map();
    for (const raw of players) {
        const value = Number(raw?.marketValue);
        if (!Number.isFinite(value) || value <= 0)
            continue;
        const key = normalize(String(raw?.name ?? ''));
        if (!key)
            continue;
        const entry = { marketValue: value, valueLabel: String(raw?.valueLabel ?? '') };
        if (!values.has(key))
            values.set(key, entry);
        // Also index "Last First" so a flipped provider ordering still resolves.
        const parts = key.split(' ');
        if (parts.length >= 2) {
            const flipped = `${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`;
            if (!values.has(flipped))
                values.set(flipped, entry);
        }
    }
    return {
        teamId: typeof record.teamId === 'number' ? record.teamId : null,
        source: String(record.source ?? ''),
        found: Boolean(record.found),
        values
    };
};
async function loadMatchValues(homeName, awayName, timeoutMs = 16_000) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const url = `${SCOUT_BASE}/api/values?home=${encodeURIComponent(homeName)}&away=${encodeURIComponent(awayName)}`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok)
            return null;
        const data = await response.json();
        return {
            home: data.home ? toSquadValues(data.home) : null,
            away: data.away ? toSquadValues(data.away) : null
        };
    }
    catch {
        return null;
    }
}
// Returns a copy of the roster with each matched player's marketValue / valueLabel filled
// in. Returns the original roster untouched when nothing matches (so the UI can tell).
function annotateRosterValues(roster, squad) {
    if (!roster || !squad || squad.values.size === 0)
        return { roster, matched: 0 };
    let matched = 0;
    const players = roster.players.map((player) => {
        const key = normalize(player.name);
        let hit = squad.values.get(key);
        if (!hit) {
            const parts = key.split(' ');
            if (parts.length >= 2) {
                hit = squad.values.get(`${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`);
            }
        }
        if (hit) {
            matched += 1;
            return { ...player, marketValue: hit.marketValue, valueLabel: hit.valueLabel };
        }
        return player;
    });
    if (matched === 0)
        return { roster, matched: 0 };
    return { roster: { ...roster, players }, matched };
}
