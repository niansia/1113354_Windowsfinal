import * as React from 'react';

/**
 * HtmlCanvasPipeline.tsx
 * GPU 渲染管線流程圖組件
 */

interface HtmlCanvasPipelineProps {
  activeStage?: 'html' | 'snapshot' | 'paint' | 'texture' | 'surface' | null;
}

export const HtmlCanvasPipeline: React.FC<HtmlCanvasPipelineProps> = ({ activeStage }) => {
  const steps = [
    { id: 'html', label: 'HTML Node' },
    { id: 'snapshot', label: 'Snapshot' },
    { id: 'paint', label: 'Canvas Paint' },
    { id: 'texture', label: 'WebGL Texture' },
    { id: 'surface', label: '3D Surface' }
  ];

  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', 
      padding: '24px', backgroundColor: 'rgba(34, 211, 238, 0.03)', borderRadius: '100px', 
      border: '1px solid rgba(34, 211, 238, 0.1)', margin: '20px 0'
    }}>
      {steps.map((step, i) => {
        const isActive = activeStage === step.id;
        return (
          <React.Fragment key={step.id}>
            <div style={{ 
              padding: '8px 18px', borderRadius: '20px', 
              backgroundColor: isActive ? 'rgba(34, 211, 238, 0.2)' : '#0f172a', 
              border: `1px solid ${isActive ? '#22d3ee' : 'rgba(255,255,255,0.1)'}`,
              color: isActive ? '#22d3ee' : 'rgba(255,255,255,0.4)', 
              fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em',
              boxShadow: isActive ? '0 0 20px rgba(34, 211, 238, 0.4)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <div style={{ 
                width: '30px', height: '2px', 
                background: isActive ? 'linear-gradient(to right, #22d3ee, transparent)' : 'rgba(255,255,255,0.05)' 
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
