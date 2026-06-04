import type { MutableRefObject } from "react";
import type { Vector3 } from "three";

export type BodyId =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type SceneMode = "overview" | "focus" | "inner";

export type PerformanceMode = "low" | "medium" | "high" | "auto";

export type VisualFeature =
  | "solar"
  | "rocky"
  | "cloudy"
  | "earth"
  | "dust"
  | "banded"
  | "ringed"
  | "ice"
  | "deepIce";

export interface RingConfig {
  innerRadius: number;
  outerRadius: number;
  tilt: number;
  particleCount: number;
  colors: string[];
  density: number;
  brightness: number;
}

export interface CelestialBodyData {
  id: BodyId;
  name: string;
  englishName: string;
  type: "sun" | "planet";
  radiusKm: string;
  averageDistance: string;
  satellites: string;
  rotationPeriod: string;
  orbitalPeriod: string;
  visualRadius: number;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  particleCount: number;
  focusParticleCount: number;
  colors: string[];
  coreColor: string;
  glowIntensity: number;
  feature: VisualFeature;
  seed: number;
  ringConfig?: RingConfig;
}

export interface GesturePointer {
  active: boolean;
  x: number;
  y: number;
  openness: number;
}

export interface RuntimeControls {
  orbitImpulse: number;
  elevationImpulse: number;
  zoomImpulse: number;
  pointer: GesturePointer;
  lastGestureLabel: string;
}

export type RuntimeControlsRef = MutableRefObject<RuntimeControls>;

export interface BodyPositions {
  [key: string]: Vector3;
}

// Kept for the desktop keyboard shortcut map (1-8 → planet); the hand gesture
// for number-counting has been removed in favour of movement-based travel.
export type NumberGestureValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type GestureEvent =
  | { type: "openPalm"; amount: number }
  | { type: "closedFist"; confidence: number }
  | { type: "orbit"; velocityX: number; velocityY: number }
  | { type: "pointer"; pointer: GesturePointer }
  | { type: "swipe"; dir: "left" | "right" }
  | { type: "tilt"; dir: "up" | "down" };

export interface GestureDebugState {
  enabled: boolean;
  active: boolean;
  label: string;
  confidence: number;
  fingerStates: string;
  fps: number;
}
