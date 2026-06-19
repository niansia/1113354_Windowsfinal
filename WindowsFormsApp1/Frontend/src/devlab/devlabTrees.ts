import {
  FrameBuilder,
  layoutTree,
  msg,
  type CellState,
  type DevTrace,
  type LayoutTreeNode,
  type SceneTreeEdge,
  type TreeScene
} from './devlabScene.js';

export type TreeKind = 'bst' | 'avl' | 'red-black';
export type TreeOperation = 'insert' | 'search' | 'remove';

export interface TreeNode {
  id: string;
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
  height: number;
  color: 'red' | 'black';
}

let idSeq = 0;
const makeNode = (value: number, color: 'red' | 'black' = 'red'): TreeNode => ({
  id: `tn-${idSeq++}`,
  value,
  left: null,
  right: null,
  height: 1,
  color
});

const heightOf = (node: TreeNode | null) => (node ? node.height : 0);
const balanceOf = (node: TreeNode | null) => (node ? heightOf(node.left) - heightOf(node.right) : 0);
const recalcHeight = (node: TreeNode) => {
  node.height = 1 + Math.max(heightOf(node.left), heightOf(node.right));
};

export interface SceneOptions {
  compare?: string[];
  active?: string[];
  path?: string[];
  inserted?: string;
  removed?: string;
  rotate?: string[];
  showBalance?: boolean;
}

const statePriority = (
  id: string,
  o: SceneOptions
): CellState => {
  if (o.rotate?.includes(id)) return 'rotate';
  if (o.inserted === id) return 'insert';
  if (o.removed === id) return 'remove';
  if (o.active?.includes(id)) return 'active';
  if (o.compare?.includes(id)) return 'compare';
  if (o.path?.includes(id)) return 'path';
  return 'idle';
};

export function buildTreeScene(root: TreeNode | null, kind: TreeKind, o: SceneOptions = {}): TreeScene {
  if (!root) return { kind: 'tree', nodes: [], edges: [], empty: true };

  // Attach display badges (AVL balance factor) before layout.
  if (kind === 'avl' && o.showBalance) {
    const annotate = (node: TreeNode | null) => {
      if (!node) return;
      const bf = balanceOf(node);
      (node as TreeNode & { badge?: string }).badge = bf > 0 ? `+${bf}` : `${bf}`;
      annotate(node.left);
      annotate(node.right);
    };
    annotate(root);
  }

  const layout = layoutTree(root as unknown as LayoutTreeNode, (id) => statePriority(id, o));
  const pathSet = new Set(o.path ?? []);
  const edges: SceneTreeEdge[] = layout.edges.map((edge) => ({
    ...edge,
    state: pathSet.has(edge.from) && pathSet.has(edge.to) ? 'path' : undefined
  }));
  return {
    kind: 'tree',
    nodes: layout.nodes.map((node) => ({ ...node, color: kind === 'red-black' ? node.color : undefined })),
    edges
  };
}

// ---- Binary Search Tree ----------------------------------------------------------

export function bstInsert(root: TreeNode | null, value: number): TreeNode {
  if (!root) return makeNode(value, 'black');
  if (value < root.value) root.left = bstInsert(root.left, value);
  else if (value > root.value) root.right = bstInsert(root.right, value);
  return root;
}

export function buildBst(values: readonly number[]): TreeNode | null {
  return values.reduce<TreeNode | null>((root, value) => bstInsert(root, value), null);
}

export function inOrder(root: TreeNode | null): number[] {
  return root ? [...inOrder(root.left), root.value, ...inOrder(root.right)] : [];
}

const minNode = (node: TreeNode): TreeNode => {
  let cur = node;
  while (cur.left) cur = cur.left;
  return cur;
};

// ---- AVL rotations ---------------------------------------------------------------

const rotateRight = (y: TreeNode): TreeNode => {
  const x = y.left as TreeNode;
  y.left = x.right;
  x.right = y;
  recalcHeight(y);
  recalcHeight(x);
  return x;
};
const rotateLeft = (x: TreeNode): TreeNode => {
  const y = x.right as TreeNode;
  x.right = y.left;
  y.left = x;
  recalcHeight(x);
  recalcHeight(y);
  return y;
};

// ---- Animated operations ---------------------------------------------------------

const collectPath = (root: TreeNode | null, value: number): string[] => {
  const path: string[] = [];
  let node = root;
  while (node) {
    path.push(node.id);
    if (value === node.value) break;
    node = value < node.value ? node.left : node.right;
  }
  return path;
};

export interface TreeResult {
  root: TreeNode | null;
  trace: DevTrace;
}

export function treeOperation(
  kind: TreeKind,
  root: TreeNode | null,
  operation: TreeOperation,
  value: number
): TreeResult {
  if (!Number.isFinite(value)) throw new Error('請輸入有效的節點數值。');
  const fb = new FrameBuilder();
  const showBalance = kind === 'avl';

  const snapshot = (o: SceneOptions, message: ReturnType<typeof msg>, line: number, phase: Parameters<FrameBuilder['push']>[3]) =>
    fb.push(buildTreeScene(rootRef, kind, { ...o, showBalance }), message, line, phase);

  let rootRef = root;

  if (operation === 'search') {
    fb.push(buildTreeScene(rootRef, kind, { showBalance }), msg('從根節點開始尋找 {0}。', value), 0, 'ready');
    let node = rootRef;
    const path: string[] = [];
    while (node) {
      path.push(node.id);
      fb.metrics.comparisons += 1;
      fb.metrics.visits += 1;
      if (value === node.value) {
        snapshot({ path, active: [node.id] }, msg('在樹中找到 {0}。', value), 3, 'complete');
        return { root: rootRef, trace: fb.build(msg('在樹中找到 {0}。', value)) };
      }
      const goLeft = value < node.value;
      snapshot(
        { path, compare: [node.id] },
        goLeft ? msg('{0} 較小，往左子樹前進。', value) : msg('{0} 較大，往右子樹前進。', value),
        goLeft ? 1 : 2,
        'visit'
      );
      node = goLeft ? node.left : node.right;
    }
    snapshot({ path }, msg('樹中找不到 {0}。', value), 3, 'complete');
    return { root: rootRef, trace: fb.build(msg('樹中找不到 {0}。', value)) };
  }

  if (operation === 'insert') {
    fb.push(buildTreeScene(rootRef, kind, { showBalance }), msg('準備插入 {0}。', value), 0, 'ready');

    // Show the descent path for the comparison animation (visual only).
    let cursor = rootRef;
    const path: string[] = [];
    let duplicate = false;
    while (cursor) {
      path.push(cursor.id);
      if (value === cursor.value) {
        duplicate = true;
        break;
      }
      fb.metrics.comparisons += 1;
      const goLeft = value < cursor.value;
      snapshot(
        { path, compare: [cursor.id] },
        goLeft ? msg('{0} 較小，往左子樹前進。', value) : msg('{0} 較大，往右子樹前進。', value),
        goLeft ? 1 : 2,
        'visit'
      );
      cursor = goLeft ? cursor.left : cursor.right;
    }
    if (duplicate) {
      snapshot({ path }, msg('{0} 已存在，略過插入。', value), 4, 'complete');
      return { root: rootRef, trace: fb.build(msg('{0} 已存在，略過插入。', value)) };
    }

    if (kind === 'bst') {
      rootRef = bstInsert(rootRef, value);
    } else if (kind === 'red-black') {
      rootRef = rbInsert(rootRef, value, fb, snapshot);
    } else {
      const rotations: Array<{ id: string; label: ReturnType<typeof msg> }> = [];
      rootRef = avlInsert(rootRef, value, rotations);
    }
    const insertedId = findIdByValue(rootRef, value);
    const newPath = collectPath(rootRef, value);

    if (kind === 'avl') {
      // Re-run insert capturing rotations for animation: insert already mutated; show result.
      snapshot({ path: newPath, inserted: insertedId ?? undefined }, msg('插入 {0} 並完成 AVL 平衡。', value), 4, 'rotate');
    } else if (kind === 'red-black') {
      snapshot({ path: newPath, inserted: insertedId ?? undefined }, msg('插入 {0} 並完成紅黑樹修正。', value), 4, 'complete');
    } else {
      snapshot({ path: newPath, inserted: insertedId ?? undefined }, msg('已將 {0} 插入二元搜尋樹。', value), 4, 'complete');
    }
    return { root: rootRef, trace: fb.build(msg('已將 {0} 插入。', value)) };
  }

  // remove
  fb.push(buildTreeScene(rootRef, kind, { showBalance }), msg('準備移除 {0}。', value), 0, 'ready');
  const path = collectPath(rootRef, value);
  const targetId = findIdByValue(rootRef, value);
  if (!targetId) {
    snapshot({ path }, msg('樹中找不到 {0}，無法移除。', value), 3, 'complete');
    return { root: rootRef, trace: fb.build(msg('樹中找不到 {0}。', value)) };
  }
  snapshot({ path, removed: targetId }, msg('找到 {0}，開始移除。', value), 2, 'visit');
  if (kind === 'avl') rootRef = avlRemove(rootRef, value);
  else rootRef = bstRemove(rootRef, value, kind);
  snapshot(
    {},
    kind === 'avl' ? msg('移除 {0} 並重新平衡。', value) : msg('已移除 {0}。', value),
    3,
    kind === 'avl' ? 'rotate' : 'complete'
  );
  return { root: rootRef, trace: fb.build(msg('已移除 {0}。', value)) };
}

const findIdByValue = (root: TreeNode | null, value: number): string | null => {
  let node = root;
  while (node) {
    if (value === node.value) return node.id;
    node = value < node.value ? node.left : node.right;
  }
  return null;
};

// AVL insert with rebalancing.
function avlInsert(node: TreeNode | null, value: number, rotations: Array<{ id: string; label: ReturnType<typeof msg> }>): TreeNode {
  if (!node) return makeNode(value, 'black');
  if (value < node.value) node.left = avlInsert(node.left, value, rotations);
  else if (value > node.value) node.right = avlInsert(node.right, value, rotations);
  else return node;

  recalcHeight(node);
  const balance = balanceOf(node);

  if (balance > 1 && value < (node.left as TreeNode).value) {
    rotations.push({ id: node.id, label: msg('右旋以恢復平衡。') });
    return rotateRight(node);
  }
  if (balance < -1 && value > (node.right as TreeNode).value) {
    rotations.push({ id: node.id, label: msg('左旋以恢復平衡。') });
    return rotateLeft(node);
  }
  if (balance > 1 && value > (node.left as TreeNode).value) {
    node.left = rotateLeft(node.left as TreeNode);
    rotations.push({ id: node.id, label: msg('左右旋以恢復平衡。') });
    return rotateRight(node);
  }
  if (balance < -1 && value < (node.right as TreeNode).value) {
    node.right = rotateRight(node.right as TreeNode);
    rotations.push({ id: node.id, label: msg('右左旋以恢復平衡。') });
    return rotateLeft(node);
  }
  return node;
}

function avlRebalance(node: TreeNode): TreeNode {
  recalcHeight(node);
  const balance = balanceOf(node);
  if (balance > 1) {
    if (balanceOf(node.left) < 0) node.left = rotateLeft(node.left as TreeNode);
    return rotateRight(node);
  }
  if (balance < -1) {
    if (balanceOf(node.right) > 0) node.right = rotateRight(node.right as TreeNode);
    return rotateLeft(node);
  }
  return node;
}

function avlRemove(node: TreeNode | null, value: number): TreeNode | null {
  if (!node) return null;
  if (value < node.value) node.left = avlRemove(node.left, value);
  else if (value > node.value) node.right = avlRemove(node.right, value);
  else {
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    const successor = minNode(node.right);
    node.value = successor.value;
    node.right = avlRemove(node.right, successor.value);
  }
  return avlRebalance(node);
}

function bstRemove(node: TreeNode | null, value: number, kind: TreeKind): TreeNode | null {
  if (!node) return null;
  if (value < node.value) node.left = bstRemove(node.left, value, kind);
  else if (value > node.value) node.right = bstRemove(node.right, value, kind);
  else {
    if (!node.left) return node.right;
    if (!node.right) return node.left;
    const successor = minNode(node.right);
    node.value = successor.value;
    node.right = bstRemove(node.right, successor.value, kind);
  }
  return node;
}

// ---- Red-Black tree (top-down recursion with rebalancing on the way up) -----------

const isRed = (node: TreeNode | null) => Boolean(node && node.color === 'red');

function rbInsert(
  root: TreeNode | null,
  value: number,
  fb: FrameBuilder,
  snapshot: (o: SceneOptions, message: ReturnType<typeof msg>, line: number, phase: Parameters<FrameBuilder['push']>[3]) => void
): TreeNode {
  const insert = (node: TreeNode | null): TreeNode => {
    if (!node) return makeNode(value, 'red');
    if (value < node.value) node.left = insert(node.left);
    else if (value > node.value) node.right = insert(node.right);
    else return node;

    // Left-leaning red-black fix-ups.
    if (isRed(node.right) && !isRed(node.left)) node = rbRotateLeft(node);
    if (isRed(node.left) && isRed(node.left!.left)) node = rbRotateRight(node);
    if (isRed(node.left) && isRed(node.right)) rbFlip(node);
    recalcHeight(node);
    return node;
  };
  const next = insert(root);
  next.color = 'black';
  return next;
}

const rbRotateLeft = (h: TreeNode): TreeNode => {
  const x = h.right as TreeNode;
  h.right = x.left;
  x.left = h;
  x.color = h.color;
  h.color = 'red';
  recalcHeight(h);
  recalcHeight(x);
  return x;
};
const rbRotateRight = (h: TreeNode): TreeNode => {
  const x = h.left as TreeNode;
  h.left = x.right;
  x.right = h;
  x.color = h.color;
  h.color = 'red';
  recalcHeight(h);
  recalcHeight(x);
  return x;
};
const rbFlip = (h: TreeNode) => {
  h.color = 'red';
  if (h.left) h.left.color = 'black';
  if (h.right) h.right.color = 'black';
};

// ---- Binary heap -----------------------------------------------------------------

export type HeapMode = 'min' | 'max';
export type HeapOperation = 'insert' | 'extract' | 'peek';

const heapCompare = (mode: HeapMode, a: number, b: number) => (mode === 'min' ? a < b : a > b);

export function heapScene(
  array: readonly number[],
  states: Record<number, CellState> = {}
): TreeScene {
  if (!array.length) return { kind: 'tree', nodes: [], edges: [], empty: true };
  const n = array.length;
  // Map the array into a layout tree so the heap renders as a real binary tree.
  const build = (index: number): LayoutTreeNode | null => {
    if (index >= n) return null;
    return {
      id: `heap-${index}`,
      value: array[index],
      left: build(index * 2 + 1),
      right: build(index * 2 + 2),
      badge: `#${index}`
    };
  };
  const layout = layoutTree(build(0), (id) => {
    const idx = Number(id.replace('heap-', ''));
    return states[idx] ?? 'idle';
  });
  return { kind: 'tree', nodes: layout.nodes, edges: layout.edges };
}

export interface HeapResult {
  array: number[];
  trace: DevTrace;
  output?: number;
}

export function heapOperation(
  mode: HeapMode,
  array: readonly number[],
  operation: HeapOperation,
  value?: number
): HeapResult {
  const heap = [...array];
  const fb = new FrameBuilder();
  const label = mode === 'min' ? '最小堆積' : '最大堆積';

  if (operation === 'peek') {
    if (!heap.length) throw new Error('堆積目前是空的。');
    fb.push(heapScene(heap, { 0: 'active' }), msg('{0}的根節點為 {1}。', label, heap[0]), 0, 'visit');
    return { array: heap, trace: fb.build(), output: heap[0] };
  }

  if (operation === 'insert') {
    if (value === undefined || !Number.isFinite(value)) throw new Error('請輸入有效的節點數值。');
    heap.push(value);
    let i = heap.length - 1;
    fb.push(heapScene(heap, { [i]: 'insert' }), msg('將 {0} 放到堆積末端。', value), 1, 'write');
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      fb.metrics.comparisons += 1;
      fb.push(
        heapScene(heap, { [i]: 'active', [parent]: 'compare' }),
        msg('比較 {0} 與父節點 {1}。', heap[i], heap[parent]),
        2,
        'compare'
      );
      if (!heapCompare(mode, heap[i], heap[parent])) break;
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      fb.metrics.writes += 2;
      fb.push(heapScene(heap, { [i]: 'swap', [parent]: 'swap' }), msg('上浮：與父節點交換。'), 3, 'write');
      i = parent;
    }
    fb.push(heapScene(heap, { [i]: 'settled' }), msg('{0} 已就位。', value), 4, 'complete');
    return { array: heap, trace: fb.build() };
  }

  // extract root
  if (!heap.length) throw new Error('堆積目前是空的。');
  const output = heap[0];
  fb.push(heapScene(heap, { 0: 'remove' }), msg('取出根節點 {0}。', output), 1, 'visit');
  const last = heap.pop()!;
  if (heap.length) {
    heap[0] = last;
    fb.push(heapScene(heap, { 0: 'active' }), msg('將末端 {0} 移到根節點。', last), 2, 'write');
    let i = 0;
    const size = heap.length;
    while (true) {
      const left = i * 2 + 1;
      const right = i * 2 + 2;
      let target = i;
      if (left < size) {
        fb.metrics.comparisons += 1;
        if (heapCompare(mode, heap[left], heap[target])) target = left;
      }
      if (right < size) {
        fb.metrics.comparisons += 1;
        if (heapCompare(mode, heap[right], heap[target])) target = right;
      }
      if (target === i) break;
      fb.push(
        heapScene(heap, { [i]: 'active', [target]: 'compare' }),
        msg('下沉：與較{0}的子節點交換。', mode === 'min' ? '小' : '大'),
        3,
        'compare'
      );
      [heap[i], heap[target]] = [heap[target], heap[i]];
      fb.metrics.writes += 2;
      i = target;
    }
  }
  fb.push(heapScene(heap, {}), msg('已取出 {0}，堆積完成重整。', output), 4, 'complete');
  return { array: heap, trace: fb.build(), output };
}
