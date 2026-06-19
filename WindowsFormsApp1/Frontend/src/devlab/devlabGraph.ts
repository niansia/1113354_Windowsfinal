import {
  FrameBuilder,
  circularLayout,
  msg,
  type CellState,
  type DevTrace,
  type GraphScene,
  type SceneGraphEdge,
  type SceneGraphNode
} from './devlabScene.js';

export type GraphAlgorithmId = 'bfs' | 'dfs' | 'dijkstra' | 'prim' | 'kruskal' | 'topological';

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  directed: boolean;
}

export interface GraphModel {
  nodes: string[];
  edges: GraphEdge[];
  adjacency: Record<string, Array<{ to: string; weight: number }>>;
  directed: boolean;
}

// Accepts: "A-B", "A-B:5", "A>B" / "A->B" (directed), "A>B:5".
export function parseGraph(input: string): GraphModel {
  const chunks = input
    .split(/[,\n;]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (!chunks.length) throw new Error('請輸入至少一條圖形邊。');

  const nodes = new Set<string>();
  const edges: GraphEdge[] = [];
  const adjacency: Record<string, Array<{ to: string; weight: number }>> = {};
  let anyDirected = false;

  for (const chunk of chunks) {
    const match = chunk.match(/^([A-Za-z0-9_]+)\s*(->|-|>)\s*([A-Za-z0-9_]+)\s*(?::\s*(-?\d+(?:\.\d+)?))?$/);
    if (!match) throw new Error(`圖形邊「${chunk}」格式無效，請使用 A-B 或 A-B:5 格式。`);
    const from = match[1];
    const directedToken = match[2] === '>' || match[2] === '->';
    const to = match[3];
    const weight = match[4] !== undefined ? Number(match[4]) : 1;
    if (from === to) throw new Error('此實驗室不使用連回自身的邊。');
    anyDirected = anyDirected || directedToken;
    nodes.add(from);
    nodes.add(to);
    adjacency[from] ??= [];
    adjacency[to] ??= [];
    if (!edges.some((edge) => edge.from === from && edge.to === to)) {
      edges.push({ from, to, weight, directed: directedToken });
    }
    if (!adjacency[from].some((entry) => entry.to === to)) adjacency[from].push({ to, weight });
    if (!directedToken && !adjacency[to].some((entry) => entry.to === from)) {
      adjacency[to].push({ to: from, weight });
    }
  }

  return { nodes: [...nodes].sort(), edges, adjacency, directed: anyDirected };
}

interface SceneState {
  nodeStates?: Record<string, CellState>;
  nodeDist?: Record<string, number | null>;
  nodeBadge?: Record<string, string>;
  edgeStates?: Record<string, CellState>;
  frontier?: string[];
  frontierLabel?: string;
  order?: string[];
}

const edgeKey = (a: string, b: string) => `${a}__${b}`;

const buildGraphScene = (graph: GraphModel, positions: Record<string, { x: number; y: number }>, state: SceneState): GraphScene => {
  const nodes: SceneGraphNode[] = graph.nodes.map((id) => ({
    id,
    x: positions[id].x,
    y: positions[id].y,
    state: state.nodeStates?.[id] ?? 'idle',
    dist: state.nodeDist ? state.nodeDist[id] ?? null : undefined,
    badge: state.nodeBadge?.[id]
  }));
  const edges: SceneGraphEdge[] = graph.edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    weight: graph.edges.some((e) => e.weight !== 1) ? edge.weight : undefined,
    directed: edge.directed,
    state: state.edgeStates?.[edgeKey(edge.from, edge.to)] ?? state.edgeStates?.[edgeKey(edge.to, edge.from)]
  }));
  return {
    kind: 'graph',
    nodes,
    edges,
    frontier: state.frontier,
    frontierLabel: state.frontierLabel,
    order: state.order
  };
};

const sortedNeighbors = (graph: GraphModel, node: string) =>
  [...(graph.adjacency[node] ?? [])].sort((a, b) => a.to.localeCompare(b.to));

export function runGraphTrace(algorithm: GraphAlgorithmId, graph: GraphModel, startNode: string): DevTrace {
  if (!graph.nodes.length) throw new Error('請輸入至少一條圖形邊。');
  const positions = circularLayout(graph.nodes);
  const fb = new FrameBuilder();

  if (algorithm === 'kruskal') return runKruskal(graph, positions, fb);
  if (algorithm === 'topological') return runTopological(graph, positions, fb);

  if (!graph.nodes.includes(startNode)) throw new Error(`起始節點 ${startNode} 不存在於圖形中。`);

  if (algorithm === 'bfs') return runBfs(graph, positions, startNode, fb);
  if (algorithm === 'dfs') return runDfs(graph, positions, startNode, fb);
  if (algorithm === 'dijkstra') return runDijkstra(graph, positions, startNode, fb);
  return runPrim(graph, positions, startNode, fb);
}

function runBfs(graph: GraphModel, positions: Record<string, { x: number; y: number }>, start: string, fb: FrameBuilder): DevTrace {
  const visited = new Set<string>([start]);
  const order: string[] = [];
  const queue: string[] = [start];
  const treeEdges: Record<string, CellState> = {};
  const nodeStates: Record<string, CellState> = { [start]: 'frontier' };

  fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates }, frontier: [...queue], frontierLabel: '佇列', order }), msg('將起點 {0} 加入佇列。', start), 0, 'ready');

  while (queue.length) {
    const node = queue.shift()!;
    order.push(node);
    fb.metrics.visits += 1;
    nodeStates[node] = 'active';
    fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates }, frontier: [...queue], frontierLabel: '佇列', order: [...order] }), msg('從佇列取出並走訪 {0}。', node), 1, 'visit');
    for (const { to } of sortedNeighbors(graph, node)) {
      fb.metrics.comparisons += 1;
      if (!visited.has(to)) {
        visited.add(to);
        queue.push(to);
        treeEdges[edgeKey(node, to)] = 'path';
        nodeStates[to] = 'frontier';
        fb.metrics.writes += 1;
        fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates }, edgeStates: { ...treeEdges }, frontier: [...queue], frontierLabel: '佇列', order: [...order] }), msg('發現 {0}，加入佇列。', to), 2, 'visit');
      }
    }
    nodeStates[node] = 'visited';
  }
  fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates }, edgeStates: { ...treeEdges }, order: [...order] }), msg('廣度優先走訪完成。'), 3, 'complete');
  return fb.build(msg('走訪順序：{0}', order.join(' → ')));
}

function runDfs(graph: GraphModel, positions: Record<string, { x: number; y: number }>, start: string, fb: FrameBuilder): DevTrace {
  const visited = new Set<string>();
  const order: string[] = [];
  const treeEdges: Record<string, CellState> = {};
  const nodeStates: Record<string, CellState> = {};
  const stack: string[] = [];

  fb.push(buildGraphScene(graph, positions, { nodeStates: {}, frontier: [start], frontierLabel: '堆疊', order }), msg('從 {0} 開始深度優先走訪。', start), 0, 'ready');

  const visit = (node: string, parent: string | null) => {
    visited.add(node);
    order.push(node);
    stack.push(node);
    fb.metrics.visits += 1;
    if (parent) treeEdges[edgeKey(parent, node)] = 'path';
    nodeStates[node] = 'active';
    fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates }, edgeStates: { ...treeEdges }, frontier: [...stack], frontierLabel: '堆疊', order: [...order] }), msg('走訪 {0} 並檢查其鄰居。', node), 1, 'visit');
    for (const { to } of sortedNeighbors(graph, node)) {
      fb.metrics.comparisons += 1;
      if (!visited.has(to)) {
        fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates, [to]: 'frontier' }, edgeStates: { ...treeEdges, [edgeKey(node, to)]: 'compare' }, frontier: [...stack], frontierLabel: '堆疊', order: [...order] }), msg('沿邊深入 {0} → {1}。', node, to), 2, 'visit');
        visit(to, node);
      }
    }
    nodeStates[node] = 'visited';
    stack.pop();
    fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates }, edgeStates: { ...treeEdges }, frontier: [...stack], frontierLabel: '堆疊', order: [...order] }), msg('{0} 的分支已結束，回溯。', node), 3, 'backtrack');
  };
  visit(start, null);
  fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates }, edgeStates: { ...treeEdges }, order: [...order] }), msg('深度優先走訪完成。'), 4, 'complete');
  return fb.build(msg('走訪順序：{0}', order.join(' → ')));
}

function runDijkstra(graph: GraphModel, positions: Record<string, { x: number; y: number }>, start: string, fb: FrameBuilder): DevTrace {
  const dist: Record<string, number | null> = {};
  graph.nodes.forEach((node) => (dist[node] = null));
  dist[start] = 0;
  const settled = new Set<string>();
  const treeEdges: Record<string, CellState> = {};
  const parent: Record<string, string> = {};

  const nodeStates = (): Record<string, CellState> => {
    const states: Record<string, CellState> = {};
    settled.forEach((id) => (states[id] = 'visited'));
    return states;
  };
  const frontier = () =>
    graph.nodes
      .filter((node) => !settled.has(node) && dist[node] !== null)
      .sort((a, b) => (dist[a] as number) - (dist[b] as number))
      .map((node) => `${node}:${dist[node]}`);

  fb.push(buildGraphScene(graph, positions, { nodeStates: {}, nodeDist: { ...dist }, frontier: frontier(), frontierLabel: '優先佇列' }), msg('起點 {0} 距離設為 0，其餘為無限大。', start), 0, 'ready');

  while (settled.size < graph.nodes.length) {
    let current: string | null = null;
    let best = Infinity;
    for (const node of graph.nodes) {
      if (!settled.has(node) && dist[node] !== null && (dist[node] as number) < best) {
        best = dist[node] as number;
        current = node;
      }
    }
    if (current === null) break;
    settled.add(current);
    fb.metrics.visits += 1;
    fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates(), [current]: 'active' }, nodeDist: { ...dist }, edgeStates: { ...treeEdges }, frontier: frontier(), frontierLabel: '優先佇列' }), msg('選擇距離最小的 {0}（{1}）。', current, dist[current] as number), 1, 'visit');

    for (const { to, weight } of sortedNeighbors(graph, current)) {
      if (settled.has(to)) continue;
      fb.metrics.comparisons += 1;
      const candidate = (dist[current] as number) + weight;
      const better = dist[to] === null || candidate < (dist[to] as number);
      fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates(), [current]: 'active', [to]: 'frontier' }, nodeDist: { ...dist }, edgeStates: { ...treeEdges, [edgeKey(current, to)]: 'compare' }, frontier: frontier(), frontierLabel: '優先佇列' }), msg('鬆弛 {0} → {1}：{2} + {3} = {4}。', current, to, dist[current] as number, weight, candidate), 2, 'relax');
      if (better) {
        dist[to] = candidate;
        if (parent[to]) delete treeEdges[edgeKey(parent[to], to)];
        parent[to] = current;
        treeEdges[edgeKey(current, to)] = 'path';
        fb.metrics.writes += 1;
        fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates(), [current]: 'active', [to]: 'frontier' }, nodeDist: { ...dist }, edgeStates: { ...treeEdges }, frontier: frontier(), frontierLabel: '優先佇列' }), msg('更新 {0} 的最短距離為 {1}。', to, candidate), 3, 'relax');
      }
    }
  }
  fb.push(buildGraphScene(graph, positions, { nodeStates: nodeStates(), nodeDist: { ...dist }, edgeStates: { ...treeEdges } }), msg('Dijkstra 完成，已求得最短路徑樹。'), 4, 'complete');
  return fb.build(msg('Dijkstra 完成，已求得最短路徑樹。'));
}

function runPrim(graph: GraphModel, positions: Record<string, { x: number; y: number }>, start: string, fb: FrameBuilder): DevTrace {
  const inTree = new Set<string>([start]);
  const treeEdges: Record<string, CellState> = {};
  let total = 0;
  const nodeStates = (): Record<string, CellState> => {
    const states: Record<string, CellState> = {};
    inTree.forEach((id) => (states[id] = 'path'));
    return states;
  };

  fb.push(buildGraphScene(graph, positions, { nodeStates: nodeStates() }), msg('從 {0} 開始建立最小生成樹。', start), 0, 'ready');

  while (inTree.size < graph.nodes.length) {
    let bestEdge: GraphEdge | null = null;
    let bestFrom = '';
    let bestTo = '';
    for (const edge of graph.edges) {
      const candidates: Array<[string, string]> = edge.directed ? [[edge.from, edge.to]] : [[edge.from, edge.to], [edge.to, edge.from]];
      for (const [u, v] of candidates) {
        if (inTree.has(u) && !inTree.has(v)) {
          fb.metrics.comparisons += 1;
          if (!bestEdge || edge.weight < bestEdge.weight) {
            bestEdge = edge;
            bestFrom = u;
            bestTo = v;
          }
        }
      }
    }
    if (!bestEdge) break;
    fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates(), [bestTo]: 'frontier' }, edgeStates: { ...treeEdges, [edgeKey(bestFrom, bestTo)]: 'compare' } }), msg('跨越切割的最小邊：{0} — {1}（權重 {2}）。', bestFrom, bestTo, bestEdge.weight), 1, 'relax');
    inTree.add(bestTo);
    treeEdges[edgeKey(bestFrom, bestTo)] = 'path';
    total += bestEdge.weight;
    fb.metrics.writes += 1;
    fb.push(buildGraphScene(graph, positions, { nodeStates: nodeStates(), edgeStates: { ...treeEdges } }), msg('將 {0} 加入生成樹，目前總權重 {1}。', bestTo, total), 2, 'visit');
  }
  fb.push(buildGraphScene(graph, positions, { nodeStates: nodeStates(), edgeStates: { ...treeEdges } }), msg('Prim 完成，最小生成樹總權重為 {0}。', total), 3, 'complete');
  return fb.build(msg('最小生成樹總權重為 {0}。', total));
}

function runKruskal(graph: GraphModel, positions: Record<string, { x: number; y: number }>, fb: FrameBuilder): DevTrace {
  const parent: Record<string, string> = {};
  graph.nodes.forEach((node) => (parent[node] = node));
  const find = (x: string): string => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const ordered = [...graph.edges].sort((a, b) => a.weight - b.weight);
  const treeEdges: Record<string, CellState> = {};
  const used = new Set<string>();
  let total = 0;

  fb.push(buildGraphScene(graph, positions, {}), msg('將所有邊依權重排序。'), 0, 'ready');

  for (const edge of ordered) {
    fb.metrics.comparisons += 1;
    const ra = find(edge.from);
    const rb = find(edge.to);
    const cycle = ra === rb;
    fb.push(buildGraphScene(graph, positions, { nodeStates: nodeStatesFromUsed(graph, used), edgeStates: { ...treeEdges, [edgeKey(edge.from, edge.to)]: cycle ? 'excluded' : 'compare' } }), cycle ? msg('邊 {0} — {1} 會形成環，捨棄。', edge.from, edge.to) : msg('檢查邊 {0} — {1}（權重 {2}）。', edge.from, edge.to, edge.weight), 1, cycle ? 'backtrack' : 'relax');
    if (!cycle) {
      parent[ra] = rb;
      treeEdges[edgeKey(edge.from, edge.to)] = 'path';
      used.add(edge.from);
      used.add(edge.to);
      total += edge.weight;
      fb.metrics.writes += 1;
      fb.push(buildGraphScene(graph, positions, { nodeStates: nodeStatesFromUsed(graph, used), edgeStates: { ...treeEdges } }), msg('加入邊 {0} — {1}，目前總權重 {2}。', edge.from, edge.to, total), 2, 'visit');
    }
  }
  fb.push(buildGraphScene(graph, positions, { nodeStates: nodeStatesFromUsed(graph, used), edgeStates: { ...treeEdges } }), msg('Kruskal 完成，最小生成樹總權重為 {0}。', total), 3, 'complete');
  return fb.build(msg('最小生成樹總權重為 {0}。', total));
}

const nodeStatesFromUsed = (graph: GraphModel, used: Set<string>): Record<string, CellState> => {
  const states: Record<string, CellState> = {};
  graph.nodes.forEach((node) => {
    if (used.has(node)) states[node] = 'path';
  });
  return states;
};

function runTopological(graph: GraphModel, positions: Record<string, { x: number; y: number }>, fb: FrameBuilder): DevTrace {
  if (!graph.directed) throw new Error('拓撲排序需要有向圖，請使用 A>B 格式。');
  const indegree: Record<string, number> = {};
  graph.nodes.forEach((node) => (indegree[node] = 0));
  graph.edges.forEach((edge) => (indegree[edge.to] += 1));

  const order: string[] = [];
  const nodeStates: Record<string, CellState> = {};
  const nodeBadge: Record<string, string> = {};
  graph.nodes.forEach((node) => (nodeBadge[node] = `入度 ${indegree[node]}`));
  let ready = graph.nodes.filter((node) => indegree[node] === 0).sort();

  fb.push(buildGraphScene(graph, positions, { nodeStates: {}, nodeBadge: { ...nodeBadge }, frontier: [...ready], frontierLabel: '入度為 0', order }), msg('計算每個節點的入度。'), 0, 'ready');

  while (ready.length) {
    const node = ready.shift()!;
    order.push(node);
    nodeStates[node] = 'visited';
    fb.metrics.visits += 1;
    fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates, [node]: 'active' }, nodeBadge: { ...nodeBadge }, frontier: [...ready], frontierLabel: '入度為 0', order: [...order] }), msg('輸出 {0}，移除其出邊。', node), 1, 'visit');
    for (const { to } of sortedNeighbors(graph, node)) {
      // Only follow directed out-edges.
      if (!graph.edges.some((edge) => edge.from === node && edge.to === to)) continue;
      indegree[to] -= 1;
      nodeBadge[to] = `入度 ${indegree[to]}`;
      fb.metrics.comparisons += 1;
      if (indegree[to] === 0) {
        ready.push(to);
        fb.push(buildGraphScene(graph, positions, { nodeStates: { ...nodeStates, [to]: 'frontier' }, nodeBadge: { ...nodeBadge }, frontier: [...ready], frontierLabel: '入度為 0', order: [...order] }), msg('{0} 入度歸零，加入佇列。', to), 2, 'relax');
      }
    }
    ready = ready.sort();
  }
  if (order.length < graph.nodes.length) {
    fb.push(buildGraphScene(graph, positions, { nodeStates, nodeBadge: { ...nodeBadge }, order: [...order] }), msg('圖中存在環，無法完成拓撲排序。'), 3, 'complete');
    return fb.build(msg('圖中存在環，無法完成拓撲排序。'));
  }
  fb.push(buildGraphScene(graph, positions, { nodeStates, nodeBadge: { ...nodeBadge }, order: [...order] }), msg('拓撲排序完成。'), 3, 'complete');
  return fb.build(msg('拓撲順序：{0}', order.join(' → ')));
}
