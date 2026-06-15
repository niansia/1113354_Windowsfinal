import { parseTeamRecord } from './sportsStrength.js';
import type {
  SportsEvent,
  SportsEventDetail,
  SportsRecentGame,
  TeamRoster
} from './sportsTypes.js';
import type { SportsPredictionInput } from './sportsSimulation.js';

export interface SportsEvidenceFactor {
  id: string;
  label: string;
  homeValue: string;
  awayValue: string;
  impact: number;
  confidence: number;
  source: string;
}

export interface SportsPredictionEvidence {
  factors: SportsEvidenceFactor[];
  homeRatingAdjustment: number;
  awayRatingAdjustment: number;
  homeFormAdjustment: number;
  awayFormAdjustment: number;
  coverage: number;
}

interface EvidenceOptions {
  event: SportsEvent;
  detail: SportsEventDetail | null;
  homeRoster: TeamRoster | null;
  awayRoster: TeamRoster | null;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : 0));

const signed = (difference: number, scale: number, limit: number) =>
  clamp(difference * scale, -limit, limit);

const recentScore = (games: readonly SportsRecentGame[]) => {
  if (!games.length) return null;
  const score = games.reduce((total, game) => {
    if (game.result === 'W') return total + 1;
    if (game.result === 'D') return total + 0.5;
    return total;
  }, 0);
  return score / games.length;
};

const resultLabel = (score: number | null) =>
  score === null ? '—' : `${Math.round(score * 100)}%`;

const standingFor = (detail: SportsEventDetail | null, teamId: string) =>
  detail?.standings.find((row) => row.teamId === teamId);

const recentFor = (detail: SportsEventDetail | null, teamId: string) =>
  detail?.teams.find((team) => team.teamId === teamId)?.recentGames ?? [];

const h2hScore = (
  games: readonly SportsRecentGame[],
  homeId: string,
  awayId: string
) => {
  if (!games.length) return null;
  let home = 0;
  let away = 0;
  let samples = 0;
  for (const game of games) {
    if (game.teamId !== homeId && game.teamId !== awayId) continue;
    samples += 1;
    if (game.result === 'D' || game.result === 'N') {
      home += 0.5;
      away += 0.5;
    } else if (game.teamId === homeId) {
      if (game.result === 'W') home += 1;
      else away += 1;
    } else if (game.result === 'W') {
      away += 1;
    } else {
      home += 1;
    }
  }
  return samples ? { home: home / samples, away: away / samples, samples } : null;
};

export function buildPredictionEvidence(options: EvidenceOptions): SportsPredictionEvidence {
  const home = options.event.participants.find((item) => item.side === 'home') ?? options.event.participants[0];
  const away = options.event.participants.find((item) => item.side === 'away') ?? options.event.participants[1];
  if (!home || !away) {
    return {
      factors: [],
      homeRatingAdjustment: 0,
      awayRatingAdjustment: 0,
      homeFormAdjustment: 0,
      awayFormAdjustment: 0,
      coverage: 0
    };
  }

  const factors: SportsEvidenceFactor[] = [];
  let possibleWeight = 0;
  let availableWeight = 0;
  const add = (factor: SportsEvidenceFactor, weight: number) => {
    possibleWeight += weight;
    availableWeight += weight;
    factors.push(factor);
  };
  const miss = (weight: number) => {
    possibleWeight += weight;
  };

  if (typeof home.rating === 'number' && typeof away.rating === 'number') {
    add({
      id: 'model-rating',
      label: '模型評分',
      homeValue: String(Math.round(home.rating)),
      awayValue: String(Math.round(away.rating)),
      impact: signed(home.rating - away.rating, 0.22, 55),
      confidence: 0.75,
      source: 'normalized model input'
    }, 1.1);
  } else miss(1.1);

  const homeRecord = parseTeamRecord(home.record);
  const awayRecord = parseTeamRecord(away.record);
  if (homeRecord && awayRecord) {
    const sampleConfidence = clamp(Math.min(homeRecord.games, awayRecord.games) / 10, 0.2, 1);
    add({
      id: 'record',
      label: '賽季戰績',
      homeValue: `${Math.round(homeRecord.winPct * 100)}%`,
      awayValue: `${Math.round(awayRecord.winPct * 100)}%`,
      impact: signed(homeRecord.winPct - awayRecord.winPct, 90, 42),
      confidence: sampleConfidence,
      source: 'provider record'
    }, 1);
  } else miss(1);

  const homeRecent = recentScore(recentFor(options.detail, home.id));
  const awayRecent = recentScore(recentFor(options.detail, away.id));
  if (homeRecent !== null && awayRecent !== null) {
    const samples = Math.min(recentFor(options.detail, home.id).length, recentFor(options.detail, away.id).length);
    add({
      id: 'recent-form',
      label: '近五場狀態',
      homeValue: resultLabel(homeRecent),
      awayValue: resultLabel(awayRecent),
      impact: signed(homeRecent - awayRecent, 80, 44),
      confidence: clamp(samples / 5, 0.2, 1),
      source: 'ESPN last five games'
    }, 1.25);
  } else miss(1.25);

  const headToHead = h2hScore(options.detail?.headToHeadGames ?? [], home.id, away.id);
  if (headToHead) {
    add({
      id: 'head-to-head',
      label: '歷史交手',
      homeValue: `${Math.round(headToHead.home * 100)}%`,
      awayValue: `${Math.round(headToHead.away * 100)}%`,
      impact: signed(headToHead.home - headToHead.away, 56, 35),
      confidence: clamp(headToHead.samples / 5, 0.2, 0.85),
      source: 'ESPN head-to-head'
    }, 0.9);
  } else miss(0.9);

  const homeStanding = standingFor(options.detail, home.id);
  const awayStanding = standingFor(options.detail, away.id);
  if (homeStanding?.rank && awayStanding?.rank) {
    add({
      id: 'standings',
      label: '賽事排名',
      homeValue: `#${homeStanding.rank}`,
      awayValue: `#${awayStanding.rank}`,
      impact: signed(awayStanding.rank - homeStanding.rank, 10, 40),
      confidence: (homeStanding.played ?? 0) > 0 && (awayStanding.played ?? 0) > 0 ? 0.8 : 0.45,
      source: options.detail?.standingsHeader || 'provider standings'
    }, 1);
  } else miss(1);

  if (options.homeRoster && options.awayRoster) {
    const homeAvailable = options.homeRoster.summary.available;
    const awayAvailable = options.awayRoster.summary.available;
    add({
      id: 'squad-depth',
      label: '陣容深度',
      homeValue: String(homeAvailable),
      awayValue: String(awayAvailable),
      impact: signed(homeAvailable - awayAvailable, 4, 28),
      confidence: 0.65,
      source: 'provider roster'
    }, 0.8);
    add({
      id: 'availability',
      label: '可用球員',
      homeValue: String(options.homeRoster.summary.unavailable),
      awayValue: String(options.awayRoster.summary.unavailable),
      impact: signed(options.awayRoster.summary.unavailable - options.homeRoster.summary.unavailable, 11, 33),
      confidence: 0.7,
      source: 'provider roster status'
    }, 0.9);
  } else {
    miss(0.8);
    miss(0.9);
  }

  if (options.detail && typeof options.detail.neutralSite === 'boolean') {
    add({
      id: 'venue',
      label: '場地因素',
      homeValue: options.detail.neutralSite ? '中立場' : '主場',
      awayValue: options.detail.neutralSite ? '中立場' : '客場',
      impact: options.detail.neutralSite ? 0 : 18,
      confidence: 0.7,
      source: 'event venue'
    }, 0.65);
  } else miss(0.65);

  const total = factors.reduce((sum, factor) => sum + factor.impact * factor.confidence, 0);
  const rawAdjustment = clamp(total / 2, -180, 180);
  const adjustment = Math.abs(rawAdjustment) < Number.EPSILON ? 0 : rawAdjustment;
  const formSignal = clamp(
    factors
      .filter((factor) => factor.id === 'recent-form' || factor.id === 'record')
      .reduce((sum, factor) => sum + factor.impact * factor.confidence, 0) / 5,
    -18,
    18
  );

  return {
    factors,
    homeRatingAdjustment: adjustment,
    awayRatingAdjustment: adjustment === 0 ? 0 : -adjustment,
    homeFormAdjustment: formSignal,
    awayFormAdjustment: formSignal === 0 ? 0 : -formSignal,
    coverage: possibleWeight ? clamp(availableWeight / possibleWeight, 0, 1) : 0
  };
}

export function applyPredictionEvidence(
  input: SportsPredictionInput,
  evidence: SportsPredictionEvidence
): SportsPredictionInput {
  return {
    ...input,
    home: {
      ...input.home,
      rating: Math.round(clamp(input.home.rating + evidence.homeRatingAdjustment, 800, 2600)),
      form: Math.round(clamp(input.home.form + evidence.homeFormAdjustment, 0, 100))
    },
    away: {
      ...input.away,
      rating: Math.round(clamp(input.away.rating + evidence.awayRatingAdjustment, 800, 2600)),
      form: Math.round(clamp(input.away.form + evidence.awayFormAdjustment, 0, 100))
    }
  };
}
