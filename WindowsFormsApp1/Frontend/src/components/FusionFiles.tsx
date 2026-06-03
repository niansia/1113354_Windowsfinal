import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronRight,
  Download,
  File as FileIcon,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  List as ListIcon,
  Music,
  RefreshCw,
  User,
  X,
  type LucideIcon
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface FusionFilesProps {
  open: boolean;
  onClose: () => void;
  accent: string;
}

interface VNode {
  name: string;
  type: 'folder' | 'file';
  size?: number;
  modified?: string;
  children?: VNode[];
}

interface Entry {
  name: string;
  isDir: boolean;
  size?: number;
  modified?: string;
  vnode?: VNode;
  handle?: any;
}

// A virtual sample project tree shown by default ("存放舊作品與新作品的預設資料夾").
const VIRTUAL_ROOT: VNode = {
  name: '專案檔案',
  type: 'folder',
  children: [
    {
      name: '舊作品',
      type: 'folder',
      modified: '2025-12-10',
      children: [
        { name: '期中專案', type: 'folder', children: [{ name: 'main.cs', type: 'file', size: 18234 }, { name: 'README.md', type: 'file', size: 1204 }] },
        { name: '小遊戲', type: 'folder', children: [{ name: 'game.unity', type: 'file', size: 90233 }] },
        { name: '報告.docx', type: 'file', size: 233012, modified: '2025-11-02' }
      ]
    },
    {
      name: '新作品',
      type: 'folder',
      modified: '2026-06-01',
      children: [
        { name: 'FusionOS', type: 'folder', children: [{ name: 'Form1.cs', type: 'file', size: 142890 }, { name: 'Frontend', type: 'folder', children: [{ name: 'App.tsx', type: 'file', size: 3204 }] }] },
        { name: '展示影片.mp4', type: 'file', size: 48201233, modified: '2026-05-28' }
      ]
    },
    { name: '文件', type: 'folder', children: [{ name: '筆記.txt', type: 'file', size: 5120 }, { name: '簡報.pdf', type: 'file', size: 1820233 }] },
    { name: '圖片', type: 'folder', children: [{ name: 'hero.png', type: 'file', size: 920233 }, { name: 'logo.svg', type: 'file', size: 12033 }] },
    { name: 'README.md', type: 'file', size: 2048, modified: '2026-06-03' }
  ]
};

function formatSize(bytes?: number): string {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function iconFor(name: string, isDir: boolean): LucideIcon {
  if (isDir) return Folder;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'cs', 'html', 'css', 'json', 'unity'].includes(ext)) return FileCode;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return ImageIcon;
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return Music;
  if (['mp4', 'mov', 'mkv', 'avi'].includes(ext)) return Music;
  if (['txt', 'md', 'pdf', 'doc', 'docx'].includes(ext)) return FileText;
  return FileIcon;
}

const supportsFSA = typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';

export const FusionFiles: React.FC<FusionFilesProps> = ({ open, onClose, accent }) => {
  const { t, tf } = useI18n();
  const [mode, setMode] = useState<'virtual' | 'real'>('virtual');
  const [vstack, setVstack] = useState<VNode[]>([VIRTUAL_ROOT]);
  const [rstack, setRstack] = useState<any[]>([]);
  const [rentries, setRentries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  // Load real directory entries whenever the real stack changes.
  useEffect(() => {
    if (mode !== 'real' || rstack.length === 0) return;
    const dir = rstack[rstack.length - 1];
    let alive = true;
    setLoading(true);
    (async () => {
      const out: Entry[] = [];
      try {
        for await (const [name, handle] of (dir as any).entries()) {
          const isDir = handle.kind === 'directory';
          let size: number | undefined;
          let modified: string | undefined;
          if (!isDir) {
            try {
              const file = await handle.getFile();
              size = file.size;
              modified = new Date(file.lastModified).toLocaleDateString('zh-TW');
            } catch {
              /* ignore unreadable file */
            }
          }
          out.push({ name, isDir, size, modified, handle });
        }
      } catch {
        /* permission revoked / unreadable */
      }
      out.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
      if (alive) {
        setRentries(out);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, rstack]);

  const entries: Entry[] = useMemo(() => {
    if (mode === 'real') return rentries;
    const current = vstack[vstack.length - 1];
    const kids = current.children ?? [];
    return [...kids]
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1))
      .map((n) => ({ name: n.name, isDir: n.type === 'folder', size: n.size, modified: n.modified, vnode: n }));
  }, [mode, rentries, vstack]);

  const crumbs = useMemo(() => {
    if (mode === 'real') return rstack.map((h: any) => h.name as string);
    return vstack.map((n) => n.name);
  }, [mode, rstack, vstack]);

  const openEntry = (entry: Entry) => {
    if (!entry.isDir) {
      setSelected(entry.name);
      return;
    }
    if (mode === 'real') {
      setRstack((prev) => [...prev, entry.handle]);
    } else if (entry.vnode) {
      setVstack((prev) => [...prev, entry.vnode as VNode]);
    }
    setSelected(null);
  };

  const goCrumb = (index: number) => {
    if (mode === 'real') setRstack((prev) => prev.slice(0, index + 1));
    else setVstack((prev) => prev.slice(0, index + 1));
    setSelected(null);
  };

  const goBack = () => {
    if (mode === 'real') {
      if (rstack.length > 1) setRstack((prev) => prev.slice(0, -1));
      else goVirtual();
    } else if (vstack.length > 1) {
      setVstack((prev) => prev.slice(0, -1));
    }
    setSelected(null);
  };

  const goVirtual = () => {
    setMode('virtual');
    setVstack([VIRTUAL_ROOT]);
    setRstack([]);
    setRentries([]);
    setSelected(null);
  };

  const pickRealFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      setMode('real');
      setRstack([handle]);
      setSelected(null);
    } catch {
      /* user cancelled */
    }
  };

  const sideItems: Array<{ label: string; icon: LucideIcon; onClick: () => void; active: boolean }> = [
    { label: '專案檔案（範例）', icon: Folder, onClick: goVirtual, active: mode === 'virtual' },
    ...(supportsFSA
      ? [
          { label: '使用者資料夾', icon: User, onClick: pickRealFolder, active: false },
          { label: '下載', icon: Download, onClick: pickRealFolder, active: false },
          { label: '開啟本機資料夾', icon: HardDrive, onClick: pickRealFolder, active: false }
        ]
      : [])
  ];

  const selectedEntry = entries.find((e) => e.name === selected);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="set-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          style={{ ['--accent' as string]: accent } as React.CSSProperties}
        >
          <motion.div
            className="set-panel files-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="set-topbar">
              <div className="set-title">
                <FolderOpen size={20} strokeWidth={1.9} />
                <span>{t('專案檔案')}</span>
              </div>
              <button type="button" className="files-open-btn" onClick={pickRealFolder} disabled={!supportsFSA} title={supportsFSA ? t('瀏覽本機真實資料夾') : t('此環境不支援')}>
                <FolderOpen size={15} /> {t('開啟本機資料夾')}
              </button>
              <button type="button" className="set-close" onClick={onClose} title={t('關閉')}>
                <X size={18} />
              </button>
            </header>

            <div className="files-body">
              <nav className="files-side">
                <span className="files-side-label">{t('快速存取')}</span>
                {sideItems.map((it) => {
                  const Icon = it.icon;
                  return (
                    <button key={it.label} type="button" className={it.active ? 'active' : ''} onClick={it.onClick}>
                      <Icon size={18} strokeWidth={1.8} />
                      <span>{t(it.label)}</span>
                    </button>
                  );
                })}
                {mode === 'real' && (
                  <button type="button" className="active">
                    <HardDrive size={18} strokeWidth={1.8} />
                    <span>{rstack[0]?.name ?? t('本機資料夾')}</span>
                  </button>
                )}
              </nav>

              <div className="files-main">
                <div className="files-toolbar">
                  <button type="button" className="files-back" onClick={goBack} disabled={crumbs.length <= 1 && mode === 'virtual'} title={t('返回')}>
                    <ArrowLeft size={18} />
                  </button>
                  <div className="files-crumbs">
                    {crumbs.map((c, i) => (
                      <span key={`${c}-${i}`} className="files-crumb">
                        <button type="button" onClick={() => goCrumb(i)}>{t(c)}</button>
                        {i < crumbs.length - 1 && <ChevronRight size={14} />}
                      </span>
                    ))}
                  </div>
                  <div className="files-tools">
                    <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title={t('格狀檢視')}>
                      <LayoutGrid size={17} />
                    </button>
                    <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title={t('清單檢視')}>
                      <ListIcon size={17} />
                    </button>
                    {mode === 'real' && (
                      <button type="button" onClick={() => setRstack((p) => [...p])} title={t('重新整理')}>
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className={`files-listing ${view}`}>
                  {loading && <div className="files-empty">{t('讀取中…')}</div>}
                  {!loading && entries.length === 0 && <div className="files-empty">{t('此資料夾是空的')}</div>}
                  {!loading &&
                    entries.map((entry) => {
                      const Icon = iconFor(entry.name, entry.isDir);
                      return (
                        <button
                          key={entry.name}
                          type="button"
                          className={`files-item ${entry.isDir ? 'is-dir' : ''} ${selected === entry.name ? 'is-selected' : ''}`}
                          onClick={() => (entry.isDir ? openEntry(entry) : setSelected(entry.name))}
                          onDoubleClick={() => openEntry(entry)}
                        >
                          <span className="files-item-icon">
                            <Icon size={view === 'grid' ? 30 : 20} strokeWidth={1.7} />
                          </span>
                          <span className="files-item-name">{t(entry.name)}</span>
                          <span className="files-item-meta">{entry.isDir ? t('資料夾') : formatSize(entry.size)}</span>
                        </button>
                      );
                    })}
                </div>

                <div className="files-statusbar">
                  <span>{tf('{0} 個項目', entries.length)}{selectedEntry ? ` · ${tf('已選取「{0}」', selectedEntry.name)}` : ''}</span>
                  <span>{mode === 'real' ? t('本機資料夾（真實）') : t('範例專案（虛擬）')}{!supportsFSA && mode === 'virtual' ? ` · ${t('此環境不支援開啟真實資料夾')}` : ''}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
