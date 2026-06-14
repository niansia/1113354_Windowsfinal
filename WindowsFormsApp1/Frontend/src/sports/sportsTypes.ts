export type SportId =
  | 'football'
  | 'basketball'
  | 'baseball'
  | 'american-football'
  | 'ice-hockey'
  | 'motorsport'
  | 'tennis'
  | 'badminton'
  | 'table-tennis'
  | 'volleyball'
  | 'golf'
  | 'combat';

export type SportsPredictionModel = 'goals' | 'points' | 'sets' | 'generic';
export type SportsProviderId = 'espn' | 'thesportsdb' | 'bundled';
export type SportsEventStatus = 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled';
export type SportsParticipantSide = 'home' | 'away' | 'neutral';

export interface SportsCompetition {
  id: string;
  sport: SportId;
  name: string;
  shortName: string;
  provider: SportsProviderId;
  providerPath?: string;
  secondarySportName?: string;
  model: SportsPredictionModel;
  featured?: boolean;
}

export interface SportsParticipant {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  side: SportsParticipantSide;
  score: number | null;
  record?: string;
  logo?: string;
  color?: string;
  winner?: boolean;
  rating?: number;
  offense?: number;
  defense?: number;
  form?: number;
}

export interface SportsEvent {
  id: string;
  sport: SportId;
  competitionId: string;
  competitionName: string;
  headline: string;
  startTime: string;
  status: SportsEventStatus;
  statusText: string;
  participants: SportsParticipant[];
  venue?: string;
  round?: string;
  source: string;
  sourceUpdatedAt: string;
}

export type SportsSnapshotMode = 'live' | 'cache' | 'fallback';

export interface SportsDataSnapshot {
  events: SportsEvent[];
  source: string;
  updatedAt: string;
  mode: SportsSnapshotMode;
  warning?: string;
}

