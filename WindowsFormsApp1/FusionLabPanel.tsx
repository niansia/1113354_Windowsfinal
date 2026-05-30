import * as React from 'react';
import { LiquidGlassSlider } from './LiquidGlassSlider';
import { HtmlTextureCube } from './HtmlTextureCube';
import { HtmlCanvasPipeline } from './HtmlCanvasPipeline';

/**
 * FusionLabPanel.tsx
 * HTML-IN-CANVAS LAB 主面板組件
 */

const THEME = {
  accent: '#22d3ee',
  accentSecondary: '#c026d3',
  border: 'rgba(34, 211, 238, 0.3)',
  muted: '#94a3b8',
  mono: '"JetBrains Mono", "Fira Code", monospace'
};

export const FusionLabPanel: React.FC = () => {
  const [activeStage, setActiveStage] = React.useState<'html' | 'snapshot' | 'paint' | 'texture' | 'surface' | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#e2e8f0', padding: '24px', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '32px', borderBottom: '1px solid rgba(34, 211, 238, 0.2)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.2em', color: 'rgba(34, 211, 238, 0.6)', textTransform: 'uppercase' }}>System Module v4.2</span>
            <h2 style={{ fontSize: '28px', fontWeight: '900', margin: '4px 0 0 0', color: THEME.accent }}>HTML-IN-CANVAS LAB</h2>
            <p style={{ fontSize: '14px', color: THEME.muted, marginTop: '4px' }}>DOM Snapshot / Canvas Paint / WebGL Texture Bridge</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Fallback Simulation Mode', 'DOM Snapshot', 'Canvas Paint', 'WebGL Texture'].map(tag => (
              <span key={tag} style={{ padding: '4px 10px', fontSize: '9px', border: '1px solid ' + THEME.border, borderRadius: '4px', color: THEME.accent, fontWeight: 'bold' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* Section 1: Liquid Slider */}
        <section>
          <div style={{ marginBottom: '16px' }}>
             <h3 style={{ fontSize: '16px', color: THEME.accent, borderLeft: '3px solid ' + THEME.accentSecondary, paddingLeft: '12px', margin: 0 }}>
               線上示範：使用 WebGPU copyElementImage API 進行物理驅動的渲染。
             </h3>
          </div>
          <LiquidGlassSlider 
            onHover={(h) => setActiveStage(h ? 'paint' : null)}
          />
        </section>

        {/* Pipeline Flow */}
        <HtmlCanvasPipeline activeStage={activeStage} />

        {/* Section 2: WebGL Cube */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ marginBottom: '16px' }}>
             <h3 style={{ fontSize: '16px', color: THEME.accent, borderLeft: '3px solid ' + THEME.accentSecondary, paddingLeft: '12px', margin: 0 }}>
               即時演示：WebGL texElementImage2D 在 3D 空間中的 HTML 映射。
             </h3>
          </div>
          <HtmlTextureCube 
            onHover={(h) => setActiveStage(h ? 'texture' : 'surface')}
          />
        </section>

      </div>

      <footer style={{ marginTop: 'auto', textAlign: 'center', padding: '20px 0', color: THEME.muted, fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p>© 2026 FUSION LABS - 實驗性渲染技術展示 (繁體中文版)</p>
      </footer>
    </div>
  );
};
