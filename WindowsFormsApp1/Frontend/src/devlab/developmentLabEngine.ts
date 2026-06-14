export type LinearStructureKind = 'stack' | 'queue' | 'linked-list';
export type LinearStructureAction =
  | 'push'
  | 'pop'
  | 'peek'
  | 'enqueue'
  | 'dequeue'
  | 'front'
  | 'append'
  | 'prepend'
  | 'remove'
  | 'find';

export type SortAlgorithmId =
  | 'bubble-sort'
  | 'insertion-sort'
  | 'selection-sort'
  | 'quick-sort'
  | 'merge-sort'
  | 'heap-sort';
export type SearchAlgorithmId = 'linear-search' | 'binary-search';
export type TraversalAlgorithmId = 'bfs' | 'dfs';
export type AlgorithmId = SortAlgorithmId | SearchAlgorithmId | TraversalAlgorithmId;
export type TracePhase = 'ready' | 'compare' | 'write' | 'pivot' | 'visit' | 'complete';
export type DatasetPreset = 'random' | 'nearly-sorted' | 'reversed' | 'duplicates';

export interface AlgorithmMetrics {
  comparisons: number;
  writes: number;
  visits: number;
}

export interface TraceFrame {
  values: number[];
  auxiliaryValues?: number[];
  activeIndices: number[];
  settledIndices: number[];
  activeNodes: string[];
  visitedNodes: string[];
  message: string;
  pseudocodeLine: number;
  metrics: AlgorithmMetrics;
  phase: TracePhase;
  range?: [number, number];
}

export interface AlgorithmTrace {
  algorithm: AlgorithmId;
  frames: TraceFrame[];
  resultIndex?: number;
  visitedOrder?: string[];
}

export interface SortBenchmark {
  algorithm: SortAlgorithmId;
  comparisons: number;
  writes: number;
  frames: number;
}

export interface LinearStructureResult {
  values: number[];
  message: string;
  output?: number;
  activeIndex?: number;
}

export interface BinaryTreeNode {
  id: string;
  value: number;
  left: BinaryTreeNode | null;
  right: BinaryTreeNode | null;
}

export interface GraphModel {
  nodes: string[];
  edges: Array<[string, string]>;
  adjacency: Record<string, string[]>;
}

const cloneMetrics = (metrics: AlgorithmMetrics): AlgorithmMetrics => ({ ...metrics });

const normalizeValue = (value: number | undefined, action: string) => {
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`${action} requires a valid number.`);
  }
  return value;
};

export function parseNumberList(input: string): number[] {
  const tokens = input
    .trim()
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) throw new Error('Enter at least one number.');

  const values = tokens.map(Number);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Use only valid numbers separated by commas.');
  }
  if (values.length > 40) throw new Error('Use 40 numbers or fewer for a readable trace.');
  return values;
}

export function updateLinearStructure(
  kind: LinearStructureKind,
  values: readonly number[],
  action: LinearStructureAction,
  value?: number
): LinearStructureResult {
  const next = [...values];

  if (kind === 'stack') {
    if (action === 'push') {
      const item = normalizeValue(value, 'Push');
      next.push(item);
      return { values: next, output: item, activeIndex: next.length - 1, message: `Pushed ${item} onto the stack.` };
    }
    if (action === 'pop') {
      if (!next.length) throw new Error('The stack is empty.');
      const output = next.pop()!;
      return { values: next, output, message: `Popped ${output} from the stack.` };
    }
    if (action === 'peek') {
      if (!next.length) throw new Error('The stack is empty.');
      const activeIndex = next.length - 1;
      return { values: next, output: next[activeIndex], activeIndex, message: `Top value is ${next[activeIndex]}.` };
    }
  }

  if (kind === 'queue') {
    if (action === 'enqueue') {
      const item = normalizeValue(value, 'Enqueue');
      next.push(item);
      return { values: next, output: item, activeIndex: next.length - 1, message: `Enqueued ${item} at the rear.` };
    }
    if (action === 'dequeue') {
      if (!next.length) throw new Error('The queue is empty.');
      const output = next.shift()!;
      return { values: next, output, activeIndex: next.length ? 0 : undefined, message: `Dequeued ${output} from the front.` };
    }
    if (action === 'front') {
      if (!next.length) throw new Error('The queue is empty.');
      return { values: next, output: next[0], activeIndex: 0, message: `Front value is ${next[0]}.` };
    }
  }

  if (kind === 'linked-list') {
    if (action === 'append') {
      const item = normalizeValue(value, 'Append');
      next.push(item);
      return { values: next, output: item, activeIndex: next.length - 1, message: `Appended node ${item}.` };
    }
    if (action === 'prepend') {
      const item = normalizeValue(value, 'Prepend');
      next.unshift(item);
      return { values: next, output: item, activeIndex: 0, message: `Prepended node ${item}.` };
    }
    if (action === 'remove') {
      const item = normalizeValue(value, 'Remove');
      const index = next.indexOf(item);
      if (index < 0) throw new Error(`Node ${item} was not found.`);
      next.splice(index, 1);
      return { values: next, output: item, message: `Removed the first node containing ${item}.` };
    }
    if (action === 'find') {
      const item = normalizeValue(value, 'Find');
      const activeIndex = next.indexOf(item);
      return {
        values: next,
        output: activeIndex,
        activeIndex: activeIndex >= 0 ? activeIndex : undefined,
        message: activeIndex >= 0 ? `Found ${item} at position ${activeIndex}.` : `Node ${item} was not found.`
      };
    }
  }

  throw new Error(`${action} is not available for ${kind}.`);
}

const treeSize = (root: BinaryTreeNode | null): number =>
  root ? 1 + treeSize(root.left) + treeSize(root.right) : 0;

export function insertTreeValue(root: BinaryTreeNode | null, value: number): BinaryTreeNode {
  if (!Number.isFinite(value)) throw new Error('Tree values must be valid numbers.');
  if (!root) {
    return {
      id: `tree-${String(value).replace('.', '_')}-${treeSize(root)}`,
      value,
      left: null,
      right: null
    };
  }
  if (value === root.value) return root;
  if (value < root.value) return { ...root, left: insertTreeValue(root.left, value) };
  return { ...root, right: insertTreeValue(root.right, value) };
}

export function buildBinarySearchTree(values: readonly number[]): BinaryTreeNode | null {
  return values.reduce<BinaryTreeNode | null>((root, value) => insertTreeValue(root, value), null);
}

export function searchTree(root: BinaryTreeNode | null, value: number): { found: boolean; path: number[] } {
  const path: number[] = [];
  let node = root;
  while (node) {
    path.push(node.value);
    if (node.value === value) return { found: true, path };
    node = value < node.value ? node.left : node.right;
  }
  return { found: false, path };
}

const smallestNode = (root: BinaryTreeNode) => {
  let node = root;
  while (node.left) node = node.left;
  return node;
};

export function removeTreeValue(root: BinaryTreeNode | null, value: number): BinaryTreeNode | null {
  if (!root) return null;
  if (value < root.value) return { ...root, left: removeTreeValue(root.left, value) };
  if (value > root.value) return { ...root, right: removeTreeValue(root.right, value) };
  if (!root.left) return root.right;
  if (!root.right) return root.left;
  const successor = smallestNode(root.right);
  return {
    ...root,
    value: successor.value,
    right: removeTreeValue(root.right, successor.value)
  };
}

export function inOrderTree(root: BinaryTreeNode | null): number[] {
  return root ? [...inOrderTree(root.left), root.value, ...inOrderTree(root.right)] : [];
}

const makeFrame = (
  values: readonly number[],
  metrics: AlgorithmMetrics,
  message: string,
  pseudocodeLine: number,
  activeIndices: number[] = [],
  settledIndices: number[] = [],
  phase: TracePhase = 'ready',
  auxiliaryValues?: readonly number[],
  range?: [number, number]
): TraceFrame => ({
  values: [...values],
  auxiliaryValues: auxiliaryValues ? [...auxiliaryValues] : undefined,
  activeIndices,
  settledIndices,
  activeNodes: [],
  visitedNodes: [],
  message,
  pseudocodeLine,
  metrics: cloneMetrics(metrics),
  phase,
  range
});

export function runSortTrace(algorithm: SortAlgorithmId, input: readonly number[]): AlgorithmTrace {
  if (!input.length) throw new Error('Enter at least one number.');
  const values = [...input];
  const frames: TraceFrame[] = [];
  const metrics: AlgorithmMetrics = { comparisons: 0, writes: 0, visits: 0 };
  frames.push(makeFrame(values, metrics, 'Dataset ready. Start the trace.', 0, [], [], 'ready'));

  if (algorithm === 'bubble-sort') {
    for (let end = values.length - 1; end > 0; end -= 1) {
      let swapped = false;
      for (let index = 0; index < end; index += 1) {
        metrics.comparisons += 1;
        frames.push(makeFrame(values, metrics, `Compare ${values[index]} and ${values[index + 1]}.`, 1, [index, index + 1], [], 'compare'));
        if (values[index] > values[index + 1]) {
          [values[index], values[index + 1]] = [values[index + 1], values[index]];
          metrics.writes += 2;
          swapped = true;
          frames.push(makeFrame(values, metrics, 'Swap the out-of-order pair.', 2, [index, index + 1], [], 'write'));
        }
      }
      frames.push(makeFrame(values, metrics, `${values[end]} is now in its final position.`, 3, [], Array.from({ length: values.length - end }, (_, i) => end + i)));
      if (!swapped) break;
    }
  } else if (algorithm === 'insertion-sort') {
    for (let index = 1; index < values.length; index += 1) {
      const key = values[index];
      let cursor = index - 1;
      frames.push(makeFrame(values, metrics, `Lift ${key} into the sorted prefix.`, 1, [index], Array.from({ length: index }, (_, i) => i)));
      while (cursor >= 0) {
        metrics.comparisons += 1;
        frames.push(makeFrame(values, metrics, `Compare ${values[cursor]} with key ${key}.`, 2, [cursor, cursor + 1], [], 'compare'));
        if (values[cursor] <= key) break;
        values[cursor + 1] = values[cursor];
        metrics.writes += 1;
        cursor -= 1;
        frames.push(makeFrame(values, metrics, 'Shift the larger value one slot right.', 3, [cursor + 1, cursor + 2], [], 'write'));
      }
      values[cursor + 1] = key;
      metrics.writes += 1;
      frames.push(makeFrame(values, metrics, `Insert ${key} into the prefix.`, 4, [cursor + 1], Array.from({ length: index + 1 }, (_, i) => i), 'write'));
    }
  } else if (algorithm === 'selection-sort') {
    for (let start = 0; start < values.length - 1; start += 1) {
      let minIndex = start;
      for (let index = start + 1; index < values.length; index += 1) {
        metrics.comparisons += 1;
        frames.push(makeFrame(values, metrics, `Compare current minimum ${values[minIndex]} with ${values[index]}.`, 2, [minIndex, index], Array.from({ length: start }, (_, i) => i), 'compare'));
        if (values[index] < values[minIndex]) {
          minIndex = index;
          frames.push(makeFrame(values, metrics, `${values[minIndex]} becomes the new minimum.`, 3, [minIndex]));
        }
      }
      if (minIndex !== start) {
        [values[start], values[minIndex]] = [values[minIndex], values[start]];
        metrics.writes += 2;
        frames.push(makeFrame(values, metrics, 'Move the minimum into the sorted region.', 4, [start, minIndex], Array.from({ length: start + 1 }, (_, i) => i), 'write'));
      }
    }
  } else if (algorithm === 'quick-sort') {
    const partition = (low: number, high: number): number => {
      const pivot = values[high];
      let boundary = low;
      frames.push(makeFrame(values, metrics, `Choose ${pivot} as the pivot.`, 1, [high], [], 'pivot', undefined, [low, high]));
      for (let index = low; index < high; index += 1) {
        metrics.comparisons += 1;
        frames.push(makeFrame(values, metrics, `Compare ${values[index]} with pivot ${pivot}.`, 2, [index, high], [], 'compare', undefined, [low, high]));
        if (values[index] <= pivot) {
          [values[boundary], values[index]] = [values[index], values[boundary]];
          metrics.writes += 2;
          frames.push(makeFrame(values, metrics, 'Move the value into the lower partition.', 3, [boundary, index], [], 'write', undefined, [low, high]));
          boundary += 1;
        }
      }
      [values[boundary], values[high]] = [values[high], values[boundary]];
      metrics.writes += 2;
      frames.push(makeFrame(values, metrics, `Pivot ${pivot} reaches its partition point.`, 4, [boundary], [boundary], 'pivot', undefined, [low, high]));
      return boundary;
    };
    const quickSort = (low: number, high: number) => {
      if (low >= high) return;
      const pivotIndex = partition(low, high);
      quickSort(low, pivotIndex - 1);
      quickSort(pivotIndex + 1, high);
    };
    quickSort(0, values.length - 1);
  } else if (algorithm === 'merge-sort') {
    const auxiliary = [...values];
    const merge = (low: number, middle: number, high: number) => {
      for (let index = low; index <= high; index += 1) auxiliary[index] = values[index];
      frames.push(makeFrame(values, metrics, `Merge ranges ${low}-${middle} and ${middle + 1}-${high}.`, 1, [low, middle, high], [], 'pivot', auxiliary, [low, high]));

      let left = low;
      let right = middle + 1;
      for (let output = low; output <= high; output += 1) {
        if (left > middle) {
          values[output] = auxiliary[right++];
          metrics.writes += 1;
        } else if (right > high) {
          values[output] = auxiliary[left++];
          metrics.writes += 1;
        } else {
          metrics.comparisons += 1;
          frames.push(makeFrame(values, metrics, `Compare ${auxiliary[left]} and ${auxiliary[right]} from the buffer.`, 2, [left, right], [], 'compare', auxiliary, [low, high]));
          values[output] = auxiliary[left] <= auxiliary[right] ? auxiliary[left++] : auxiliary[right++];
          metrics.writes += 1;
        }
        frames.push(makeFrame(values, metrics, `Write ${values[output]} at index ${output}.`, 3, [output], [], 'write', auxiliary, [low, high]));
      }
    };
    const mergeSort = (low: number, high: number) => {
      if (low >= high) return;
      const middle = Math.floor((low + high) / 2);
      frames.push(makeFrame(values, metrics, `Split range ${low}-${high} at ${middle}.`, 0, [middle], [], 'pivot', auxiliary, [low, high]));
      mergeSort(low, middle);
      mergeSort(middle + 1, high);
      merge(low, middle, high);
    };
    mergeSort(0, values.length - 1);
  } else {
    const settled = new Set<number>();
    const heapify = (size: number, root: number) => {
      let largest = root;
      const left = root * 2 + 1;
      const right = root * 2 + 2;
      if (left < size) {
        metrics.comparisons += 1;
        frames.push(makeFrame(values, metrics, `Compare parent ${values[largest]} with left child ${values[left]}.`, 1, [largest, left], [...settled], 'compare', undefined, [0, size - 1]));
        if (values[left] > values[largest]) largest = left;
      }
      if (right < size) {
        metrics.comparisons += 1;
        frames.push(makeFrame(values, metrics, `Compare largest ${values[largest]} with right child ${values[right]}.`, 2, [largest, right], [...settled], 'compare', undefined, [0, size - 1]));
        if (values[right] > values[largest]) largest = right;
      }
      if (largest !== root) {
        [values[root], values[largest]] = [values[largest], values[root]];
        metrics.writes += 2;
        frames.push(makeFrame(values, metrics, 'Restore the max-heap property.', 3, [root, largest], [...settled], 'write', undefined, [0, size - 1]));
        heapify(size, largest);
      }
    };

    for (let root = Math.floor(values.length / 2) - 1; root >= 0; root -= 1) heapify(values.length, root);
    frames.push(makeFrame(values, metrics, 'Max heap ready. Extract the root repeatedly.', 4, [0], [], 'pivot'));
    for (let end = values.length - 1; end > 0; end -= 1) {
      [values[0], values[end]] = [values[end], values[0]];
      metrics.writes += 2;
      settled.add(end);
      frames.push(makeFrame(values, metrics, `Move maximum ${values[end]} into its final position.`, 4, [0, end], [...settled], 'write', undefined, [0, end - 1]));
      heapify(end, 0);
    }
  }

  frames.push(makeFrame(values, metrics, 'Trace complete. The dataset is sorted.', 5, [], values.map((_, index) => index), 'complete'));
  return { algorithm, frames };
}

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

export function createDatasetPreset(
  preset: DatasetPreset,
  requestedSize: number,
  seed = Date.now()
): number[] {
  const size = Math.min(24, Math.max(4, Math.round(requestedSize)));
  const random = createSeededRandom(seed);

  if (preset === 'reversed') {
    return Array.from({ length: size }, (_, index) => size - index);
  }
  if (preset === 'duplicates') {
    const palette = [12, 24, 36, 48];
    return Array.from({ length: size }, () => palette[Math.floor(random() * palette.length)]);
  }
  if (preset === 'nearly-sorted') {
    const values = Array.from({ length: size }, (_, index) => index + 1);
    const swaps = Math.max(1, Math.floor(size / 5));
    for (let index = 0; index < swaps; index += 1) {
      const left = Math.floor(random() * (size - 1));
      [values[left], values[left + 1]] = [values[left + 1], values[left]];
    }
    return values;
  }
  return Array.from({ length: size }, () => 8 + Math.floor(random() * 91));
}

export function benchmarkSortAlgorithms(input: readonly number[]): SortBenchmark[] {
  const algorithms: SortAlgorithmId[] = [
    'bubble-sort',
    'insertion-sort',
    'selection-sort',
    'quick-sort',
    'merge-sort',
    'heap-sort'
  ];
  return algorithms.map((algorithm) => {
    const trace = runSortTrace(algorithm, input);
    const finalMetrics = trace.frames.at(-1)?.metrics ?? { comparisons: 0, writes: 0, visits: 0 };
    return {
      algorithm,
      comparisons: finalMetrics.comparisons,
      writes: finalMetrics.writes,
      frames: trace.frames.length
    };
  });
}

export function runSearchTrace(
  algorithm: SearchAlgorithmId,
  input: readonly number[],
  target: number
): AlgorithmTrace {
  if (!input.length) throw new Error('Enter at least one number.');
  if (!Number.isFinite(target)) throw new Error('Enter a valid search target.');
  const values = algorithm === 'binary-search' ? [...input].sort((a, b) => a - b) : [...input];
  const frames: TraceFrame[] = [];
  const metrics: AlgorithmMetrics = { comparisons: 0, writes: 0, visits: 0 };
  frames.push(makeFrame(values, metrics, algorithm === 'binary-search' ? 'Sorted copy prepared for binary search.' : 'Dataset ready for linear search.', 0));

  if (algorithm === 'linear-search') {
    for (let index = 0; index < values.length; index += 1) {
      metrics.comparisons += 1;
      metrics.visits += 1;
      frames.push(makeFrame(values, metrics, `Inspect index ${index}: ${values[index]}.`, 1, [index]));
      if (values[index] === target) {
        frames.push(makeFrame(values, metrics, `Target ${target} found at index ${index}.`, 2, [index], [index]));
        return { algorithm, frames, resultIndex: index };
      }
    }
  } else {
    let low = 0;
    let high = values.length - 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      metrics.comparisons += 1;
      metrics.visits += 1;
      frames.push(makeFrame(values, metrics, `Inspect midpoint ${middle}: ${values[middle]}.`, 1, [middle], Array.from({ length: values.length }, (_, index) => index).filter((index) => index < low || index > high)));
      if (values[middle] === target) {
        frames.push(makeFrame(values, metrics, `Target ${target} found at index ${middle}.`, 2, [middle], [middle]));
        return { algorithm, frames, resultIndex: middle };
      }
      if (values[middle] < target) {
        low = middle + 1;
        frames.push(makeFrame(values, metrics, 'Discard the lower half.', 3, [], Array.from({ length: low }, (_, index) => index)));
      } else {
        high = middle - 1;
        frames.push(makeFrame(values, metrics, 'Discard the upper half.', 4, [], Array.from({ length: values.length - high - 1 }, (_, index) => high + 1 + index)));
      }
    }
  }

  frames.push(makeFrame(values, metrics, `Target ${target} was not found.`, 5));
  return { algorithm, frames, resultIndex: -1 };
}

export function parseGraph(input: string): GraphModel {
  const chunks = input
    .split(/[,\n;]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (!chunks.length) throw new Error('Enter at least one graph edge.');

  const adjacency: Record<string, string[]> = {};
  const edges: Array<[string, string]> = [];
  const nodes = new Set<string>();

  for (const chunk of chunks) {
    const match = chunk.match(/^([A-Za-z0-9_]+)\s*(?:-|>|:)\s*([A-Za-z0-9_]+)$/);
    if (!match) throw new Error(`Invalid graph edge "${chunk}". Use A-B format.`);
    const from = match[1];
    const to = match[2];
    if (from === to) throw new Error('Self-loop edges are not used in this lab.');
    nodes.add(from);
    nodes.add(to);
    adjacency[from] ??= [];
    adjacency[to] ??= [];
    if (!adjacency[from].includes(to)) adjacency[from].push(to);
    if (!adjacency[to].includes(from)) adjacency[to].push(from);
    if (!edges.some(([a, b]) => (a === from && b === to) || (a === to && b === from))) {
      edges.push([from, to]);
    }
  }

  return { nodes: [...nodes].sort(), edges, adjacency };
}

const makeGraphFrame = (
  metrics: AlgorithmMetrics,
  message: string,
  pseudocodeLine: number,
  activeNodes: string[],
  visitedNodes: string[],
  phase: TracePhase = 'visit'
): TraceFrame => ({
  values: [],
  activeIndices: [],
  settledIndices: [],
  activeNodes,
  visitedNodes,
  message,
  pseudocodeLine,
  metrics: cloneMetrics(metrics),
  phase
});

export function runTraversalTrace(
  algorithm: TraversalAlgorithmId,
  graph: GraphModel,
  startNode: string
): AlgorithmTrace {
  if (!graph.nodes.includes(startNode)) throw new Error(`Start node ${startNode} does not exist in the graph.`);
  const frames: TraceFrame[] = [];
  const metrics: AlgorithmMetrics = { comparisons: 0, writes: 0, visits: 0 };
  const visited = new Set<string>();
  const visitedOrder: string[] = [];
  frames.push(makeGraphFrame(metrics, `Begin at node ${startNode}.`, 0, [startNode], []));

  if (algorithm === 'bfs') {
    const queue = [startNode];
    visited.add(startNode);
    while (queue.length) {
      const node = queue.shift()!;
      visitedOrder.push(node);
      metrics.visits += 1;
      frames.push(makeGraphFrame(metrics, `Visit ${node}. Queue: ${queue.join(', ') || 'empty'}.`, 1, [node], [...visitedOrder]));
      for (const neighbor of graph.adjacency[node] ?? []) {
        metrics.comparisons += 1;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          metrics.writes += 1;
          frames.push(makeGraphFrame(metrics, `Discover ${neighbor} and add it to the queue.`, 2, [node, neighbor], [...visitedOrder]));
        }
      }
    }
  } else {
    const visit = (node: string) => {
      visited.add(node);
      visitedOrder.push(node);
      metrics.visits += 1;
      frames.push(makeGraphFrame(metrics, `Visit ${node} and inspect its neighbors.`, 1, [node], [...visitedOrder]));
      for (const neighbor of graph.adjacency[node] ?? []) {
        metrics.comparisons += 1;
        if (!visited.has(neighbor)) {
          metrics.writes += 1;
          frames.push(makeGraphFrame(metrics, `Follow the edge from ${node} to ${neighbor}.`, 2, [node, neighbor], [...visitedOrder]));
          visit(neighbor);
        }
      }
    };
    visit(startNode);
  }

  frames.push(makeGraphFrame(metrics, `${algorithm.toUpperCase()} traversal complete.`, 3, [], [...visitedOrder], 'complete'));
  return { algorithm, frames, visitedOrder };
}
