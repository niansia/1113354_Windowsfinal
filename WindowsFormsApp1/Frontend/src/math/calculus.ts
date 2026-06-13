import { evaluateExpression, type AngleMode } from './expression.js';

const functionAt = (expression: string, x: number, angleMode: AngleMode) =>
  evaluateExpression(expression, { angleMode, variables: { x } });

export const numericalDerivative = (
  expression: string,
  x: number,
  angleMode: AngleMode = 'rad'
): number => {
  const step = Math.max(1e-5, Math.abs(x) * 1e-5);
  return (
    -functionAt(expression, x + 2 * step, angleMode)
    + 8 * functionAt(expression, x + step, angleMode)
    - 8 * functionAt(expression, x - step, angleMode)
    + functionAt(expression, x - 2 * step, angleMode)
  ) / (12 * step);
};

export const definiteIntegral = (
  expression: string,
  lower: number,
  upper: number,
  steps = 1000,
  angleMode: AngleMode = 'rad'
): number => {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) throw new Error('INVALID_BOUND');
  if (lower === upper) return 0;
  const count = Math.max(2, Math.min(100_000, Math.floor(steps / 2) * 2));
  const width = (upper - lower) / count;
  let sum = functionAt(expression, lower, angleMode) + functionAt(expression, upper, angleMode);
  for (let index = 1; index < count; index += 1) {
    sum += functionAt(expression, lower + index * width, angleMode) * (index % 2 === 0 ? 2 : 4);
  }
  return sum * width / 3;
};

export const solveRoot = (
  expression: string,
  lower: number,
  upper: number,
  angleMode: AngleMode = 'rad',
  tolerance = 1e-10
): number => {
  if (!(lower < upper)) throw new Error('INVALID_BOUND');
  let left = lower;
  let right = upper;
  let leftValue = functionAt(expression, left, angleMode);
  let rightValue = functionAt(expression, right, angleMode);
  if (Math.abs(leftValue) <= tolerance) return left;
  if (Math.abs(rightValue) <= tolerance) return right;

  if (leftValue * rightValue > 0) {
    const segments = 256;
    let previousX = left;
    let previousValue = leftValue;
    let found = false;
    for (let index = 1; index <= segments; index += 1) {
      const x = lower + (upper - lower) * index / segments;
      const value = functionAt(expression, x, angleMode);
      if (previousValue * value <= 0) {
        left = previousX;
        right = x;
        leftValue = previousValue;
        rightValue = value;
        found = true;
        break;
      }
      previousX = x;
      previousValue = value;
    }
    if (!found) throw new Error('ROOT_NOT_BRACKETED');
  }

  for (let iteration = 0; iteration < 200; iteration += 1) {
    const middle = (left + right) / 2;
    const middleValue = functionAt(expression, middle, angleMode);
    if (Math.abs(middleValue) <= tolerance || Math.abs(right - left) <= tolerance) return middle;
    if (leftValue * middleValue <= 0) {
      right = middle;
      rightValue = middleValue;
    } else {
      left = middle;
      leftValue = middleValue;
    }
  }
  return (left + right) / 2;
};
