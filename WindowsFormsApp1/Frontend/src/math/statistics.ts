import { combinations } from './discreteMath.js';

export interface SampleSummary {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  populationVariance: number;
  sampleVariance: number;
  populationStdDev: number;
  sampleStdDev: number;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  correlation: number;
  rSquared: number;
}

export const parseNumberList = (source: string): number[] => {
  const values = source.split(/[\s,;]+/).filter(Boolean).map(Number);
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) throw new Error('INVALID_SAMPLE');
  return values;
};

const medianOfSorted = (values: number[]): number => {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
};

export const describeSample = (sample: number[]): SampleSummary => {
  if (sample.length === 0 || sample.some((value) => !Number.isFinite(value))) throw new Error('INVALID_SAMPLE');
  const sorted = [...sample].sort((left, right) => left - right);
  const count = sorted.length;
  const sum = sorted.reduce((total, value) => total + value, 0);
  const mean = sum / count;
  const median = medianOfSorted(sorted);
  const midpoint = Math.floor(count / 2);
  const lower = sorted.slice(0, midpoint);
  const upper = sorted.slice(count % 2 === 0 ? midpoint : midpoint + 1);
  const q1 = lower.length ? medianOfSorted(lower) : median;
  const q3 = upper.length ? medianOfSorted(upper) : median;
  const squared = sorted.reduce((total, value) => total + (value - mean) ** 2, 0);
  const populationVariance = squared / count;
  const sampleVariance = count > 1 ? squared / (count - 1) : 0;
  return {
    count,
    sum,
    mean,
    median,
    min: sorted[0],
    max: sorted[count - 1],
    range: sorted[count - 1] - sorted[0],
    q1,
    q3,
    populationVariance,
    sampleVariance,
    populationStdDev: Math.sqrt(populationVariance),
    sampleStdDev: Math.sqrt(sampleVariance)
  };
};

export const linearRegression = (x: number[], y: number[]): RegressionResult => {
  if (x.length !== y.length || x.length < 2 || x.some((value) => !Number.isFinite(value)) || y.some((value) => !Number.isFinite(value))) {
    throw new Error('INVALID_SAMPLE');
  }
  const xMean = x.reduce((sum, value) => sum + value, 0) / x.length;
  const yMean = y.reduce((sum, value) => sum + value, 0) / y.length;
  let xx = 0;
  let yy = 0;
  let xy = 0;
  x.forEach((value, index) => {
    const dx = value - xMean;
    const dy = y[index] - yMean;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  });
  if (xx === 0 || yy === 0) throw new Error('ZERO_VARIANCE');
  const slope = xy / xx;
  const intercept = yMean - slope * xMean;
  const correlation = xy / Math.sqrt(xx * yy);
  return { slope, intercept, correlation, rSquared: correlation ** 2 };
};

export const binomialProbability = (n: number, k: number, probability: number): number => {
  if (probability < 0 || probability > 1) throw new Error('INVALID_PROBABILITY');
  return combinations(n, k) * probability ** k * (1 - probability) ** (n - k);
};

export const normalPdf = (value: number, mean = 0, stdDev = 1): number => {
  if (!(stdDev > 0)) throw new Error('INVALID_STANDARD_DEVIATION');
  const z = (value - mean) / stdDev;
  return Math.exp(-0.5 * z * z) / (stdDev * Math.sqrt(2 * Math.PI));
};

const erf = (value: number): number => {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sign * (1 - polynomial * Math.exp(-x * x));
};

export const normalCdf = (value: number, mean = 0, stdDev = 1): number => {
  if (!(stdDev > 0)) throw new Error('INVALID_STANDARD_DEVIATION');
  if (value === mean) return 0.5;
  return 0.5 * (1 + erf((value - mean) / (stdDev * Math.SQRT2)));
};

export const zScore = (value: number, mean: number, stdDev: number): number => {
  if (!(stdDev > 0)) throw new Error('INVALID_STANDARD_DEVIATION');
  return (value - mean) / stdDev;
};
