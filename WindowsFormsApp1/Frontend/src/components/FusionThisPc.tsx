import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Battery,
  Cpu,
  Download,
  Folder,
  Gauge,
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

  const storagePct = sys.storage && sys.storage.totalGB > 0 ? (sys.storage.usedGB / sys.storage.totalGB) * 100 : 0;

  const folders: Array<{ label: string; icon: LucideIcon; onClick?: () => void }> = [
    { label: '專案檔案', icon: Folder, onClick: onOpenFiles },
    { label: '使用者檔案', icon: User },
    { label: '下載', icon: Download },
    { label: '桌面', icon: Monitor }
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
                <span>本機</span>
              </div>
              <button type="button" className="set-close" onClick={onClose} title="關閉">
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
                  <Folder size={16} /> 開啟專案檔案
                </button>
              </section>

              {/* live specs */}
              <h3 className="pc-section-title">系統資訊（即時偵測）</h3>
              <div className="pc-spec-grid">
                <SpecCard icon={Cpu} label="處理器" value={sys.cores ? `${sys.cores} 核心` : '—'} sub="邏輯處理器" />
                <SpecCard icon={MemoryStick} label="記憶體" value={sys.memoryGB ? `${sys.memoryGB} GB` : '—'} sub="瀏覽器回報" />
                <SpecCard icon={Monitor} label="螢幕" value={sys.screen} sub={`縮放 ${sys.scalePercent}%`} />
                <SpecCard
                  icon={Battery}
                  label="電池"
                  value={sys.battery ? `${sys.battery.level}%` : '—'}
                  sub={sys.battery ? (sys.battery.charging ? '充電中' : '使用電池') : '無法讀取'}
                  bar={sys.battery ? sys.battery.level : undefined}
                />
                <SpecCard icon={Info} label="作業系統" value={sys.os} sub={sys.browser} />
                <SpecCard
                  icon={sys.online ? Wifi : Globe2}
                  label="網路"
                  value={sys.online ? '已連線' : '離線'}
                  sub={sys.connection ? sys.connection.toUpperCase() : '—'}
                />
              </div>

              {/* drives */}
              <h3 className="pc-section-title">裝置與磁碟機</h3>
              <div className="pc-drives">
                <div className="pc-drive">
                  <span className="pc-drive-icon"><HardDrive size={22} /></span>
                  <div className="pc-drive-body">
                    <div className="pc-drive-head">
                      <strong>本機磁碟 (C:)</strong>
                      <span>
                        {sys.storage
                          ? `可用 ${(sys.storage.totalGB - sys.storage.usedGB).toFixed(0)} GB／共 ${sys.storage.totalGB.toFixed(0)} GB`
                          : '計算中…'}
                      </span>
                    </div>
                    <span className="pc-bar">
                      <span className="pc-bar-fill" style={{ width: `${Math.max(3, Math.min(100, storagePct))}%` }} />
                    </span>
                  </div>
                </div>
                <div className="pc-drive">
                  <span className="pc-drive-icon"><Gauge size={22} /></span>
                  <div className="pc-drive-body">
                    <div className="pc-drive-head">
                      <strong>效能</strong>
                      <span>{sys.cores ? `${sys.cores} 核心` : ''} · {sys.online ? '線上' : '離線'}</span>
                    </div>
                    <span className="pc-bar">
                      <span className="pc-bar-fill" style={{ width: '42%' }} />
                    </span>
                  </div>
                </div>
              </div>

              {/* folders */}
              <h3 className="pc-section-title">資料夾</h3>
              <div className="pc-folders">
                {folders.map((f) => {
                  const Icon = f.icon;
                  return (
                    <button key={f.label} type="button" className="pc-folder" onClick={f.onClick}>
                      <Icon size={26} strokeWidth={1.7} />
                      <span>{f.label}</span>
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
