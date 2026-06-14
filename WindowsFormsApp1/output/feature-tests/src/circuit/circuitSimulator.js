"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateCircuit = void 0;
const circuitTypes_js_1 = require("./circuitTypes.js");
const OPEN_RESISTANCE = 1e12;
const CLOSED_SWITCH_RESISTANCE = 0.01;
const INDUCTOR_RESISTANCE = 0.01;
const AMMETER_RESISTANCE = 0.01;
const VOLTMETER_RESISTANCE = 1e9;
const EPSILON = 1e-10;
class DisjointSet {
    parent = new Map();
    add(value) {
        if (!this.parent.has(value))
            this.parent.set(value, value);
    }
    find(value) {
        this.add(value);
        const parent = this.parent.get(value);
        if (parent === value)
            return value;
        const root = this.find(parent);
        this.parent.set(value, root);
        return root;
    }
    union(a, b) {
        const rootA = this.find(a);
        const rootB = this.find(b);
        if (rootA !== rootB)
            this.parent.set(rootB, rootA);
    }
}
const hasTwoTerminals = (component) => component.kind !== 'ground';
const effectiveResistance = (component, blownFuses) => {
    switch (component.kind) {
        case 'resistor':
        case 'potentiometer':
        case 'lamp':
            return Math.max(component.resistance ?? 1000, 0.001);
        case 'switch':
            return component.closed ? CLOSED_SWITCH_RESISTANCE : OPEN_RESISTANCE;
        case 'fuse':
            return blownFuses.has(component.id) ? OPEN_RESISTANCE : 0.02;
        case 'capacitor':
            return OPEN_RESISTANCE;
        case 'inductor':
            return INDUCTOR_RESISTANCE;
        case 'ammeter':
            return AMMETER_RESISTANCE;
        case 'voltmeter':
            return VOLTMETER_RESISTANCE;
        default:
            return null;
    }
};
const solveLinearSystem = (matrix, rhs) => {
    const size = rhs.length;
    const a = matrix.map((row, index) => [...row, rhs[index]]);
    for (let column = 0; column < size; column += 1) {
        let pivot = column;
        for (let row = column + 1; row < size; row += 1) {
            if (Math.abs(a[row][column]) > Math.abs(a[pivot][column]))
                pivot = row;
        }
        if (Math.abs(a[pivot][column]) < EPSILON)
            return null;
        [a[column], a[pivot]] = [a[pivot], a[column]];
        const pivotValue = a[column][column];
        for (let col = column; col <= size; col += 1)
            a[column][col] /= pivotValue;
        for (let row = 0; row < size; row += 1) {
            if (row === column)
                continue;
            const factor = a[row][column];
            if (Math.abs(factor) < EPSILON)
                continue;
            for (let col = column; col <= size; col += 1) {
                a[row][col] -= factor * a[column][col];
            }
        }
    }
    return a.map((row) => row[size]);
};
const simulateCircuit = (document) => {
    const diagnostics = [];
    const emptyResult = (code, message) => ({
        ok: false,
        nodeVoltages: {},
        components: {},
        diagnostics: [{ code, severity: 'error', message }],
        totalCurrent: 0,
        totalPower: 0
    });
    if (!document.components.length)
        return emptyResult('EMPTY_CIRCUIT', '請先放置元件再執行模擬。');
    const ground = document.components.find((component) => component.kind === 'ground');
    if (!ground)
        return emptyResult('GROUND_REQUIRED', '請先新增並連接接地參考點再執行模擬。');
    const dsu = new DisjointSet();
    for (const component of document.components) {
        dsu.add((0, circuitTypes_js_1.terminalId)(component.id, 'a'));
        if (hasTwoTerminals(component))
            dsu.add((0, circuitTypes_js_1.terminalId)(component.id, 'b'));
    }
    for (const wire of document.wires)
        dsu.union(wire.from, wire.to);
    const groundRoot = dsu.find((0, circuitTypes_js_1.terminalId)(ground.id, 'a'));
    const roots = new Set();
    for (const component of document.components) {
        roots.add(dsu.find((0, circuitTypes_js_1.terminalId)(component.id, 'a')));
        if (hasTwoTerminals(component))
            roots.add(dsu.find((0, circuitTypes_js_1.terminalId)(component.id, 'b')));
    }
    const nodeRoots = [...roots].filter((root) => root !== groundRoot);
    const nodeIndex = new Map(nodeRoots.map((root, index) => [root, index]));
    const voltageSources = document.components.filter((component) => component.kind === 'battery' || component.kind === 'voltage-source');
    const sourceIndex = new Map(voltageSources.map((component, index) => [component.id, index]));
    const contexts = document.components.map((component) => ({
        component,
        nodeA: nodeIndex.get(dsu.find((0, circuitTypes_js_1.terminalId)(component.id, 'a'))) ?? null,
        nodeB: hasTwoTerminals(component)
            ? nodeIndex.get(dsu.find((0, circuitTypes_js_1.terminalId)(component.id, 'b'))) ?? null
            : null
    }));
    const ledActive = new Map();
    const blownFuses = new Set();
    let solution = null;
    const nodeVoltage = (node) => node === null ? 0 : (solution?.[node] ?? 0);
    const runSolve = () => {
        const nodeCount = nodeRoots.length;
        const size = nodeCount + voltageSources.length;
        const matrix = Array.from({ length: size }, () => Array(size).fill(0));
        const rhs = Array(size).fill(0);
        const stampConductance = (nodeA, nodeB, conductance) => {
            if (nodeA !== null)
                matrix[nodeA][nodeA] += conductance;
            if (nodeB !== null)
                matrix[nodeB][nodeB] += conductance;
            if (nodeA !== null && nodeB !== null) {
                matrix[nodeA][nodeB] -= conductance;
                matrix[nodeB][nodeA] -= conductance;
            }
        };
        const stampCurrent = (nodeA, nodeB, current) => {
            if (nodeA !== null)
                rhs[nodeA] -= current;
            if (nodeB !== null)
                rhs[nodeB] += current;
        };
        for (const context of contexts) {
            const { component, nodeA, nodeB } = context;
            const resistance = effectiveResistance(component, blownFuses);
            if (resistance !== null && resistance < OPEN_RESISTANCE) {
                stampConductance(nodeA, nodeB, 1 / resistance);
            }
            if (component.kind === 'current-source') {
                stampCurrent(nodeA, nodeB, component.current ?? 0.01);
            }
            if (component.kind === 'led') {
                const active = ledActive.get(component.id) ?? false;
                if (active) {
                    const resistance = Math.max(component.resistance ?? 1, 0.1);
                    const conductance = 1 / resistance;
                    const forwardVoltage = Math.max(component.forwardVoltage ?? 2, 0);
                    stampConductance(nodeA, nodeB, conductance);
                    stampCurrent(nodeA, nodeB, -conductance * forwardVoltage);
                }
                else {
                    stampConductance(nodeA, nodeB, 1 / OPEN_RESISTANCE);
                }
            }
            if (component.kind === 'battery' || component.kind === 'voltage-source') {
                const source = nodeCount + sourceIndex.get(component.id);
                if (nodeA !== null) {
                    matrix[nodeA][source] += 1;
                    matrix[source][nodeA] += 1;
                }
                if (nodeB !== null) {
                    matrix[nodeB][source] -= 1;
                    matrix[source][nodeB] -= 1;
                }
                rhs[source] += component.voltage ?? 5;
            }
        }
        return size === 0 ? [] : solveLinearSystem(matrix, rhs);
    };
    for (let iteration = 0; iteration < 16; iteration += 1) {
        solution = runSolve();
        if (!solution)
            break;
        let changed = false;
        for (const context of contexts) {
            if (context.component.kind !== 'led')
                continue;
            const voltage = nodeVoltage(context.nodeA) - nodeVoltage(context.nodeB);
            const active = voltage > (context.component.forwardVoltage ?? 2);
            if ((ledActive.get(context.component.id) ?? false) !== active) {
                ledActive.set(context.component.id, active);
                changed = true;
            }
        }
        if (!changed)
            break;
    }
    if (!solution)
        return emptyResult('SINGULAR_CIRCUIT', '電路包含浮接節點或互相衝突的理想電源。');
    const calculateReading = (context) => {
        const { component, nodeA, nodeB } = context;
        const voltage = nodeVoltage(nodeA) - nodeVoltage(nodeB);
        let current = 0;
        let active = false;
        if (component.kind === 'battery' || component.kind === 'voltage-source') {
            current = solution[nodeRoots.length + sourceIndex.get(component.id)] ?? 0;
            active = Math.abs(current) > 1e-8;
        }
        else if (component.kind === 'current-source') {
            current = component.current ?? 0.01;
            active = Math.abs(current) > 1e-8;
        }
        else if (component.kind === 'led') {
            active = ledActive.get(component.id) ?? false;
            current = active
                ? Math.max(0, (voltage - (component.forwardVoltage ?? 2)) / Math.max(component.resistance ?? 1, 0.1))
                : 0;
        }
        else {
            const resistance = effectiveResistance(component, blownFuses);
            current = resistance && resistance < OPEN_RESISTANCE ? voltage / resistance : 0;
            active = component.kind === 'switch'
                ? Boolean(component.closed)
                : component.kind === 'capacitor'
                    ? false
                    : Math.abs(current) > 1e-6;
        }
        return {
            voltage,
            current,
            power: voltage * current,
            active
        };
    };
    let readings = Object.fromEntries(contexts.map((context) => [context.component.id, calculateReading(context)]));
    let fuseChanged = false;
    for (const component of document.components) {
        if (component.kind !== 'fuse')
            continue;
        const reading = readings[component.id];
        const rated = Math.max(component.ratedCurrent ?? 0.5, 0.001);
        if (Math.abs(reading.current) > rated) {
            blownFuses.add(component.id);
            fuseChanged = true;
            diagnostics.push({
                code: 'FUSE_OVERLOAD',
                severity: 'warning',
                message: `${component.label} 超過 ${rated} A 額定電流，保險絲已開路。`,
                componentId: component.id
            });
        }
    }
    if (fuseChanged) {
        solution = runSolve();
        if (solution) {
            readings = Object.fromEntries(contexts.map((context) => {
                const reading = calculateReading(context);
                return [
                    context.component.id,
                    context.component.kind === 'fuse'
                        ? { ...reading, current: 0, power: 0, active: false, overloaded: blownFuses.has(context.component.id) }
                        : reading
                ];
            }));
        }
    }
    const nodeVoltages = { [groundRoot]: 0 };
    nodeRoots.forEach((root, index) => {
        nodeVoltages[root] = solution?.[index] ?? 0;
    });
    const sourceReadings = voltageSources.map((component) => readings[component.id]).filter(Boolean);
    const totalCurrent = sourceReadings.reduce((sum, reading) => sum + Math.abs(reading.current), 0);
    const totalPower = sourceReadings.reduce((sum, reading) => sum + Math.abs(reading.power), 0);
    return {
        ok: true,
        nodeVoltages,
        components: readings,
        diagnostics,
        totalCurrent,
        totalPower
    };
};
exports.simulateCircuit = simulateCircuit;
