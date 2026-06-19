import { Activity, Database, Gauge } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import type { SportsPredictionEvidence as PredictionEvidence } from '../../sports/sportsEvidence';

interface SportsPredictionEvidenceProps {
  evidence: PredictionEvidence;
}

export function SportsPredictionEvidence({ evidence }: SportsPredictionEvidenceProps) {
  const { t } = useI18n();
  const coverage = Math.round(evidence.coverage * 100);

  return (
    <section className="sports-evidence-panel">
      <header className="sports-subhead">
        <Gauge size={16} />
        {t('預測依據')}
        <span className="sports-evidence-coverage">
          <Database size={12} />
          {t('資料覆蓋率')} {coverage}%
        </span>
      </header>
      <div className="sports-evidence-meter" aria-label={`${t('資料覆蓋率')} ${coverage}%`}>
        <i style={{ width: `${coverage}%` }} />
      </div>
      {evidence.factors.length ? (
        <div className="sports-evidence-grid">
          {evidence.factors.map((factor) => {
            const direction = factor.impact > 1 ? 'home' : factor.impact < -1 ? 'away' : 'neutral';
            const directionLabel = direction === 'home'
              ? '有利主隊'
              : direction === 'away'
                ? '有利客隊'
                : '中性';
            return (
              <article key={factor.id} className={`sports-evidence-factor ${direction}`}>
                <div className="sports-evidence-factor-head">
                  <strong>{t(factor.label)}</strong>
                  <span>{t(directionLabel)}</span>
                </div>
                <div className="sports-evidence-values">
                  <b>{factor.homeValue}</b>
                  <span><Activity size={11} /> {factor.impact > 0 ? '+' : ''}{factor.impact.toFixed(1)}</span>
                  <b>{factor.awayValue}</b>
                </div>
                <div className="sports-evidence-meta">
                  <span>{t('資料源')}: {factor.source}</span>
                  <span>{t('信心')} {Math.round(factor.confidence * 100)}%</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="sports-detail-empty">{t('暫無詳細資料')}</p>
      )}
      <p className="sports-evidence-note">
        {t('資料越完整，模型信心越高；所有加權都有上限。')}
      </p>
    </section>
  );
}

