import {
  FrameBuilder,
  msg,
  type ArrayCell,
  type ArrayPointer,
  type ArrayScene,
  type CellState,
  type DevTrace
} from './devlabScene.js';

export type SortAlgorithmId =
  | 'bubble-sort'
  | 'insertion-sort'
  | 'selection-sort'
  | 'quick-sort'
  | 'merge-sort'
  | 'heap-sort'
  | 'shell-sort';

export type SearchAlgorithmId = 'linear-search' | 'binary-search';

export function parseNumberList(input: string): number[] {
  const tokens = input
    .trim()
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) throw new Error('請輸入至少一個數值。');
  const values = tokens.map(Number);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('請使用以逗號分隔的有效數值。');
  }
  if (values.length > 32) throw new Error('為維持動畫可讀性，請使用 32 個以下的數值。');
  return values;
}

const buildScene = (
  values: readonly number[],
  states: Record<number, CellState>,
  options: {
    pointers?: ArrayPointer[];
    range?: [number, number];
    buffer?: readonly number[];
    bufferStates?: Record<number, CellState>;
    bufferLabel?: string;
    target?: number;
  } = {}
): ArrayScene => {
  const cells: ArrayCell[] = values.map((value, index) => ({
    value,
    state: states[index] ?? 'idle'
  }));
  const scene: ArrayScene = { kind: 'array', cells };
  if (options.pointers) scene.pointers = options.pointers;
  if (options.range) scene.range = options.range;
  if (options.target !== undefined) scene.target = options.target;
  if (options.buffer) {
    scene.buffer = options.buffer.map((value, index) => ({
      value,
      state: options.bufferStates?.[index] ?? 'idle'
    }));
    scene.bufferLabel = options.bufferLabel;
  }
  return scene;
};

export function runSortTrace(algorithm: SortAlgorithmId, input: readonly number[]): DevTrace {
  if (!input.length) throw new Error('請輸入至少一個數值。');
  const values = [...input];
  const fb = new FrameBuilder();
  const n = values.length;
  const settled = new Set<number>();

  const stateMap = (extra: Record<number, CellState> = {}): Record<number, CellState> => {
    const map: Record<number, CellState> = {};
    settled.forEach((index) => (map[index] = 'settled'));
    return { ...map, ...extra };
  };

  fb.push(buildScene(values, stateMap()), msg('資料集已就緒，開始逐步動畫。'), 0, 'ready');

  if (algorithm === 'bubble-sort') {
    for (let end = n - 1; end > 0; end -= 1) {
      let swapped = false;
      for (let i = 0; i < end; i += 1) {
        fb.metrics.comparisons += 1;
        fb.push(
          buildScene(values, stateMap({ [i]: 'compare', [i + 1]: 'compare' }), {
            pointers: [{ index: i, label: 'i', tone: 'a' }]
          }),
          msg('比較 {0} 與 {1}。', values[i], values[i + 1]),
          1,
          'compare'
        );
        if (values[i] > values[i + 1]) {
          [values[i], values[i + 1]] = [values[i + 1], values[i]];
          fb.metrics.writes += 2;
          swapped = true;
          fb.push(
            buildScene(values, stateMap({ [i]: 'swap', [i + 1]: 'swap' })),
            msg('交換順序錯誤的相鄰數值。'),
            2,
            'write'
          );
        }
      }
      settled.add(end);
      if (!swapped) break;
    }
  } else if (algorithm === 'insertion-sort') {
    for (let i = 1; i < n; i += 1) {
      const key = values[i];
      let j = i - 1;
      fb.push(
        buildScene(values, stateMap({ [i]: 'active' }), {
          pointers: [{ index: i, label: 'key', tone: 'a' }]
        }),
        msg('取出 {0}，準備插入已排序前綴。', key),
        1,
        'compare'
      );
      while (j >= 0) {
        fb.metrics.comparisons += 1;
        fb.push(
          buildScene(values, stateMap({ [j]: 'compare', [j + 1]: 'active' }), {
            pointers: [{ index: j, label: 'j', tone: 'b' }]
          }),
          msg('比較 {0} 與鍵值 {1}。', values[j], key),
          2,
          'compare'
        );
        if (values[j] <= key) break;
        values[j + 1] = values[j];
        fb.metrics.writes += 1;
        j -= 1;
        fb.push(
          buildScene(values, stateMap({ [j + 1]: 'swap', [j + 2]: 'swap' })),
          msg('將較大的數值向右移動一格。'),
          3,
          'write'
        );
      }
      values[j + 1] = key;
      fb.metrics.writes += 1;
      fb.push(
        buildScene(values, stateMap({ [j + 1]: 'insert' })),
        msg('將 {0} 插入已排序前綴。', key),
        4,
        'write'
      );
    }
  } else if (algorithm === 'selection-sort') {
    for (let start = 0; start < n - 1; start += 1) {
      let minIndex = start;
      for (let i = start + 1; i < n; i += 1) {
        fb.metrics.comparisons += 1;
        fb.push(
          buildScene(values, stateMap({ [minIndex]: 'min', [i]: 'compare' }), {
            pointers: [{ index: minIndex, label: 'min', tone: 'c' }, { index: i, label: 'i', tone: 'a' }]
          }),
          msg('比較目前最小值 {0} 與 {1}。', values[minIndex], values[i]),
          2,
          'compare'
        );
        if (values[i] < values[minIndex]) {
          minIndex = i;
          fb.push(
            buildScene(values, stateMap({ [minIndex]: 'min' })),
            msg('{0} 成為新的最小值。', values[minIndex]),
            3,
            'compare'
          );
        }
      }
      if (minIndex !== start) {
        [values[start], values[minIndex]] = [values[minIndex], values[start]];
        fb.metrics.writes += 2;
        fb.push(
          buildScene(values, stateMap({ [start]: 'swap', [minIndex]: 'swap' })),
          msg('將最小值移入已排序區域。'),
          4,
          'write'
        );
      }
      settled.add(start);
    }
    settled.add(n - 1);
  } else if (algorithm === 'quick-sort') {
    const partition = (low: number, high: number): number => {
      const pivot = values[high];
      let boundary = low;
      fb.push(
        buildScene(values, stateMap({ [high]: 'pivot' }), { range: [low, high] }),
        msg('選擇 {0} 作為樞紐。', pivot),
        1,
        'pivot'
      );
      for (let i = low; i < high; i += 1) {
        fb.metrics.comparisons += 1;
        fb.push(
          buildScene(values, stateMap({ [i]: 'compare', [high]: 'pivot', [boundary]: 'active' }), {
            range: [low, high],
            pointers: [{ index: i, label: 'i', tone: 'a' }, { index: boundary, label: '<', tone: 'b' }]
          }),
          msg('比較 {0} 與樞紐 {1}。', values[i], pivot),
          2,
          'compare'
        );
        if (values[i] <= pivot) {
          if (boundary !== i) {
            [values[boundary], values[i]] = [values[i], values[boundary]];
            fb.metrics.writes += 2;
            fb.push(
              buildScene(values, stateMap({ [boundary]: 'swap', [i]: 'swap', [high]: 'pivot' }), {
                range: [low, high]
              }),
              msg('將 {0} 移入較小值分割區。', values[boundary]),
              3,
              'write'
            );
          }
          boundary += 1;
        }
      }
      [values[boundary], values[high]] = [values[high], values[boundary]];
      fb.metrics.writes += 2;
      settled.add(boundary);
      fb.push(
        buildScene(values, stateMap({ [boundary]: 'settled' }), { range: [low, high] }),
        msg('樞紐 {0} 已到達分割位置。', pivot),
        4,
        'pivot'
      );
      return boundary;
    };
    const quick = (low: number, high: number) => {
      if (low > high) return;
      if (low === high) {
        settled.add(low);
        return;
      }
      const p = partition(low, high);
      quick(low, p - 1);
      quick(p + 1, high);
    };
    quick(0, n - 1);
  } else if (algorithm === 'merge-sort') {
    const aux = [...values];
    const merge = (low: number, mid: number, high: number) => {
      for (let i = low; i <= high; i += 1) aux[i] = values[i];
      fb.push(
        buildScene(values, stateMap(), {
          range: [low, high],
          buffer: aux.slice(low, high + 1),
          bufferLabel: '緩衝區'
        }),
        msg('合併範圍 {0}–{1} 與 {2}–{3}。', low, mid, mid + 1, high),
        2,
        'pivot'
      );
      let left = low;
      let right = mid + 1;
      for (let out = low; out <= high; out += 1) {
        let chosen: number;
        if (left > mid) {
          chosen = aux[right++];
        } else if (right > high) {
          chosen = aux[left++];
        } else {
          fb.metrics.comparisons += 1;
          if (aux[left] <= aux[right]) chosen = aux[left++];
          else chosen = aux[right++];
        }
        values[out] = chosen;
        fb.metrics.writes += 1;
        fb.push(
          buildScene(values, stateMap({ [out]: 'swap' }), {
            range: [low, high],
            buffer: aux.slice(low, high + 1),
            bufferLabel: '緩衝區'
          }),
          msg('將 {0} 寫入索引 {1}。', chosen, out),
          3,
          'write'
        );
      }
    };
    const sort = (low: number, high: number) => {
      if (low >= high) return;
      const mid = Math.floor((low + high) / 2);
      fb.push(
        buildScene(values, stateMap(), { range: [low, high] }),
        msg('在 {2} 分割範圍 {0}–{1}。', low, high, mid),
        1,
        'pivot'
      );
      sort(low, mid);
      sort(mid + 1, high);
      merge(low, mid, high);
    };
    sort(0, n - 1);
  } else if (algorithm === 'shell-sort') {
    let gap = Math.floor(n / 2);
    while (gap > 0) {
      fb.push(
        buildScene(values, stateMap()),
        msg('使用間隔 {0} 進行插入排序。', gap),
        1,
        'pivot'
      );
      for (let i = gap; i < n; i += 1) {
        const temp = values[i];
        let j = i;
        while (j >= gap) {
          fb.metrics.comparisons += 1;
          fb.push(
            buildScene(values, stateMap({ [j]: 'active', [j - gap]: 'compare' }), {
              pointers: [{ index: j, label: 'i', tone: 'a' }, { index: j - gap, label: 'i-g', tone: 'b' }]
            }),
            msg('比較 {0} 與 {1}（間隔 {2}）。', values[j - gap], temp, gap),
            2,
            'compare'
          );
          if (values[j - gap] <= temp) break;
          values[j] = values[j - gap];
          fb.metrics.writes += 1;
          j -= gap;
          fb.push(
            buildScene(values, stateMap({ [j]: 'swap', [j + gap]: 'swap' })),
            msg('將較大的數值向後移動。'),
            3,
            'write'
          );
        }
        values[j] = temp;
        fb.metrics.writes += 1;
      }
      gap = Math.floor(gap / 2);
    }
  } else {
    // heap-sort
    const heapify = (size: number, root: number) => {
      let largest = root;
      const left = root * 2 + 1;
      const right = root * 2 + 2;
      if (left < size) {
        fb.metrics.comparisons += 1;
        fb.push(
          buildScene(values, stateMap({ [largest]: 'active', [left]: 'compare' }), { range: [0, size - 1] }),
          msg('比較父節點 {0} 與左子節點 {1}。', values[largest], values[left]),
          1,
          'compare'
        );
        if (values[left] > values[largest]) largest = left;
      }
      if (right < size) {
        fb.metrics.comparisons += 1;
        fb.push(
          buildScene(values, stateMap({ [largest]: 'active', [right]: 'compare' }), { range: [0, size - 1] }),
          msg('比較目前最大值 {0} 與右子節點 {1}。', values[largest], values[right]),
          2,
          'compare'
        );
        if (values[right] > values[largest]) largest = right;
      }
      if (largest !== root) {
        [values[root], values[largest]] = [values[largest], values[root]];
        fb.metrics.writes += 2;
        fb.push(
          buildScene(values, stateMap({ [root]: 'swap', [largest]: 'swap' }), { range: [0, size - 1] }),
          msg('交換節點以恢復最大堆積性質。'),
          3,
          'write'
        );
        heapify(size, largest);
      }
    };
    for (let root = Math.floor(n / 2) - 1; root >= 0; root -= 1) heapify(n, root);
    fb.push(buildScene(values, stateMap()), msg('最大堆積已就緒，開始逐次取出根節點。'), 4, 'pivot');
    for (let end = n - 1; end > 0; end -= 1) {
      [values[0], values[end]] = [values[end], values[0]];
      fb.metrics.writes += 2;
      settled.add(end);
      fb.push(
        buildScene(values, stateMap({ [0]: 'swap', [end]: 'settled' }), { range: [0, end - 1] }),
        msg('將最大值 {0} 移到最終位置。', values[end]),
        5,
        'write'
      );
      heapify(end, 0);
    }
    settled.add(0);
  }

  for (let i = 0; i < n; i += 1) settled.add(i);
  fb.push(buildScene(values, stateMap()), msg('動畫完成，資料集已排序。'), 6, 'complete');
  return fb.build(msg('動畫完成，資料集已排序。'));
}

export function runSearchTrace(
  algorithm: SearchAlgorithmId,
  input: readonly number[],
  target: number
): DevTrace {
  if (!input.length) throw new Error('請輸入至少一個數值。');
  if (!Number.isFinite(target)) throw new Error('請輸入有效的搜尋目標。');
  const values = algorithm === 'binary-search' ? [...input].sort((a, b) => a - b) : [...input];
  const fb = new FrameBuilder();

  fb.push(
    buildScene(values, {}, { target }),
    algorithm === 'binary-search'
      ? msg('已建立排序副本，準備進行二元搜尋。')
      : msg('資料集已就緒，準備進行線性搜尋。'),
    0,
    'ready'
  );

  if (algorithm === 'linear-search') {
    for (let i = 0; i < values.length; i += 1) {
      fb.metrics.comparisons += 1;
      fb.metrics.visits += 1;
      const found = values[i] === target;
      fb.push(
        buildScene(values, { [i]: found ? 'path' : 'compare' }, {
          target,
          pointers: [{ index: i, label: 'i', tone: 'a' }]
        }),
        msg('檢查索引 {0}：{1}。', i, values[i]),
        1,
        found ? 'complete' : 'compare'
      );
      if (found) {
        fb.push(
          buildScene(values, { [i]: 'path' }, { target }),
          msg('在索引 {1} 找到目標值 {0}。', target, i),
          2,
          'complete'
        );
        return fb.build(msg('在索引 {1} 找到目標值 {0}。', target, i));
      }
    }
  } else {
    let low = 0;
    let high = values.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      fb.metrics.comparisons += 1;
      fb.metrics.visits += 1;
      const states: Record<number, CellState> = {};
      for (let i = 0; i < values.length; i += 1) if (i < low || i > high) states[i] = 'excluded';
      states[mid] = values[mid] === target ? 'path' : 'compare';
      fb.push(
        buildScene(values, states, {
          target,
          range: [low, high],
          pointers: [
            { index: low, label: 'lo', tone: 'b' },
            { index: mid, label: 'mid', tone: 'a' },
            { index: high, label: 'hi', tone: 'c' }
          ]
        }),
        msg('檢查中點 {0}：{1}。', mid, values[mid]),
        1,
        values[mid] === target ? 'complete' : 'compare'
      );
      if (values[mid] === target) {
        return fb.build(msg('在索引 {1} 找到目標值 {0}。', target, mid));
      }
      if (values[mid] < target) {
        low = mid + 1;
        fb.push(buildScene(values, states, { target, range: [low, high] }), msg('排除較小的一半範圍。'), 3, 'visit');
      } else {
        high = mid - 1;
        fb.push(buildScene(values, states, { target, range: [low, high] }), msg('排除較大的一半範圍。'), 4, 'visit');
      }
    }
  }

  fb.push(buildScene(values, {}, { target }), msg('找不到目標值 {0}。', target), 5, 'complete');
  return fb.build(msg('找不到目標值 {0}。', target));
}

export interface SortBenchmark {
  algorithm: SortAlgorithmId;
  comparisons: number;
  writes: number;
  frames: number;
}

export function benchmarkSortAlgorithms(input: readonly number[]): SortBenchmark[] {
  const algorithms: SortAlgorithmId[] = [
    'bubble-sort',
    'insertion-sort',
    'selection-sort',
    'shell-sort',
    'quick-sort',
    'merge-sort',
    'heap-sort'
  ];
  return algorithms.map((algorithm) => {
    const trace = runSortTrace(algorithm, input);
    const last = trace.frames.at(-1)?.metrics ?? { comparisons: 0, writes: 0, visits: 0 };
    return { algorithm, comparisons: last.comparisons, writes: last.writes, frames: trace.frames.length };
  });
}

const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

export type DatasetPreset = 'random' | 'nearly-sorted' | 'reversed' | 'duplicates';

export function createDatasetPreset(preset: DatasetPreset, requestedSize: number, seed = Date.now()): number[] {
  const size = Math.min(20, Math.max(4, Math.round(requestedSize)));
  const random = seededRandom(seed);
  if (preset === 'reversed') return Array.from({ length: size }, (_, index) => size - index);
  if (preset === 'duplicates') {
    const palette = [12, 24, 36, 48];
    return Array.from({ length: size }, () => palette[Math.floor(random() * palette.length)]);
  }
  if (preset === 'nearly-sorted') {
    const values = Array.from({ length: size }, (_, index) => index + 1);
    const swaps = Math.max(1, Math.floor(size / 5));
    for (let i = 0; i < swaps; i += 1) {
      const left = Math.floor(random() * (size - 1));
      [values[left], values[left + 1]] = [values[left + 1], values[left]];
    }
    return values;
  }
  return Array.from({ length: size }, () => 8 + Math.floor(random() * 91));
}
