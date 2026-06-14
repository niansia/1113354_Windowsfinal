"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatEngineering = exports.parseCircuitDocument = exports.rotateCircuitComponent = exports.createCircuitComponent = exports.getPartDefinition = exports.CIRCUIT_PARTS = void 0;
exports.CIRCUIT_PARTS = [
    { kind: 'battery', name: '電池', symbol: 'BAT', description: '直流電池電源', group: '電源', color: '#67e8ff', defaults: { voltage: 9 } },
    { kind: 'voltage-source', name: '電壓源', symbol: 'VDC', description: '理想直流電壓源', group: '電源', color: '#58a6ff', defaults: { voltage: 5 } },
    { kind: 'current-source', name: '電流源', symbol: 'IDC', description: '理想直流電流源', group: '電源', color: '#8b9dff', defaults: { current: 0.02 } },
    { kind: 'resistor', name: '電阻', symbol: 'R', description: '固定電阻負載', group: '被動元件', color: '#ffcc78', defaults: { resistance: 330 } },
    { kind: 'potentiometer', name: '可變電阻', symbol: 'VR', description: '可調整的電阻值', group: '被動元件', color: '#ffad66', defaults: { resistance: 1000 } },
    { kind: 'capacitor', name: '電容器', symbol: 'C', description: '直流穩態時視為開路', group: '被動元件', color: '#78ebda', defaults: { capacitance: 0.000001 } },
    { kind: 'inductor', name: '電感器', symbol: 'L', description: '直流穩態時接近短路', group: '被動元件', color: '#77b7ff', defaults: { inductance: 0.01 } },
    { kind: 'led', name: 'LED', symbol: 'LED', description: '分段線性發光二極體', group: '被動元件', color: '#ff6fcf', defaults: { forwardVoltage: 2, resistance: 1 } },
    { kind: 'lamp', name: '燈泡', symbol: 'LAMP', description: '可視化電阻負載', group: '被動元件', color: '#ffe56a', defaults: { resistance: 48 } },
    { kind: 'switch', name: '開關', symbol: 'SW', description: '可互動的開路或閉路接點', group: '控制', color: '#7ef6c8', defaults: { closed: true } },
    { kind: 'fuse', name: '保險絲', symbol: 'F', description: '電流超過額定值時開路', group: '控制', color: '#ff809d', defaults: { ratedCurrent: 0.5 } },
    { kind: 'ammeter', name: '電流表', symbol: 'A', description: '低電阻電流量測器', group: '量測', color: '#5df2ff', defaults: {} },
    { kind: 'voltmeter', name: '電壓表', symbol: 'V', description: '高電阻電壓量測器', group: '量測', color: '#be8cff', defaults: {} },
    { kind: 'ground', name: '接地', symbol: 'GND', description: '必要的零伏特參考點', group: '參考', color: '#b7c8e8', defaults: {} }
];
const getPartDefinition = (kind) => exports.CIRCUIT_PARTS.find((part) => part.kind === kind);
exports.getPartDefinition = getPartDefinition;
const nextLabel = (kind, index) => {
    const prefix = {
        battery: 'BAT',
        'voltage-source': 'V',
        'current-source': 'I',
        resistor: 'R',
        potentiometer: 'VR',
        led: 'LED',
        lamp: 'LAMP',
        switch: 'SW',
        fuse: 'F',
        capacitor: 'C',
        inductor: 'L',
        ammeter: 'A',
        voltmeter: 'VM',
        ground: 'GND'
    };
    return kind === 'ground' ? `GND${index}` : `${prefix[kind]}${index}`;
};
const createCircuitComponent = (kind, x, y, index) => {
    const definition = (0, exports.getPartDefinition)(kind);
    return {
        id: `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        kind,
        label: nextLabel(kind, index),
        x,
        y,
        rotation: 0,
        ...definition.defaults
    };
};
exports.createCircuitComponent = createCircuitComponent;
const rotateCircuitComponent = (rotation) => ((rotation + 90) % 360);
exports.rotateCircuitComponent = rotateCircuitComponent;
const parseCircuitDocument = (text) => {
    const parsed = JSON.parse(text);
    if (parsed.version !== 1 ||
        typeof parsed.id !== 'string' ||
        typeof parsed.name !== 'string' ||
        !Array.isArray(parsed.components) ||
        !Array.isArray(parsed.wires)) {
        throw new Error('此檔案不是有效的 Fusion 電路工作室專案。');
    }
    const validKinds = new Set(exports.CIRCUIT_PARTS.map((part) => part.kind));
    for (const component of parsed.components) {
        if (!component ||
            typeof component.id !== 'string' ||
            !validKinds.has(component.kind) ||
            typeof component.x !== 'number' ||
            typeof component.y !== 'number') {
            throw new Error('專案包含無效的元件。');
        }
    }
    for (const wire of parsed.wires) {
        if (!wire || typeof wire.id !== 'string' || typeof wire.from !== 'string' || typeof wire.to !== 'string') {
            throw new Error('專案包含無效的導線。');
        }
    }
    return {
        version: 1,
        id: parsed.id,
        name: parsed.name,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
        components: parsed.components,
        wires: parsed.wires
    };
};
exports.parseCircuitDocument = parseCircuitDocument;
const formatEngineering = (value, unit) => {
    if (!Number.isFinite(value))
        return `-- ${unit}`;
    const absolute = Math.abs(value);
    const scales = [
        { threshold: 1e9, divisor: 1e9, prefix: 'G' },
        { threshold: 1e6, divisor: 1e6, prefix: 'M' },
        { threshold: 1e3, divisor: 1e3, prefix: 'k' },
        { threshold: 1, divisor: 1, prefix: '' },
        { threshold: 1e-3, divisor: 1e-3, prefix: 'm' },
        { threshold: 1e-6, divisor: 1e-6, prefix: 'µ' },
        { threshold: 0, divisor: 1e-9, prefix: 'n' }
    ];
    const scale = scales.find((item) => absolute >= item.threshold) ?? scales[scales.length - 1];
    const scaled = value / scale.divisor;
    return `${scaled.toFixed(Math.abs(scaled) >= 100 ? 1 : Math.abs(scaled) >= 10 ? 2 : 3).replace(/\.?0+$/, '')} ${scale.prefix}${unit}`;
};
exports.formatEngineering = formatEngineering;
