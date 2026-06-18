import React, { useEffect, useRef } from 'react';
import type { InferenceTrace, LiquidParameters } from '../../neuro/neuroFlow';

interface NeuralFlowCanvasProps {
  trace: InferenceTrace;
  phaseIndex: number;
  running: boolean;
  speed: number;
  stageLabels: string[];
}

interface Point { x: number; y: number; value: number }

const palette = ['#6ee7ff', '#79a8ff', '#a987ff', '#ff75bc', '#7df2cc', '#f5d77d'];

const fitCanvas = (canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext('2d');
  context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { context, width: rect.width, height: rect.height };
};

export function NeuralFlowCanvas({ trace, phaseIndex, running, speed, stageLabels }: NeuralFlowCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    let active = true;
    const resizeObserver = new ResizeObserver(() => {
      if (canvas) fitCanvas(canvas);
    });
    resizeObserver.observe(canvas);

    const render = (timestamp: number) => {
      if (!active) return;
      const { context: ctx, width, height } = fitCanvas(canvas);
      if (!ctx || width < 2 || height < 2) {
        frame = requestAnimationFrame(render);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, 'rgba(4, 16, 39, .96)');
      background.addColorStop(0.55, 'rgba(7, 10, 35, .96)');
      background.addColorStop(1, 'rgba(18, 7, 35, .96)');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(126, 220, 255, .055)';
      ctx.lineWidth = 1;
      for (let x = 20; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 20; y < height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      const paddingX = Math.max(56, width * 0.07);
      const labelBand = 34;
      const networkHeight = Math.max(100, height - labelBand - 28);
      const counts = [
        Math.max(4, Math.min(10, trace.tokens.length || 6)),
        trace.architecture === 'liquid' ? 8 : 11,
        trace.architecture === 'transformer' ? 13 : 10,
        trace.architecture === 'hybrid' ? 12 : 9,
        8,
        5
      ];
      const layers: Point[][] = counts.map((count, layerIndex) => {
        const x = paddingX + (width - paddingX * 2) * (layerIndex / (counts.length - 1));
        return Array.from({ length: count }, (_, nodeIndex) => ({
          x,
          y: labelBand + 18 + networkHeight * ((nodeIndex + 1) / (count + 1)),
          value: (Math.sin(timestamp * 0.0012 * speed + nodeIndex * 1.7 + layerIndex * 0.8) + 1) / 2
        }));
      });

      layers.slice(0, -1).forEach((layer, layerIndex) => {
        const next = layers[layerIndex + 1] ?? [];
        layer.forEach((from, fromIndex) => {
          next.forEach((to, toIndex) => {
            const selected = (fromIndex * 7 + toIndex * 11 + layerIndex * 3) % 5 <= 1;
            if (!selected) return;
            const activeLayer = running && (layerIndex === phaseIndex || layerIndex + 1 === phaseIndex);
            const strength = 0.05 + ((fromIndex + toIndex) % 6) * 0.025 + (activeLayer ? 0.18 : 0);
            ctx.strokeStyle = `${palette[(fromIndex + toIndex + layerIndex) % palette.length]}${Math.round(strength * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = activeLayer ? 1.35 : 0.75;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            const control = (from.x + to.x) / 2;
            ctx.bezierCurveTo(control, from.y, control, to.y, to.x, to.y);
            ctx.stroke();

            if (activeLayer) {
              const progress = (timestamp * 0.00042 * speed + (fromIndex + toIndex) * 0.09) % 1;
              const inv = 1 - progress;
              const px = inv ** 3 * from.x + 3 * inv ** 2 * progress * control + 3 * inv * progress ** 2 * control + progress ** 3 * to.x;
              const py = inv ** 3 * from.y + 3 * inv ** 2 * progress * from.y + 3 * inv * progress ** 2 * to.y + progress ** 3 * to.y;
              ctx.fillStyle = '#f4fdff';
              ctx.shadowColor = palette[(layerIndex + 1) % palette.length] ?? '#6ee7ff';
              ctx.shadowBlur = 12;
              ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill();
              ctx.shadowBlur = 0;
            }
          });
        });
      });

      layers.forEach((layer, layerIndex) => {
        layer.forEach((point, nodeIndex) => {
          const isActive = phaseIndex === layerIndex && running;
          const radius = 4.5 + point.value * 3 + (isActive ? 1.8 : 0);
          ctx.shadowColor = palette[layerIndex] ?? '#6ee7ff';
          ctx.shadowBlur = isActive ? 18 : 7;
          ctx.fillStyle = `${palette[layerIndex] ?? '#6ee7ff'}${Math.round((0.4 + point.value * 0.6) * 255).toString(16).padStart(2, '0')}`;
          ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(238, 251, 255, .6)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
          if (layerIndex === 0 && trace.tokens[nodeIndex]) {
            ctx.fillStyle = 'rgba(219, 243, 255, .72)';
            ctx.font = '10px Inter, system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(trace.tokens[nodeIndex]?.text ?? '', point.x - 10, point.y + 3);
          }
        });
        ctx.fillStyle = phaseIndex === layerIndex ? '#ecfbff' : 'rgba(193, 224, 244, .58)';
        ctx.font = `${phaseIndex === layerIndex ? 700 : 600} 10px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(stageLabels[layerIndex] ?? '', layer[0]?.x ?? 0, 21);
      });

      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [phaseIndex, running, speed, stageLabels, trace]);

  return <canvas ref={ref} className="neuro-network-canvas" aria-label={stageLabels.join(', ')} />;
}

interface LiquidStateCanvasProps {
  params: LiquidParameters;
  running: boolean;
  speed: number;
  label: string;
}

export function LiquidStateCanvas({ params, running, speed, label }: LiquidStateCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[][]>(Array.from({ length: 4 }, () => Array.from({ length: 90 }, () => 0)));

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    let lastSample = 0;
    const draw = (timestamp: number) => {
      const { context: ctx, width, height } = fitCanvas(canvas);
      if (!ctx) return;
      if (running && timestamp - lastSample > 55 / speed) {
        lastSample = timestamp;
        historyRef.current = historyRef.current.map((line, index) => {
          const previous = line[line.length - 1] ?? 0;
          const drive = Math.sin(timestamp * 0.0014 * speed + index * 1.5) * (0.4 + params.recurrence * 0.35);
          const next = Math.tanh(previous * params.recurrence + drive / Math.max(0.2, params.timeConstant)) * (1 - params.damping * 0.35);
          return [...line.slice(1), next];
        });
      }
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(3, 11, 31, .92)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(126, 220, 255, .08)';
      for (let y = height / 4; y < height; y += height / 4) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }
      historyRef.current.forEach((line, lineIndex) => {
        ctx.strokeStyle = palette[lineIndex] ?? '#6ee7ff';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        line.forEach((value, index) => {
          const x = (index / (line.length - 1)) * width;
          const y = height / 2 - value * height * 0.36;
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [params, running, speed]);

  return <canvas ref={ref} className="neuro-liquid-canvas" aria-label={label} />;
}
