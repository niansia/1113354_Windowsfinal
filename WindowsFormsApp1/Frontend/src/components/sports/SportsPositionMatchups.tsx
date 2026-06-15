import { Shield, Star, UserRoundSearch, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import type {
  PositionMatchupReport,
  PositionGroupMatchup
} from '../../sports/sportsMatchups';
import { isStarPlayer } from '../../sports/sportsPlayerRatings';
import type { RosterPlayer, SquadGroup } from '../../sports/sportsTypes';

const GROUP_LABELS: Record<SquadGroup, string> = {
  GK: '門將',
  DEF: '後衛',
  MID: '中場',
  FWD: '前鋒',
  OTHER: '其他'
};

interface SportsPositionMatchupsProps {
  report: PositionMatchupReport;
  onSelectPlayer: (player: RosterPlayer) => void;
}

const sideSummary = (
  group: PositionGroupMatchup,
  side: 'home' | 'away',
  label: string
) => {
  const summary = group[side];
  return (
    <div className={`sports-matchup-side ${side}`}>
      <strong>{label}</strong>
      <b>{summary.score}</b>
      <span>{summary.available}/{summary.count}</span>
      <small>{summary.avgAge ?? '—'}</small>
    </div>
  );
};

export function SportsPositionMatchups({
  report,
  onSelectPlayer
}: SportsPositionMatchupsProps) {
  const { t } = useI18n();
  const [selectedGroup, setSelectedGroup] = useState<SquadGroup | null>(null);
  const group = useMemo(
    () => report.groups.find((item) => item.group === selectedGroup) ?? report.groups[0],
    [report.groups, selectedGroup]
  );

  if (!group) return null;
  const advantage = group.advantage === 'home'
    ? report.homeName
    : group.advantage === 'away'
      ? report.awayName
      : t('勢均力敵');

  return (
    <section className="sports-matchups-panel">
      <header className="sports-subhead">
        <Users size={16} />
        {t('位置對位')}
        <small>{t('比較分數')}</small>
      </header>
      <div className="sports-matchup-tabs" role="tablist" aria-label={t('位置對位')}>
        {report.groups.map((item) => (
          <button
            key={item.group}
            type="button"
            role="tab"
            aria-selected={item.group === group.group}
            className={item.group === group.group ? 'active' : ''}
            onClick={() => setSelectedGroup(item.group)}
          >
            {t(GROUP_LABELS[item.group])}
            <b>{item.home.score}:{item.away.score}</b>
          </button>
        ))}
      </div>
      <div className="sports-matchup-summary">
        {sideSummary(group, 'home', report.homeName)}
        <div className="sports-matchup-edge">
          <Shield size={17} />
          <small>{t('對位優勢')}</small>
          <strong>{advantage}</strong>
        </div>
        {sideSummary(group, 'away', report.awayName)}
      </div>
      <header className="sports-subhead compact">
        <UserRoundSearch size={15} />
        {t('球員對位')}
      </header>
      <div className="sports-player-pairings">
        {group.pairings.map((pair, index) => (
          <article key={`${pair.home?.id ?? 'home'}-${pair.away?.id ?? 'away'}-${index}`}>
            <button
              type="button"
              disabled={!pair.home}
              onClick={() => pair.home && onSelectPlayer(pair.home)}
            >
              <span>{pair.home?.headshot ? <img src={pair.home.headshot} alt="" /> : pair.home?.jersey || '—'}</span>
              <div>
                <strong>{isStarPlayer(pair.home?.name) && <Star size={11} className="sports-star-icon" />}{pair.home?.name ?? '—'}</strong>
                <small>{pair.home?.position || t('未提供')}</small>
              </div>
              <b>{pair.homeScore}</b>
            </button>
            <i>VS</i>
            <button
              type="button"
              disabled={!pair.away}
              onClick={() => pair.away && onSelectPlayer(pair.away)}
            >
              <b>{pair.awayScore}</b>
              <div>
                <strong>{isStarPlayer(pair.away?.name) && <Star size={11} className="sports-star-icon" />}{pair.away?.name ?? '—'}</strong>
                <small>{pair.away?.position || t('未提供')}</small>
              </div>
              <span>{pair.away?.headshot ? <img src={pair.away.headshot} alt="" /> : pair.away?.jersey || '—'}</span>
            </button>
          </article>
        ))}
      </div>
      <p className="sports-evidence-note">
        {t('此分數為可用資料估計，並非官方球員評分。')}
      </p>
    </section>
  );
}

