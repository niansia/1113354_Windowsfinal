import { useEffect, useRef, useState } from 'react';
import { addHostMessageListener } from '../utils/bridge';

// Live, Task-Manager-style metrics.
//  - FPS, app JS-heap, battery, network: measured in the browser (cross-platform).
//  - Real CPU / RAM / Disk: pushed by the WinForms host via FUSION_SYS_METRICS
//    (Windows only). When host metrics stop arriving we fall back gracefully.

export interface SystemMetrics {
  hasHost: boolean;
  cpu: number | null;
  ram: { pct: number; usedGB: number; totalGB: number } | null;
  disk: { usedGB: number; totalGB: number; pct: number } | null;
  fps: number;
  heapMB: number | null;
  heapLimitMB: number | null;
  net: { downlink: number | null; type: string | null };
  cpuHistory: number[];
  ramHistory: number[];
  fpsHistory: number[];
  heapHistory: number[];
}

const CAP = 48;

function push(arr: number[], value: number): number[] {
  const next = arr.concat(value);
  return next.length > CAP ? next.slice(next.length - CAP) : next;
}

function emptyHistory(): number[] {
  return new Array(CAP).fill(0);
}

const INITIAL: SystemMetrics = {
  hasHost: false,
  cpu: null,
  ram: null,
  disk: null,
  fps: 0,
  heapMB: null,
  heapLimitMB: null,
  net: { downlink: null, type: null },
  cpuHistory: emptyHistory(),
  ramHistory: emptyHistory(),
  fpsHistory: emptyHistory(),
  heapHistory: emptyHistory()
};

export function useSystemMetrics(active: boolean): SystemMetrics {
  const [metrics, setMetrics] = useState<SystemMetrics>(INITIAL);
  const hostRef = useRef<{ cpu: number | null; ram: SystemMetrics['ram']; disk: SystemMetrics['disk']; ts: number }>({
    cpu: null,
    ram: null,
    disk: null,
    ts: 0
  });
  const framesRef = useRef(0);

  useEffect(() => {
    if (!active) return;

    let raf = 0;
    const onFrame = () => {
      framesRef.current += 1;
      raf = requestAnimationFrame(onFrame);
    };
    raf = requestAnimationFrame(onFrame);

    const dispose = addHostMessageListener((message) => {
      if (message.type !== 'FUSION_SYS_METRICS' || !message.payload || typeof message.payload !== 'object') return;
      const p = message.payload as Record<string, number>;
      const totalGB = Number(p.ramTotal) || 0;
      const diskTotal = Number(p.diskTotal) || 0;
      const diskUsed = Number(p.diskUsed) || 0;
      hostRef.current = {
        cpu: typeof p.cpu === 'number' && p.cpu >= 0 ? p.cpu : null,
        ram: totalGB > 0 ? { pct: Number(p.ramPct) || 0, usedGB: Number(p.ramUsed) || 0, totalGB } : null,
        disk: diskTotal > 0 ? { usedGB: diskUsed, totalGB: diskTotal, pct: (diskUsed / diskTotal) * 100 } : null,
        ts: Date.now()
      };
    });

    const tick = window.setInterval(() => {
      const fps = framesRef.current;
      framesRef.current = 0;

      const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      const heapMB = perfMem ? perfMem.usedJSHeapSize / 1048576 : null;
      const heapLimitMB = perfMem ? perfMem.jsHeapSizeLimit / 1048576 : null;
      const heapPct = heapMB && heapLimitMB ? (heapMB / heapLimitMB) * 100 : 0;

      const conn = (navigator as unknown as { connection?: { downlink?: number; effectiveType?: string } }).connection;
      const host = hostRef.current;
      const hasHost = Date.now() - host.ts < 4000;

      setMetrics((prev) => ({
        hasHost,
        cpu: hasHost ? host.cpu : null,
        ram: hasHost ? host.ram : null,
        disk: hasHost ? host.disk : null,
        fps,
        heapMB,
        heapLimitMB,
        net: { downlink: conn?.downlink ?? null, type: conn?.effectiveType ?? null },
        cpuHistory: push(prev.cpuHistory, hasHost && host.cpu != null ? host.cpu : 0),
        ramHistory: push(prev.ramHistory, hasHost && host.ram ? host.ram.pct : heapPct),
        fpsHistory: push(prev.fpsHistory, fps),
        heapHistory: push(prev.heapHistory, heapPct)
      }));
    }, 1000);

    return () => {
      cancelAnimationFrame(raf);
      dispose();
      window.clearInterval(tick);
    };
  }, [active]);

  return metrics;
}
