"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimumSpanningTree = exports.topologicalSort = exports.shortestPath = exports.connectedComponents = exports.breadthFirstTraversal = exports.graphDegrees = exports.parseGraph = void 0;
const verticesOf = (graph) => {
    const vertices = new Set(graph.vertices ?? []);
    graph.edges.forEach((edge) => {
        if (!edge.from.trim() || !edge.to.trim() || !Number.isFinite(edge.weight))
            throw new Error('INVALID_GRAPH');
        vertices.add(edge.from);
        vertices.add(edge.to);
    });
    return [...vertices].sort((left, right) => left.localeCompare(right));
};
const adjacencyOf = (graph) => {
    const adjacency = new Map(verticesOf(graph).map((vertex) => [vertex, []]));
    graph.edges.forEach((edge) => {
        adjacency.get(edge.from)?.push({ vertex: edge.to, weight: edge.weight });
        if (!graph.directed)
            adjacency.get(edge.to)?.push({ vertex: edge.from, weight: edge.weight });
    });
    adjacency.forEach((neighbors) => neighbors.sort((left, right) => left.vertex.localeCompare(right.vertex)));
    return adjacency;
};
const parseGraph = (source, directed = false) => {
    const edges = source
        .split(/[;\n]+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
        const parts = line.split(/[\s,]+/).filter(Boolean);
        if (parts.length < 2 || parts.length > 3)
            throw new Error('INVALID_GRAPH');
        const weight = parts[2] === undefined ? 1 : Number(parts[2]);
        if (!Number.isFinite(weight))
            throw new Error('INVALID_GRAPH');
        return { from: parts[0], to: parts[1], weight };
    });
    if (edges.length === 0)
        throw new Error('INVALID_GRAPH');
    return { directed, edges };
};
exports.parseGraph = parseGraph;
const graphDegrees = (graph) => {
    const result = Object.fromEntries(verticesOf(graph).map((vertex) => [vertex, { inDegree: 0, outDegree: 0, degree: 0 }]));
    graph.edges.forEach((edge) => {
        result[edge.from].outDegree += 1;
        result[edge.to].inDegree += 1;
        if (graph.directed) {
            result[edge.from].degree += 1;
            result[edge.to].degree += 1;
        }
        else {
            result[edge.from].degree += 1;
            result[edge.to].degree += 1;
            result[edge.from].inDegree += 1;
            result[edge.to].outDegree += 1;
        }
    });
    return result;
};
exports.graphDegrees = graphDegrees;
const breadthFirstTraversal = (graph, start) => {
    const adjacency = adjacencyOf(graph);
    if (!adjacency.has(start))
        throw new Error('VERTEX_NOT_FOUND');
    const queue = [start];
    const visited = new Set([start]);
    const order = [];
    while (queue.length) {
        const vertex = queue.shift();
        order.push(vertex);
        for (const neighbor of adjacency.get(vertex) ?? []) {
            if (!visited.has(neighbor.vertex)) {
                visited.add(neighbor.vertex);
                queue.push(neighbor.vertex);
            }
        }
    }
    return order;
};
exports.breadthFirstTraversal = breadthFirstTraversal;
const connectedComponents = (graph) => {
    const adjacency = adjacencyOf({ ...graph, directed: false });
    const visited = new Set();
    const components = [];
    for (const start of adjacency.keys()) {
        if (visited.has(start))
            continue;
        const queue = [start];
        visited.add(start);
        const component = [];
        while (queue.length) {
            const vertex = queue.shift();
            component.push(vertex);
            for (const neighbor of adjacency.get(vertex) ?? []) {
                if (!visited.has(neighbor.vertex)) {
                    visited.add(neighbor.vertex);
                    queue.push(neighbor.vertex);
                }
            }
        }
        components.push(component.sort((left, right) => left.localeCompare(right)));
    }
    return components;
};
exports.connectedComponents = connectedComponents;
const shortestPath = (graph, start, end) => {
    const adjacency = adjacencyOf(graph);
    if (!adjacency.has(start) || !adjacency.has(end))
        throw new Error('VERTEX_NOT_FOUND');
    if (graph.edges.some((edge) => edge.weight < 0))
        throw new Error('NEGATIVE_WEIGHT');
    const distances = new Map([...adjacency.keys()].map((vertex) => [vertex, Number.POSITIVE_INFINITY]));
    const previous = new Map();
    const unsettled = new Set(adjacency.keys());
    distances.set(start, 0);
    while (unsettled.size) {
        let current;
        let best = Number.POSITIVE_INFINITY;
        for (const vertex of unsettled) {
            const distance = distances.get(vertex);
            if (distance < best) {
                best = distance;
                current = vertex;
            }
        }
        if (current === undefined || best === Number.POSITIVE_INFINITY)
            break;
        unsettled.delete(current);
        if (current === end)
            break;
        for (const neighbor of adjacency.get(current) ?? []) {
            if (!unsettled.has(neighbor.vertex))
                continue;
            const candidate = best + neighbor.weight;
            if (candidate < distances.get(neighbor.vertex)) {
                distances.set(neighbor.vertex, candidate);
                previous.set(neighbor.vertex, current);
            }
        }
    }
    const distance = distances.get(end);
    if (!Number.isFinite(distance))
        return { distance, path: [] };
    const path = [end];
    while (path[0] !== start)
        path.unshift(previous.get(path[0]));
    return { distance, path };
};
exports.shortestPath = shortestPath;
const topologicalSort = (graph) => {
    if (!graph.directed)
        throw new Error('DIRECTED_GRAPH_REQUIRED');
    const vertices = verticesOf(graph);
    const adjacency = adjacencyOf(graph);
    const inDegree = new Map(vertices.map((vertex) => [vertex, 0]));
    graph.edges.forEach((edge) => inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1));
    const queue = vertices.filter((vertex) => inDegree.get(vertex) === 0);
    const order = [];
    while (queue.length) {
        queue.sort((left, right) => left.localeCompare(right));
        const vertex = queue.shift();
        order.push(vertex);
        for (const neighbor of adjacency.get(vertex) ?? []) {
            const next = inDegree.get(neighbor.vertex) - 1;
            inDegree.set(neighbor.vertex, next);
            if (next === 0)
                queue.push(neighbor.vertex);
        }
    }
    if (order.length !== vertices.length)
        throw new Error('GRAPH_HAS_CYCLE');
    return order;
};
exports.topologicalSort = topologicalSort;
const minimumSpanningTree = (graph) => {
    if (graph.directed)
        throw new Error('UNDIRECTED_GRAPH_REQUIRED');
    const vertices = verticesOf(graph);
    const parent = new Map(vertices.map((vertex) => [vertex, vertex]));
    const rank = new Map(vertices.map((vertex) => [vertex, 0]));
    const find = (vertex) => {
        const current = parent.get(vertex);
        if (current !== vertex)
            parent.set(vertex, find(current));
        return parent.get(vertex);
    };
    const union = (left, right) => {
        let a = find(left);
        let b = find(right);
        if (a === b)
            return false;
        if ((rank.get(a) ?? 0) < (rank.get(b) ?? 0))
            [a, b] = [b, a];
        parent.set(b, a);
        if (rank.get(a) === rank.get(b))
            rank.set(a, (rank.get(a) ?? 0) + 1);
        return true;
    };
    const edges = [];
    let totalWeight = 0;
    [...graph.edges]
        .sort((left, right) => left.weight - right.weight || left.from.localeCompare(right.from) || left.to.localeCompare(right.to))
        .forEach((edge) => {
        if (union(edge.from, edge.to)) {
            edges.push(edge);
            totalWeight += edge.weight;
        }
    });
    return { totalWeight, edges };
};
exports.minimumSpanningTree = minimumSpanningTree;
