import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Battery,
  Cpu,
  Download,
  Folder,
  Globe2,
  HardDrive,
  Info,
  MemoryStick,
  Monitor,
  Server,
  User,
  Wifi,
  X,
  type LucideIcon
} from 'lucide-react';
import { useSystemInfo } from '../hooks/useSystemInfo';
import { useSystemMetrics } from '../hooks/useSystemMetrics';
import { useI18n } from '../i18n/I18nContext';

// Task-Manager-style live area graph.
function Sparkline({ values, max, color }: { values: number[]; max: number; color: string }) {
  const W = 120;
  const H = 40;
  const safeMax = max || 1;
  const line = values
    .map((v, i) => {
      const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * W;
      const y = H - Math.max(0, Math.min(1, v / safeMax)) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const area = values.length ? `0,${H} ${line} ${W},${H}` : '';
  return (
    <svg className="pc-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={area} fill={color} opacity={0.16} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function PerfCard({
  icon: Icon,
  label,
  value,
  sub,
  values,
  max,
  color
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  values: number[];
  max: number;
  color: string;
}) {
  return (
    <div className="pc-perf-card">
      <div className="pc-perf-head">
        <span className="pc-perf-icon" style={{ color }}>
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <span className="pc-perf-label">{label}</span>
        <strong className="pc-perf-value">{value}</strong>
      </div>
      <span className="pc-perf-sub">{sub}</span>
      <Sparkline values={values} max={max} color={color} />
    </div>
  );
}

interface FusionThisPcProps {
  open: boolean;
  onClose: () => void;
  accent: string;
  onOpenFiles: () => void;
}

function SpecCard({
  icon: Icon,
  label,
  value,
  sub,
  bar
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  bar?: number; // 0..100
}) {
  return (
    <div className="pc-spec">
      <span className="pc-spec-icon">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <div className="pc-spec-body">
        <span className="pc-spec-label">{label}</span>
        <strong className="pc-spec-value">{value}</strong>
        {sub && <span className="pc-spec-sub">{sub}</span>}
        {typeof bar === 'number' && (
          <span className="pc-bar">
            <span className="pc-bar-fill" style={{ width: `${Math.max(2, Math.min(100, bar))}%` }} />
          </span>
        )}
      </div>
    </div>
  );
}

export const FusionThisPc: React.FC<FusionThisPcProps> = ({ open, onClose, accent, onOpenFiles }) => {
  const sys = useSystemInfo();
  const metrics = useSystemMetrics(open);
  const { t, tf } = useI18n();

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

  // Disk: real host figures if available, otherwise the browser storage estimate.
  const diskUsed = metrics.disk ? metrics.disk.usedGB : sys.storage?.usedGB ?? 0;
  const diskTotal = metrics.disk ? metrics.disk.totalGB : sys.storage?.totalGB ?? 0;
  const diskPct = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0;

  const folders: Array<{ label: string; icon: LucideIcon; onClick?: () => void }> = [
    { label: '專案檔案', icon: Folder, onClick: onOpenFiles },
    { label: '使用者檔案', icon: User, onClick: onOpenFiles },
    { label: '下載', icon: Download, onClick: onOpenFiles },
    { label: '桌面', icon: Monitor, onClick: onOpenFiles }
  ];

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
            className="set-panel pc-panel"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="set-topbar">
              <div className="set-title">
                <Server size={20} strokeWidth={1.9} />
                <span>{t('本機')}</span>
              </div>
              <button type="button" className="set-close" onClick={onClose} title={t('關閉')}>
                <X size={18} />
              </button>
            </header>

            <div className="pc-scroll">
              {/* hero */}
              <section className="pc-hero">
                <span className="pc-hero-icon">
                  <Server size={42} strokeWidth={1.5} />
                </span>
                <div className="pc-hero-text">
                  <strong>{sys.device || sys.os}</strong>
                  <span>{sys.os} · FUSION OS 1.0</span>
                  <small>{sys.arch ? `${sys.arch} · ` : ''}{sys.browser}</small>
                </div>
                <button type="button" className="pc-hero-action" onClick={onOpenFiles}>
                  <Folder size={16} /> {t('開啟專案檔案')}
                </button>
              </section>

              {/* live specs */}
              <h3 className="pc-section-title">{t('系統資訊（即時偵測）')}</h3>
              <div className="pc-spec-grid">
                <SpecCard icon={Cpu} label={t('處理器')} value={sys.cores ? tf('{0} 核心', sys.cores) : '—'} sub={t('邏輯處理器')} />
                <SpecCard icon={MemoryStick} label={t('記憶體')} value={sys.memoryGB ? `${sys.memoryGB} GB` : '—'} sub={t('瀏覽器回報')} />
                <SpecCard icon={Monitor} label={t('螢幕')} value={sys.screen} sub={tf('縮放 {0}%', sys.scalePercent)} />
                <SpecCard
                  icon={Battery}
                  label={t('電池')}
                  value={sys.battery ? `${sys.battery.level}%` : '—'}
                  sub={sys.battery ? (sys.battery.charging ? t('充電中') : t('使用電池')) : t('無法讀取')}
                  bar={sys.battery ? sys.battery.level : undefined}
                />
                <SpecCard icon={Info} label={t('作業系統')} value={sys.os} sub={sys.browser} />
                <SpecCard
                  icon={sys.online ? Wifi : Globe2}
                  label={t('網路')}
                  value={sys.online ? t('已連線') : t('離線')}
                  sub={sys.connection ? sys.connection.toUpperCase() : '—'}
                />
              </div>

              {/* live performance (Task-Manager style) */}
              <h3 className="pc-section-title">{t('效能（即時更新）')}{metrics.hasHost ? ` · ${t('主機真實數據')}` : ''}</h3>
              <div className="pc-perf">
                <PerfCard
                  icon={Cpu}
                  label={t('CPU 使用率')}
                  value={metrics.cpu != null ? `${metrics.cpu.toFixed(0)}%` : '—'}
                  sub={metrics.hasHost ? tf('{0} 核心 · 即時', sys.cores ?? '') : t('需主機支援')}
                  values={metrics.cpuHistory}
                  max={100}
                  color={accent}
                />
                <PerfCard
                  icon={MemoryStick}
                  label={t('記憶體')}
                  value={metrics.ram ? `${metrics.ram.pct.toFixed(0)}%` : metrics.heapMB != null ? `${metrics.heapMB.toFixed(0)} MB` : '—'}
                  sub={metrics.ram ? `${metrics.ram.usedGB.toFixed(1)}／${metrics.ram.totalGB.toFixed(1)} GB` : t('應用程式記憶體')}
                  values={metrics.ramHistory}
                  max={100}
                  color="#b65cff"
                />
                <PerfCard
                  icon={Activity}
                  label={t('畫面更新率')}
                  value={`${metrics.fps} FPS`}
                  sub={t('即時繪製效能')}
                  values={metrics.fpsHistory}
                  max={120}
                  color="#36efc5"
                />
              </div>

              {/* storage */}
              <h3 className="pc-section-title">{t('儲存空間')}</h3>
              <div className="pc-drives">
                <div className="pc-drive">
                  <span className="pc-drive-icon"><HardDrive size={22} /></span>
                  <div className="pc-drive-body">
                    <div className="pc-drive-head">
                      <strong>{t('本機磁碟 (C:)')}</strong>
                      <span>
                        {diskTotal > 0
                          ? tf('可用 {0} GB／共 {1} GB', (diskTotal - diskUsed).toFixed(0), diskTotal.toFixed(0)) +
                            (metrics.hasHost ? t('（真實）') : t('（估計）'))
                          : t('計算中…')}
                      </span>
                    </div>
                    <span className="pc-bar">
                      <span className="pc-bar-fill" style={{ width: `${Math.max(3, Math.min(100, diskPct))}%` }} />
                    </span>
                  </div>
                </div>
              </div>

              {/* folders */}
              <h3 className="pc-section-title">{t('資料夾')}</h3>
              <div className="pc-folders">
                {folders.map((f) => {
                  const Icon = f.icon;
                  return (
                    <button key={f.label} type="button" className="pc-folder" onClick={f.onClick}>
                      <Icon size={26} strokeWidth={1.7} />
                      <span>{t(f.label)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
