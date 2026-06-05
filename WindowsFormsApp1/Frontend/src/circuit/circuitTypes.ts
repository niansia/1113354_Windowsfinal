export type CircuitComponentKind =
  | 'battery'
  | 'voltage-source'
  | 'current-source'
  | 'resistor'
  | 'potentiometer'
  | 'led'
  | 'lamp'
  | 'switch'
  | 'fuse'
  | 'capacitor'
  | 'inductor'
  | 'ammeter'
  | 'voltmeter'
  | 'ground';

export type CircuitRotation = 0 | 90 | 180 | 270;
export type TerminalKey = 'a' | 'b';

export interface CircuitComponent {
  id: string;
  kind: CircuitComponentKind;
  label: string;
  x: number;
  y: number;
  rotation: CircuitRotation;
  voltage?: number;
  current?: number;
  resistance?: number;
  forwardVoltage?: number;
  ratedCurrent?: number;
  capacitance?: number;
  inductance?: number;
  closed?: boolean;
}

export interface CircuitWire {
  id: string;
  from: string;
  to: string;
}

export interface CircuitDocument {
  version: 1;
  id: string;
  name: string;
  updatedAt: string;
  components: CircuitComponent[];
  wires: CircuitWire[];
}

export interface CircuitDiagnostic {
  code:
    | 'GROUND_REQUIRED'
    | 'EMPTY_CIRCUIT'
    | 'SINGULAR_CIRCUIT'
    | 'FUSE_OVERLOAD'
    | 'FLOATING_COMPONENT';
  severity: 'error' | 'warning';
  message: string;
  componentId?: string;
}

export interface ComponentReading {
  voltage: number;
  current: number;
  power: number;
  active: boolean;
  overloaded?: boolean;
}

export interface CircuitSimulationResult {
  ok: boolean;
  nodeVoltages: Record<string, number>;
  components: Record<string, ComponentReading>;
  diagnostics: CircuitDiagnostic[];
  totalCurrent: number;
  totalPower: number;
}

export const terminalId = (componentId: string, terminal: TerminalKey) =>
  `${componentId}:${terminal}`;
