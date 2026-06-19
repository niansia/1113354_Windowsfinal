// ESPN's free feeds expose no team rating, but they do carry a win-loss record per
// competitor. We turn that record (and, for national teams, a real strength table) into a
// relative strength so the prediction model and the comparison view stop showing every
// team as an identical 1500 / 50 / 50 / 50 blank. A 1-game World Cup record alone cannot
// capture that, say, Argentina is far stronger than Curaçao — hence the rating table.
// Values approximate World-Football-Elo and are for learning/analysis, not betting.

// National-team baseline ratings (men's). Keyed by ESPN `displayName`; alias table below
// folds common spelling variants in. Strong sides sit ~2000-2150, minnows ~1450-1600.
const NATIONAL_TEAM_RATING: Record<string, number> = {
  Argentina: 2145, France: 2090, Spain: 2075, England: 2030, Brazil: 2020, Portugal: 2005,
  Netherlands: 1985, Germany: 1965, Italy: 1940, Belgium: 1930, Croatia: 1900, Uruguay: 1900,
  Colombia: 1880, Morocco: 1845, Switzerland: 1840, Japan: 1840, Ecuador: 1835, Denmark: 1825,
  Serbia: 1820, Senegal: 1815, USA: 1805, Mexico: 1800, Iran: 1795, Austria: 1790, Ukraine: 1785,
  Nigeria: 1782, Algeria: 1768, Sweden: 1765, Canada: 1762, Norway: 1760, Czechia: 1758,
  Hungary: 1755, Poland: 1752, 'South Korea': 1750, Chile: 1748, Wales: 1742, Greece: 1740,
  Scotland: 1735, Türkiye: 1782, 'Ivory Coast': 1752, Cameroon: 1730, Russia: 1728, Peru: 1728,
  Mali: 1722, Ghana: 1720, Romania: 1718, Slovakia: 1715, Slovenia: 1712, Paraguay: 1710,
  Venezuela: 1700, Egypt: 1742, 'South Africa': 1700, 'Costa Rica': 1698, Qatar: 1690,
  Tunisia: 1688, Panama: 1685, 'Saudi Arabia': 1672, Jamaica: 1668, 'Cape Verde': 1665,
  Uzbekistan: 1660, Jordan: 1655, Australia: 1735, Iraq: 1640, Bolivia: 1640, Honduras: 1638,
  Curaçao: 1635, 'New Zealand': 1612, China: 1535, 'North Korea': 1560
};

// ESPN spelling variants → canonical key in NATIONAL_TEAM_RATING.
const RATING_ALIASES: Record<string, string> = {
  'United States': 'USA',
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'Korea DPR': 'North Korea',
  'Czech Republic': 'Czechia',
  Turkey: 'Türkiye',
  'IR Iran': 'Iran',
  "Côte d'Ivoire": 'Ivory Coast',
  'Côte d’Ivoire': 'Ivory Coast',
  'Cabo Verde': 'Cape Verde'
};

// Returns a baseline rating for a known national team, or null for clubs / unknown names.
export function nationalTeamRating(name: string | undefined | null): number | null {
  const key = (name ?? '').trim();
  if (!key) return null;
  return NATIONAL_TEAM_RATING[key] ?? NATIONAL_TEAM_RATING[RATING_ALIASES[key] ?? ''] ?? null;
}

export interface ParsedRecord {
  wins: number;
  losses: number;
  others: number; // draws (soccer) or overtime losses (hockey) — counted as non-wins
  games: number;
  winPct: number; // 0..1
}

export interface DerivedSideMetrics {
  rating: number;
  offense: number;
  defense: number;
  form: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

// Accepts "29-40" (W-L), "53-22-7" (W-L-OTL) or "1-0-0" (W-D-L). The middle/last extra
// segment is folded into `others`; what matters for a strength proxy is the win share.
export function parseTeamRecord(record: string | undefined | null): ParsedRecord | null {
  const text = (record ?? '').trim();
  if (!text) return null;
  const parts = text.split('-').map((part) => Number(part.trim()));
  if (parts.length < 2 || parts.some((value) => !Number.isFinite(value) || value < 0)) return null;
  const wins = parts[0];
  const losses = parts[1];
  const others = parts.length >= 3 ? parts[2] : 0;
  const games = wins + losses + others;
  if (games <= 0) return null;
  return { wins, losses, others, games, winPct: wins / games };
}

// Maps a team onto the rating/offense/defense/form scale the simulator uses. National
// teams use the real strength table (big, meaningful gaps); everyone else derives from the
// win-loss record, nudged by the table when the side is a known national team. The record
// is widened (vs the previous near-flat mapping) and only lightly shrunk so genuine gaps
// show through instead of collapsing every match to a coin-flip.
export function deriveSideMetrics(
  record: string | undefined | null,
  name?: string | null
): DerivedSideMetrics | null {
  const baseline = nationalTeamRating(name);
  const parsed = parseTeamRecord(record);
  if (baseline == null && !parsed) return null;

  let rating: number;
  if (baseline != null) {
    // Known national team: anchor on the table, then nudge with the in-tournament record.
    const recordEdge = parsed ? (parsed.winPct - 0.5) * clamp(parsed.games / (parsed.games + 4), 0, 1) : 0;
    rating = Math.round(baseline + recordEdge * 120);
  } else {
    const confidence = clamp(parsed!.games / (parsed!.games + 4), 0, 1);
    const edge = (parsed!.winPct - 0.5) * confidence; // -0.5..0.5
    rating = Math.round(1500 + edge * 720);
  }

  // Attack/defence/form scale with how far the rating sits from the 1500 baseline so the
  // goals/points models get a real expected-goals spread for mismatched sides.
  const lift = clamp((rating - 1500) / 16, -30, 40);
  return {
    rating,
    offense: Math.round(clamp(52 + lift, 18, 92)),
    defense: Math.round(clamp(52 + lift, 18, 92)),
    form: Math.round(clamp(52 + lift * 1.1, 12, 95))
  };
}

// A compact win-pct label like "63%" for badges; null when there is no usable record.
export function winPctLabel(record: string | undefined | null): string | null {
  const parsed = parseTeamRecord(record);
  if (!parsed) return null;
  return `${Math.round(parsed.winPct * 100)}%`;
}
