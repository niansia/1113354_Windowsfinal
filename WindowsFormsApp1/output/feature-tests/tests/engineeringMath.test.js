"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const index_js_1 = require("../src/math/index.js");
const closeTo = (actual, expected, tolerance = 1e-7) => {
    strict_1.default.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`);
};
(0, node_test_1.default)('evaluates scientific expressions without dynamic code execution', () => {
    closeTo((0, index_js_1.evaluateExpression)('sin(30)^2 + cos(30)^2', { angleMode: 'deg' }), 1);
    closeTo((0, index_js_1.evaluateExpression)('sqrt(81) + log(1000) + ln(e)', { angleMode: 'rad' }), 13);
    strict_1.default.equal((0, index_js_1.evaluateExpression)('5! / (3! * 2!)'), 10);
    strict_1.default.equal((0, index_js_1.evaluateExpression)('x^3 - 2*x', { variables: { x: 4 } }), 56);
});
(0, node_test_1.default)('performs numerical calculus on user expressions', () => {
    closeTo((0, index_js_1.numericalDerivative)('x^3 + x', 2), 13, 1e-5);
    closeTo((0, index_js_1.definiteIntegral)('sin(x)', 0, Math.PI), 2, 1e-7);
    closeTo((0, index_js_1.solveRoot)('x^2 - 2', 0, 2), Math.sqrt(2), 1e-8);
});
(0, node_test_1.default)('solves common linear algebra workflows', () => {
    const matrix = (0, index_js_1.parseMatrix)('1, 2; 3, 4');
    strict_1.default.deepEqual(matrix, [[1, 2], [3, 4]]);
    strict_1.default.equal((0, index_js_1.determinant)(matrix), -2);
    strict_1.default.deepEqual((0, index_js_1.matrixMultiply)(matrix, [[2], [1]]), [[4], [10]]);
    const inverted = (0, index_js_1.inverse)(matrix);
    closeTo(inverted[0][0], -2);
    closeTo(inverted[1][1], -0.5);
    const rref = (0, index_js_1.reducedRowEchelon)([[1, 2, 5], [3, 4, 11]]);
    closeTo(rref[0][0], 1);
    closeTo(rref[0][2], 1);
    closeTo(rref[1][1], 1);
    closeTo(rref[1][2], 2);
    strict_1.default.deepEqual((0, index_js_1.solveLinearSystem)([[2, 1], [5, 7]], [11, 13]).map((value) => Math.round(value)), [7, -3]);
});
(0, node_test_1.default)('covers number theory and combinatorics utilities', () => {
    strict_1.default.equal((0, index_js_1.gcd)(84, 30), 6);
    strict_1.default.equal((0, index_js_1.lcm)(21, 6), 42);
    strict_1.default.equal((0, index_js_1.permutations)(10, 3), 720);
    strict_1.default.equal((0, index_js_1.combinations)(52, 5), 2_598_960);
    strict_1.default.deepEqual((0, index_js_1.primeFactorization)(756), [2, 2, 3, 3, 3, 7]);
    strict_1.default.equal((0, index_js_1.modPow)(7, 128, 13), 3);
    strict_1.default.equal((0, index_js_1.convertIntegerBase)('FF', 16, 10), '255');
});
(0, node_test_1.default)('analyzes unweighted and weighted graphs', () => {
    const graph = {
        directed: false,
        edges: [
            { from: 'A', to: 'B', weight: 4 },
            { from: 'A', to: 'C', weight: 1 },
            { from: 'C', to: 'B', weight: 2 },
            { from: 'B', to: 'D', weight: 1 },
            { from: 'C', to: 'D', weight: 5 },
            { from: 'X', to: 'Y', weight: 3 }
        ]
    };
    strict_1.default.deepEqual((0, index_js_1.connectedComponents)(graph), [['A', 'B', 'C', 'D'], ['X', 'Y']]);
    strict_1.default.deepEqual((0, index_js_1.shortestPath)(graph, 'A', 'D'), {
        distance: 4,
        path: ['A', 'C', 'B', 'D']
    });
    const tree = (0, index_js_1.minimumSpanningTree)(graph);
    strict_1.default.equal(tree.totalWeight, 7);
    strict_1.default.equal(tree.edges.length, 4);
});
(0, node_test_1.default)('sorts directed acyclic graphs and rejects cycles', () => {
    const dag = {
        directed: true,
        edges: [
            { from: 'calculus', to: 'signals', weight: 1 },
            { from: 'linear', to: 'signals', weight: 1 },
            { from: 'signals', to: 'control', weight: 1 }
        ]
    };
    const order = (0, index_js_1.topologicalSort)(dag);
    strict_1.default.ok(order.indexOf('calculus') < order.indexOf('signals'));
    strict_1.default.ok(order.indexOf('linear') < order.indexOf('signals'));
    strict_1.default.ok(order.indexOf('signals') < order.indexOf('control'));
    strict_1.default.throws(() => (0, index_js_1.topologicalSort)({
        directed: true,
        edges: [
            { from: 'A', to: 'B', weight: 1 },
            { from: 'B', to: 'A', weight: 1 }
        ]
    }));
});
(0, node_test_1.default)('builds truth tables and minimizes boolean expressions', () => {
    strict_1.default.equal((0, index_js_1.evaluateBooleanExpression)('A & (!B | C)', { A: true, B: false, C: false }), true);
    const table = (0, index_js_1.generateTruthTable)('A xor B');
    strict_1.default.deepEqual(table.variables, ['A', 'B']);
    strict_1.default.deepEqual(table.rows.map((row) => row.result), [false, true, true, false]);
    strict_1.default.equal(table.canonicalSop, '!A & B | A & !B');
    const minimized = (0, index_js_1.minimizeBooleanExpression)('(!A & B) | (A & B)');
    strict_1.default.equal(minimized, 'B');
});
(0, node_test_1.default)('produces descriptive statistics, regression, and probabilities', () => {
    const summary = (0, index_js_1.describeSample)([1, 2, 3, 4, 5]);
    strict_1.default.equal(summary.count, 5);
    strict_1.default.equal(summary.mean, 3);
    strict_1.default.equal(summary.median, 3);
    strict_1.default.equal(summary.q1, 1.5);
    strict_1.default.equal(summary.q3, 4.5);
    strict_1.default.equal(summary.sampleVariance, 2.5);
    const regression = (0, index_js_1.linearRegression)([1, 2, 3], [2, 4, 5]);
    closeTo(regression.slope, 1.5);
    closeTo(regression.intercept, 2 / 3);
    closeTo(regression.rSquared, 27 / 28);
    closeTo((0, index_js_1.binomialProbability)(10, 3, 0.5), 0.1171875);
    closeTo((0, index_js_1.normalCdf)(0), 0.5, 1e-7);
});
(0, node_test_1.default)('rejects malformed expressions and singular matrices', () => {
    strict_1.default.throws(() => (0, index_js_1.evaluateExpression)('2 + alert(1)'));
    strict_1.default.throws(() => (0, index_js_1.inverse)([[1, 2], [2, 4]]));
    strict_1.default.throws(() => (0, index_js_1.combinations)(4, 8));
});
(0, node_test_1.default)('turns editable matrix grids into calculation-ready matrices', () => {
    const resized = (0, index_js_1.resizeMatrixGrid)([['1', '2'], ['3', '4']], 3, 3);
    strict_1.default.deepEqual(resized, [
        ['1', '2', ''],
        ['3', '4', ''],
        ['', '', '']
    ]);
    strict_1.default.deepEqual((0, index_js_1.matrixGridToNumbers)([['1', ''], ['-2.5', '4']]), [[1, 0], [-2.5, 4]]);
    strict_1.default.throws(() => (0, index_js_1.matrixGridToNumbers)([['1', 'not-a-number']]));
});
(0, node_test_1.default)('converts visible data rows and graph edge rows without delimiter syntax', () => {
    strict_1.default.deepEqual((0, index_js_1.seriesRowsToNumbers)(['1', '', '2.5', '-4']), [1, 2.5, -4]);
    strict_1.default.deepEqual((0, index_js_1.graphRowsToGraph)([
        { id: 'edge-1', from: 'A', to: 'B', weight: '' },
        { id: 'edge-2', from: 'B', to: 'C', weight: '2.5' },
        { id: 'edge-3', from: '', to: '', weight: '' }
    ], true), {
        directed: true,
        edges: [
            { from: 'A', to: 'B', weight: 1 },
            { from: 'B', to: 'C', weight: 2.5 }
        ]
    });
});
(0, node_test_1.default)('inserts math templates at the current caret instead of only appending', () => {
    strict_1.default.deepEqual((0, index_js_1.insertMathToken)('2 + 4', 4, 5, 'sqrt(', 5), {
        value: '2 + sqrt(4)',
        caret: 9
    });
    strict_1.default.deepEqual((0, index_js_1.insertMathToken)('sin()', 4, 4, 'pi'), {
        value: 'sin(pi)',
        caret: 6
    });
});
