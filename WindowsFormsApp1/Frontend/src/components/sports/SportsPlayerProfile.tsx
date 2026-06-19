import { CalendarDays, ExternalLink, HeartPulse, Ruler, Scale, UserRound, X } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { formatFusionFileDate } from '../../i18n/localeFormatting';
import { useSettings } from '../../state/SettingsContext';
import type { RosterPlayer } from '../../sports/sportsTypes';

interface SportsPlayerProfileProps {
  player: RosterPlayer;
  onClose: () => void;
}

export function SportsPlayerProfile({ player, onClose }: SportsPlayerProfileProps) {
  const { lang, t } = useI18n();
  const { settings } = useSettings();
  const birthDate = player.dateOfBirth
    ? formatFusionFileDate(new Date(player.dateOfBirth), lang, settings.timezone)
    : t('未提供');

  return (
    <div className="sports-player-sheet-backdrop" onClick={onClose}>
      <aside
        className="sports-player-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('球員簡介')}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="sports-dialog-close" onClick={onClose} title={t('關閉球員簡介')}>
          <X size={18} />
        </button>
        <header>
          <span className="sports-player-portrait">
            {player.headshot ? <img src={player.headshot} alt="" /> : <UserRound size={34} />}
          </span>
          <div>
            <small>{t('球員簡介')}</small>
            <h2>{player.name}</h2>
            <p>{player.position || t('未提供')} · {player.country || t('未提供')}</p>
          </div>
        </header>
        <div className="sports-player-facts">
          <div><CalendarDays size={15} /><span>{t('出生日期')}</span><b>{birthDate}</b></div>
          <div><Ruler size={15} /><span>{t('身高')}</span><b>{player.displayHeight || t('未提供')}</b></div>
          <div><Scale size={15} /><span>{t('體重')}</span><b>{player.displayWeight || t('未提供')}</b></div>
          <div>
            <HeartPulse size={15} />
            <span>{t('健康狀態')}</span>
            <b className={player.available ? 'available' : 'unavailable'}>
              {t(player.available ? '可出賽' : '可能缺陣')}
            </b>
          </div>
        </div>
        <section>
          <h3>{t('傷病資訊')}</h3>
          <p>{player.injuries.length ? player.injuries.join(' · ') : t('可出賽')}</p>
        </section>
        {player.profileUrl && (
          <a href={player.profileUrl} target="_blank" rel="noreferrer noopener">
            ESPN <ExternalLink size={14} />
          </a>
        )}
      </aside>
    </div>
  );
}

