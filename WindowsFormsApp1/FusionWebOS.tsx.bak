import * as React from 'react';
import { FusionLabPanel } from './FusionLabPanel';
import { HtmlTextureViewport } from './HtmlTextureViewport';

/**
 * FUSION OS / MAIN SHELL
 * 保留原本 OS 架構：左側 Sidebar, 底部 HUD, 中央 Window Manager
 * 中央舞台升級為真正的 Three.js WebGL Viewport
 */

type AppId = 'canvas-lab' | 'piano' | 'database' | 'language' | 'terminal' | 'pc' | 'cosmic';

interface WindowState {
  id: AppId;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
}

const THEME = {
  bg: '#020617',
  window: 'rgba(15, 23, 42, 0.85)',
  accent: '#22d3ee',
  accentSecondary: '#c026d3',
  glass: 'rgba(255, 255, 255, 0.05)'
};

const APPS_CONFIG = [
  { id: 'canvas-lab', title: 'HTML Canvas Lab', icon: '📦' },
  { id: 'cosmic', title: 'Cosmic Gesture', icon: '🌌' },
  { id: 'piano', title: 'Piano Studio', icon: '🎹' },
  { id: 'database', title: 'Database SQL', icon: '🗄️' },
  { id: 'language', title: 'Language Lab', icon: '💻' },
  { id: 'terminal', title: 'Terminal', icon: '🐚' },
  { id: 'pc', title: 'Local PC Backup', icon: '💾' }
];

const CloseIcon = () => <span>✕</span>;
const MinusIcon = () => <span>─</span>;
const MaxIcon = () => <span>▢</span>;

const TerminalApp = () => (
  <div style={{ height: '100%', backgroundColor: 'rgba(2, 6, 23, 0.9)', padding: '20px', fontFamily: 'monospace', fontSize: '13px', color: '#22d3ee' }}>
    <div>FUSION SHELL v4.2.0</div>
    <div>Kernel: WinForms-Bridge</div>
    <div style={{ marginTop: '10px' }}>user@fusion:~$ <span style={{ width: '10px', height: '18px', backgroundColor: '#22d3ee', display: 'inline-block', verticalAlign: 'middle' }}></span></div>
  </div>
);

export default function FusionWebOS() {
  const [windows, setWindows] = React.useState<WindowState[]>([]);
  const [time, setTime] = React.useState(new Date().toLocaleTimeString());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const bringToFront = (id: AppId) => {
    setWindows(prev => {
      const maxZ = Math.max(0, ...prev.map(w => w.zIndex));
      return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
    });
  };

  const toggleWindow = (id: AppId) => {
    const exists = windows.find(w => w.id === id);
    if (exists) {
      setWindows(p => p.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
      if(exists.isMinimized) bringToFront(id);
    } else {
      const conf = APPS_CONFIG.find(c => c.id === id)!;
      setWindows(p => [...p, {
        id, title: conf.title, icon: conf.icon,
        isOpen: true, isMinimized: false, isMaximized: false,
        zIndex: p.length + 10,
        position: { x: p.length * 40 + 320, y: p.length * 40 + 100 }
      }]);
    }
  };

  const closeWindow = (id: string) => setWindows(p => p.filter(w => w.id !== id));

  const renderContent = (id: AppId) => {
    switch(id) {
      case 'canvas-lab': return <FusionLabPanel />;
      case 'terminal': return <TerminalApp />;
      default: return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>{id.toUpperCase()} MODULE OFFLINE</div>;
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif', background: THEME.bg, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      
      {/* 底部 3D 主視圖 - Three.js WebGL Viewport */}
      <HtmlTextureViewport />

      {/* UI Overlay - Pipeline/Status */}
      <div style={{ position: 'absolute', top: '40px', right: '40px', zIndex: 5, pointerEvents: 'none', textAlign: 'right' }}>
        <div style={{ fontSize: '10px', color: THEME.accent, fontWeight: 'bold', letterSpacing: '0.2em' }}>WEBGL RENDERER ACTIVE</div>
        <div style={{ fontSize: '24px', fontWeight: '900', color: 'white', marginTop: '4px' }}>HTML-IN-CANVAS ENGINE</div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'flex-end' }}>
             {['THREE.JS', 'WEBGL 2.0', 'CANVAS_TEXTURE'].map(t => (
               <span key={t} style={{ padding: '2px 8px', border: '1px solid ' + THEME.accent, borderRadius: '4px', fontSize: '9px', color: THEME.accent }}>{t}</span>
             ))}
        </div>
      </div>

      {/* Main Container */}
      <div style={{ flex: 1, position: 'relative', zIndex: 10, display: 'flex' }}>
        
        {/* Left Sidebar (App Shelf) */}
        <div style={{ width: '260px', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '12px', borderRight: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(34, 211, 238, 0.4)', letterSpacing: '0.3em', marginBottom: '16px', paddingLeft: '12px' }}>CORE SYSTEM</div>
          {APPS_CONFIG.map(app => (
            <div 
              key={app.id} 
              onClick={() => toggleWindow(app.id as AppId)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '16px', padding: '14px', borderRadius: '12px', 
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                {app.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#cbd5e1' }}>{app.title}</span>
                <span style={{ fontSize: '8px', color: THEME.accent, letterSpacing: '0.1em' }}>ACTIVE NODE</span>
              </div>
            </div>
          ))}
        </div>

        {/* Windows Workspace */}
        <div style={{ flex: 1, position: 'relative', padding: '32px', pointerEvents: 'none' }}>
          {windows.map(win => !win.isMinimized && (
            <div
              key={win.id}
              onMouseDown={() => bringToFront(win.id)}
              style={{ 
                zIndex: win.zIndex, position: 'absolute', pointerEvents: 'auto',
                width: win.isMaximized ? 'calc(100% - 64px)' : '980px',
                height: win.isMaximized ? 'calc(100% - 64px)' : '720px',
                left: win.isMaximized ? '32px' : `${win.position.x}px`,
                top: win.isMaximized ? '32px' : `${win.position.y}px`,
                display: 'flex', flexDirection: 'column', borderRadius: '20px', overflow: 'hidden',
                background: THEME.window, backdropFilter: 'blur(30px)', border: '1px solid rgba(34, 211, 238, 0.25)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Window Header */}
              <div style={{ height: '64px', background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{win.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: 'white', letterSpacing: '0.1em' }}>{win.title.toUpperCase()}</span>
                    <span style={{ fontSize: '8px', color: '#22d3ee', fontWeight: 'bold' }}>SYSTEM PRIORITY : HIGH</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>
                  <div onClick={(e) => { e.stopPropagation(); toggleWindow(win.id); }}><MinusIcon /></div>
                  <div onClick={(e) => { e.stopPropagation(); setWindows(p => p.map(w => w.id === win.id ? {...w, isMaximized: !w.isMaximized} : w)); }}><MaxIcon /></div>
                  <div onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }} style={{ color: '#f43f5e' }}><CloseIcon /></div>
                </div>
              </div>
              {/* Window Body */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {renderContent(win.id)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer HUD (Taskbar) */}
      <div style={{ height: '80px', background: 'rgba(2, 6, 23, 0.98)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: THEME.accent, boxShadow: '0 0 10px ' + THEME.accent }}></div>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.2em' }}>FUSION OS</span>
          </div>
          <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)' }}></div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {windows.map(win => (
              <div 
                key={win.id}
                onClick={() => { if(win.isMinimized) toggleWindow(win.id); bringToFront(win.id); }}
                style={{ 
                  padding: '10px 24px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.1em',
                  background: !win.isMinimized ? 'rgba(34, 211, 238, 0.15)' : 'rgba(255,255,255,0.03)',
                  color: !win.isMinimized ? '#22d3ee' : '#64748b',
                  border: '1px solid',
                  borderColor: !win.isMinimized ? 'rgba(34, 211, 238, 0.4)' : 'transparent',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {win.title.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ color: 'white', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '14px' }}>{time}</div>
           <div style={{ color: THEME.accent, fontSize: '9px', fontWeight: 'bold', marginTop: '4px' }}>HYBRID CORE ACTIVE</div>
        </div>
      </div>
    </div>
  );
}
