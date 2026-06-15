// ESPN's free feeds expose no team rating, but they do carry a win-loss record per
// competitor. We turn that record into a relative strength so the prediction model and
// the comparison view stop showing every team as an identical 1500 / 50 / 50 / 50 blank.
// These are transparent heuristics for learning/analysis, not real power rankings.

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

// Maps a win share onto the rating/offense/defense/form scale the simulator already uses.
// Small-sample records (e.g. a single World Cup group game) are pulled toward the mean so
// one result does not imply an extreme rating.
export function deriveSideMetrics(record: string | undefined | null): DerivedSideMetrics | null {
  const parsed = parseTeamRecord(record);
  if (!parsed) return null;
  // Shrink toward 0.5 when very few games have been played.
  const confidence = clamp(parsed.games / (parsed.games + 6), 0, 1);
  const edge = (parsed.winPct - 0.5) * confidence; // -0.5..0.5
  return {
    rating: Math.round(1500 + edge * 540),
    offense: Math.round(clamp(50 + edge * 70, 18, 86)),
    defense: Math.round(clamp(50 + edge * 70, 18, 86)),
    form: Math.round(clamp(50 + edge * 90, 12, 92))
  };
}

// A compact win-pct label like "63%" for badges; null when there is no usable record.
export function winPctLabel(record: string | undefined | null): string | null {
  const parsed = parseTeamRecord(record);
  if (!parsed) return null;
  return `${Math.round(parsed.winPct * 100)}%`;
}
