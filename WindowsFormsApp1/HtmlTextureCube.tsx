import * as React from 'react';

/**
 * HtmlTextureCube.tsx
 * WebGL HTML Texture 旋轉立方體組件
 */

interface HtmlTextureCubeProps {
  onHover?: (isHovered: boolean) => void;
}

export const HtmlTextureCube: React.FC<HtmlTextureCubeProps> = ({ onHover }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const drawFace = (label: string) => {
      const off = document.createElement('canvas');
      off.width = 256; off.height = 256;
      const c = off.getContext('2d')!;
      c.fillStyle = 'white';
      c.fillRect(0, 0, 256, 256);
      c.fillStyle = '#1e293b';
      c.font = 'bold 22px sans-serif';
      c.fillText(label, 20, 50);
      c.fillStyle = '#64748b';
      c.font = '14px sans-serif';
      c.fillText('HTML Source Node...', 20, 85);
      c.fillText('Rendered to WebGL Texture', 20, 110);
      c.fillStyle = '#10b981';
      c.roundRect(20, 130, 100, 30, 5); c.fill();
      c.fillStyle = '#e2e8f0';
      c.fillRect(150, 50, 80, 80);
      c.strokeStyle = '#3b82f6';
      c.lineWidth = 4;
      c.strokeRect(5, 5, 246, 246);
      return off;
    };

    const faces = ['主頁面', '內容區', '設定檔', '資源庫', '日誌區', '雲端'].map(drawFace);
    let angle = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      angle += 0.01;
      const cx = w/2, cy = h/2, size = 110;

      const points = [
          [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1],
          [-1,-1,1], [1,-1,1], [1,1,1], [-1,1,1]
      ];

      const projected = points.map(p => {
          let x = p[0], y = p[1], z = p[2];
          let tx = x * Math.cos(angle) - z * Math.sin(angle);
          let tz = x * Math.sin(angle) + z * Math.cos(angle);
          x = tx; z = tz;
          let ty = y * Math.cos(angle*0.6) - z * Math.sin(angle*0.6);
          tz = y * Math.sin(angle*0.6) + z * Math.cos(angle*0.6);
          y = ty; z = tz;
          const factor = 450 / (z + 4);
          return [x * size * factor + cx, y * size * factor + cy, z];
      });

      const faceIndices = [
          [0,1,2,3,0], [4,5,6,7,1], [0,1,5,4,2],
          [2,3,7,6,3], [0,3,7,4,4], [1,2,6,5,5]
      ];

      const sortedFaces = faceIndices.map(f => {
          const avgZ = (projected[f[0]][2] + projected[f[1]][2] + projected[f[2]][2] + projected[f[3]][2]) / 4;
          return { f, avgZ };
      }).sort((a, b) => b.avgZ - a.avgZ);

      sortedFaces.forEach(sf => {
          const f = sf.f;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(projected[f[0]][0], projected[f[0]][1]);
          ctx.lineTo(projected[f[1]][0], projected[f[1]][1]);
          ctx.lineTo(projected[f[2]][0], projected[f[2]][1]);
          ctx.lineTo(projected[f[3]][0], projected[f[3]][1]);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(faces[f[4]], projected[f[0]][0] - 100, projected[f[0]][1] - 100, 400, 400);
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
      });

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '400px', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(34, 211, 238, 0.2)' }}
      onMouseEnter={() => onHover && onHover(true)}
      onMouseLeave={() => onHover && onHover(false)}
    >
      <canvas ref={canvasRef} width={800} height={400} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
