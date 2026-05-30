import * as React from 'react';

/**
 * LiquidGlassSlider.tsx
 * 高階液態玻璃 / 果凍材質滑桿組件
 */

interface LiquidGlassSliderProps {
  onValueChange?: (value: number) => void;
  onHover?: (isHovered: boolean) => void;
}

const THEME = {
  accent: '#22d3ee',
  muted: '#94a3b8',
  mono: '"JetBrains Mono", "Fira Code", monospace'
};

export const LiquidGlassSlider: React.FC<LiquidGlassSliderProps> = ({ onValueChange, onHover }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [value, setValue] = React.useState(85);
  const [isDragging, setIsDragging] = React.useState(false);
  
  const blobPos = React.useRef(85);
  const velocity = React.useRef(0);
  const targetPos = React.useRef(85);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 物理模擬 (Spring)
      const k = 0.15;
      const d = 0.8;
      const diff = targetPos.current - blobPos.current;
      velocity.current += diff * k;
      velocity.current *= d;
      blobPos.current += velocity.current;

      const centerX = (blobPos.current / 100) * (w - 100) + 50;
      const centerY = h / 2;

      // 1. 膠囊背景 (Glass)
      ctx.beginPath();
      ctx.roundRect(40, centerY - 30, w - 80, 60, 30);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 2. 液態 Blob
      const stretch = Math.abs(velocity.current) * 2;
      const bw = 80 + stretch;
      const bh = 60 - stretch * 0.5;

      const grad = ctx.createLinearGradient(centerX - bw/2, 0, centerX + bw/2, 0);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.5, '#fbbf24');
      grad.addColorStop(1, '#ffffff');

      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, bw/2, bh/2, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // 3. 折射文字
      const pText = `${Math.round(value)} %`;
      ctx.font = `bold 16px ${THEME.mono}`;
      ctx.textAlign = 'right';
      const tx = w - 60;
      const ty = centerY + 6;
      
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillText(pText, tx, ty);

      const dist = Math.abs(centerX - tx);
      if (dist < 100) {
          ctx.save();
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = THEME.accent;
          const offset = (centerX - tx) * 0.05;
          ctx.fillText(pText, tx + offset, ty);
          ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [value]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateVal(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) updateVal(e);
  };

  const updateVal = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - 50;
    const width = rect.width - 100;
    const nextVal = Math.max(0, Math.min(100, (x / width) * 100));
    setValue(nextVal);
    targetPos.current = nextVal;
    if (onValueChange) onValueChange(nextVal);
  };

  return (
    <div 
      style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseEnter={() => onHover && onHover(true)}
      onMouseLeave={() => { setIsDragging(false); onHover && onHover(false); }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: THEME.accent, fontWeight: 'bold' }}>Liquid-Glass-Slider</span>
        <span style={{ fontSize: '11px', color: THEME.muted, fontFamily: THEME.mono }}>{Math.round(value)} %</span>
      </div>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={100} 
        onMouseDown={handleMouseDown}
        style={{ width: '100%', height: '100px', cursor: 'pointer', background: '#111827', borderRadius: '12px' }}
      />
    </div>
  );
};
