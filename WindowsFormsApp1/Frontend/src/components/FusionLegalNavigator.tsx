import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpenText,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  FileSearch,
  KeyRound,
  NotebookTabs,
  Save,
  Scale,
  Search,
  ShieldAlert,
  Trash2,
  WifiOff,
  X
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { formatFusionDate, formatFusionDateTime, formatFusionFileDate, formatFusionTime, localeForLanguage } from '../i18n/localeFormatting';
import { useSettings } from '../state/SettingsContext';
import {
  LEGAL_DOMAIN_LABELS,
  LEGAL_PROVISIONS,
  LEGAL_SOURCES,
  LEGAL_VERIFIED_AT,
  type LegalDomain
} from '../legal/legalCorpus';
import { analyzeLegalScenario, searchLegalProvisions, type LegalAnalysis } from '../legal/legalSearch';
import {
  genericLegalActions,
  genericLegalEvidence,
  legalArticleLabel,
  localizedLegalSummaryKey
} from '../legal/legalLocalization';

interface FusionLegalNavigatorProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

type LegalView = 'analysis' | 'library' | 'notes';

interface SavedLegalCase {
  id: string;
  createdAt: string;
  query: string;
  primaryDomain: LegalDomain | null;
  matches: Array<{ id: string; lawName: string; article: string; title: string }>;
}

const STORAGE_KEY = 'fusion-legal-cases-v1';

const SAMPLE_SCENARIOS = [
  '公司要求我每天加班卻沒有給加班費。',
  '網購商品到貨後想退貨，賣家說拆箱就不能退。',
  '房東在退租後沒有說明原因就不退押金。',
  '我收到通知說會員個資外洩，之後出現陌生登入。'
];

const loadSavedCases = (): SavedLegalCase[] => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedLegalCase[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string' && typeof item.query === 'string') : [];
  } catch {
    return [];
  }
};

const urgencyLabel = (analysis: LegalAnalysis) => analysis.urgency === 'urgent'
  ? '立即處理'
  : analysis.urgency === 'prompt'
    ? '儘快處理'
    : '一般整理';

export const FusionLegalNavigator: React.FC<FusionLegalNavigatorProps> = ({ open, onClose, accent }) => {
  const { t, lang } = useI18n();
  const { settings } = useSettings();
  const [view, setView] = useState<LegalView>('analysis');
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState<LegalAnalysis | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [domain, setDomain] = useState<LegalDomain | 'all'>('all');
  const [savedCases, setSavedCases] = useState<SavedLegalCase[]>(loadSavedCases);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCases)); } catch { /* local storage is optional */ }
  }, [savedCases]);

  const numberFormat = useMemo(
    () => new Intl.NumberFormat(localeForLanguage(lang), { style: 'percent', maximumFractionDigits: 0 }),
    [lang]
  );

  const filteredProvisions = useMemo(
    () => searchLegalProvisions(libraryQuery, domain),
    [domain, libraryQuery]
  );

  const evidenceItems = analysis && lang !== 'zh-TW' ? genericLegalEvidence : analysis?.evidence ?? [];
  const actionItems = analysis && lang !== 'zh-TW' ? genericLegalActions : analysis?.actions ?? [];

  const runAnalysis = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setAnalysis(analyzeLegalScenario(trimmed));
  };

  const saveAnalysis = () => {
    if (!analysis?.query || !analysis.matches.length) return;
    const next: SavedLegalCase = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      query: analysis.query,
      primaryDomain: analysis.primaryDomain,
      matches: analysis.matches.slice(0, 4).map((match) => ({
        id: match.provision.id,
        lawName: match.provision.lawName,
        article: match.provision.article,
        title: match.provision.title
      }))
    };
    setSavedCases((current) => [next, ...current].slice(0, 30));
  };

  const loadCase = (item: SavedLegalCase) => {
    setQuery(item.query);
    setAnalysis(analyzeLegalScenario(item.query));
    setView('analysis');
  };

  const navItems: Array<{ id: LegalView; label: string; icon: typeof FileSearch }> = [
    { id: 'analysis', label: '情境分析', icon: FileSearch },
    { id: 'library', label: '法規資料庫', icon: Database },
    { id: 'notes', label: '案件筆記', icon: NotebookTabs }
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="legal-nav-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={t('LexTaiwan 法律導航')}
        >
          <motion.section
            className="legal-nav-shell"
            style={{ '--legal-accent': accent } as React.CSSProperties}
            initial={{ opacity: 0, scale: 0.985, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: 8 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <header className="legal-nav-topbar">
              <div className="legal-brand">
                <span className="legal-brand-mark"><Scale size={23} /></span>
                <div><strong>{t('LexTaiwan 法律導航')}</strong><small>{t('台灣法規與情境分析')}</small></div>
              </div>
              <div className="legal-system-state">
                <span><WifiOff size={14} />{t('離線可用')}</span>
                <span><KeyRound size={14} />{t('無需 API 金鑰')}</span>
                <time>
                  <strong>{formatFusionTime(now, lang, settings.timezone, settings.clock24)}</strong>
                  <small>{formatFusionDate(now, lang, settings.timezone)}</small>
                </time>
              </div>
              <button className="legal-icon-button" type="button" onClick={onClose} aria-label={t('關閉')} title={t('關閉')}><X size={20} /></button>
            </header>

            <div className="legal-nav-layout">
              <nav className="legal-nav-sidebar" aria-label={t('LexTaiwan 法律導航')}>
                <div className="legal-nav-title"><span>{t('台灣法律')}</span><strong>{t('智慧法律工作台')}</strong></div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} type="button" className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>
                      <Icon size={17} /><span>{t(item.label)}</span>
                      {item.id === 'notes' && <small>{savedCases.length}</small>}
                    </button>
                  );
                })}
                <div className="legal-sidebar-foot">
                  <ShieldAlert size={17} />
                  <span>{t('資料會留在這台裝置')}</span>
                </div>
              </nav>

              <main className="legal-workspace">
                {view === 'analysis' && (
                  <div className="legal-analysis-view">
                    <section className="legal-intake">
                      <div className="legal-section-heading">
                        <div><span>{t('情境分析')}</span><h2>{t('描述發生了什麼事')}</h2></div>
                        <span className="legal-local-badge"><FileSearch size={14} />{t('本機可解釋檢索')}</span>
                      </div>
                      <textarea
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t('請包含人物關係、時間、對方做了什麼、你有哪些文件或訊息。')}
                        rows={4}
                      />
                      <div className="legal-examples">
                        <span>{t('範例情境')}</span>
                        {SAMPLE_SCENARIOS.map((sample) => (
                          <button key={sample} type="button" onClick={() => setQuery(t(sample))}>{t(sample)}</button>
                        ))}
                      </div>
                      <div className="legal-intake-actions">
                        <button className="legal-primary-action" type="button" disabled={!query.trim()} onClick={runAnalysis}><Search size={17} />{t('開始分析')}</button>
                        <button className="legal-secondary-action" type="button" onClick={() => { setQuery(''); setAnalysis(null); }}>{t('清除')}</button>
                      </div>
                    </section>

                    {!analysis && (
                      <section className="legal-empty-state">
                        <Scale size={42} />
                        <div><strong>{t('尚未分析')}</strong><p>{t('輸入具體情況後，系統會比對本機法規索引並說明命中原因。')}</p></div>
                      </section>
                    )}

                    {analysis && (
                      <section className="legal-results" aria-live="polite">
                        {analysis.safety.length > 0 && (
                          <div className="legal-safety-alert">
                            <ShieldAlert size={22} />
                            <div><strong>{t('安全優先')}</strong>{analysis.safety.map((item) => <p key={item}>{t(item)}</p>)}</div>
                          </div>
                        )}

                        <div className="legal-result-summary">
                          <div><span>{t('處理優先度')}</span><strong className={`urgency-${analysis.urgency}`}>{t(urgencyLabel(analysis))}</strong></div>
                          <div><span>{t('主要領域')}</span><strong>{analysis.primaryDomain ? t(LEGAL_DOMAIN_LABELS[analysis.primaryDomain]) : t('待補充資訊')}</strong></div>
                          <div><span>{t('相關法規')}</span><strong>{analysis.matches.length}</strong></div>
                          <button type="button" onClick={saveAnalysis} disabled={!analysis.matches.length}><Save size={16} />{t('儲存本次分析')}</button>
                        </div>

                        <div className="legal-result-grid">
                          <div className="legal-match-list">
                            <div className="legal-subhead"><BookOpenText size={17} /><strong>{t('可能涉及')}</strong></div>
                            {analysis.matches.map((match) => (
                              <article className="legal-match" key={match.provision.id}>
                                <header>
                                  <div><span>{t(match.label)}</span><strong>{t(match.provision.lawName)} · {legalArticleLabel(match.provision.article, lang)}</strong></div>
                                  <small>{t('相關程度')} {numberFormat.format(match.confidence)}</small>
                                </header>
                                <h3>{t(match.provision.title)}</h3>
                                <p>{lang === 'zh-TW' ? match.provision.summary : t(localizedLegalSummaryKey(match.provision.domain))}</p>
                                <div className="legal-reasons"><span>{t('命中原因')}</span>{lang === 'zh-TW' ? match.reasons.map((reason) => <small key={reason}>{reason}</small>) : <small>{t('情境詞與法規主題相符')}</small>}</div>
                                <a href={match.provision.sourceUrl} target="_blank" rel="noreferrer">{t('查看官方條文')}<ExternalLink size={13} /></a>
                              </article>
                            ))}
                          </div>
                          <div className="legal-check-columns">
                            <section>
                              <div className="legal-subhead"><FileSearch size={17} /><strong>{t('建議保留的證據')}</strong></div>
                              <ul>{evidenceItems.map((item) => <li key={item}><CheckCircle2 size={15} />{t(item)}</li>)}</ul>
                            </section>
                            <section>
                              <div className="legal-subhead"><Clock3 size={17} /><strong>{t('下一步清單')}</strong></div>
                              <ol>{actionItems.map((item, index) => <li key={item}><span>{index + 1}</span>{t(item)}</li>)}</ol>
                            </section>
                          </div>
                        </div>
                        <p className="legal-inline-disclaimer"><AlertTriangle size={15} />{t(analysis.disclaimer)}</p>
                      </section>
                    )}
                  </div>
                )}

                {view === 'library' && (
                  <div className="legal-library-view">
                    <div className="legal-section-heading">
                      <div><span>{t('法規資料庫')}</span><h2>{t('搜尋法律、條號或生活用語')}</h2></div>
                      <strong>{filteredProvisions.length} {t('條法規指引')}</strong>
                    </div>
                    <label className="legal-library-search"><Search size={17} /><input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder={t('搜尋法律、條號或生活用語')} /></label>
                    <div className="legal-domain-filter">
                      <button type="button" className={domain === 'all' ? 'active' : ''} onClick={() => setDomain('all')}>{t('全部領域')}</button>
                      {(Object.entries(LEGAL_DOMAIN_LABELS) as Array<[LegalDomain, string]>).map(([id, label]) => (
                        <button key={id} type="button" className={domain === id ? 'active' : ''} onClick={() => setDomain(id)}>{t(label)}</button>
                      ))}
                    </div>
                    <div className="legal-library-list">
                      {filteredProvisions.map((provision) => (
                        <article key={provision.id}>
                          <div><span>{t(LEGAL_DOMAIN_LABELS[provision.domain])}</span><strong>{t(provision.lawName)} · {legalArticleLabel(provision.article, lang)}</strong><h3>{t(provision.title)}</h3></div>
                          <p>{lang === 'zh-TW' ? provision.summary : t(localizedLegalSummaryKey(provision.domain))}</p>
                          <a href={provision.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${t('查看官方條文')} ${t(provision.lawName)} ${legalArticleLabel(provision.article, lang)}`}><ExternalLink size={15} /></a>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {view === 'notes' && (
                  <div className="legal-notes-view">
                    <div className="legal-section-heading"><div><span>{t('案件筆記')}</span><h2>{t('資料會留在這台裝置')}</h2></div><strong>{savedCases.length}</strong></div>
                    {!savedCases.length && <div className="legal-empty-state"><NotebookTabs size={40} /><strong>{t('尚無案件筆記')}</strong></div>}
                    <div className="legal-notes-list">
                      {savedCases.map((item) => (
                        <article key={item.id}>
                          <button className="legal-note-open" type="button" onClick={() => loadCase(item)}>
                            <span>{item.primaryDomain ? t(LEGAL_DOMAIN_LABELS[item.primaryDomain]) : t('待補充資訊')}</span>
                            <strong>{item.query}</strong>
                            <small>{t('建立時間')} · {formatFusionDateTime(new Date(item.createdAt), lang, settings.timezone, settings.clock24)}</small>
                            <div>{item.matches.slice(0, 3).map((match) => <em key={match.id}>{t(match.lawName)} {legalArticleLabel(match.article, lang)}</em>)}</div>
                          </button>
                          <button className="legal-note-delete" type="button" onClick={() => setSavedCases((current) => current.filter((saved) => saved.id !== item.id))} aria-label={t('刪除筆記')} title={t('刪除筆記')}><Trash2 size={16} /></button>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </main>

              <aside className="legal-source-panel">
                <section className="legal-disclaimer-panel">
                  <AlertTriangle size={18} />
                  <strong>{t('資訊用途')}</strong>
                  <p>{t('這是本機資訊整理，不是法律意見，也不會取代律師或主管機關的判斷。')}</p>
                </section>
                <section>
                  <div className="legal-subhead"><BookOpenText size={17} /><strong>{t('官方來源')}</strong></div>
                  <div className="legal-source-links">
                    {LEGAL_SOURCES.map((source) => (
                      <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span><strong>{t(source.name)}</strong><small>{t(source.authority)}</small></span><ExternalLink size={14} /></a>
                    ))}
                  </div>
                </section>
                <section className="legal-review-date">
                  <Clock3 size={17} />
                  <span>{t('最後檢核日期')}</span>
                  <strong>{formatFusionFileDate(new Date(LEGAL_VERIFIED_AT), lang, settings.timezone)}</strong>
                </section>
              </aside>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
