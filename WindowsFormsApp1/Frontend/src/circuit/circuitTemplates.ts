import type {
  CircuitComponent,
  CircuitComponentKind,
  CircuitDocument,
  CircuitWire
} from './circuitTypes.js';
import { terminalId } from './circuitTypes.js';

const now = () => new Date().toISOString();

const component = (
  id: string,
  kind: CircuitComponentKind,
  label: string,
  x: number,
  y: number,
  values: Partial<CircuitComponent> = {}
): CircuitComponent => ({
  id,
  kind,
  label,
  x,
  y,
  rotation: 0,
  ...values
});

const wire = (
  id: string,
  fromComponent: string,
  fromTerminal: 'a' | 'b',
  toComponent: string,
  toTerminal: 'a' | 'b'
): CircuitWire => ({
  id,
  from: terminalId(fromComponent, fromTerminal),
  to: terminalId(toComponent, toTerminal)
});

const document = (
  id: string,
  name: string,
  components: CircuitComponent[],
  wires: CircuitWire[]
): CircuitDocument => ({
  version: 1,
  id,
  name,
  updatedAt: now(),
  components,
  wires
});

export const createResistorCircuit = (voltage = 9, resistance = 330) =>
  document(
    'resistor-loop',
    '電阻迴路',
    [
      component('source', 'battery', 'BAT1', 120, 180, { voltage }),
      component('resistor', 'resistor', 'R1', 390, 120, { resistance }),
      component('ground', 'ground', 'GND', 390, 300)
    ],
    [
      wire('w1', 'source', 'a', 'resistor', 'a'),
      wire('w2', 'resistor', 'b', 'source', 'b'),
      wire('w3', 'source', 'b', 'ground', 'a')
    ]
  );

export const createLedStarterCircuit = () =>
  document(
    'led-starter',
    'LED 入門電路',
    [
      component('source', 'battery', 'BAT1', 100, 190, { voltage: 9 }),
      component('resistor', 'resistor', 'R1', 330, 90, { resistance: 330 }),
      component('led', 'led', 'LED1', 570, 190, { forwardVoltage: 2, resistance: 1 }),
      component('ground', 'ground', 'GND', 330, 330)
    ],
    [
      wire('w1', 'source', 'a', 'resistor', 'a'),
      wire('w2', 'resistor', 'b', 'led', 'a'),
      wire('w3', 'led', 'b', 'source', 'b'),
      wire('w4', 'source', 'b', 'ground', 'a')
    ]
  );

export const createOpenSwitchCircuit = () =>
  document(
    'switch-lamp',
    '開關燈泡',
    [
      component('source', 'battery', 'BAT1', 100, 190, { voltage: 12 }),
      component('switch', 'switch', 'SW1', 330, 90, { closed: false }),
      component('lamp', 'lamp', 'L1', 570, 190, { resistance: 48 }),
      component('ground', 'ground', 'GND', 330, 330)
    ],
    [
      wire('w1', 'source', 'a', 'switch', 'a'),
      wire('w2', 'switch', 'b', 'lamp', 'a'),
      wire('w3', 'lamp', 'b', 'source', 'b'),
      wire('w4', 'source', 'b', 'ground', 'a')
    ]
  );

export const createParallelCircuit = () =>
  document(
    'parallel-loads',
    '並聯負載',
    [
      component('source', 'voltage-source', 'V1', 90, 210, { voltage: 12 }),
      component('r1', 'resistor', 'R1', 350, 80, { resistance: 220 }),
      component('r2', 'resistor', 'R2', 350, 210, { resistance: 470 }),
      component('lamp', 'lamp', 'L1', 350, 340, { resistance: 96 }),
      component('ground', 'ground', 'GND', 650, 300)
    ],
    [
      wire('w1', 'source', 'a', 'r1', 'a'),
      wire('w2', 'source', 'a', 'r2', 'a'),
      wire('w3', 'source', 'a', 'lamp', 'a'),
      wire('w4', 'r1', 'b', 'source', 'b'),
      wire('w5', 'r2', 'b', 'source', 'b'),
      wire('w6', 'lamp', 'b', 'source', 'b'),
      wire('w7', 'source', 'b', 'ground', 'a')
    ]
  );

export const createMeasurementBench = () =>
  document(
    'measurement-bench',
    '量測工作台',
    [
      component('source', 'battery', 'BAT1', 80, 220, { voltage: 9 }),
      component('ammeter', 'ammeter', 'A1', 275, 100),
      component('resistor', 'resistor', 'R1', 500, 100, { resistance: 330 }),
      component('voltmeter', 'voltmeter', 'V1', 500, 300),
      component('ground', 'ground', 'GND', 735, 300)
    ],
    [
      wire('w1', 'source', 'a', 'ammeter', 'a'),
      wire('w2', 'ammeter', 'b', 'resistor', 'a'),
      wire('w3', 'resistor', 'b', 'source', 'b'),
      wire('w4', 'voltmeter', 'a', 'resistor', 'a'),
      wire('w5', 'voltmeter', 'b', 'resistor', 'b'),
      wire('w6', 'source', 'b', 'ground', 'a')
    ]
  );

export const CIRCUIT_TEMPLATES = [
  { id: 'led', name: 'LED 入門電路', description: '9 V 電源、限流電阻與 LED', create: createLedStarterCircuit },
  { id: 'series', name: '串聯迴路', description: '簡單的電源與電阻迴路', create: () => createResistorCircuit() },
  { id: 'parallel', name: '並聯負載', description: '三個負載共用同一電源', create: createParallelCircuit },
  { id: 'switch', name: '開關燈泡', description: '以互動開關控制燈泡', create: createOpenSwitchCircuit },
  { id: 'meters', name: '量測工作台', description: '電流表與電壓表接線範例', create: createMeasurementBench }
] as const;
