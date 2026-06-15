import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  MapPin,
  Radio,
  RefreshCw,
  Shield,
  Trophy,
  Users,
  X
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { formatFusionEventDateTime } from '../../i18n/localeFormatting';
import { useSettings } from '../../state/SettingsContext';
import type {
  RosterPlayer,
  SportsDetailTeam,
  SportsEvent,
  SportsEventDetail,
  SportsRecentGame,
  TeamRoster
} from '../../sports/sportsTypes';

type DetailTab = 'overview' | 'history' | 'squads';

interface SportsEventDetailDialogProps {
  event: SportsEvent;
  detail: SportsEventDetail | null;
  loading: boolean;
  error: string | null;
  rosters: TeamRoster[];
  localizeName: (name: string) => string;
  onSelectPlayer: (player: RosterPlayer) => void;
  onClose: () => void;
}

const resultClass = (result: SportsRecentGame['result']) =>
  result === 'W' ? 'win' : result === 'L' ? 'loss' : 'draw';

export function SportsEventDetailDialog({
  event,
  detail,
  loading,
  error,
  rosters,
  localizeName,
  onSelectPlayer,
  onClose
}: SportsEventDetailDialogProps) {
  const { lang, t } = useI18n();
  const { settings } = useSettings();
  const [tab, setTab] = useState<DetailTab>('overview');
  const home = event.participants.find((item) => item.side === 'home') ?? event.participants[0];
  const away = event.participants.find((item) => item.side === 'away') ?? event.participants[1];
  const score = event.status === 'scheduled'
    ? 'VS'
    : `${home?.score ?? 0} : ${away?.score ?? 0}`;
  const coverage = Math.round((detail?.coverage.score ?? 0) * 100);
  const effectiveRosters = useMemo(() => {
    const byTeam = new Map<string, TeamRoster>();
    for (const roster of detail?.rosters ?? []) byTeam.set(roster.teamId, roster);
    for (const roster of rosters) byTeam.set(roster.teamId, roster);
    return [...byTeam.values()];
  }, [detail?.rosters, rosters]);

  useEffect(() => setTab('overview'), [event.id]);

  const recentSection = (team: SportsDetailTeam) => (
    <section className="sports-detail-form-card" key={team.teamId}>
      <header>
        {team.logo ? <img src={team.logo} alt="" /> : <Shield size={18} />}
        <strong>{localizeName(team.name)}</strong>
        {team.form && <span>{team.form}</span>}
      </header>
      {team.recentGames.length ? (
        <ul>
          {team.recentGames.map((game) => (
            <li key={game.id}>
              <b className={resultClass(game.result)}>{game.result}</b>
              <span>{localizeName(game.opponentName)}</span>
              <strong>{game.score || '—'}</strong>
              <small>{game.competition || ''}</small>
            </li>
          ))}
        </ul>
      ) : <p>{t('無近期賽事資料')}</p>}
    </section>
  );

  return (
    <div className="sports-detail-backdrop" onClick={onClose}>
      <section
        className="sports-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('賽事詳情')}
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <header className="sports-detail-hero">
          <div className="sports-detail-title">
            <small>{t('賽事詳情')} · {t(event.competitionName)}</small>
            <h2>{localizeName(home?.name || 'A')} vs {localizeName(away?.name || 'B')}</h2>
            <p>{formatFusionEventDateTime(new Date(event.startTime), lang, settings.timezone, settings.clock24)}</p>
          </div>
          <div className="sports-detail-score">
            <span>{home?.abbreviation || 'A'}</span>
            <strong>{score}</strong>
            <span>{away?.abbreviation || 'B'}</span>
          </div>
          <button type="button" className="sports-dialog-close" onClick={onClose} title={t('關閉詳情')}>
            <X size={20} />
          </button>
        </header>

        <nav className="sports-detail-tabs" aria-label={t('賽事詳情')}>
          {([
            ['overview', '總覽', Trophy],
            ['history', '近期狀態與交手', Activity],
            ['squads', '陣容與球員', Users]
          ] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              <Icon size={15} /> {t(label)}
            </button>
          ))}
          <span>{t('資料覆蓋率')} <b>{coverage}%</b></span>
        </nav>

        <div className="sports-detail-content">
          {loading ? (
            <div className="sports-detail-loading"><RefreshCw className="spin" size={25} /> {t('讀取賽事詳情中...')}</div>
          ) : error && !detail ? (
            <div className="sports-detail-empty">{t('暫無詳細資料')}</div>
          ) : tab === 'overview' ? (
            <div className="sports-detail-overview">
              <section className="sports-detail-facts">
                <div><CalendarDays size={16} /><span>{t('開賽時間')}</span><b>{formatFusionEventDateTime(new Date(event.startTime), lang, settings.timezone, settings.clock24)}</b></div>
                <div><MapPin size={16} /><span>{t('場地')}</span><b>{detail?.venue?.name || event.venue || t('未提供')}</b></div>
                <div><MapPin size={16} /><span>{t('場館地址')}</span><b>{[detail?.venue?.city, detail?.venue?.country].filter(Boolean).join(', ') || t('未提供')}</b></div>
                <div><Trophy size={16} /><span>{t('賽事狀態')}</span><b>{event.statusText}</b></div>
                <div><Radio size={16} /><span>{t('轉播')}</span><b>{detail?.broadcasts.join(' · ') || t('未提供')}</b></div>
              </section>
              <section className="sports-detail-coverage-card">
                <header><strong>{t(coverage >= 70 ? '完整資料' : '部分資料')}</strong><b>{coverage}%</b></header>
                <div><i style={{ width: `${coverage}%` }} /></div>
                <p>{detail?.round || event.round || t('世界排名未由資料源提供')}</p>
                <small>{t('世界排名未由資料源提供')}</small>
              </section>
            </div>
          ) : tab === 'history' ? (
            <div className="sports-detail-history">
              <header className="sports-subhead"><Activity size={16} /> {t('近五場')}</header>
              <div className="sports-detail-form-grid">
                {detail?.teams.length ? detail.teams.map(recentSection) : <p className="sports-detail-empty">{t('無近期賽事資料')}</p>}
              </div>
              <header className="sports-subhead"><Shield size={16} /> {t('歷史交手')}</header>
              {detail?.headToHeadGames.length ? (
                <ul className="sports-h2h-list">
                  {detail.headToHeadGames.map((game) => (
                    <li key={game.id}>
                      <b className={resultClass(game.result)}>{game.result}</b>
                      <span>{localizeName(game.opponentName)}</span>
                      <strong>{game.score || '—'}</strong>
                      <small>{game.competition || ''}</small>
                    </li>
                  ))}
                </ul>
              ) : <p className="sports-detail-empty">{t('無歷史交手資料')}</p>}
              {detail?.standings.length ? (
                <>
                  <header className="sports-subhead"><Trophy size={16} /> {t('賽事排名')}</header>
                  <div className="sports-standings-table">
                    <div><b>#</b><span>{t('隊伍')}</span><b>{t('賽')}</b><b>{t('勝')}</b><b>{t('和')}</b><b>{t('負')}</b><b>{t('積分')}</b></div>
                    {detail.standings.map((row) => (
                      <div key={row.teamId}>
                        <b>{row.rank ?? '—'}</b><span>{localizeName(row.name)}</span><b>{row.played ?? '—'}</b><b>{row.wins ?? '—'}</b><b>{row.draws ?? '—'}</b><b>{row.losses ?? '—'}</b><b>{row.points ?? '—'}</b>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="sports-detail-rosters">
              {effectiveRosters.length ? effectiveRosters.map((roster) => {
                const participant = event.participants.find((item) => item.id === roster.teamId);
                return (
                  <section key={roster.teamId}>
                    <header><strong>{localizeName(participant?.name || roster.teamId)}</strong><span>{roster.summary.available}/{roster.summary.count} {t('可用球員')}</span></header>
                    <div>
                      {roster.players.map((player) => (
                        <button key={player.id} type="button" onClick={() => onSelectPlayer(player)}>
                          <span>{player.headshot ? <img src={player.headshot} alt="" /> : player.jersey || '—'}</span>
                          <div><strong>{player.name}</strong><small>{player.position || t('未提供')}</small></div>
                          <b className={player.available ? 'available' : 'unavailable'}>{t(player.available ? '可出賽' : '可能缺陣')}</b>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              }) : <p className="sports-detail-empty">{t('此賽事暫無球員名單')}</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
