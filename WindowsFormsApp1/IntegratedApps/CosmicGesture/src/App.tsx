import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { numberGestureMap } from "./data/celestialBodies";
import { CATEGORIES, type CatalogCategory, catalogById, catalog, entriesByCategory } from "./data/catalog";
import { GestureController } from "./components/GestureController";
import { SolarSystemScene } from "./components/SolarSystemScene";
import { DeepSpaceScene } from "./components/DeepSpaceScene";
import { EarthExploreScene } from "./components/EarthExploreScene";
import { EARTH_REGIONS } from "./utils/earthGeo";
import { CosmicBackdrop } from "./components/CosmicBackdrop";
import { CosmosMenu } from "./components/CosmosMenu";
import { InfoCard, type InfoTab } from "./components/InfoCard";
import { ApodPanel } from "./components/ApodPanel";
import { performanceScale } from "./utils/particleMath";
import { fetchApod, type ApodData } from "./services/nasaService";
import type { BodyId, GestureDebugState, GestureEvent, PerformanceMode, RuntimeControls, SceneMode } from "./types";

const params = new URLSearchParams(window.location.search);
const hostMode = params.get("host") === "fusionos";
const requestedBody = params.get("planet");

const regionById = Object.fromEntries(EARTH_REGIONS.map((r) => [r.id, r]));

const initialControls: RuntimeControls = {
  orbitImpulse: 0,
  elevationImpulse: 0,
  zoomImpulse: 0,
  pointer: { active: false, x: 0.5, y: 0.5, openness: 0 },
  lastGestureLabel: "待命"
};

export default function App() {
  const initialId = requestedBody && catalogById[requestedBody] ? requestedBody : "earth";
  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [mode, setMode] = useState<SceneMode>("overview");
  const [menuCategory, setMenuCategory] = useState<CatalogCategory>(catalogById[initialId]?.category ?? "planet");
  const [infoTab, setInfoTab] = useState<InfoTab>("summary");
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>("auto");
  const [gestureEnabled, setGestureEnabled] = useState(hostMode);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [orbitLinesEnabled, setOrbitLinesEnabled] = useState(true);
  const [coreLevel, setCoreLevel] = useState(0);
  const [earthExplore, setEarthExplore] = useState(false);
  const [earthRegionId, setEarthRegionId] = useState("east-asia");
  const [notice, setNotice] = useState("太陽系粒子總覽");
  const [apod, setApod] = useState<ApodData | null>(null);
  const [apodLoading, setApodLoading] = useState(true);
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
  const lastSolarIdRef = useRef<string>(catalogById[initialId]?.render === "solar" ? initialId : "earth");

  const entry = catalogById[selectedId] ?? catalogById.earth;
  const isSolar = entry.render === "solar";
  const particleScale = useMemo(() => performanceScale(performanceMode), [performanceMode]);

  useEffect(() => {
    let active = true;
    fetchApod()
      .then((data) => active && setApod(data))
      .finally(() => active && setApodLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const selectEntry = useCallback((id: string) => {
    const next = catalogById[id];
    if (!next) return;
    setEarthExplore(false);
    setSelectedId(id);
    setMenuCategory(next.category);
    setInfoTab("summary");
    setCoreLevel(0);
    setMode("focus");
    if (next.render === "solar") lastSolarIdRef.current = id;
    setNotice(`${next.name} / ${next.englishName}`);
  }, []);

  const exitEarthExplore = useCallback(() => {
    setEarthExplore(false);
    setMode("focus");
    setNotice("離開地球 · 回到太空視角");
    controlsRef.current.lastGestureLabel = "握拳 / 離開地球";
  }, []);

  const navigateObject = useCallback(
    (dir: "prev" | "next") => {
      // Interstellar travel: swipe traverses the ENTIRE catalog, never bound by the
      // current category. (Categories are only a convenience filter in the menu.)
      const pool = catalog;
      const index = Math.max(0, pool.findIndex((e) => e.id === selectedId));
      const nextIndex = (index + (dir === "next" ? 1 : -1) + pool.length) % pool.length;
      selectEntry(pool[nextIndex].id);
    },
    [selectedId, selectEntry]
  );

  const navigateCategory = useCallback(
    (dir: "prev" | "next") => {
      const index = Math.max(0, CATEGORIES.findIndex((c) => c.id === menuCategory));
      const nextIndex = (index + (dir === "next" ? 1 : -1) + CATEGORIES.length) % CATEGORIES.length;
      const cat = CATEGORIES[nextIndex].id;
      setMenuCategory(cat);
      const first = entriesByCategory(cat)[0];
      if (first) selectEntry(first.id);
      setNotice(`分類：${CATEGORIES[nextIndex].name}`);
    },
    [menuCategory, selectEntry]
  );

  const resetOverview = useCallback(() => {
    controlsRef.current.orbitImpulse = 0;
    controlsRef.current.elevationImpulse = 0;
    controlsRef.current.zoomImpulse = 0;
    setEarthExplore(false);
    if (catalogById[selectedId]?.render !== "solar") {
      setSelectedId(lastSolarIdRef.current);
      setMenuCategory(catalogById[lastSolarIdRef.current]?.category ?? "planet");
    }
    setMode("overview");
    setCoreLevel(0);
    setNotice("回到太陽系總覽");
  }, [selectedId]);

  const enterCore = useCallback(
    (amount: number) => {
      if (isSolar && entry.id === "earth") {
        // Enter the dedicated Earth Explore mode (solid globe you travel across).
        setEarthExplore(true);
        setMode("focus");
        controlsRef.current.lastGestureLabel = "張掌 / 進入地球";
        setNotice("進入地球 · 揮手環遊各大地區，握拳離開");
      } else if (isSolar) {
        setMode("inner");
        setCoreLevel((current) => Math.max(current, amount));
        controlsRef.current.zoomImpulse += amount * 0.018;
        controlsRef.current.lastGestureLabel = "張掌 / 進入核心";
        setNotice(`${entry.name} 核心展開`);
      } else {
        setInfoTab("detail");
        controlsRef.current.zoomImpulse += amount * 0.02;
        controlsRef.current.lastGestureLabel = "張掌 / 詳細資料";
        setNotice(`${entry.name} 詳細資料`);
      }
    },
    [entry.id, entry.name, isSolar]
  );

  const exitCore = useCallback(() => {
    if (earthExplore) {
      exitEarthExplore();
    } else if (isSolar && mode === "inner") {
      setMode("focus");
      setCoreLevel(0);
      controlsRef.current.zoomImpulse -= 0.14;
      controlsRef.current.lastGestureLabel = "握拳 / 退出核心";
      setNotice(`${entry.name} 外部視角`);
    } else {
      resetOverview();
      controlsRef.current.lastGestureLabel = "握拳 / 返回總覽";
    }
  }, [earthExplore, entry.name, exitEarthExplore, isSolar, mode, resetOverview]);

  const handleGesture = useCallback(
    (event: GestureEvent) => {
      // While walking the Earth surface, every gesture drives travel/zoom, not
      // object switching — "fly across the regions" feel.
      if (earthExplore) {
        switch (event.type) {
          case "pointer":
            controlsRef.current.pointer = event.pointer;
            return;
          case "orbit":
            controlsRef.current.orbitImpulse += -event.velocityX * 0.014;
            controlsRef.current.elevationImpulse += event.velocityY * 0.006;
            return;
          case "swipe":
            controlsRef.current.orbitImpulse += event.dir === "left" ? 0.18 : -0.18;
            controlsRef.current.lastGestureLabel = "飛越地表";
            return;
          case "tilt":
            controlsRef.current.elevationImpulse += event.dir === "up" ? 0.1 : -0.1;
            return;
          case "openPalm":
            controlsRef.current.zoomImpulse += 0.06;
            controlsRef.current.lastGestureLabel = "張掌 / 靠近地表";
            return;
          case "closedFist":
            exitEarthExplore();
            return;
          case "number":
            setEarthExplore(false);
            selectEntry(numberGestureMap[event.value]);
            controlsRef.current.lastGestureLabel = `數字 ${event.value}`;
            return;
        }
        return;
      }
      switch (event.type) {
        case "pointer":
          controlsRef.current.pointer = event.pointer;
          return;
        case "orbit":
          controlsRef.current.orbitImpulse += -event.velocityX * 0.012;
          controlsRef.current.elevationImpulse += event.velocityY * 0.005;
          controlsRef.current.lastGestureLabel = "手掌環繞";
          return;
        case "swipe":
          navigateObject(event.dir === "left" ? "prev" : "next");
          controlsRef.current.lastGestureLabel = `揮動切換 ${event.dir === "left" ? "←" : "→"}`;
          return;
        case "tilt":
          navigateCategory(event.dir === "up" ? "prev" : "next");
          controlsRef.current.lastGestureLabel = `上下切換分類`;
          return;
        case "openPalm":
          enterCore(event.amount);
          return;
        case "closedFist":
          exitCore();
          return;
        case "number":
          {
            const targetId = numberGestureMap[event.value];
            const target = catalogById[targetId];
            selectEntry(targetId);
            setMode("focus");
            controlsRef.current.lastGestureLabel = `數字 ${event.value}`;
            setNotice(target ? `切換到 ${target.name}` : `數字 ${event.value}`);
          }
          return;
      }
    },
    [earthExplore, enterCore, exitCore, exitEarthExplore, navigateCategory, navigateObject, selectEntry]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (/^[1-8]$/.test(event.key)) {
        selectEntry(numberGestureMap[Number(event.key) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8]);
      } else if (event.key === "0") {
        selectEntry("sun");
      } else if (event.key === "ArrowLeft") {
        navigateObject("prev");
      } else if (event.key === "ArrowRight") {
        navigateObject("next");
      } else if (event.key === "ArrowUp") {
        navigateCategory("prev");
      } else if (event.key === "ArrowDown") {
        navigateCategory("next");
      } else if (event.key === "Enter") {
        if (earthExplore) exitEarthExplore();
        else enterCore(1);
      } else if (event.code === "Space") {
        event.preventDefault();
        if (earthExplore) exitEarthExplore();
        else enterCore(1);
      } else if (event.key === "Escape") {
        resetOverview();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [earthExplore, enterCore, exitEarthExplore, navigateCategory, navigateObject, resetOverview, selectEntry]);

  useEffect(() => {
    if (mode !== "inner") {
    const id = window.setInterval(() => setCoreLevel((value) => Math.max(0, value - 0.065)), 50);
      return () => window.clearInterval(id);
    }
    const id = window.setInterval(() => setCoreLevel((value) => Math.min(1, value + 0.034)), 50);
    return () => window.clearInterval(id);
  }, [mode]);

  const updatePointer = (clientX: number, clientY: number, currentTarget: EventTarget & HTMLElement) => {
    const rect = currentTarget.getBoundingClientRect();
    controlsRef.current.pointer = {
      active: true,
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
      openness: controlsRef.current.pointer.openness || 1.2
    };
  };

  const viewLabel = earthExplore
    ? "地球探索模式"
    : isSolar
      ? modeLabel(mode)
      : `深空模式 · ${CATEGORIES.find((c) => c.id === entry.category)?.name}`;
  const earthRegion = regionById[earthRegionId];

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
        <Canvas camera={{ fov: 52, near: 0.05, far: 200, position: [0, 7, 24] }} dpr={[1, 1.35]} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}>
          <Suspense fallback={null}>
            <color attach="background" args={["#030611"]} />
            <CosmicBackdrop controlsRef={controlsRef} density={backgroundDensity(performanceMode)} />
            {earthExplore ? (
              <EarthExploreScene controlsRef={controlsRef} particleScale={particleScale} bloomEnabled={bloomEnabled} onRegion={setEarthRegionId} />
            ) : isSolar ? (
              <SolarSystemScene
                selectedId={entry.bodyId as BodyId}
                mode={mode}
                performanceMode={performanceMode}
                coreLevel={coreLevel}
                bloomEnabled={bloomEnabled}
                orbitLinesEnabled={orbitLinesEnabled}
                controlsRef={controlsRef}
                onSelectBody={(id) => selectEntry(id)}
              />
            ) : (
              <DeepSpaceScene entry={entry} particleScale={particleScale} controlsRef={controlsRef} bloomEnabled={bloomEnabled} />
            )}
          </Suspense>
        </Canvas>
      </div>

      <section className="hud-title">
        <div className="eyebrow">FUSIONOS / COSMIC EXPLORER</div>
        <h1>{entry.name}</h1>
        <p>
          {entry.englishName} · {viewLabel}
        </p>
      </section>

      <CosmosMenu
        activeCategory={menuCategory}
        selectedId={selectedId}
        onCategoryChange={(cat) => {
          setMenuCategory(cat);
          const first = entriesByCategory(cat)[0];
          if (first) selectEntry(first.id);
        }}
        onSelect={selectEntry}
      />

      <InfoCard entry={entry} tab={infoTab} onTabChange={setInfoTab} />

      <ApodPanel apod={apod} loading={apodLoading} />

      {earthExplore && earthRegion && (
        <section className="earth-region-panel">
          <div className="erp-eyebrow">地球探索 · 目前地區</div>
          <h3>{earthRegion.name}</h3>
          <p className="erp-en">{earthRegion.en}</p>
          <p className="erp-blurb">{earthRegion.blurb}</p>
          <div className="erp-flora">🌱 {earthRegion.flora}</div>
          <div className="erp-hint">揮手 / 拖曳環遊地表 · 張掌靠近 · 握拳離開</div>
        </section>
      )}

      <section className="control-strip">
        <div className="control-row">
          <span className={`gesture-pill ${debug.active ? "on" : ""}`}>{debug.active ? "手勢追蹤中" : gestureEnabled ? "等待手勢" : "手勢關閉"}</span>
          <span className="gesture-label">{debug.label}</span>
        </div>
        <div className="control-row buttons">
          <select value={performanceMode} onChange={(e) => setPerformanceMode(e.target.value as PerformanceMode)}>
            <option value="auto">Auto</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="button" onClick={() => setGestureEnabled((v) => !v)}>{gestureEnabled ? "關閉手勢" : "啟動手勢"}</button>
          <button type="button" onClick={() => setBloomEnabled((v) => !v)}>{bloomEnabled ? "Bloom✓" : "Bloom✗"}</button>
          <button type="button" onClick={() => setOrbitLinesEnabled((v) => !v)}>{orbitLinesEnabled ? "軌道✓" : "軌道✗"}</button>
          <button type="button" onClick={resetOverview}>重置視角</button>
        </div>
      </section>

      <div className="command-bar">
        <button type="button" onClick={() => navigateObject("prev")}>‹ 上一個</button>
        <button type="button" onClick={resetOverview}>總覽</button>
        <button type="button" onClick={() => setInfoTab("detail")}>詳細資料</button>
        <button type="button" onClick={() => navigateObject("next")}>下一個 ›</button>
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

function backgroundDensity(mode: PerformanceMode): number {
  if (mode === "low") return 0.18;
  if (mode === "medium") return 0.42;
  if (mode === "high") return 0.72;
  return 0.5;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
