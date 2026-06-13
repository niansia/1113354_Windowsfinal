import test from 'node:test';
import assert from 'node:assert/strict';
import {
  binomialProbability,
  combinations,
  connectedComponents,
  convertIntegerBase,
  definiteIntegral,
  determinant,
  describeSample,
  evaluateExpression,
  evaluateBooleanExpression,
  generateTruthTable,
  gcd,
  inverse,
  lcm,
  linearRegression,
  minimumSpanningTree,
  minimizeBooleanExpression,
  matrixMultiply,
  matrixGridToNumbers,
  modPow,
  normalCdf,
  numericalDerivative,
  graphRowsToGraph,
  insertMathToken,
  parseMatrix,
  permutations,
  primeFactorization,
  resizeMatrixGrid,
  seriesRowsToNumbers,
  shortestPath,
  reducedRowEchelon,
  solveLinearSystem,
  solveRoot,
  topologicalSort
} from '../src/math/index.js';

const closeTo = (actual: number, expected: number, tolerance = 1e-7) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
};

test('evaluates scientific expressions without dynamic code execution', () => {
  closeTo(evaluateExpression('sin(30)^2 + cos(30)^2', { angleMode: 'deg' }), 1);
  closeTo(evaluateExpression('sqrt(81) + log(1000) + ln(e)', { angleMode: 'rad' }), 13);
  assert.equal(evaluateExpression('5! / (3! * 2!)'), 10);
  assert.equal(evaluateExpression('x^3 - 2*x', { variables: { x: 4 } }), 56);
});

test('performs numerical calculus on user expressions', () => {
  closeTo(numericalDerivative('x^3 + x', 2), 13, 1e-5);
  closeTo(definiteIntegral('sin(x)', 0, Math.PI), 2, 1e-7);
  closeTo(solveRoot('x^2 - 2', 0, 2), Math.sqrt(2), 1e-8);
});

test('solves common linear algebra workflows', () => {
  const matrix = parseMatrix('1, 2; 3, 4');
  assert.deepEqual(matrix, [[1, 2], [3, 4]]);
  assert.equal(determinant(matrix), -2);
  assert.deepEqual(matrixMultiply(matrix, [[2], [1]]), [[4], [10]]);

  const inverted = inverse(matrix);
  closeTo(inverted[0][0], -2);
  closeTo(inverted[1][1], -0.5);

  const rref = reducedRowEchelon([[1, 2, 5], [3, 4, 11]]);
  closeTo(rref[0][0], 1);
  closeTo(rref[0][2], 1);
  closeTo(rref[1][1], 1);
  closeTo(rref[1][2], 2);

  assert.deepEqual(solveLinearSystem([[2, 1], [5, 7]], [11, 13]).map((value) => Math.round(value)), [7, -3]);
});

test('covers number theory and combinatorics utilities', () => {
  assert.equal(gcd(84, 30), 6);
  assert.equal(lcm(21, 6), 42);
  assert.equal(permutations(10, 3), 720);
  assert.equal(combinations(52, 5), 2_598_960);
  assert.deepEqual(primeFactorization(756), [2, 2, 3, 3, 3, 7]);
  assert.equal(modPow(7, 128, 13), 3);
  assert.equal(convertIntegerBase('FF', 16, 10), '255');
});

test('analyzes unweighted and weighted graphs', () => {
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

  assert.deepEqual(connectedComponents(graph), [['A', 'B', 'C', 'D'], ['X', 'Y']]);
  assert.deepEqual(shortestPath(graph, 'A', 'D'), {
    distance: 4,
    path: ['A', 'C', 'B', 'D']
  });

  const tree = minimumSpanningTree(graph);
  assert.equal(tree.totalWeight, 7);
  assert.equal(tree.edges.length, 4);
});

test('sorts directed acyclic graphs and rejects cycles', () => {
  const dag = {
    directed: true,
    edges: [
      { from: 'calculus', to: 'signals', weight: 1 },
      { from: 'linear', to: 'signals', weight: 1 },
      { from: 'signals', to: 'control', weight: 1 }
    ]
  };

  const order = topologicalSort(dag);
  assert.ok(order.indexOf('calculus') < order.indexOf('signals'));
  assert.ok(order.indexOf('linear') < order.indexOf('signals'));
  assert.ok(order.indexOf('signals') < order.indexOf('control'));

  assert.throws(() => topologicalSort({
    directed: true,
    edges: [
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'A', weight: 1 }
    ]
  }));
});

test('builds truth tables and minimizes boolean expressions', () => {
  assert.equal(evaluateBooleanExpression('A & (!B | C)', { A: true, B: false, C: false }), true);

  const table = generateTruthTable('A xor B');
  assert.deepEqual(table.variables, ['A', 'B']);
  assert.deepEqual(table.rows.map((row) => row.result), [false, true, true, false]);
  assert.equal(table.canonicalSop, '!A & B | A & !B');

  const minimized = minimizeBooleanExpression('(!A & B) | (A & B)');
  assert.equal(minimized, 'B');
});

test('produces descriptive statistics, regression, and probabilities', () => {
  const summary = describeSample([1, 2, 3, 4, 5]);
  assert.equal(summary.count, 5);
  assert.equal(summary.mean, 3);
  assert.equal(summary.median, 3);
  assert.equal(summary.q1, 1.5);
  assert.equal(summary.q3, 4.5);
  assert.equal(summary.sampleVariance, 2.5);

  const regression = linearRegression([1, 2, 3], [2, 4, 5]);
  closeTo(regression.slope, 1.5);
  closeTo(regression.intercept, 2 / 3);
  closeTo(regression.rSquared, 27 / 28);

  closeTo(binomialProbability(10, 3, 0.5), 0.1171875);
  closeTo(normalCdf(0), 0.5, 1e-7);
});

test('rejects malformed expressions and singular matrices', () => {
  assert.throws(() => evaluateExpression('2 + alert(1)'));
  assert.throws(() => inverse([[1, 2], [2, 4]]));
  assert.throws(() => combinations(4, 8));
});

test('turns editable matrix grids into calculation-ready matrices', () => {
  const resized = resizeMatrixGrid([['1', '2'], ['3', '4']], 3, 3);
  assert.deepEqual(resized, [
    ['1', '2', ''],
    ['3', '4', ''],
    ['', '', '']
  ]);
  assert.deepEqual(matrixGridToNumbers([['1', ''], ['-2.5', '4']]), [[1, 0], [-2.5, 4]]);
  assert.throws(() => matrixGridToNumbers([['1', 'not-a-number']]));
});

test('converts visible data rows and graph edge rows without delimiter syntax', () => {
  assert.deepEqual(seriesRowsToNumbers(['1', '', '2.5', '-4']), [1, 2.5, -4]);
  assert.deepEqual(graphRowsToGraph([
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

test('inserts math templates at the current caret instead of only appending', () => {
  assert.deepEqual(insertMathToken('2 + 4', 4, 5, 'sqrt(', 5), {
    value: '2 + sqrt(4)',
    caret: 9
  });
  assert.deepEqual(insertMathToken('sin()', 4, 4, 'pi'), {
    value: 'sin(pi)',
    caret: 6
  });
});
