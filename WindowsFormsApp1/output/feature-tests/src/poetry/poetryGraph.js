"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPoetryGraph = buildPoetryGraph;
exports.findPoetPath = findPoetPath;
const edgeKey = (a, b) => [a, b].sort().join('::');
function buildPoetryGraph(poets, poems) {
    const poemIdsByPoet = new Map();
    for (const poem of poems) {
        const ids = poemIdsByPoet.get(poem.poetId) ?? [];
        ids.push(poem.id);
        poemIdsByPoet.set(poem.poetId, ids);
    }
    const nodes = poets.map((poet) => ({
        poetId: poet.id,
        poemIds: poemIdsByPoet.get(poet.id) ?? [],
        weight: Math.max(1, Math.log10(poet.poemCount + 10))
    }));
    const edges = new Map();
    for (const poet of poets) {
        for (const relation of poet.relations) {
            if (!poets.some((candidate) => candidate.id === relation.poetId))
                continue;
            const key = edgeKey(poet.id, relation.poetId);
            const candidate = {
                source: poet.id,
                target: relation.poetId,
                kind: relation.kind,
                reason: relation.reason,
                weight: relation.weight ?? 0.65
            };
            const current = edges.get(key);
            if (!current || candidate.weight > current.weight)
                edges.set(key, candidate);
        }
    }
    for (let i = 0; i < poets.length; i += 1) {
        for (let j = i + 1; j < poets.length; j += 1) {
            const left = poets[i];
            const right = poets[j];
            const key = edgeKey(left.id, right.id);
            if (edges.has(key))
                continue;
            const sharedThemes = left.themes.filter((theme) => right.themes.includes(theme));
            if (sharedThemes.length >= 2) {
                edges.set(key, {
                    source: left.id,
                    target: right.id,
                    kind: '意象',
                    reason: `共同關注${sharedThemes.slice(0, 2).join('、')}等意象與主題`,
                    weight: Math.min(0.72, 0.42 + sharedThemes.length * 0.1)
                });
            }
            else if (left.dynasty === right.dynasty && Math.abs(Math.log10(left.poemCount + 1) - Math.log10(right.poemCount + 1)) < 0.42) {
                edges.set(key, {
                    source: left.id,
                    target: right.id,
                    kind: '同時代',
                    reason: `同為${left.dynasty}重要作者，作品規模與文學影響相近`,
                    weight: 0.38
                });
            }
        }
    }
    return { nodes, edges: [...edges.values()] };
}
function findPoetPath(graph, startId, endId) {
    if (startId === endId)
        return { poetIds: [startId], edges: [] };
    const adjacency = new Map();
    for (const edge of graph.edges) {
        adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), { next: edge.target, edge }]);
        adjacency.set(edge.target, [...(adjacency.get(edge.target) ?? []), { next: edge.source, edge }]);
    }
    const queue = [startId];
    const visited = new Set([startId]);
    const previous = new Map();
    while (queue.length) {
        const current = queue.shift();
        for (const neighbor of adjacency.get(current) ?? []) {
            if (visited.has(neighbor.next))
                continue;
            visited.add(neighbor.next);
            previous.set(neighbor.next, { poetId: current, edge: neighbor.edge });
            if (neighbor.next === endId) {
                const poetIds = [endId];
                const edges = [];
                let cursor = endId;
                while (cursor !== startId) {
                    const step = previous.get(cursor);
                    if (!step)
                        return { poetIds: [], edges: [] };
                    poetIds.unshift(step.poetId);
                    edges.unshift(step.edge);
                    cursor = step.poetId;
                }
                return { poetIds, edges };
            }
            queue.push(neighbor.next);
        }
    }
    return { poetIds: [], edges: [] };
}
