import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpenText,
  CircuitBoard,
  Clock3,
  Code2,
  Database,
  FolderInput,
  Gamepad2,
  Hand,
  Headphones,
  KeyboardMusic,
  Map,
  Play,
  Search,
  Sparkles,
  Terminal,
  UserRound,
  Video,
  Wrench,
  X,
  type LucideIcon
} from 'lucide-react';
import { APP_CENTER_APPS, type AppCategory, type FusionApp } from '../data/fusionApps';
import type { AppId } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface FusionAppCenterProps {
  open: boolean;
  onClose: () => void;
  accent: string;
  onLaunch: (app: FusionApp) => void;
}

const CATEGORY_LABELS: Array<{ id: 'all' | AppCategory; label: string }> = [
  { id: 'all', label: '所有應用程式' },
  { id: 'creative', label: '創作' },
  { id: 'development', label: '工程' },
  { id: 'data', label: '資料' },
  { id: 'utilities', label: '實用工具' },
  { id: 'files', label: '檔案' },
  { id: 'system', label: '個人' }
];

const APP_ICONS: Partial<Record<AppId, LucideIcon>> = {
  circuit: CircuitBoard,
  piano: KeyboardMusic,
  flashcards: BookOpenText,
  media: Video,
  wav: Headphones,
  cosmic: Hand,
  metro: Map,
  dev: Code2,
  db: Database,
  cmd: Terminal,
  toolbox: Wrench,
  user: UserRound,
  add: FolderInput,
  game: Gamepad2
};

const RECENT_KEY = 'fusion-app-center-recent-v1';

export const FusionAppCenter: React.FC<FusionAppCenterProps> = ({ open, onClose, accent, onLaunch }) => {
  const { t, tf } = useI18n();
  const [category, setCategory] = useState<'all' | AppCategory>('all');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<AppId[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]') as AppId[];
    } catch {
      return [];
    }
  });
  const searchRef = useRef<HTMLInputElement>(null);

  const featured = APP_CENTER_APPS.find((app) => app.id === 'circuit') ?? APP_CENTER_APPS[0];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return APP_CENTER_APPS.filter((app) => {
      const categoryMatch = category === 'all' || app.category === category;
      const queryMatch = !normalized || [
        t(app.title),
        t(app.subtitle),
        t(app.description),
        ...app.tags.map(t)
      ].join(' ').toLowerCase().includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [category, query, t]);

  const recentApps = recent
    .map((id) => APP_CENTER_APPS.find((app) => app.id === id))
    .filter((app): app is FusionApp => Boolean(app))
    .slice(0, 4);

  const launch = (app: FusionApp) => {
    const next = [app.id, ...recent.filter((id) => id !== app.id)].slice(0, 8);
    setRecent(next);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    onLaunch(app);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="app-center-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ ['--accent' as string]: accent } as React.CSSProperties}
        >
          <motion.div
            className="app-center"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="app-center-topbar">
              <div className="app-center-brand">
                <span><Sparkles size={21} /></span>
                <div><strong>{t('應用程式中心')}</strong><small>{t('Fusion 應用程式與工作室')}</small></div>
              </div>
              <label className="app-center-search">
                <Search size={17} />
                <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('搜尋應用程式、工具與工作室')} />
                <kbd>Ctrl K</kbd>
              </label>
              <button type="button" className="app-center-close" onClick={onClose} title={t('關閉應用程式中心')}><X size={19} /></button>
            </header>

            <div className="app-center-body">
              <nav className="app-center-categories">
                <span>{t('應用程式庫')}</span>
                {CATEGORY_LABELS.map((item) => (
                  <button key={item.id} type="button" className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>
                    <i />{t(item.label)}
                    <small>{item.id === 'all' ? APP_CENTER_APPS.length : APP_CENTER_APPS.filter((app) => app.category === item.id).length}</small>
                  </button>
                ))}
                {recentApps.length > 0 && (
                  <section className="app-center-recent">
                    <span><Clock3 size={14} /> {t('最近使用')}</span>
                    {recentApps.map((app) => {
                      const Icon = APP_ICONS[app.id] ?? Sparkles;
                      return (
                        <button key={app.id} type="button" onClick={() => launch(app)}>
                          <Icon size={16} /><b>{t(app.title)}</b>
                        </button>
                      );
                    })}
                  </section>
                )}
              </nav>

              <main className="app-center-content">
                {category === 'all' && !query && featured && (
                  <section className="app-center-featured" style={{ ['--app-color' as string]: featured.color } as React.CSSProperties}>
                    <div className="app-center-feature-copy">
                      <span><CircuitBoard size={16} /> {t('精選工程工作區')}</span>
                      <h2>{t(featured.title)}</h2>
                      <p>{t(featured.description)}</p>
                      <div>
                        <button type="button" onClick={() => launch(featured)}><Play size={16} fill="currentColor" /> {t('開啟工作區')}</button>
                        <small>{t('即時直流求解器 · 電表 · 範本 · 專案檔案')}</small>
                      </div>
                    </div>
                    <div className="app-center-feature-visual" aria-hidden="true">
                      <div className="feature-orbit orbit-one" />
                      <div className="feature-orbit orbit-two" />
                      <div className="feature-chip"><CircuitBoard size={52} /></div>
                      <span className="feature-node n1" />
                      <span className="feature-node n2" />
                      <span className="feature-node n3" />
                    </div>
                  </section>
                )}

                <div className="app-center-section-head">
                  <div><strong>{t(category === 'all' ? '應用程式庫' : CATEGORY_LABELS.find((item) => item.id === category)?.label ?? '應用程式庫')}</strong><span>{tf('{0} 個可用', filtered.length)}</span></div>
                  <p>{t('不必擴充桌面 Dock，即可啟動任何工作區。')}</p>
                </div>

                <section className="app-center-grid">
                  {filtered.map((app, index) => {
                    const Icon = APP_ICONS[app.id] ?? Sparkles;
                    return (
                      <motion.button
                        key={app.id}
                        type="button"
                        className={`app-center-card ${app.featured ? 'featured' : ''}`}
                        style={{ ['--app-color' as string]: app.color } as React.CSSProperties}
                        onClick={() => launch(app)}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.025, 0.25) }}
                      >
                        <span className="app-center-card-icon"><Icon size={25} /></span>
                        <span className="app-center-card-copy">
                          <strong>{t(app.title)}</strong>
                          <small>{t(app.subtitle)}</small>
                          <p>{t(app.description)}</p>
                          <span>{app.tags.slice(0, 3).map((tag) => <i key={tag}>{t(tag)}</i>)}</span>
                        </span>
                        <span className="app-center-card-status">{t(app.status)}</span>
                        <ArrowRight className="app-center-card-arrow" size={18} />
                      </motion.button>
                    );
                  })}
                  {!filtered.length && (
                    <div className="app-center-empty">
                      <Search size={32} />
                      <strong>{t('找不到應用程式')}</strong>
                      <span>{t('請嘗試其他分類或搜尋字詞。')}</span>
                    </div>
                  )}
                </section>
              </main>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
