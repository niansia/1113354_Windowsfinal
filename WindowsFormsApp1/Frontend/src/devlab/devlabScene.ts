// Unified scene model for the Development Lab. Every algorithm produces a list of
// DevFrame scenes; the React layer renders them with SVG node-link diagrams (trees,
// graphs), DP matrices, or array bars. Messages are i18n templates: the zh-TW string is
// the key (source-as-key convention) and {0},{1}… are filled from args at render time.

export type CellState =
  | 'idle'
  | 'active'
  | 'compare'
  | 'swap'
  | 'settled'
  | 'pivot'
  | 'frontier'
  | 'visited'
  | 'path'
  | 'min'
  | 'excluded'
  | 'insert'
  | 'remove'
  | 'rotate'
  | 'relax'
  | 'highlight';

export type Phase =
  | 'ready'
  | 'compare'
  | 'write'
  | 'pivot'
  | 'visit'
  | 'rotate'
  | 'relax'
  | 'fill'
  | 'backtrack'
  | 'complete';

export interface Metrics {
  comparisons: number;
  writes: number;
  visits: number;
}

export interface DevMessage {
  key: string;
  args?: Array<string | number>;
}

export const msg = (key: string, ...args: Array<string | number>): DevMessage => ({ key, args });

// ---- Array (sorting / searching) -------------------------------------------------

export interface ArrayCell {
  value: number;
  state: CellState;
}

export interface ArrayPointer {
  index: number;
  label: string;
  tone?: 'a' | 'b' | 'c';
}

export interface ArrayScene {
  kind: 'array';
  cells: ArrayCell[];
  buffer?: ArrayCell[];
  bufferLabel?: string;
  pointers?: ArrayPointer[];
  range?: [number, number];
  target?: number;
}

// ---- Tree (BST / AVL / Red-Black / Heap) -----------------------------------------

export interface SceneTreeNode {
  id: string;
  value: number | string;
  x: number; // 0..1
  y: number; // 0..1
  state: CellState;
  color?: 'red' | 'black';
  badge?: string; // balance factor, heap index, etc.
}

export interface SceneTreeEdge {
  from: string; // node id
  to: string; // node id
  state?: CellState;
}

export interface TreeScene {
  kind: 'tree';
  nodes: SceneTreeNode[];
  edges: SceneTreeEdge[];
  empty?: boolean;
}

// ---- Graph (BFS / DFS / Dijkstra / MST / Topological) ----------------------------

export interface SceneGraphNode {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  state: CellState;
  dist?: number | null; // shortest-path / order badge
  badge?: string;
}

export interface SceneGraphEdge {
  from: string;
  to: string;
  weight?: number;
  state?: CellState;
  directed?: boolean;
}

export interface GraphScene {
  kind: 'graph';
  nodes: SceneGraphNode[];
  edges: SceneGraphEdge[];
  frontier?: string[]; // queue / stack / priority-queue contents
  frontierLabel?: string;
  order?: string[]; // visiting / topological order so far
}

// ---- Matrix (Dynamic Programming) ------------------------------------------------

export interface MatrixCell {
  value: number | string;
  state: CellState;
}

export interface MatrixScene {
  kind: 'matrix';
  cells: MatrixCell[][];
  rowLabels?: Array<number | string>;
  colLabels?: Array<number | string>;
  rowHeader?: string;
  colHeader?: string;
  arrows?: Array<{ from: [number, number]; to: [number, number] }>;
  highlight?: string; // running result expression
}

export type Scene = ArrayScene | TreeScene | GraphScene | MatrixScene;

export interface DevFrame {
  scene: Scene;
  message: DevMessage;
  pseudoLine: number;
  metrics: Metrics;
  phase: Phase;
}

export interface DevTrace {
  frames: DevFrame[];
  summary?: DevMessage;
}

// ---- Frame builder ---------------------------------------------------------------

export class FrameBuilder {
  readonly frames: DevFrame[] = [];
  readonly metrics: Metrics = { comparisons: 0, writes: 0, visits: 0 };

  push(scene: Scene, message: DevMessage, pseudoLine: number, phase: Phase): void {
    this.frames.push({
      scene,
      message,
      pseudoLine,
      phase,
      metrics: { ...this.metrics }
    });
  }

  build(summary?: DevMessage): DevTrace {
    return { frames: this.frames, summary };
  }
}

// ---- Layout helpers --------------------------------------------------------------

export interface LayoutTreeNode {
  id: string;
  value: number | string;
  left: LayoutTreeNode | null;
  right: LayoutTreeNode | null;
  color?: 'red' | 'black';
  badge?: string;
}

interface PositionedTree {
  nodes: SceneTreeNode[];
  edges: SceneTreeEdge[];
  positions: Record<string, { x: number; y: number }>;
  depth: number;
}

// In-order index drives the horizontal slot; depth drives the vertical slot. This keeps
// a binary tree visually sorted left→right and never overlaps siblings.
export function layoutTree(
  root: LayoutTreeNode | null,
  stateOf: (id: string) => CellState = () => 'idle'
): PositionedTree {
  if (!root) return { nodes: [], edges: [], positions: {}, depth: 0 };

  const order: Array<{ node: LayoutTreeNode; depth: number }> = [];
  let maxDepth = 0;
  const walk = (node: LayoutTreeNode | null, depth: number) => {
    if (!node) return;
    maxDepth = Math.max(maxDepth, depth);
    walk(node.left, depth + 1);
    order.push({ node, depth });
    walk(node.right, depth + 1);
  };
  walk(root, 0);

  const count = order.length;
  const positions: Record<string, { x: number; y: number }> = {};
  const nodes: SceneTreeNode[] = order.map(({ node, depth }, index) => {
    const x = count === 1 ? 0.5 : (index + 0.5) / count;
    const y = maxDepth === 0 ? 0.5 : 0.12 + (depth / maxDepth) * 0.74;
    positions[node.id] = { x, y };
    return {
      id: node.id,
      value: node.value,
      x,
      y,
      state: stateOf(node.id),
      color: node.color,
      badge: node.badge
    };
  });

  const edges: SceneTreeEdge[] = [];
  const linkEdges = (node: LayoutTreeNode | null) => {
    if (!node) return;
    if (node.left) edges.push({ from: node.id, to: node.left.id });
    if (node.right) edges.push({ from: node.id, to: node.right.id });
    linkEdges(node.left);
    linkEdges(node.right);
  };
  linkEdges(root);

  return { nodes, edges, positions, depth: maxDepth };
}

// Deterministic circular layout: node 0 at the top, going clockwise. Good for the small
// graphs (≤ ~12 nodes) the lab works with and avoids the jitter of force layouts.
export function circularLayout(nodeIds: string[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const n = nodeIds.length;
  if (n === 0) return positions;
  if (n === 1) {
    positions[nodeIds[0]] = { x: 0.5, y: 0.5 };
    return positions;
  }
  const cx = 0.5;
  const cy = 0.52;
  const radius = 0.4;
  nodeIds.forEach((id, index) => {
    const angle = -Math.PI / 2 + (index / n) * Math.PI * 2;
    positions[id] = {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius * 0.92
    };
  });
  return positions;
}
