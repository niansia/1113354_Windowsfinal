import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Clock3,
  Database,
  ExternalLink,
  Flag,
  Gauge,
  Heart,
  Newspaper,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import {
  formatFusionEventDateTime,
  formatFusionTime,
  fusionCalendarKey,
  localeForLanguage
} from '../i18n/localeFormatting';
import { useSettings } from '../state/SettingsContext';
import {
  BUNDLED_SPORTS_EVENTS,
  getCompetition,
  SPORT_LABELS,
  SPORTS_COMPETITIONS
} from '../sports/sportsCatalog';
import { loadSportsCenterData } from '../sports/sportsDataService';
import { loadSportsHeadlines } from '../sports/sportsProviders';
import { loadTeamRoster, ROSTER_SPORTS } from '../sports/sportsRoster';
import { loadSportsEventDetail } from '../sports/sportsDetail';
import {
  applyPredictionEvidence,
  buildPredictionEvidence
} from '../sports/sportsEvidence';
import { buildPositionMatchups } from '../sports/sportsMatchups';
import { localizeTeamName } from '../sports/sportsTeamNames';
import {
  annotateRosterValues,
  isScoutAvailable,
  loadMatchValues,
  type MatchValues
} from '../sports/sportsMarketValues';
import { winPctLabel } from '../sports/sportsStrength';
import { buildSquadInsight } from '../sports/sportsAnalysis';
import { generateSportsReport, type SportsReport } from '../sports/sportsAi';
import { SportsEventDetailDialog } from './sports/SportsEventDetailDialog';
import { SportsPlayerProfile } from './sports/SportsPlayerProfile';
import { SportsPositionMatchups } from './sports/SportsPositionMatchups';
import { SportsPredictionEvidence } from './sports/SportsPredictionEvidence';
import {
  buildLocalSportsReport,
  createPredictionInput,
  simulateMatch,
  type PredictionPreset,
  type SportsPredictionInput,
  type SportsPredictionResult
} from '../sports/sportsSimulation';
import type {
  SportId,
  SportsCompetition,
  SportsDataSnapshot,
  SportsEvent,
  SportsEventDetail,
  SportsEventStatus,
  SportsHeadline,
  SportsParticipant,
  RosterPlayer,
  SquadGroup,
  TeamRoster
} from '../sports/sportsTypes';

interface FusionSportsCenterProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

type WorkspaceTab = 'events' | 'prediction' | 'compare';
type SideKey = 'home' | 'away';
type MetricKey = 'rating' | 'offense' | 'defense' | 'form';
type StatusFilter = 'all' | 'live' | 'upcoming' | 'final';

interface SideTuning {
  rating: number;
  offense: number;
  defense: number;
  form: number;
}

const FAVORITES_KEY = 'fusion-sports-favorites-v1';
const LIVE_REFRESH_MS = 30_000;
// How events sort within a day: anything in progress first, then upcoming, then
// finished, with delayed/cancelled fixtures sinking to the bottom.
const STATUS_SORT_ORDER: Record<SportsEventStatus, number> = {
  live: 0,
  scheduled: 1,
  final: 2,
  postponed: 3,
  cancelled: 4
};
const STATUS_FILTERS: Array<{ id: StatusFilter; label: string; match?: SportsEventStatus }> = [
  { id: 'all', label: '全部' },
  { id: 'live', label: '即時', match: 'live' },
  { id: 'upcoming', label: '即將開始', match: 'scheduled' },
  { id: 'final', label: '已結束', match: 'final' }
];

const TABS: Array<{ id: WorkspaceTab; label: string; icon: typeof Trophy }> = [
  { id: 'events', label: '賽事中心', icon: CalendarDays },
  { id: 'prediction', label: '預測實驗室', icon: BarChart3 },
  { id: 'compare', label: '比較與 AI', icon: BrainCircuit }
];

const SQUAD_GROUP_LABELS: Record<SquadGroup, string> = {
  GK: '門將',
  DEF: '後衛',
  MID: '中場',
  FWD: '前鋒',
  OTHER: '其他'
};
const SQUAD_GROUP_ORDER: SquadGroup[] = ['GK', 'DEF', 'MID', 'FWD', 'OTHER'];

const STATUS_LABELS: Record<SportsEventStatus, string> = {
  scheduled: '即將開始',
  live: '即時',
  final: '已結束',
  postponed: '延期',
  cancelled: '取消'
};

const emptySnapshot = (): SportsDataSnapshot => ({
  events: [],
  source: '內建賽程',
  updatedAt: new Date().toISOString(),
  mode: 'fallback'
});

const loadFavorites = () => {
  try {
    return new Set<string>(JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? '[]') as string[]);
  } catch {
    return new Set<string>();
  }
};

const saveFavorites = (favorites: Set<string>) => {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {
    // Favorites are a convenience; storage failure is non-fatal.
  }
};

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const defaultTuning = (participant: SportsParticipant | undefined, index: number): SideTuning => ({
  rating: participant?.rating ?? 1500 + (hashString(participant?.id ?? String(index)) % 260) - 130,
  offense: participant?.offense ?? 50,
  defense: participant?.defense ?? 50,
  form: participant?.form ?? 50
});

const participantName = (participant: SportsParticipant | undefined, fallback: string) =>
  participant?.name || fallback;

const modeLabel = (mode: SportsDataSnapshot['mode']) => {
  if (mode === 'live') return '線上';
  if (mode === 'cache') return '快取';
  return '離線備援';
};

export function FusionSportsCenter({ open, onClose, accent }: FusionSportsCenterProps) {
  const { lang, t, tf } = useI18n();
  const { settings } = useSettings();
  const reducedMotion = useReducedMotion();
  const animate = settings.animations && !reducedMotion;
  const [tab, setTab] = useState<WorkspaceTab>('events');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [sportFilter, setSportFilter] = useState<'all' | SportId>('all');
  const [competitionFilter, setCompetitionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [headlines, setHeadlines] = useState<SportsHeadline[]>([]);
  const [headlinesLoading, setHeadlinesLoading] = useState(false);
  const [homeRoster, setHomeRoster] = useState<TeamRoster | null>(null);
  const [awayRoster, setAwayRoster] = useState<TeamRoster | null>(null);
  const [rostersLoading, setRostersLoading] = useState(false);
  const [matchValues, setMatchValues] = useState<MatchValues | null>(null);
  const [valuesLoading, setValuesLoading] = useState(false);
  const [eventDetail, setEventDetail] = useState<SportsEventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [snapshot, setSnapshot] = useState<SportsDataSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [preset, setPreset] = useState<PredictionPreset>('balanced');
  const [iterations, setIterations] = useState(20_000);
  const [homeTuning, setHomeTuning] = useState<SideTuning>(() => defaultTuning(undefined, 0));
  const [awayTuning, setAwayTuning] = useState<SideTuning>(() => defaultTuning(undefined, 1));
  const [prediction, setPrediction] = useState<SportsPredictionResult | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [report, setReport] = useState<SportsReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const predictionRequestRef = useRef(0);

  const dateKey = fusionCalendarKey(selectedDate, settings.timezone);
  const todayKey = fusionCalendarKey(now, settings.timezone);

  const availableCompetitions = useMemo(
    () => SPORTS_COMPETITIONS.filter((competition) =>
      sportFilter === 'all' || competition.sport === sportFilter
    ),
    [sportFilter]
  );

  useEffect(() => {
    if (competitionFilter !== 'all' && !availableCompetitions.some((item) => item.id === competitionFilter)) {
      setCompetitionFilter('all');
    }
  }, [availableCompetitions, competitionFilter]);

  const requestedCompetitions = useMemo(() => {
    if (competitionFilter !== 'all') {
      return SPORTS_COMPETITIONS.filter((item) => item.id === competitionFilter);
    }
    if (sportFilter !== 'all') return availableCompetitions;
    // Default view: pull every ESPN-backed league in parallel so whatever is in season
    // shows up. Off-season leagues just return empty, and the flaky no-key TheSportsDB
    // feeds are only queried when their sport is explicitly selected.
    return SPORTS_COMPETITIONS.filter((item) => item.provider === 'espn');
  }, [availableCompetitions, competitionFilter, sportFilter]);

  const fallbackEvents = useMemo(
    () => BUNDLED_SPORTS_EVENTS.filter((event) => {
      const sameDate = fusionCalendarKey(new Date(event.startTime), settings.timezone) === dateKey;
      const sportMatches = sportFilter === 'all' || event.sport === sportFilter;
      const competitionMatches = competitionFilter === 'all' || event.competitionId === competitionFilter;
      return sameDate && sportMatches && competitionMatches;
    }),
    [competitionFilter, dateKey, settings.timezone, sportFilter]
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const ids = requestedCompetitions.map((item) => item.id).sort().join(',');
    void loadSportsCenterData({
      cacheKey: `fusion-sports:v1:${dateKey}:${ids}`,
      storage: window.localStorage,
      competitions: requestedCompetitions,
      dateKey,
      fallbackEvents,
      force: refreshNonce > 0,
      ttlMs: 45_000,
      windowDays: 1
    }).then((next) => {
      if (!cancelled) setSnapshot(next);
    }).catch(() => {
      if (!cancelled) {
        setSnapshot({
          events: fallbackEvents,
          source: '內建賽程',
          updatedAt: new Date().toISOString(),
          mode: 'fallback',
          warning: '資料更新失敗，已顯示可用內容。'
        });
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dateKey, fallbackEvents, open, refreshNonce, requestedCompetitions]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedPlayer) {
        setSelectedPlayer(null);
        return;
      }
      if (detailOpen) {
        setDetailOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [detailOpen, onClose, open, selectedPlayer]);

  useEffect(() => {
    if (!open || typeof Worker === 'undefined') return;
    const worker = new Worker(new URL('../sports/sportsWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{
      requestId: number;
      result?: SportsPredictionResult;
      error?: string;
    }>) => {
      if (event.data.requestId !== predictionRequestRef.current) return;
      if (event.data.result) setPrediction(event.data.result);
      setPredicting(false);
    };
    worker.onerror = () => setPredicting(false);
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [open]);

  // Events whose start time lands on the selected calendar day *in the viewer's
  // timezone*. The provider window already fetched neighbouring days, so this is what
  // makes a US night game appear on the correct Taipei date instead of vanishing.
  const dayEvents = useMemo(
    () => snapshot.events.filter(
      (event) => fusionCalendarKey(new Date(event.startTime), settings.timezone) === dateKey
    ),
    [dateKey, settings.timezone, snapshot.events]
  );

  // Day events narrowed by sport / competition / favourites / search — but NOT by the
  // live-state chip, so the chip counts stay accurate.
  const facetEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return dayEvents.filter((event) => {
      const sportMatches = sportFilter === 'all' || event.sport === sportFilter;
      const competitionMatches = competitionFilter === 'all' || event.competitionId === competitionFilter;
      const favoriteMatches = !favoriteOnly || favorites.has(event.id);
      const queryMatches = !normalizedQuery || [
        event.headline,
        event.competitionName,
        ...event.participants.map((item) => item.name)
      ].join(' ').toLowerCase().includes(normalizedQuery);
      return sportMatches && competitionMatches && favoriteMatches && queryMatches;
    });
  }, [competitionFilter, dayEvents, favoriteOnly, favorites, query, sportFilter]);

  const statusCounts = useMemo(() => ({
    all: facetEvents.length,
    live: facetEvents.filter((event) => event.status === 'live').length,
    upcoming: facetEvents.filter((event) => event.status === 'scheduled').length,
    final: facetEvents.filter((event) => event.status === 'final').length
  }), [facetEvents]);

  const visibleEvents = useMemo(() => {
    const matcher = STATUS_FILTERS.find((item) => item.id === statusFilter)?.match;
    const filtered = matcher ? facetEvents.filter((event) => event.status === matcher) : facetEvents;
    return [...filtered].sort((a, b) => {
      const orderDelta = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
      if (orderDelta !== 0) return orderDelta;
      const timeDelta = Date.parse(a.startTime) - Date.parse(b.startTime);
      // Finished games read best most-recent-first; everything else earliest-first.
      return a.status === 'final' ? -timeDelta : timeDelta;
    });
  }, [facetEvents, statusFilter]);

  const liveCount = useMemo(
    () => dayEvents.filter((event) => event.status === 'live').length,
    [dayEvents]
  );

  useEffect(() => {
    if (!visibleEvents.length) {
      setSelectedEventId('');
      return;
    }
    if (!visibleEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(visibleEvents[0].id);
    }
  }, [selectedEventId, visibleEvents]);

  const selectedEvent = visibleEvents.find((event) => event.id === selectedEventId) ?? visibleEvents[0];
  const home = selectedEvent?.participants.find((item) => item.side === 'home') ?? selectedEvent?.participants[0];
  const away = selectedEvent?.participants.find((item) => item.side === 'away') ?? selectedEvent?.participants[1];
  const competition = selectedEvent ? getCompetition(selectedEvent.competitionId) : undefined;

  // While any game on the selected day is live, quietly re-pull scores on an interval so
  // the board stays current without the user hitting refresh.
  useEffect(() => {
    if (!open || liveCount === 0) return;
    const timer = window.setInterval(() => setRefreshNonce((value) => value + 1), LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [liveCount, open]);

  // Recent league headlines for the selected competition (ESPN public news feed, no key).
  const headlineProviderPath = competition?.provider === 'espn' ? competition.providerPath : undefined;
  useEffect(() => {
    if (!open || !headlineProviderPath) {
      setHeadlines([]);
      setHeadlinesLoading(false);
      return;
    }
    let cancelled = false;
    setHeadlinesLoading(true);
    loadSportsHeadlines({ providerPath: headlineProviderPath, limit: 4 })
      .then((items) => {
        if (!cancelled) setHeadlines(items);
      })
      .catch(() => {
        if (!cancelled) setHeadlines([]);
      })
      .finally(() => {
        if (!cancelled) setHeadlinesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [headlineProviderPath, open]);

  // Localize an ESPN team / national-team name into the active language (falls back to
  // the original English when we have no translation).
  const tName = useCallback((name: string | undefined | null) => localizeTeamName(name, lang), [lang]);

  // Event summary data drives the dossier, explainable prediction evidence, recent form,
  // head-to-head history and standings. It loads independently from the score feed.
  const detailProviderPath = competition?.provider === 'espn' ? competition.providerPath : undefined;
  useEffect(() => {
    if (!open || !selectedEvent || !detailProviderPath) {
      setEventDetail(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    loadSportsEventDetail({
      providerPath: detailProviderPath,
      event: selectedEvent
    }).then((detail) => {
      if (!cancelled) setEventDetail(detail);
    }).catch(() => {
      if (!cancelled) {
        setEventDetail(null);
        setDetailError('暫無詳細資料');
      }
    }).finally(() => {
      if (!cancelled) setDetailLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [detailProviderPath, open, selectedEvent?.id]);

  // Player rosters for the two teams — loaded lazily when the Compare tab is open, since
  // prediction evidence and the dossier also use them. Failures degrade to summary data.
  const rosterProviderPath = competition?.provider === 'espn' ? competition.providerPath : undefined;
  const rosterSupported = Boolean(selectedEvent && ROSTER_SPORTS.has(selectedEvent.sport) && rosterProviderPath);
  useEffect(() => {
    const needsRoster = tab === 'compare' || tab === 'prediction' || detailOpen;
    if (!open || !needsRoster || !rosterSupported || !home?.id || !away?.id || !rosterProviderPath) {
      setHomeRoster(null);
      setAwayRoster(null);
      setRostersLoading(false);
      return;
    }
    let cancelled = false;
    setRostersLoading(true);
    Promise.all([
      loadTeamRoster({ providerPath: rosterProviderPath, teamId: home.id }).catch(() => null),
      loadTeamRoster({ providerPath: rosterProviderPath, teamId: away.id }).catch(() => null)
    ]).then(([homeData, awayData]) => {
      if (cancelled) return;
      setHomeRoster(homeData);
      setAwayRoster(awayData);
    }).finally(() => {
      if (!cancelled) setRostersLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpen, open, tab, selectedEvent?.id, rosterProviderPath, rosterSupported]);

  useEffect(() => {
    if (!selectedEvent || !home || !away) {
      setPrediction(null);
      setReport(null);
      return;
    }
    const nextHome = defaultTuning(home, 0);
    const nextAway = defaultTuning(away, 1);
    setHomeTuning(nextHome);
    setAwayTuning(nextAway);
    const input = createPredictionInput({
      model: competition?.model ?? 'generic',
      homeName: tName(home.name),
      awayName: tName(away.name),
      homeRating: nextHome.rating,
      awayRating: nextAway.rating,
      homeOffense: nextHome.offense,
      awayOffense: nextAway.offense,
      homeDefense: nextHome.defense,
      awayDefense: nextAway.defense,
      homeForm: nextHome.form,
      awayForm: nextAway.form,
      iterations: 6000,
      seed: hashString(selectedEvent.id),
      preset
    });
    const result = simulateMatch(input);
    setPrediction(result);
    setReport({ text: buildLocalSportsReport(input, result, lang), source: 'local' });
  }, [away, competition?.model, home, lang, preset, selectedEvent]);

  const effectiveHomeRoster = homeRoster
    ?? eventDetail?.rosters.find((roster) => roster.teamId === home?.id)
    ?? null;
  const effectiveAwayRoster = awayRoster
    ?? eventDetail?.rosters.find((roster) => roster.teamId === away?.id)
    ?? null;

  // Layer 3: real Transfermarkt market values via the optional local SportsScout proxy.
  // Fetched only when the Compare tab is open and rosters exist; silently does nothing if
  // the proxy is not running.
  useEffect(() => {
    if (!open || tab !== 'compare' || selectedEvent?.sport !== 'football' || !home || !away
        || !(effectiveHomeRoster?.players.length || effectiveAwayRoster?.players.length)) {
      return;
    }
    let cancelled = false;
    (async () => {
      if (!(await isScoutAvailable())) {
        if (!cancelled) setMatchValues(null);
        return;
      }
      if (cancelled) return;
      setValuesLoading(true);
      const values = await loadMatchValues(home.name, away.name);
      if (!cancelled) setMatchValues(values);
      if (!cancelled) setValuesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, selectedEvent?.id, effectiveHomeRoster, effectiveAwayRoster]);

  const valuedHomeRoster = useMemo(
    () => annotateRosterValues(effectiveHomeRoster, matchValues?.home ?? null).roster,
    [effectiveHomeRoster, matchValues]
  );
  const valuedAwayRoster = useMemo(
    () => annotateRosterValues(effectiveAwayRoster, matchValues?.away ?? null).roster,
    [effectiveAwayRoster, matchValues]
  );
  const marketValuesActive = Boolean(matchValues?.home?.found || matchValues?.away?.found);

  const predictionEvidence = useMemo(
    () => selectedEvent
      ? buildPredictionEvidence({
          event: selectedEvent,
          detail: eventDetail,
          homeRoster: effectiveHomeRoster,
          awayRoster: effectiveAwayRoster
        })
      : {
          factors: [],
          homeRatingAdjustment: 0,
          awayRatingAdjustment: 0,
          homeFormAdjustment: 0,
          awayFormAdjustment: 0,
          coverage: 0
        },
    [effectiveAwayRoster, effectiveHomeRoster, eventDetail, selectedEvent]
  );

  const predictionInput = useMemo<SportsPredictionInput | null>(() => {
    if (!selectedEvent || !home || !away) return null;
    const base = createPredictionInput({
      model: competition?.model ?? 'generic',
      homeName: tName(home.name),
      awayName: tName(away.name),
      homeRating: homeTuning.rating,
      awayRating: awayTuning.rating,
      homeOffense: homeTuning.offense,
      awayOffense: awayTuning.offense,
      homeDefense: homeTuning.defense,
      awayDefense: awayTuning.defense,
      homeForm: homeTuning.form,
      awayForm: awayTuning.form,
      iterations,
      seed: hashString(`${selectedEvent.id}:${preset}:${iterations}`),
      preset
    });
    return applyPredictionEvidence(base, predictionEvidence);
  }, [away, awayTuning, competition?.model, home, homeTuning, iterations, predictionEvidence, preset, selectedEvent, tName]);

  const positionMatchups = useMemo(
    () => selectedEvent && home && away
      ? buildPositionMatchups({
          sport: selectedEvent.sport,
          homeName: tName(home.name),
          awayName: tName(away.name),
          homeRoster: valuedHomeRoster,
          awayRoster: valuedAwayRoster,
          homeTeamRating: predictionInput?.home.rating ?? homeTuning.rating,
          awayTeamRating: predictionInput?.away.rating ?? awayTuning.rating
        })
      : null,
    [
      away,
      awayTuning.rating,
      valuedAwayRoster,
      valuedHomeRoster,
      home,
      homeTuning.rating,
      predictionInput?.away.rating,
      predictionInput?.home.rating,
      selectedEvent,
      tName
    ]
  );

  // Refresh the preview once provider evidence arrives. Manual changes still require the
  // explicit Run Prediction action, avoiding expensive simulations on every slider tick.
  useEffect(() => {
    if (!predictionInput || !eventDetail) return;
    const previewInput = { ...predictionInput, iterations: Math.min(6000, predictionInput.iterations) };
    const result = simulateMatch(previewInput);
    setPrediction(result);
    setReport({ text: buildLocalSportsReport(previewInput, result, lang), source: 'local' });
    // predictionInput is intentionally omitted: slider changes are user-controlled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    eventDetail?.updatedAt,
    effectiveAwayRoster?.summary.available,
    effectiveHomeRoster?.summary.available,
    lang,
    selectedEvent?.id
  ]);

  const runPrediction = useCallback(() => {
    if (!predictionInput) return;
    setPredicting(true);
    setReport(null);
    const requestId = predictionRequestRef.current + 1;
    predictionRequestRef.current = requestId;
    if (workerRef.current) {
      workerRef.current.postMessage({ requestId, input: predictionInput });
      return;
    }
    window.setTimeout(() => {
      if (predictionRequestRef.current !== requestId) return;
      setPrediction(simulateMatch(predictionInput));
      setPredicting(false);
    }, 20);
  }, [predictionInput]);

  useEffect(() => {
    if (!prediction || !predictionInput || predicting) return;
    setReport({
      text: buildLocalSportsReport(predictionInput, prediction, lang),
      source: 'local'
    });
  }, [lang, prediction, predictionInput, predicting]);

  const generateReport = useCallback(async () => {
    if (!prediction || !predictionInput) return;
    setReportLoading(true);
    const next = await generateSportsReport({
      input: predictionInput,
      result: prediction,
      evidence: predictionEvidence,
      lang,
      useAI: settings.assistantUseAI,
      model: settings.assistantModel
    });
    setReport(next);
    setReportLoading(false);
  }, [lang, prediction, predictionEvidence, predictionInput, settings.assistantModel, settings.assistantUseAI]);

  const openEventDetail = useCallback((event: SportsEvent) => {
    setSelectedEventId(event.id);
    setDetailOpen(true);
  }, []);

  const resetFacets = () => {
    setSportFilter('all');
    setCompetitionFilter('all');
    setStatusFilter('all');
    setFavoriteOnly(false);
    setQuery('');
  };

  const toggleFavorite = (eventId: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      saveFavorites(next);
      return next;
    });
  };

  const updateTuning = (side: SideKey, metric: MetricKey, value: number) => {
    const setter = side === 'home' ? setHomeTuning : setAwayTuning;
    setter((current) => ({ ...current, [metric]: value }));
  };

  const dateRail = useMemo(
    () => [-2, -1, 0, 1, 2].map((offset) => addDays(selectedDate, offset)),
    [selectedDate]
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeForLanguage(lang), {
      timeZone: settings.timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }),
    [lang, settings.timezone]
  );
  const weekdayFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeForLanguage(lang), {
      timeZone: settings.timezone,
      weekday: 'short'
    }),
    [lang, settings.timezone]
  );
  const shortDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeForLanguage(lang), {
      timeZone: settings.timezone,
      month: 'short',
      day: 'numeric'
    }),
    [lang, settings.timezone]
  );

  const probabilityRows = prediction && home && away ? [
    { label: tName(home.name), value: prediction.homeWin, kind: 'home' },
    ...(prediction.draw > 0 ? [{ label: t('和局'), value: prediction.draw, kind: 'draw' }] : []),
    { label: tName(away.name), value: prediction.awayWin, kind: 'away' }
  ] : [];

  const squadInsight = useMemo(
    () => (home && away
      ? buildSquadInsight(lang, {
          homeName: tName(home.name),
          awayName: tName(away.name),
          home: effectiveHomeRoster?.summary ?? null,
          away: effectiveAwayRoster?.summary ?? null
        })
      : null),
    [away, effectiveAwayRoster, effectiveHomeRoster, home, lang, tName]
  );

  const renderParticipant = (participant: SportsParticipant | undefined, label: string) => (
    <div className="sports-participant">
      <span className="sports-team-mark">
        {participant?.logo ? <img src={participant.logo} alt="" /> : <Shield size={22} />}
      </span>
      <div>
        <small>{t(label)}</small>
        <strong>{tName(participantName(participant, t(label)))}</strong>
        <span>{participant?.record || participant?.abbreviation || '—'}</span>
      </div>
      <b>{participant?.score ?? '—'}</b>
    </div>
  );

  const renderTuning = (side: SideKey, participant: SportsParticipant | undefined, tuning: SideTuning) => (
    <section className="sports-tuning-card">
      <header>
        <span className="sports-team-mark small">
          {participant?.logo ? <img src={participant.logo} alt="" /> : <Shield size={18} />}
        </span>
        <div>
          <small>{t(side === 'home' ? '主隊' : '客隊')}</small>
          <strong>{tName(participantName(participant, t(side === 'home' ? '主隊' : '客隊')))}</strong>
        </div>
      </header>
      {([
        ['rating', '評分', 800, 2600, 10],
        ['offense', '進攻', 0, 100, 1],
        ['defense', '防守', 0, 100, 1],
        ['form', '近期狀態', 0, 100, 1]
      ] as const).map(([metric, label, minimum, maximum, step]) => (
        <label key={metric}>
          <span>{t(label)} <b>{tuning[metric]}</b></span>
          <input
            type="range"
            min={minimum}
            max={maximum}
            step={step}
            value={tuning[metric]}
            onChange={(event) => updateTuning(side, metric, Number(event.target.value))}
          />
        </label>
      ))}
    </section>
  );

  const renderSquad = (
    participant: SportsParticipant | undefined,
    roster: TeamRoster | null,
    side: SideKey
  ) => {
    const summary = roster?.summary;
    return (
      <section className="sports-squad-card">
        <header>
          <span className="sports-team-mark small">
            {participant?.logo ? <img src={participant.logo} alt="" /> : <Shield size={18} />}
          </span>
          <div>
            <small>{t(side === 'home' ? '主隊' : '客隊')}</small>
            <strong>{tName(participantName(participant, t(side === 'home' ? '主隊' : '客隊')))}</strong>
          </div>
          {summary && <b>{tf('{0} 人', summary.count)}</b>}
        </header>
        {summary && (summary.avgAge != null || summary.count > 0) && (
          <div className="sports-squad-metrics">
            {summary.avgAge != null && <span>{t('平均年齡')} <b>{summary.avgAge}</b></span>}
            {SQUAD_GROUP_ORDER.filter((group) => summary.byGroup[group] > 0).map((group) => (
              <span key={group}>{t(SQUAD_GROUP_LABELS[group])} <b>{summary.byGroup[group]}</b></span>
            ))}
          </div>
        )}
        {roster?.players.length ? (
          <ul className="sports-squad-list">
            {roster.players.slice(0, 30).map((player) => (
              <li
                key={player.id}
                role="button"
                tabIndex={0}
                onDoubleClick={() => setSelectedPlayer(player)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') setSelectedPlayer(player);
                }}
              >
                <span className="sports-squad-mark">
                  {player.headshot
                    ? <img src={player.headshot} alt="" loading="lazy" />
                    : <b>{player.jersey || '·'}</b>}
                </span>
                <span className="sports-squad-name">{player.name}</span>
                {player.valueLabel && <span className="sports-squad-value">{player.valueLabel}</span>}
                {player.position && <span className="sports-squad-pos">{player.position}</span>}
                {player.age != null && <span className="sports-squad-age">{player.age}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="sports-squad-empty">{t('暫無球員名單')}</p>
        )}
      </section>
    );
  };

  const compareMetrics = predictionInput ? [
    { label: '評分', home: predictionInput.home.rating, away: predictionInput.away.rating, maximum: 2600 },
    { label: '進攻', home: predictionInput.home.offense, away: predictionInput.away.offense, maximum: 100 },
    { label: '防守', home: predictionInput.home.defense, away: predictionInput.away.defense, maximum: 100 },
    { label: '近期狀態', home: predictionInput.home.form, away: predictionInput.away.form, maximum: 100 }
  ] : [];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={`sports-overlay ${animate ? '' : 'reduce-motion'}`}
        style={{ '--sports-accent': accent } as CSSProperties}
        initial={animate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        exit={animate ? { opacity: 0 } : undefined}
        onClick={onClose}
      >
        <motion.div
          className="sports-shell"
          initial={animate ? { opacity: 0, y: 22, scale: 0.985 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={animate ? { opacity: 0, y: 14, scale: 0.99 } : undefined}
          transition={{ type: 'spring', stiffness: 250, damping: 28 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sports-aurora" aria-hidden="true" />
          <header className="sports-topbar">
            <div className="sports-brand">
              <span><Trophy size={23} /></span>
              <div>
                <strong>{t('全球體育中心')}</strong>
                <small>{t('即時比分、賽程與 AI 預測')}</small>
              </div>
            </div>
            <nav className="sports-tabs" aria-label={t('全球體育中心')}>
              {TABS.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
                    <Icon size={16} /> {t(item.label)}
                  </button>
                );
              })}
            </nav>
            <div className="sports-system-status">
              <span className={`sports-mode ${snapshot.mode}`}><i /> {t(modeLabel(snapshot.mode))}</span>
              <div><strong>{formatFusionTime(now, lang, settings.timezone, settings.clock24)}</strong><small>{t('系統同步')}</small></div>
              <button type="button" onClick={() => setRefreshNonce((value) => value + 1)} title={t('重新整理')}><RefreshCw size={18} className={loading ? 'spin' : ''} /></button>
              <button type="button" onClick={onClose} title={t('關閉體育中心')}><X size={20} /></button>
            </div>
          </header>

          <section className="sports-commandbar">
            <button type="button" onClick={() => setSelectedDate((date) => addDays(date, -1))} title={t('上一天')}><ChevronLeft size={18} /></button>
            <div className="sports-date-rail">
              {dateRail.map((date) => {
                const key = fusionCalendarKey(date, settings.timezone);
                return (
                  <button key={key} type="button" className={key === dateKey ? 'active' : ''} onClick={() => setSelectedDate(date)}>
                    <small>{key === todayKey ? t('今天') : weekdayFormatter.format(date)}</small>
                    <strong>{shortDateFormatter.format(date)}</strong>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setSelectedDate((date) => addDays(date, 1))} title={t('下一天')}><ChevronRight size={18} /></button>
            {dateKey !== todayKey && (
              <button type="button" className="sports-today" onClick={() => setSelectedDate(new Date())} title={t('回到今天')}>
                <CalendarClock size={16} /> {t('今天')}
              </button>
            )}
            <label className="sports-search">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('搜尋賽事或隊伍')} />
            </label>
            <button type="button" className={favoriteOnly ? 'active favorite' : 'favorite'} onClick={() => setFavoriteOnly((value) => !value)}>
              <Heart size={17} fill={favoriteOnly ? 'currentColor' : 'none'} /> {t('個人收藏')}
            </button>
          </section>

          <div className="sports-body">
            <aside className="sports-navigator">
              <div className="sports-side-title"><Flag size={15} /> {t('賽事篩選')}</div>
              <button type="button" className={sportFilter === 'all' ? 'active' : ''} onClick={() => setSportFilter('all')}>
                <Trophy size={17} /><span>{t('所有運動')}</span><small>{dayEvents.length}</small>
              </button>
              {(Object.keys(SPORT_LABELS) as SportId[]).map((sport) => {
                const count = dayEvents.filter((event) => event.sport === sport).length;
                return (
                  <button key={sport} type="button" className={sportFilter === sport ? 'active' : ''} onClick={() => setSportFilter(sport)}>
                    <Activity size={17} /><span>{t(SPORT_LABELS[sport])}</span><small>{count}</small>
                  </button>
                );
              })}
              <div className="sports-side-title competition"><Database size={15} /> {t('所有賽事')}</div>
              <button type="button" className={competitionFilter === 'all' ? 'active' : ''} onClick={() => setCompetitionFilter('all')}>
                <Sparkles size={17} /><span>{t('全部')}</span>
              </button>
              {availableCompetitions.map((item) => (
                <button key={item.id} type="button" className={competitionFilter === item.id ? 'active' : ''} onClick={() => setCompetitionFilter(item.id)}>
                  <span className="sports-competition-dot" /><span>{t(item.shortName)}</span>
                </button>
              ))}
            </aside>

            <main className="sports-workspace">
              {snapshot.warning && <div className="sports-warning"><WifiOff size={16} /> {t(snapshot.warning)}</div>}

              {tab === 'events' && (
                <section className="sports-events-view">
                  <header className="sports-workspace-head">
                    <div><small>{t('焦點賽事')}</small><h2>{dateFormatter.format(selectedDate)}</h2></div>
                    <div className="sports-head-tags">
                      {liveCount > 0 && (
                        <span className="sports-live-badge"><Radio size={12} /> {tf('{0} 場進行中', liveCount)}</span>
                      )}
                      <span className="sports-count-tag">{tf('共 {0} 場', visibleEvents.length)}</span>
                    </div>
                  </header>
                  <div className="sports-status-chips" role="tablist" aria-label={t('賽事狀態')}>
                    {STATUS_FILTERS.map((item) => {
                      const count = statusCounts[item.id];
                      const isLive = item.id === 'live' && count > 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={statusFilter === item.id}
                          className={`${statusFilter === item.id ? 'active' : ''} ${isLive ? 'live' : ''}`}
                          onClick={() => setStatusFilter(item.id)}
                        >
                          {isLive && <i className="sports-chip-pulse" />}
                          {t(item.label)} <b>{count}</b>
                        </button>
                      );
                    })}
                  </div>
                  {loading && !visibleEvents.length ? (
                    <div className="sports-empty"><RefreshCw className="spin" size={31} /><strong>{t('正在同步賽事資料...')}</strong></div>
                  ) : visibleEvents.length ? (
                    <div className="sports-event-list">
                      {visibleEvents.map((event, index) => {
                        const eventHome = event.participants.find((item) => item.side === 'home') ?? event.participants[0];
                        const eventAway = event.participants.find((item) => item.side === 'away') ?? event.participants[1];
                        return (
                          <motion.article
                            layout={animate}
                            key={event.id}
                            className={`sports-event-card ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                            initial={animate ? { opacity: 0, y: 10 } : false}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: animate ? Math.min(index * 0.025, 0.2) : 0 }}
                          >
                            <button
                              type="button"
                              className="sports-event-main"
                              onClick={() => setSelectedEventId(event.id)}
                              onDoubleClick={() => openEventDetail(event)}
                              onKeyDown={(keyboardEvent) => {
                                if (keyboardEvent.key === 'Enter') {
                                  keyboardEvent.preventDefault();
                                  openEventDetail(event);
                                }
                              }}
                            >
                              <div className="sports-event-meta">
                                <span className={`sports-status ${event.status}`}>{t(STATUS_LABELS[event.status])}</span>
                                <strong>{t(event.competitionName)}</strong>
                                <small><Clock3 size={12} /> {formatFusionEventDateTime(new Date(event.startTime), lang, settings.timezone, settings.clock24)}</small>
                              </div>
                              <div className="sports-score-row">
                                {renderParticipant(eventHome, '主隊')}
                                <div className="sports-score-divider">
                                  <strong>{event.status === 'scheduled' ? 'VS' : `${eventHome?.score ?? 0} : ${eventAway?.score ?? 0}`}</strong>
                                  <small>{event.status === 'scheduled' ? t('尚未開賽') : event.statusText}</small>
                                </div>
                                {renderParticipant(eventAway, '客隊')}
                              </div>
                              <div className="sports-event-foot">
                                <span>{event.venue || t('未提供場地')}</span>
                                <span>{t(event.source)}</span>
                              </div>
                            </button>
                            <button type="button" className={`sports-favorite ${favorites.has(event.id) ? 'active' : ''}`} onClick={() => toggleFavorite(event.id)} title={t('收藏')}>
                              <Star size={17} fill={favorites.has(event.id) ? 'currentColor' : 'none'} />
                            </button>
                          </motion.article>
                        );
                      })}
                    </div>
                  ) : statusFilter !== 'all' && facetEvents.length > 0 ? (
                    <div className="sports-empty">
                      <CalendarDays size={34} />
                      <strong>{t('此狀態目前沒有賽事')}</strong>
                      <span>{tf('其他狀態仍有 {0} 場賽事。', facetEvents.length)}</span>
                      <button type="button" className="sports-empty-action" onClick={() => setStatusFilter('all')}>
                        {t('顯示全部賽事')}
                      </button>
                    </div>
                  ) : facetEvents.length === 0 && dayEvents.length > 0 ? (
                    <div className="sports-empty">
                      <CalendarDays size={34} />
                      <strong>{t('此分類今日無賽事')}</strong>
                      <span>{tf('本日其他運動仍有 {0} 場賽事。', dayEvents.length)}</span>
                      <button type="button" className="sports-empty-action" onClick={resetFacets}>
                        {t('查看所有運動')}
                      </button>
                    </div>
                  ) : (
                    <div className="sports-empty">
                      <CalendarDays size={34} />
                      <strong>{t('目前沒有符合條件的賽事')}</strong>
                      <span>{t('切換日期或賽事分類以查看其他內容。')}</span>
                      {dateKey !== todayKey && (
                        <button type="button" className="sports-empty-action" onClick={() => setSelectedDate(new Date())}>
                          {t('回到今天')}
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}

              {tab === 'prediction' && (
                <section className="sports-prediction-view">
                  {selectedEvent && home && away && predictionInput ? (
                    <>
                      <header className="sports-workspace-head">
                        <div><small>{t('蒙地卡羅模擬')}</small><h2>{tName(home.name)} vs {tName(away.name)}</h2></div>
                        <span>{competition?.model.toUpperCase() ?? 'GENERIC'}</span>
                      </header>
                      {selectedEvent.status === 'final' && (
                        <div className="sports-result-banner">
                          <span className="sports-result-flag">{t('已結束')}</span>
                          <strong>{tName(home.name)} {home.score ?? 0} : {away.score ?? 0} {tName(away.name)}</strong>
                          <small>{t('以下為賽前模型回溯，非即時預測。')}</small>
                        </div>
                      )}
                      <div className="sports-model-toolbar">
                        <div className="sports-segmented">
                          {(['conservative', 'balanced', 'upset'] as PredictionPreset[]).map((item) => (
                            <button key={item} type="button" className={preset === item ? 'active' : ''} onClick={() => setPreset(item)}>
                              {t(item === 'conservative' ? '穩健' : item === 'balanced' ? '平衡' : '冷門敏感')}
                            </button>
                          ))}
                        </div>
                        <label>
                          <span>{t('模擬次數')}</span>
                          <select value={iterations} onChange={(event) => setIterations(Number(event.target.value))}>
                            <option value={5000}>5,000</option>
                            <option value={10000}>10,000</option>
                            <option value={20000}>20,000</option>
                            <option value={50000}>50,000</option>
                          </select>
                        </label>
                        <button type="button" className="sports-primary" disabled={predicting} onClick={runPrediction}>
                          {predicting ? <RefreshCw size={17} className="spin" /> : <Gauge size={17} />}
                          {t(predicting ? '正在模擬...' : '執行預測')}
                        </button>
                      </div>
                      <div className="sports-tuning-grid">
                        {renderTuning('home', home, homeTuning)}
                        {renderTuning('away', away, awayTuning)}
                      </div>
                      {prediction && (
                        <div className="sports-result-grid">
                          <section className="sports-probability-card">
                            <header><BarChart3 size={17} /><strong>{t('勝率')}</strong></header>
                            {probabilityRows.map((row) => (
                              <div className="sports-probability-row" key={row.label}>
                                <span>{row.label}</span>
                                <div><i className={row.kind} style={{ width: `${Math.max(2, row.value * 100)}%` }} /></div>
                                <strong>{(row.value * 100).toFixed(1)}%</strong>
                              </div>
                            ))}
                          </section>
                          <section className="sports-score-card">
                            <small>{t('預測比分')}</small>
                            <strong>{prediction.projectedScore}</strong>
                            <span>{t('模型信心')} {Math.round(prediction.confidence * 100)}%</span>
                          </section>
                          <section className="sports-scorelines">
                            <header><Activity size={17} /><strong>{t('可能比分')}</strong></header>
                            {prediction.topScorelines.map((item) => (
                              <span key={item.score}><b>{item.score}</b><i>{(item.probability * 100).toFixed(1)}%</i></span>
                            ))}
                          </section>
                        </div>
                      )}
                      <SportsPredictionEvidence evidence={predictionEvidence} />
                      <p className="sports-disclaimer">{t('僅供學習與賽事分析，不構成投注建議。')}</p>
                    </>
                  ) : (
                    <div className="sports-empty"><BarChart3 size={34} /><strong>{t('未選擇賽事')}</strong><span>{t('請先從賽事中心選擇一場可比較的賽事。')}</span></div>
                  )}
                </section>
              )}

              {tab === 'compare' && (
                <section className="sports-compare-view">
                  {selectedEvent && home && away && predictionInput ? (
                    <>
                      <header className="sports-workspace-head">
                        <div><small>{t('隊伍／選手比較')}</small><h2>{tName(home.name)} vs {tName(away.name)}</h2></div>
                        <span>{t(selectedEvent.competitionName)}</span>
                      </header>
                      <div className="sports-comparison">
                        <div className="sports-comparison-head">
                          <div className="sports-comparison-team">
                            <strong>{tName(home.name)}</strong>
                            {winPctLabel(home.record) && <small>{t('勝率')} {winPctLabel(home.record)}</small>}
                          </div>
                          <span>{t('指標')}</span>
                          <div className="sports-comparison-team">
                            <strong>{tName(away.name)}</strong>
                            {winPctLabel(away.record) && <small>{t('勝率')} {winPctLabel(away.record)}</small>}
                          </div>
                        </div>
                        {compareMetrics.map((metric) => {
                          const lead = metric.home === metric.away ? '' : metric.home > metric.away ? 'home' : 'away';
                          return (
                            <div className="sports-comparison-row" key={metric.label}>
                              <div className={`left ${lead === 'home' ? 'lead' : ''}`}><b>{metric.home}</b><span><i style={{ width: `${metric.home / metric.maximum * 100}%` }} /></span></div>
                              <strong>{t(metric.label)}</strong>
                              <div className={`right ${lead === 'away' ? 'lead' : ''}`}><span><i style={{ width: `${metric.away / metric.maximum * 100}%` }} /></span><b>{metric.away}</b></div>
                            </div>
                          );
                        })}
                      </div>

                      {positionMatchups?.groups.length ? (
                        <SportsPositionMatchups
                          report={positionMatchups}
                          valuesActive={marketValuesActive}
                          valuesLoading={valuesLoading}
                          onSelectPlayer={setSelectedPlayer}
                        />
                      ) : null}

                      <section className="sports-rosters">
                        <header className="sports-subhead"><Users size={16} /> {t('球員名單')} <small>ESPN</small></header>
                        {rostersLoading ? (
                          <div className="sports-headlines-state"><RefreshCw size={14} className="spin" /> {t('讀取球員名單中...')}</div>
                        ) : (effectiveHomeRoster?.players.length || effectiveAwayRoster?.players.length) ? (
                          <div className="sports-squad-grid">
                            {renderSquad(home, valuedHomeRoster, 'home')}
                            {renderSquad(away, valuedAwayRoster, 'away')}
                          </div>
                        ) : rosterSupported ? (
                          <p className="sports-headlines-state">{t('此賽事暫無球員名單')}</p>
                        ) : (
                          <p className="sports-headlines-state">{t('此運動為個人賽，無隊伍名單')}</p>
                        )}
                      </section>

                      <section className="sports-ai-card">
                        <header>
                          <span><BrainCircuit size={20} /></span>
                          <div><strong>{t('本機 AI 賽前報告')}</strong><small>{t(report?.source === 'ollama' ? 'Ollama 本機模型' : '本機規則')}</small></div>
                          <button type="button" disabled={reportLoading || !prediction} onClick={generateReport}>
                            {reportLoading ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />}
                            {t(reportLoading ? '分析中...' : '產生 AI 分析')}
                          </button>
                        </header>
                        <p>{report?.text || t('選擇賽事後即可執行模型')}</p>
                        {squadInsight && <p className="sports-squad-insight">{squadInsight}</p>}
                      </section>
                    </>
                  ) : (
                    <div className="sports-empty"><BrainCircuit size={34} /><strong>{t('未選擇賽事')}</strong><span>{t('請先從賽事中心選擇一場可比較的賽事。')}</span></div>
                  )}
                </section>
              )}
            </main>

            <aside className="sports-inspector">
              <section className="sports-selected-panel">
                <header><Trophy size={18} /><strong>{t('焦點賽事')}</strong></header>
                {selectedEvent ? (
                  <>
                    <small>{t(selectedEvent.competitionName)}</small>
                    <h3>{tName(participantName(home, t('主隊')))} vs {tName(participantName(away, t('客隊')))}</h3>
                    <div className="sports-inspector-score">
                      <span>{home?.abbreviation ?? 'A'}</span>
                      <strong>{selectedEvent.status === 'scheduled' ? 'VS' : `${home?.score ?? 0}:${away?.score ?? 0}`}</strong>
                      <span>{away?.abbreviation ?? 'B'}</span>
                    </div>
                    <dl>
                      <div><dt>{t('開賽時間')}</dt><dd>{formatFusionEventDateTime(new Date(selectedEvent.startTime), lang, settings.timezone, settings.clock24)}</dd></div>
                      <div><dt>{t('場地')}</dt><dd>{selectedEvent.venue || t('未提供場地')}</dd></div>
                      <div><dt>{t('賽事狀態')}</dt><dd>{t(STATUS_LABELS[selectedEvent.status])}</dd></div>
                      {(home?.record || away?.record) && (
                        <div><dt>{t('戰績')}</dt><dd>{`${home?.record || '—'} · ${away?.record || '—'}`}</dd></div>
                      )}
                    </dl>
                    <div className="sports-inspector-actions">
                      <button type="button" onClick={() => openEventDetail(selectedEvent)}>
                        <Trophy size={16} /> {t('查看賽事詳情')}
                      </button>
                      <button type="button" onClick={() => setTab('prediction')}>
                        <BarChart3 size={16} /> {t('預測實驗室')}
                      </button>
                    </div>
                  </>
                ) : (
                  <p>{t('未選擇賽事')}</p>
                )}
              </section>
              {headlineProviderPath && (
                <section className="sports-headlines-panel">
                  <header><Newspaper size={18} /><strong>{t('賽事頭條')}</strong><small>ESPN</small></header>
                  {headlinesLoading ? (
                    <div className="sports-headlines-state"><RefreshCw size={14} className="spin" /> {t('讀取頭條中...')}</div>
                  ) : headlines.length ? (
                    <ul>
                      {headlines.map((item, index) => (
                        <li key={item.url ?? index}>
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noreferrer noopener">
                              <span>{item.title}</span><ExternalLink size={12} />
                            </a>
                          ) : (
                            <span>{item.title}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="sports-headlines-state">{t('暫無相關頭條')}</p>
                  )}
                </section>
              )}
              <section className="sports-source-panel">
                <header>{snapshot.mode === 'live' ? <Wifi size={18} /> : <WifiOff size={18} />}<strong>{t('資料模式')}</strong></header>
                <div><span>{t(modeLabel(snapshot.mode))}</span><b>{t(snapshot.source)}</b></div>
                <small>{t('更新於')} {formatFusionTime(new Date(snapshot.updatedAt), lang, settings.timezone, settings.clock24)}</small>
              </section>
              <section className="sports-capabilities">
                <header><Sparkles size={18} /><strong>{t('支援項目')}</strong></header>
                <span><Shield size={15} /> {t('免 API Key')}</span>
                <span><Gauge size={15} /> {t('本機運算')}</span>
                <span><BrainCircuit size={15} /> {t('隱私優先')}</span>
              </section>
            </aside>
          </div>
          {detailOpen && selectedEvent && (
            <SportsEventDetailDialog
              event={selectedEvent}
              detail={eventDetail}
              loading={detailLoading}
              error={detailError}
              rosters={[effectiveHomeRoster, effectiveAwayRoster].filter((roster): roster is TeamRoster => Boolean(roster))}
              localizeName={(name) => tName(name)}
              onSelectPlayer={setSelectedPlayer}
              onClose={() => setDetailOpen(false)}
            />
          )}
          {selectedPlayer && (
            <SportsPlayerProfile
              player={selectedPlayer}
              onClose={() => setSelectedPlayer(null)}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
