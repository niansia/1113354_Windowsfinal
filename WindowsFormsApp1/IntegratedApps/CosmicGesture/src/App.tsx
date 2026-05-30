import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bodyById, celestialBodies, numberGestureMap } from "./data/celestialBodies";
import { GestureController } from "./components/GestureController";
import { SolarSystemScene } from "./components/SolarSystemScene";
import type { BodyId, GestureDebugState, GestureEvent, PerformanceMode, RuntimeControls, SceneMode } from "./types";

const params = new URLSearchParams(window.location.search);
const hostMode = params.get("host") === "fusionos";
const requestedBody = params.get("planet") as BodyId | null;
const requestedMode = params.get("mode") as SceneMode | null;

const initialControls: RuntimeControls = {
  orbitImpulse: 0,
  elevationImpulse: 0,
  zoomImpulse: 0,
  pointer: { active: false, x: 0.5, y: 0.5, openness: 0 },
  lastGestureLabel: "待命"
};

export default function App() {
  const [selectedId, setSelectedId] = useState<BodyId>(requestedBody && bodyById[requestedBody] ? requestedBody : "earth");
  const [mode, setMode] = useState<SceneMode>(requestedMode === "focus" || requestedMode === "inner" ? requestedMode : requestedBody ? "focus" : "overview");
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>("high");
  const [gestureEnabled, setGestureEnabled] = useState(hostMode);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [orbitLinesEnabled, setOrbitLinesEnabled] = useState(true);
  const [coreLevel, setCoreLevel] = useState(requestedMode === "inner" ? 1 : 0);
  const [notice, setNotice] = useState("太陽系粒子總覽");
  const [debug, setDebug] = useState<GestureDebugState>({
    enabled: gestureEnabled,
    active: false,
    label: "尚未啟動",
    confidence: 0,
    fingerStates: "-----",
    fps: 0
  });
  const controlsRef = useRef<RuntimeControls>({ ...initialControls });
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const pinchRef = useRef<number | null>(null);
  const selectedBody = bodyById[selectedId];

  const selectBody = useCallback((id: BodyId, nextMode: SceneMode = "focus") => {
    setSelectedId(id);
    setMode(nextMode);
    setCoreLevel(0);
    setNotice(`${bodyById[id].name} / ${bodyById[id].englishName}`);
  }, []);

  const resetCamera = useCallback(() => {
    controlsRef.current.orbitImpulse = 0;
    controlsRef.current.elevationImpulse = 0;
    controlsRef.current.zoomImpulse = 0;
    setMode("overview");
    setCoreLevel(0);
    setNotice("回到總覽模式");
  }, []);

  const handleGesture = useCallback(
    (event: GestureEvent) => {
      if (event.type === "pointer") {
        controlsRef.current.pointer = event.pointer;
        return;
      }
      if (event.type === "orbit") {
        controlsRef.current.orbitImpulse += -event.velocityX * 0.012;
        controlsRef.current.elevationImpulse += event.velocityY * 0.005;
        controlsRef.current.lastGestureLabel = "手掌環繞";
        return;
      }
      if (event.type === "openPalm") {
        setMode("inner");
        setCoreLevel((current) => Math.max(current, event.amount));
        controlsRef.current.zoomImpulse += event.amount * 0.018;
        controlsRef.current.lastGestureLabel = "張掌 / 進入核心";
        setNotice(`${selectedBody.name} 核心展開`);
        return;
      }
      if (event.type === "closedFist") {
        setMode("focus");
        setCoreLevel(0);
        controlsRef.current.zoomImpulse -= 0.14;
        controlsRef.current.lastGestureLabel = "握拳 / 退出核心";
        setNotice(`${selectedBody.name} 外部視角`);
        return;
      }
      if (event.type === "number") {
        const target = numberGestureMap[event.value];
        selectBody(target, "focus");
        controlsRef.current.lastGestureLabel = `數字 ${event.value}`;
      }
    },
    [selectBody, selectedBody.name]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (/^[1-8]$/.test(event.key)) {
        selectBody(numberGestureMap[Number(event.key) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8], "focus");
      } else if (event.key === "0") {
        selectBody("sun", "focus");
      } else if (event.code === "Space") {
        event.preventDefault();
        setMode((current) => (current === "inner" ? "focus" : "inner"));
        setCoreLevel((current) => (current > 0 ? 0 : 1));
        setNotice(mode === "inner" ? "退出核心" : "進入核心");
      } else if (event.key === "Escape") {
        resetCamera();
      } else if (event.key === "ArrowLeft") {
        controlsRef.current.orbitImpulse += 0.032;
      } else if (event.key === "ArrowRight") {
        controlsRef.current.orbitImpulse -= 0.032;
      } else if (event.key === "ArrowUp") {
        controlsRef.current.elevationImpulse += 0.018;
      } else if (event.key === "ArrowDown") {
        controlsRef.current.elevationImpulse -= 0.018;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, resetCamera, selectBody]);

  useEffect(() => {
    if (mode !== "inner") {
      const id = window.setInterval(() => setCoreLevel((value) => Math.max(0, value - 0.045)), 30);
      return () => window.clearInterval(id);
    }
    const id = window.setInterval(() => setCoreLevel((value) => Math.min(1, value + 0.018)), 30);
    return () => window.clearInterval(id);
  }, [mode]);

  const bodyButtons = useMemo(
    () =>
      celestialBodies.map((body) => (
        <button
          key={body.id}
          className={body.id === selectedId ? "body-chip active" : "body-chip"}
          type="button"
          onClick={() => selectBody(body.id, "focus")}
        >
          <span>{body.name}</span>
        </button>
      )),
    [selectBody, selectedId]
  );

  const updatePointer = (clientX: number, clientY: number, currentTarget: EventTarget & HTMLElement) => {
    const rect = currentTarget.getBoundingClientRect();
    controlsRef.current.pointer = {
      active: true,
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
      openness: controlsRef.current.pointer.openness || 1.2
    };
  };

  return (
    <main
      className="cosmic-app"
      onPointerDown={(event) => {
        dragRef.current = { active: true, x: event.clientX, y: event.clientY };
        updatePointer(event.clientX, event.clientY, event.currentTarget);
      }}
      onPointerMove={(event) => {
        updatePointer(event.clientX, event.clientY, event.currentTarget);
        const drag = dragRef.current;
        if (drag.active) {
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          controlsRef.current.orbitImpulse += -dx * 0.00048;
          controlsRef.current.elevationImpulse += dy * 0.00018;
          drag.x = event.clientX;
          drag.y = event.clientY;
        }
      }}
      onPointerUp={() => {
        dragRef.current.active = false;
      }}
      onPointerLeave={() => {
        dragRef.current.active = false;
        controlsRef.current.pointer.active = false;
      }}
      onWheel={(event) => {
        controlsRef.current.zoomImpulse += -event.deltaY * 0.004;
      }}
      onTouchMove={(event) => {
        if (event.touches.length === 2) {
          const [a, b] = [event.touches[0], event.touches[1]];
          const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          if (pinchRef.current != null) {
            controlsRef.current.zoomImpulse += (dist - pinchRef.current) * 0.008;
          }
          pinchRef.current = dist;
        }
      }}
      onTouchEnd={() => {
        pinchRef.current = null;
      }}
    >
      <div className="scene-layer">
        <Canvas camera={{ fov: 52, near: 0.05, far: 160, position: [0, 7, 24] }} dpr={[1, 1.7]} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}>
          <Suspense fallback={null}>
            <SolarSystemScene
              selectedId={selectedId}
              mode={mode}
              performanceMode={performanceMode}
              coreLevel={coreLevel}
              bloomEnabled={bloomEnabled}
              orbitLinesEnabled={orbitLinesEnabled}
              controlsRef={controlsRef}
              onSelectBody={(id) => selectBody(id, "focus")}
            />
          </Suspense>
        </Canvas>
      </div>

      <section className="hud-title">
        <div className="eyebrow">FUSIONOS / PARTICLE COSMOS</div>
        <h1>{selectedBody.name}</h1>
        <p>
          {selectedBody.englishName} / {modeLabel(mode)} / 高密度粒子天體 / 手勢核心互動
        </p>
      </section>

      <section className="status-panel">
        <div className="panel-title">狀態</div>
        <div className="stat-row">
          <span>Hand tracking</span>
          <b>{debug.active ? "active" : gestureEnabled ? "waiting" : "inactive"}</b>
        </div>
        <div className="stat-row">
          <span>Gesture</span>
          <b>{debug.label}</b>
        </div>
        <div className="stat-row">
          <span>Mode</span>
          <b>{modeLabel(mode)}</b>
        </div>
        <div className="stat-row">
          <span>Selected</span>
          <b>{selectedBody.name}</b>
        </div>
      </section>

      <section className="data-card">
        <div className="panel-title">天體資料</div>
        <dl>
          <dt>半徑</dt>
          <dd>{selectedBody.radiusKm}</dd>
          <dt>平均距離</dt>
          <dd>{selectedBody.averageDistance}</dd>
          <dt>衛星數</dt>
          <dd>{selectedBody.satellites}</dd>
          <dt>自轉週期</dt>
          <dd>{selectedBody.rotationPeriod}</dd>
          <dt>公轉週期</dt>
          <dd>{selectedBody.orbitalPeriod}</dd>
        </dl>
        <p>資料基準：NASA planetary fact sheets / NASA Sun facts</p>
      </section>

      <section className="gesture-card">
        <div className="panel-title">手勢控制</div>
        <div className="gesture-current">{controlsRef.current.lastGestureLabel}</div>
        <div className="gesture-grid">
          <span>張掌</span>
          <b>進入核心</b>
          <span>握拳</span>
          <b>退出核心</b>
          <span>左右滑</span>
          <b>鏡頭環繞</b>
          <span>1-8</span>
          <b>切換行星</b>
          <span>6/7/8</span>
          <b>中文單手手勢</b>
        </div>
        <div className="finger-debug">Finger: {debug.fingerStates} / Confidence: {Math.round(debug.confidence * 100)}%</div>
      </section>

      <section className="settings-card">
        <div className="panel-title">設定</div>
        <label>
          Performance
          <select value={performanceMode} onChange={(event) => setPerformanceMode(event.target.value as PerformanceMode)}>
            <option value="auto">Auto</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <button type="button" onClick={() => setGestureEnabled((value) => !value)}>
          {gestureEnabled ? "關閉手勢" : "啟動手勢"}
        </button>
        <button type="button" onClick={() => setBloomEnabled((value) => !value)}>
          {bloomEnabled ? "關閉 Bloom" : "開啟 Bloom"}
        </button>
        <button type="button" onClick={() => setOrbitLinesEnabled((value) => !value)}>
          {orbitLinesEnabled ? "隱藏軌道" : "顯示軌道"}
        </button>
        <button type="button" onClick={resetCamera}>
          Camera Reset
        </button>
      </section>

      <nav className="body-rail" aria-label="天體切換">
        {bodyButtons}
      </nav>

      <div className="command-bar">
        <button type="button" onClick={() => selectBody(previousBody(selectedId), "focus")}>
          上一顆
        </button>
        <button type="button" onClick={() => selectBody("sun", "focus")}>
          太陽
        </button>
        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === "inner" ? "focus" : "inner"));
            setCoreLevel((current) => (current > 0 ? 0 : 1));
          }}
        >
          {mode === "inner" ? "退出核心" : "進入核心"}
        </button>
        <button type="button" onClick={() => selectBody(nextBody(selectedId), "focus")}>
          下一顆
        </button>
        <span>{notice}</span>
      </div>

      <GestureController enabled={gestureEnabled} onGesture={handleGesture} onDebug={setDebug} />
    </main>
  );
}

function modeLabel(mode: SceneMode): string {
  if (mode === "overview") return "總覽模式";
  if (mode === "focus") return "聚焦模式";
  return "內部核心模式";
}

function previousBody(current: BodyId): BodyId {
  const index = celestialBodies.findIndex((body) => body.id === current);
  return celestialBodies[(index - 1 + celestialBodies.length) % celestialBodies.length].id;
}

function nextBody(current: BodyId): BodyId {
  const index = celestialBodies.findIndex((body) => body.id === current);
  return celestialBodies[(index + 1) % celestialBodies.length].id;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
