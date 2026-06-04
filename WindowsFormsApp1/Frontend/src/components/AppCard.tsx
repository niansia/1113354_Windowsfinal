import React from 'react';
import { motion } from 'framer-motion';
import { AppConfig } from '../types';
import { Monitor, Folder, Piano, Clapperboard, AudioWaveform, Hand, FileUser, Plus, Code, Wrench, Database, Globe, Gamepad2, Terminal, Settings, Map } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

const ICON_MAP: Record<string, any> = {
  PC: Monitor,
  DIR: Folder,
  '88': Piano,
  VID: Clapperboard,
  WAV: AudioWaveform,
  COS: Hand,
  MAP: Map,
  USR: FileUser,
  '+': Plus,
  DEV: Code,
  TOOL: Wrench,
  DB: Database,
  WEB: Globe,
  GAME: Gamepad2,
  CMD: Terminal,
  SET: Settings,
};

interface AppCardProps {
  app: AppConfig;
  isActive: boolean;
  position: number;
  status?: string;
  onClick: () => void;
}

export const AppCard: React.FC<AppCardProps> = ({ app, isActive, position, status, onClick }) => {
  const Icon = ICON_MAP[app.glyph] || Monitor;
  const { t } = useI18n();
  
  const isGestureActive = status === 'PINCH_CONTROL' || status === 'PALM_SWIPE' || status === 'INDEX_SWIPE';

  return (
    <motion.div
      onClick={onClick}
      initial={false}
      animate={{
        x: position * 280,
        scale: isActive ? (isGestureActive ? 1.15 : 1.1) : 0.8,
        opacity: Math.max(0.1, 1 - Math.abs(position) * 0.4),
        rotateY: position * -25,
        z: isActive ? 100 : -100,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`
        absolute w-64 h-96 cursor-pointer flex flex-col items-center justify-center
        rounded-[32px] glass-panel p-8 select-none
        ${isActive ? 'border-fusion-accent/60 shadow-[0_0_60px_rgba(34,211,238,0.3)]' : 'border-white/5'}
        ${isActive && isGestureActive ? 'ring-2 ring-fusion-accent/40 ring-offset-8 ring-offset-transparent' : ''}
      `}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Target Lock UI */}
      {isActive && isGestureActive && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-fusion-accent shadow-[0_0_10px_#22d3ee]" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-fusion-accent shadow-[0_0_10px_#22d3ee]" />
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-fusion-accent shadow-[0_0_10px_#22d3ee]" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-fusion-accent shadow-[0_0_10px_#22d3ee]" />
        </div>
      )}

      {/* Icon Section */}
      <div 
        className="w-24 h-24 rounded-2xl flex items-center justify-center mb-8 relative"
        style={{ 
          background: `linear-gradient(135deg, ${app.color}44, ${app.color}11)`,
          border: `1px solid ${app.color}44`
        }}
      >
        <Icon className="w-12 h-12" style={{ color: app.color }} />
        {isActive && (
          <div 
            className={`absolute inset-0 rounded-2xl animate-pulse blur-xl transition-opacity duration-500 ${isGestureActive ? 'opacity-60' : 'opacity-30'}`}
            style={{ backgroundColor: app.color }}
          />
        )}
      </div>

      {/* Info Section */}
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black text-white tracking-tight">{t(app.title)}</h3>
        <p className="text-[10px] font-bold text-fusion-accent tracking-[0.2em] uppercase opacity-60">
          {isActive && isGestureActive ? t('目標已鎖定') : t('節點協定作用中')}
        </p>
        <p className="text-xs text-slate-400 mt-4 leading-relaxed px-2 line-clamp-3">
          {t(app.description)}
        </p>
      </div>

      {/* Interaction Hint */}
      {isActive && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-12 flex flex-col items-center"
        >
          <div className={`w-1 h-1 bg-fusion-accent rounded-full animate-bounce mb-1 ${isGestureActive ? 'scale-150 shadow-[0_0_10px_#22d3ee]' : ''}`} />
          <span className="text-[9px] font-black text-fusion-accent tracking-[0.3em] uppercase">
            {isGestureActive ? t('空中控制啟用') : t('準備啟動')}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};
