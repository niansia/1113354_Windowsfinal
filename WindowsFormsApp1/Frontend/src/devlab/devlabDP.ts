import {
  FrameBuilder,
  msg,
  type CellState,
  type DevTrace,
  type MatrixCell,
  type MatrixScene
} from './devlabScene.js';

export type DpAlgorithmId = 'fibonacci' | 'coin-change' | 'knapsack' | 'lcs' | 'edit-distance';

const cell = (value: number | string, state: CellState = 'idle'): MatrixCell => ({ value, state });

const cloneGrid = (grid: MatrixCell[][]): MatrixCell[][] => grid.map((row) => row.map((c) => ({ ...c })));

const parseInts = (input: string): number[] =>
  input
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map(Number);

// ---- Fibonacci -------------------------------------------------------------------

function runFibonacci(input: string, fb: FrameBuilder): DevTrace {
  const n = Math.min(20, Math.max(1, Math.round(Number(input.trim()) || 10)));
  const dp = Array.from({ length: n + 1 }, () => 0);
  const grid: MatrixCell[][] = [Array.from({ length: n + 1 }, (_, i) => cell(0))];
  const labels = Array.from({ length: n + 1 }, (_, i) => `F${i}`);

  const scene = (highlight?: string): MatrixScene => ({
    kind: 'matrix',
    cells: cloneGrid(grid),
    colLabels: labels,
    colHeader: 'n',
    highlight
  });

  dp[0] = 0;
  grid[0][0] = cell(0, 'settled');
  fb.push(scene('F0 = 0'), msg('基底：F0 = 0。'), 0, 'fill');
  if (n >= 1) {
    dp[1] = 1;
    grid[0][1] = cell(1, 'settled');
    fb.push(scene('F1 = 1'), msg('基底：F1 = 1。'), 0, 'fill');
  }
  for (let i = 2; i <= n; i += 1) {
    grid[0][i - 1] = cell(dp[i - 1], 'compare');
    grid[0][i - 2] = cell(dp[i - 2], 'compare');
    grid[0][i] = cell('?', 'active');
    fb.metrics.comparisons += 1;
    fb.push(scene(`F${i} = F${i - 1} + F${i - 2}`), msg('F{0} = F{1} + F{2} = {3} + {4}。', i, i - 1, i - 2, dp[i - 1], dp[i - 2]), 1, 'fill');
    dp[i] = dp[i - 1] + dp[i - 2];
    fb.metrics.writes += 1;
    grid[0][i - 1] = cell(dp[i - 1], 'settled');
    grid[0][i - 2] = cell(dp[i - 2], 'settled');
    grid[0][i] = cell(dp[i], 'settled');
    fb.push(scene(`F${i} = ${dp[i]}`), msg('得到 F{0} = {1}。', i, dp[i]), 2, 'fill');
  }
  grid[0][n] = cell(dp[n], 'path');
  fb.push(scene(`F${n} = ${dp[n]}`), msg('費氏數 F{0} = {1}。', n, dp[n]), 3, 'complete');
  return fb.build(msg('費氏數 F{0} = {1}。', n, dp[n]));
}

// ---- Coin change (minimum coins) -------------------------------------------------

function runCoinChange(input: string, fb: FrameBuilder): DevTrace {
  const [coinPart, amountPart] = input.split('|');
  const coins = parseInts(coinPart ?? '1,3,4').filter((c) => c > 0);
  const amount = Math.min(30, Math.max(0, Math.round(Number((amountPart ?? '6').trim()) || 6)));
  if (!coins.length) throw new Error('請輸入至少一種硬幣面額。');
  const INF = Infinity;
  const dp = Array.from({ length: amount + 1 }, () => INF);
  dp[0] = 0;
  const display = (v: number) => (v === INF ? '∞' : v);
  const grid: MatrixCell[][] = [Array.from({ length: amount + 1 }, (_, i) => cell(i === 0 ? 0 : '∞', i === 0 ? 'settled' : 'idle'))];
  const labels = Array.from({ length: amount + 1 }, (_, i) => i);

  const scene = (highlight?: string): MatrixScene => ({
    kind: 'matrix',
    cells: cloneGrid(grid),
    colLabels: labels,
    colHeader: '金額',
    highlight
  });

  fb.push(scene('dp[0] = 0'), msg('硬幣面額 {0}，目標金額 {1}。', coins.join('、'), amount), 0, 'ready');
  for (let a = 1; a <= amount; a += 1) {
    for (const coin of coins) {
      if (coin > a) continue;
      fb.metrics.comparisons += 1;
      const via = dp[a - coin];
      grid[0][a] = cell(display(dp[a]), 'active');
      grid[0][a - coin] = cell(display(dp[a - coin]), 'compare');
      fb.push(scene(`dp[${a}] ← min(dp[${a}], dp[${a - coin}] + 1)`), msg('金額 {0}：嘗試使用硬幣 {1}。', a, coin), 1, 'fill');
      if (via + 1 < dp[a]) {
        dp[a] = via + 1;
        fb.metrics.writes += 1;
        grid[0][a] = cell(display(dp[a]), 'settled');
        fb.push(scene(`dp[${a}] = ${display(dp[a])}`), msg('更新 dp[{0}] = {1}。', a, display(dp[a])), 2, 'fill');
      }
      grid[0][a - coin] = cell(display(dp[a - coin]), 'idle');
    }
    grid[0][a] = cell(display(dp[a]), 'settled');
  }
  grid[0][amount] = cell(display(dp[amount]), 'path');
  const result = dp[amount] === INF ? '無解' : `${dp[amount]} 枚`;
  fb.push(scene(`dp[${amount}] = ${display(dp[amount])}`), msg('湊出 {0} 最少需要 {1}。', amount, result), 3, 'complete');
  return fb.build(msg('湊出 {0} 最少需要 {1}。', amount, result));
}

// ---- 0/1 Knapsack ----------------------------------------------------------------

function runKnapsack(input: string, fb: FrameBuilder): DevTrace {
  const parts = input.split('|');
  const weights = parseInts(parts[0] ?? '2,3,4,5').filter((w) => w > 0);
  const values = parseInts(parts[1] ?? '3,4,5,6');
  const capacity = Math.min(16, Math.max(1, Math.round(Number((parts[2] ?? '5').trim()) || 5)));
  const n = Math.min(weights.length, values.length);
  if (!n) throw new Error('請輸入物品的重量與價值。');

  const dp = Array.from({ length: n + 1 }, () => Array.from({ length: capacity + 1 }, () => 0));
  const grid: MatrixCell[][] = dp.map((row) => row.map((v) => cell(v)));
  const rowLabels = ['∅', ...Array.from({ length: n }, (_, i) => `物${i + 1}(${weights[i]},${values[i]})`)];
  const colLabels = Array.from({ length: capacity + 1 }, (_, i) => i);

  const scene = (highlight?: string): MatrixScene => ({
    kind: 'matrix',
    cells: cloneGrid(grid),
    rowLabels,
    colLabels,
    rowHeader: '物品',
    colHeader: '容量',
    highlight
  });

  fb.push(scene(), msg('{0} 件物品，背包容量 {1}。', n, capacity), 0, 'ready');
  for (let i = 1; i <= n; i += 1) {
    for (let w = 0; w <= capacity; w += 1) {
      grid[i][w] = cell('?', 'active');
      fb.metrics.comparisons += 1;
      if (weights[i - 1] > w) {
        dp[i][w] = dp[i - 1][w];
        grid[i - 1][w] = cell(dp[i - 1][w], 'compare');
        fb.push(scene(`容量 ${w} 放不下物${i}`), msg('物品 {0} 重 {1} 超過容量 {2}，沿用上一列。', i, weights[i - 1], w), 1, 'fill');
      } else {
        const skip = dp[i - 1][w];
        const take = dp[i - 1][w - weights[i - 1]] + values[i - 1];
        grid[i - 1][w] = cell(skip, 'compare');
        grid[i - 1][w - weights[i - 1]] = cell(dp[i - 1][w - weights[i - 1]], 'compare');
        dp[i][w] = Math.max(skip, take);
        fb.push(scene(`max(不取 ${skip}, 取 ${take})`), msg('物品 {0}：max(不取 {1}, 取 {2}) = {3}。', i, skip, take, dp[i][w]), 2, 'fill');
      }
      fb.metrics.writes += 1;
      // reset compare highlights
      for (let r = 0; r <= n; r += 1) for (let c = 0; c <= capacity; c += 1) if (grid[r][c].state === 'compare') grid[r][c] = cell(dp[r][c]);
      grid[i][w] = cell(dp[i][w], 'settled');
    }
  }

  // Backtrack to mark chosen items.
  let w = capacity;
  const chosen: number[] = [];
  for (let i = n; i >= 1; i -= 1) {
    grid[i][w] = cell(dp[i][w], 'path');
    if (dp[i][w] !== dp[i - 1][w]) {
      chosen.push(i);
      w -= weights[i - 1];
    }
  }
  fb.push(scene(`最佳價值 = ${dp[n][capacity]}`), msg('最佳價值為 {0}，選取物品 {1}。', dp[n][capacity], chosen.reverse().join('、') || '無'), 3, 'complete');
  return fb.build(msg('最佳價值為 {0}。', dp[n][capacity]));
}

// ---- LCS / Edit distance ---------------------------------------------------------

function runStringDp(kind: 'lcs' | 'edit-distance', input: string, fb: FrameBuilder): DevTrace {
  const [rawA, rawB] = input.split('|').map((s) => (s ?? '').trim());
  const a = (rawA || (kind === 'lcs' ? 'ABCBDAB' : 'KITTEN')).slice(0, 12);
  const b = (rawB || (kind === 'lcs' ? 'BDCAB' : 'SITTING')).slice(0, 12);
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));

  if (kind === 'edit-distance') {
    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  }
  const grid: MatrixCell[][] = dp.map((row, i) => row.map((v, j) => cell(v, (i === 0 || j === 0) ? 'settled' : 'idle')));
  const rowLabels = ['∅', ...a.split('')];
  const colLabels = ['∅', ...b.split('')];

  const scene = (highlight?: string): MatrixScene => ({
    kind: 'matrix',
    cells: cloneGrid(grid),
    rowLabels,
    colLabels,
    rowHeader: kind === 'lcs' ? '字串 A' : '來源',
    colHeader: kind === 'lcs' ? '字串 B' : '目標',
    highlight
  });

  fb.push(scene(), kind === 'lcs' ? msg('比較「{0}」與「{1}」的最長共同子序列。', a, b) : msg('計算「{0}」轉換為「{1}」的編輯距離。', a, b), 0, 'ready');

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const matched = a[i - 1] === b[j - 1];
      grid[i][j] = cell('?', 'active');
      grid[i - 1][j - 1] = cell(dp[i - 1][j - 1], 'compare');
      grid[i - 1][j] = cell(dp[i - 1][j], 'compare');
      grid[i][j - 1] = cell(dp[i][j - 1], 'compare');
      fb.metrics.comparisons += 1;
      if (kind === 'lcs') {
        dp[i][j] = matched ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        fb.push(scene(matched ? `${a[i - 1]} = ${b[j - 1]} → 對角 +1` : '取上方/左方較大值'), matched ? msg('字元 {0} 相符，取左上 +1 = {1}。', a[i - 1], dp[i][j]) : msg('字元不符，取上方與左方較大值 {0}。', dp[i][j]), matched ? 1 : 2, 'fill');
      } else {
        dp[i][j] = matched ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        fb.push(scene(matched ? `${a[i - 1]} = ${b[j - 1]} → 對角` : 'min(替換, 刪除, 插入) + 1'), matched ? msg('字元 {0} 相符，沿用左上 {1}。', a[i - 1], dp[i][j]) : msg('字元不符，取三方最小值 +1 = {0}。', dp[i][j]), matched ? 1 : 2, 'fill');
      }
      fb.metrics.writes += 1;
      for (let r = 0; r <= m; r += 1) for (let c = 0; c <= n; c += 1) if (grid[r][c].state === 'compare') grid[r][c] = cell(dp[r][c], (r === 0 || c === 0) ? 'settled' : 'idle');
      grid[i][j] = cell(dp[i][j], 'settled');
    }
  }

  // Backtrack.
  let i = m;
  let j = n;
  const path: string[] = [];
  while (i > 0 && j > 0) {
    grid[i][j] = cell(dp[i][j], 'path');
    if (kind === 'lcs') {
      if (a[i - 1] === b[j - 1]) {
        path.push(a[i - 1]);
        i -= 1;
        j -= 1;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) i -= 1;
      else j -= 1;
    } else {
      if (a[i - 1] === b[j - 1]) {
        i -= 1;
        j -= 1;
      } else {
        const best = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        if (best === dp[i - 1][j - 1]) {
          i -= 1;
          j -= 1;
        } else if (best === dp[i - 1][j]) i -= 1;
        else j -= 1;
      }
    }
  }

  if (kind === 'lcs') {
    const lcs = path.reverse().join('');
    fb.push(scene(`LCS = "${lcs}" (${dp[m][n]})`), msg('最長共同子序列為「{0}」，長度 {1}。', lcs || '空', dp[m][n]), 3, 'complete');
    return fb.build(msg('最長共同子序列長度 {0}。', dp[m][n]));
  }
  fb.push(scene(`編輯距離 = ${dp[m][n]}`), msg('編輯距離為 {0}。', dp[m][n]), 3, 'complete');
  return fb.build(msg('編輯距離為 {0}。', dp[m][n]));
}

export function runDpTrace(algorithm: DpAlgorithmId, input: string): DevTrace {
  const fb = new FrameBuilder();
  if (algorithm === 'fibonacci') return runFibonacci(input, fb);
  if (algorithm === 'coin-change') return runCoinChange(input, fb);
  if (algorithm === 'knapsack') return runKnapsack(input, fb);
  return runStringDp(algorithm, input, fb);
}

export const DP_DEFAULT_INPUT: Record<DpAlgorithmId, string> = {
  fibonacci: '12',
  'coin-change': '1,3,4 | 6',
  knapsack: '2,3,4,5 | 3,4,5,6 | 5',
  lcs: 'ABCBDAB | BDCAB',
  'edit-distance': 'KITTEN | SITTING'
};
