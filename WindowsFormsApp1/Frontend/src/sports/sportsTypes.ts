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

export interface SportsHeadline {
  title: string;
  url?: string;
  description?: string;
  publishedAt?: string;
}

export type SquadGroup = 'GK' | 'DEF' | 'MID' | 'FWD' | 'OTHER';

export interface RosterPlayer {
  id: string;
  name: string;
  jersey?: string;
  position?: string;
  group: SquadGroup;
  age?: number;
  headshot?: string;
  country?: string;
  displayHeight?: string;
  displayWeight?: string;
  dateOfBirth?: string;
  status?: string;
  available: boolean;
  injuries: string[];
  profileUrl?: string;
  marketValue?: number;
  valueLabel?: string;
}

export interface SquadSummary {
  count: number;
  avgAge: number | null;
  byGroup: Record<SquadGroup, number>;
  available: number;
  unavailable: number;
}

export interface TeamRoster {
  teamId: string;
  players: RosterPlayer[];
  summary: SquadSummary;
}

export type SportsGameResult = 'W' | 'D' | 'L' | 'N';

export interface SportsRecentGame {
  id: string;
  teamId?: string;
  date?: string;
  opponentId?: string;
  opponentName: string;
  opponentLogo?: string;
  score?: string;
  result: SportsGameResult;
  competition?: string;
  round?: string;
}

export interface SportsDetailTeam {
  teamId: string;
  name: string;
  abbreviation?: string;
  logo?: string;
  form?: string;
  recentGames: SportsRecentGame[];
}

export interface SportsStandingRow {
  teamId: string;
  name: string;
  logo?: string;
  rank?: number;
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  points?: number;
  record?: string;
}

export interface SportsVenueDetail {
  name: string;
  city?: string;
  country?: string;
}

export interface SportsDetailCoverage {
  score: number;
  available: string[];
  missing: string[];
}

export interface SportsEventDetail {
  eventId: string;
  season?: string;
  round?: string;
  neutralSite?: boolean;
  venue?: SportsVenueDetail;
  broadcasts: string[];
  teams: SportsDetailTeam[];
  headToHeadGames: SportsRecentGame[];
  standingsHeader?: string;
  standings: SportsStandingRow[];
  rosters: TeamRoster[];
  coverage: SportsDetailCoverage;
  source: string;
  updatedAt: string;
}

export type SportsSnapshotMode = 'live' | 'cache' | 'fallback';

export interface SportsDataSnapshot {
  events: SportsEvent[];
  source: string;
  updatedAt: string;
  mode: SportsSnapshotMode;
  warning?: string;
}
