"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTreeScene = buildTreeScene;
exports.bstInsert = bstInsert;
exports.buildBst = buildBst;
exports.inOrder = inOrder;
exports.treeOperation = treeOperation;
exports.heapScene = heapScene;
exports.heapOperation = heapOperation;
const devlabScene_js_1 = require("./devlabScene.js");
let idSeq = 0;
const makeNode = (value, color = 'red') => ({
    id: `tn-${idSeq++}`,
    value,
    left: null,
    right: null,
    height: 1,
    color
});
const heightOf = (node) => (node ? node.height : 0);
const balanceOf = (node) => (node ? heightOf(node.left) - heightOf(node.right) : 0);
const recalcHeight = (node) => {
    node.height = 1 + Math.max(heightOf(node.left), heightOf(node.right));
};
const statePriority = (id, o) => {
    if (o.rotate?.includes(id))
        return 'rotate';
    if (o.inserted === id)
        return 'insert';
    if (o.removed === id)
        return 'remove';
    if (o.active?.includes(id))
        return 'active';
    if (o.compare?.includes(id))
        return 'compare';
    if (o.path?.includes(id))
        return 'path';
    return 'idle';
};
function buildTreeScene(root, kind, o = {}) {
    if (!root)
        return { kind: 'tree', nodes: [], edges: [], empty: true };
    // Attach display badges (AVL balance factor) before layout.
    if (kind === 'avl' && o.showBalance) {
        const annotate = (node) => {
            if (!node)
                return;
            const bf = balanceOf(node);
            node.badge = bf > 0 ? `+${bf}` : `${bf}`;
            annotate(node.left);
            annotate(node.right);
        };
        annotate(root);
    }
    const layout = (0, devlabScene_js_1.layoutTree)(root, (id) => statePriority(id, o));
    const pathSet = new Set(o.path ?? []);
    const edges = layout.edges.map((edge) => ({
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
function bstInsert(root, value) {
    if (!root)
        return makeNode(value, 'black');
    if (value < root.value)
        root.left = bstInsert(root.left, value);
    else if (value > root.value)
        root.right = bstInsert(root.right, value);
    return root;
}
function buildBst(values) {
    return values.reduce((root, value) => bstInsert(root, value), null);
}
function inOrder(root) {
    return root ? [...inOrder(root.left), root.value, ...inOrder(root.right)] : [];
}
const minNode = (node) => {
    let cur = node;
    while (cur.left)
        cur = cur.left;
    return cur;
};
// ---- AVL rotations ---------------------------------------------------------------
const rotateRight = (y) => {
    const x = y.left;
    y.left = x.right;
    x.right = y;
    recalcHeight(y);
    recalcHeight(x);
    return x;
};
const rotateLeft = (x) => {
    const y = x.right;
    x.right = y.left;
    y.left = x;
    recalcHeight(x);
    recalcHeight(y);
    return y;
};
// ---- Animated operations ---------------------------------------------------------
const collectPath = (root, value) => {
    const path = [];
    let node = root;
    while (node) {
        path.push(node.id);
        if (value === node.value)
            break;
        node = value < node.value ? node.left : node.right;
    }
    return path;
};
function treeOperation(kind, root, operation, value) {
    if (!Number.isFinite(value))
        throw new Error('請輸入有效的節點數值。');
    const fb = new devlabScene_js_1.FrameBuilder();
    const showBalance = kind === 'avl';
    const snapshot = (o, message, line, phase) => fb.push(buildTreeScene(rootRef, kind, { ...o, showBalance }), message, line, phase);
    let rootRef = root;
    if (operation === 'search') {
        fb.push(buildTreeScene(rootRef, kind, { showBalance }), (0, devlabScene_js_1.msg)('從根節點開始尋找 {0}。', value), 0, 'ready');
        let node = rootRef;
        const path = [];
        while (node) {
            path.push(node.id);
            fb.metrics.comparisons += 1;
            fb.metrics.visits += 1;
            if (value === node.value) {
                snapshot({ path, active: [node.id] }, (0, devlabScene_js_1.msg)('在樹中找到 {0}。', value), 3, 'complete');
                return { root: rootRef, trace: fb.build((0, devlabScene_js_1.msg)('在樹中找到 {0}。', value)) };
            }
            const goLeft = value < node.value;
            snapshot({ path, compare: [node.id] }, goLeft ? (0, devlabScene_js_1.msg)('{0} 較小，往左子樹前進。', value) : (0, devlabScene_js_1.msg)('{0} 較大，往右子樹前進。', value), goLeft ? 1 : 2, 'visit');
            node = goLeft ? node.left : node.right;
        }
        snapshot({ path }, (0, devlabScene_js_1.msg)('樹中找不到 {0}。', value), 3, 'complete');
        return { root: rootRef, trace: fb.build((0, devlabScene_js_1.msg)('樹中找不到 {0}。', value)) };
    }
    if (operation === 'insert') {
        fb.push(buildTreeScene(rootRef, kind, { showBalance }), (0, devlabScene_js_1.msg)('準備插入 {0}。', value), 0, 'ready');
        // Show the descent path for the comparison animation (visual only).
        let cursor = rootRef;
        const path = [];
        let duplicate = false;
        while (cursor) {
            path.push(cursor.id);
            if (value === cursor.value) {
                duplicate = true;
                break;
            }
            fb.metrics.comparisons += 1;
            const goLeft = value < cursor.value;
            snapshot({ path, compare: [cursor.id] }, goLeft ? (0, devlabScene_js_1.msg)('{0} 較小，往左子樹前進。', value) : (0, devlabScene_js_1.msg)('{0} 較大，往右子樹前進。', value), goLeft ? 1 : 2, 'visit');
            cursor = goLeft ? cursor.left : cursor.right;
        }
        if (duplicate) {
            snapshot({ path }, (0, devlabScene_js_1.msg)('{0} 已存在，略過插入。', value), 4, 'complete');
            return { root: rootRef, trace: fb.build((0, devlabScene_js_1.msg)('{0} 已存在，略過插入。', value)) };
        }
        if (kind === 'bst') {
            rootRef = bstInsert(rootRef, value);
        }
        else if (kind === 'red-black') {
            rootRef = rbInsert(rootRef, value, fb, snapshot);
        }
        else {
            const rotations = [];
            rootRef = avlInsert(rootRef, value, rotations);
        }
        const insertedId = findIdByValue(rootRef, value);
        const newPath = collectPath(rootRef, value);
        if (kind === 'avl') {
            // Re-run insert capturing rotations for animation: insert already mutated; show result.
            snapshot({ path: newPath, inserted: insertedId ?? undefined }, (0, devlabScene_js_1.msg)('插入 {0} 並完成 AVL 平衡。', value), 4, 'rotate');
        }
        else if (kind === 'red-black') {
            snapshot({ path: newPath, inserted: insertedId ?? undefined }, (0, devlabScene_js_1.msg)('插入 {0} 並完成紅黑樹修正。', value), 4, 'complete');
        }
        else {
            snapshot({ path: newPath, inserted: insertedId ?? undefined }, (0, devlabScene_js_1.msg)('已將 {0} 插入二元搜尋樹。', value), 4, 'complete');
        }
        return { root: rootRef, trace: fb.build((0, devlabScene_js_1.msg)('已將 {0} 插入。', value)) };
    }
    // remove
    fb.push(buildTreeScene(rootRef, kind, { showBalance }), (0, devlabScene_js_1.msg)('準備移除 {0}。', value), 0, 'ready');
    const path = collectPath(rootRef, value);
    const targetId = findIdByValue(rootRef, value);
    if (!targetId) {
        snapshot({ path }, (0, devlabScene_js_1.msg)('樹中找不到 {0}，無法移除。', value), 3, 'complete');
        return { root: rootRef, trace: fb.build((0, devlabScene_js_1.msg)('樹中找不到 {0}。', value)) };
    }
    snapshot({ path, removed: targetId }, (0, devlabScene_js_1.msg)('找到 {0}，開始移除。', value), 2, 'visit');
    if (kind === 'avl')
        rootRef = avlRemove(rootRef, value);
    else
        rootRef = bstRemove(rootRef, value, kind);
    snapshot({}, kind === 'avl' ? (0, devlabScene_js_1.msg)('移除 {0} 並重新平衡。', value) : (0, devlabScene_js_1.msg)('已移除 {0}。', value), 3, kind === 'avl' ? 'rotate' : 'complete');
    return { root: rootRef, trace: fb.build((0, devlabScene_js_1.msg)('已移除 {0}。', value)) };
}
const findIdByValue = (root, value) => {
    let node = root;
    while (node) {
        if (value === node.value)
            return node.id;
        node = value < node.value ? node.left : node.right;
    }
    return null;
};
// AVL insert with rebalancing.
function avlInsert(node, value, rotations) {
    if (!node)
        return makeNode(value, 'black');
    if (value < node.value)
        node.left = avlInsert(node.left, value, rotations);
    else if (value > node.value)
        node.right = avlInsert(node.right, value, rotations);
    else
        return node;
    recalcHeight(node);
    const balance = balanceOf(node);
    if (balance > 1 && value < node.left.value) {
        rotations.push({ id: node.id, label: (0, devlabScene_js_1.msg)('右旋以恢復平衡。') });
        return rotateRight(node);
    }
    if (balance < -1 && value > node.right.value) {
        rotations.push({ id: node.id, label: (0, devlabScene_js_1.msg)('左旋以恢復平衡。') });
        return rotateLeft(node);
    }
    if (balance > 1 && value > node.left.value) {
        node.left = rotateLeft(node.left);
        rotations.push({ id: node.id, label: (0, devlabScene_js_1.msg)('左右旋以恢復平衡。') });
        return rotateRight(node);
    }
    if (balance < -1 && value < node.right.value) {
        node.right = rotateRight(node.right);
        rotations.push({ id: node.id, label: (0, devlabScene_js_1.msg)('右左旋以恢復平衡。') });
        return rotateLeft(node);
    }
    return node;
}
function avlRebalance(node) {
    recalcHeight(node);
    const balance = balanceOf(node);
    if (balance > 1) {
        if (balanceOf(node.left) < 0)
            node.left = rotateLeft(node.left);
        return rotateRight(node);
    }
    if (balance < -1) {
        if (balanceOf(node.right) > 0)
            node.right = rotateRight(node.right);
        return rotateLeft(node);
    }
    return node;
}
function avlRemove(node, value) {
    if (!node)
        return null;
    if (value < node.value)
        node.left = avlRemove(node.left, value);
    else if (value > node.value)
        node.right = avlRemove(node.right, value);
    else {
        if (!node.left)
            return node.right;
        if (!node.right)
            return node.left;
        const successor = minNode(node.right);
        node.value = successor.value;
        node.right = avlRemove(node.right, successor.value);
    }
    return avlRebalance(node);
}
function bstRemove(node, value, kind) {
    if (!node)
        return null;
    if (value < node.value)
        node.left = bstRemove(node.left, value, kind);
    else if (value > node.value)
        node.right = bstRemove(node.right, value, kind);
    else {
        if (!node.left)
            return node.right;
        if (!node.right)
            return node.left;
        const successor = minNode(node.right);
        node.value = successor.value;
        node.right = bstRemove(node.right, successor.value, kind);
    }
    return node;
}
// ---- Red-Black tree (top-down recursion with rebalancing on the way up) -----------
const isRed = (node) => Boolean(node && node.color === 'red');
function rbInsert(root, value, fb, snapshot) {
    const insert = (node) => {
        if (!node)
            return makeNode(value, 'red');
        if (value < node.value)
            node.left = insert(node.left);
        else if (value > node.value)
            node.right = insert(node.right);
        else
            return node;
        // Left-leaning red-black fix-ups.
        if (isRed(node.right) && !isRed(node.left))
            node = rbRotateLeft(node);
        if (isRed(node.left) && isRed(node.left.left))
            node = rbRotateRight(node);
        if (isRed(node.left) && isRed(node.right))
            rbFlip(node);
        recalcHeight(node);
        return node;
    };
    const next = insert(root);
    next.color = 'black';
    return next;
}
const rbRotateLeft = (h) => {
    const x = h.right;
    h.right = x.left;
    x.left = h;
    x.color = h.color;
    h.color = 'red';
    recalcHeight(h);
    recalcHeight(x);
    return x;
};
const rbRotateRight = (h) => {
    const x = h.left;
    h.left = x.right;
    x.right = h;
    x.color = h.color;
    h.color = 'red';
    recalcHeight(h);
    recalcHeight(x);
    return x;
};
const rbFlip = (h) => {
    h.color = 'red';
    if (h.left)
        h.left.color = 'black';
    if (h.right)
        h.right.color = 'black';
};
const heapCompare = (mode, a, b) => (mode === 'min' ? a < b : a > b);
function heapScene(array, states = {}) {
    if (!array.length)
        return { kind: 'tree', nodes: [], edges: [], empty: true };
    const n = array.length;
    // Map the array into a layout tree so the heap renders as a real binary tree.
    const build = (index) => {
        if (index >= n)
            return null;
        return {
            id: `heap-${index}`,
            value: array[index],
            left: build(index * 2 + 1),
            right: build(index * 2 + 2),
            badge: `#${index}`
        };
    };
    const layout = (0, devlabScene_js_1.layoutTree)(build(0), (id) => {
        const idx = Number(id.replace('heap-', ''));
        return states[idx] ?? 'idle';
    });
    return { kind: 'tree', nodes: layout.nodes, edges: layout.edges };
}
function heapOperation(mode, array, operation, value) {
    const heap = [...array];
    const fb = new devlabScene_js_1.FrameBuilder();
    const label = mode === 'min' ? '最小堆積' : '最大堆積';
    if (operation === 'peek') {
        if (!heap.length)
            throw new Error('堆積目前是空的。');
        fb.push(heapScene(heap, { 0: 'active' }), (0, devlabScene_js_1.msg)('{0}的根節點為 {1}。', label, heap[0]), 0, 'visit');
        return { array: heap, trace: fb.build(), output: heap[0] };
    }
    if (operation === 'insert') {
        if (value === undefined || !Number.isFinite(value))
            throw new Error('請輸入有效的節點數值。');
        heap.push(value);
        let i = heap.length - 1;
        fb.push(heapScene(heap, { [i]: 'insert' }), (0, devlabScene_js_1.msg)('將 {0} 放到堆積末端。', value), 1, 'write');
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            fb.metrics.comparisons += 1;
            fb.push(heapScene(heap, { [i]: 'active', [parent]: 'compare' }), (0, devlabScene_js_1.msg)('比較 {0} 與父節點 {1}。', heap[i], heap[parent]), 2, 'compare');
            if (!heapCompare(mode, heap[i], heap[parent]))
                break;
            [heap[i], heap[parent]] = [heap[parent], heap[i]];
            fb.metrics.writes += 2;
            fb.push(heapScene(heap, { [i]: 'swap', [parent]: 'swap' }), (0, devlabScene_js_1.msg)('上浮：與父節點交換。'), 3, 'write');
            i = parent;
        }
        fb.push(heapScene(heap, { [i]: 'settled' }), (0, devlabScene_js_1.msg)('{0} 已就位。', value), 4, 'complete');
        return { array: heap, trace: fb.build() };
    }
    // extract root
    if (!heap.length)
        throw new Error('堆積目前是空的。');
    const output = heap[0];
    fb.push(heapScene(heap, { 0: 'remove' }), (0, devlabScene_js_1.msg)('取出根節點 {0}。', output), 1, 'visit');
    const last = heap.pop();
    if (heap.length) {
        heap[0] = last;
        fb.push(heapScene(heap, { 0: 'active' }), (0, devlabScene_js_1.msg)('將末端 {0} 移到根節點。', last), 2, 'write');
        let i = 0;
        const size = heap.length;
        while (true) {
            const left = i * 2 + 1;
            const right = i * 2 + 2;
            let target = i;
            if (left < size) {
                fb.metrics.comparisons += 1;
                if (heapCompare(mode, heap[left], heap[target]))
                    target = left;
            }
            if (right < size) {
                fb.metrics.comparisons += 1;
                if (heapCompare(mode, heap[right], heap[target]))
                    target = right;
            }
            if (target === i)
                break;
            fb.push(heapScene(heap, { [i]: 'active', [target]: 'compare' }), (0, devlabScene_js_1.msg)('下沉：與較{0}的子節點交換。', mode === 'min' ? '小' : '大'), 3, 'compare');
            [heap[i], heap[target]] = [heap[target], heap[i]];
            fb.metrics.writes += 2;
            i = target;
        }
    }
    fb.push(heapScene(heap, {}), (0, devlabScene_js_1.msg)('已取出 {0}，堆積完成重整。', output), 4, 'complete');
    return { array: heap, trace: fb.build(), output };
}
