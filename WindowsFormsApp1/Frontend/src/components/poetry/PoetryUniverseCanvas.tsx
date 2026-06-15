import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import { createPoetryLayout } from '../../poetry/poetryLayout';
import type {
  Poet,
  PoetryGraph
} from '../../poetry/poetryTypes';

interface PoetryUniverseCanvasProps {
  poets: Poet[];
  graph: PoetryGraph;
  selectedPoetId: string;
  highlightedPoetIds: string[];
  resetToken: number;
  onSelectPoet: (poetId: string) => void;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

interface Size {
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const seededStars = (count: number) => {
  let seed = 0x9e3779b9;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: random(),
    y: random(),
    radius: 0.35 + random() * 1.4,
    alpha: 0.16 + random() * 0.58,
    warm: random() > 0.72
  }));
};

export function PoetryUniverseCanvas({
  poets,
  graph,
  selectedPoetId,
  highlightedPoetIds,
  resetToken,
  onSelectPoet
}: PoetryUniverseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number; originX: number; originY: number; moved: boolean } | null>(null);
  const [size, setSize] = useState<Size>({ width: 960, height: 680 });
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const [hoveredPoetId, setHoveredPoetId] = useState('');
  const stars = useMemo(() => seededStars(230), []);
  const poetById = useMemo(() => new Map(poets.map((poet) => [poet.id, poet])), [poets]);
  const visibleIds = useMemo(() => new Set(poets.map((poet) => poet.id)), [poets]);
  const visibleGraph = useMemo<PoetryGraph>(() => ({
    nodes: graph.nodes.filter((node) => visibleIds.has(node.poetId)),
    edges: graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
  }), [graph, visibleIds]);
  const layout = useMemo(
    () => createPoetryLayout(visibleGraph, { width: size.width, height: size.height, seed: 20260616 }),
    [size.height, size.width, visibleGraph]
  );
  const layoutById = useMemo(() => new Map(layout.map((node) => [node.poetId, node])), [layout]);
  const highlightSet = useMemo(() => new Set(highlightedPoetIds), [highlightedPoetIds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, Math.round(entry.contentRect.width));
      const height = Math.max(360, Math.round(entry.contentRect.height));
      setSize({ width, height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setView({ x: 0, y: 0, scale: 1 });
  }, [resetToken]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale
    };
  }, [view]);

  const findNode = useCallback((clientX: number, clientY: number) => {
    const world = screenToWorld(clientX, clientY);
    return [...layout]
      .reverse()
      .find((node) => Math.hypot(world.x - node.x, world.y - node.y) <= node.radius + 7);
  }, [layout, screenToWorld]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    for (const star of stars) {
      context.beginPath();
      context.fillStyle = star.warm
        ? `rgba(255, 210, 128, ${star.alpha})`
        : `rgba(202, 232, 255, ${star.alpha})`;
      context.arc(star.x * size.width, star.y * size.height, star.radius, 0, Math.PI * 2);
      context.fill();
    }

    context.save();
    context.translate(view.x, view.y);
    context.scale(view.scale, view.scale);
    for (const edge of visibleGraph.edges) {
      const source = layoutById.get(edge.source);
      const target = layoutById.get(edge.target);
      if (!source || !target) continue;
      const active = highlightSet.has(edge.source) && highlightSet.has(edge.target);
      context.beginPath();
      context.moveTo(source.x, source.y);
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2 - Math.min(42, Math.abs(source.x - target.x) * 0.06);
      context.quadraticCurveTo(midX, midY, target.x, target.y);
      context.strokeStyle = active
        ? 'rgba(255, 211, 103, 0.92)'
        : `rgba(255, 157, 178, ${0.1 + edge.weight * 0.24})`;
      context.lineWidth = active ? 2.2 / view.scale : Math.max(0.55, edge.weight) / view.scale;
      context.stroke();
    }

    for (const node of layout) {
      const poet = poetById.get(node.poetId);
      if (!poet) continue;
      const selected = node.poetId === selectedPoetId;
      const hovered = node.poetId === hoveredPoetId;
      const highlighted = highlightSet.has(node.poetId);
      const radius = node.radius + (selected ? 8 : hovered ? 4 : highlighted ? 3 : 0);
      const glow = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 3.4);
      glow.addColorStop(0, selected ? 'rgba(255, 239, 181, 0.98)' : `${node.color}ee`);
      glow.addColorStop(0.23, selected ? 'rgba(255, 173, 76, 0.7)' : `${node.color}70`);
      glow.addColorStop(1, 'rgba(255, 70, 135, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(node.x, node.y, radius * 3.4, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.fillStyle = selected ? '#fff4c7' : highlighted ? '#ffe08a' : node.color;
      context.arc(node.x, node.y, Math.max(3.8, radius * 0.42), 0, Math.PI * 2);
      context.fill();
      context.lineWidth = selected ? 1.8 / view.scale : 0.7 / view.scale;
      context.strokeStyle = selected ? '#fff7dc' : 'rgba(255,255,255,0.58)';
      context.stroke();

      const fontSize = clamp(10 + node.radius * 0.18 + (selected ? 3 : 0), 11, 17);
      context.font = `${selected ? 800 : 650} ${fontSize}px "Noto Serif TC", "Microsoft JhengHei", serif`;
      context.textAlign = 'center';
      context.textBaseline = 'top';
      context.shadowBlur = 10;
      context.shadowColor = 'rgba(0,0,0,0.9)';
      context.fillStyle = selected ? '#fff5d6' : 'rgba(255, 244, 230, 0.9)';
      context.fillText(poet.name, node.x, node.y + radius * 0.6 + 5);
      context.shadowBlur = 0;
    }
    context.restore();
  }, [
    highlightSet,
    hoveredPoetId,
    layout,
    layoutById,
    poetById,
    selectedPoetId,
    size.height,
    size.width,
    stars,
    view,
    visibleGraph.edges
  ]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      originX: view.x,
      originY: view.y,
      moved: false
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      setHoveredPoetId(findNode(event.clientX, event.clientY)?.poetId ?? '');
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    setView((current) => ({ ...current, x: drag.originX + dx, y: drag.originY + dy }));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!drag?.moved) {
      const node = findNode(event.clientX, event.clientY);
      if (node) onSelectPoet(node.poetId);
    }
  };

  const onWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    setView((current) => {
      const nextScale = clamp(current.scale * (event.deltaY > 0 ? 0.9 : 1.1), 0.55, 2.4);
      const worldX = (pointerX - current.x) / current.scale;
      const worldY = (pointerY - current.y) / current.scale;
      return {
        scale: nextScale,
        x: pointerX - worldX * nextScale,
        y: pointerY - worldY * nextScale
      };
    });
  };

  return (
    <canvas
      ref={canvasRef}
      className="poetry-universe-canvas"
      aria-label="可拖曳與縮放的詩人關係星圖"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        if (!dragRef.current) setHoveredPoetId('');
      }}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      onWheel={onWheel}
    />
  );
}

