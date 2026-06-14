"use strict";
// Unified scene model for the Development Lab. Every algorithm produces a list of
// DevFrame scenes; the React layer renders them with SVG node-link diagrams (trees,
// graphs), DP matrices, or array bars. Messages are i18n templates: the zh-TW string is
// the key (source-as-key convention) and {0},{1}… are filled from args at render time.
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrameBuilder = exports.msg = void 0;
exports.layoutTree = layoutTree;
exports.circularLayout = circularLayout;
const msg = (key, ...args) => ({ key, args });
exports.msg = msg;
// ---- Frame builder ---------------------------------------------------------------
class FrameBuilder {
    frames = [];
    metrics = { comparisons: 0, writes: 0, visits: 0 };
    push(scene, message, pseudoLine, phase) {
        this.frames.push({
            scene,
            message,
            pseudoLine,
            phase,
            metrics: { ...this.metrics }
        });
    }
    build(summary) {
        return { frames: this.frames, summary };
    }
}
exports.FrameBuilder = FrameBuilder;
// In-order index drives the horizontal slot; depth drives the vertical slot. This keeps
// a binary tree visually sorted left→right and never overlaps siblings.
function layoutTree(root, stateOf = () => 'idle') {
    if (!root)
        return { nodes: [], edges: [], positions: {}, depth: 0 };
    const order = [];
    let maxDepth = 0;
    const walk = (node, depth) => {
        if (!node)
            return;
        maxDepth = Math.max(maxDepth, depth);
        walk(node.left, depth + 1);
        order.push({ node, depth });
        walk(node.right, depth + 1);
    };
    walk(root, 0);
    const count = order.length;
    const positions = {};
    const nodes = order.map(({ node, depth }, index) => {
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
    const edges = [];
    const linkEdges = (node) => {
        if (!node)
            return;
        if (node.left)
            edges.push({ from: node.id, to: node.left.id });
        if (node.right)
            edges.push({ from: node.id, to: node.right.id });
        linkEdges(node.left);
        linkEdges(node.right);
    };
    linkEdges(root);
    return { nodes, edges, positions, depth: maxDepth };
}
// Deterministic circular layout: node 0 at the top, going clockwise. Good for the small
// graphs (≤ ~12 nodes) the lab works with and avoids the jitter of force layouts.
function circularLayout(nodeIds) {
    const positions = {};
    const n = nodeIds.length;
    if (n === 0)
        return positions;
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
