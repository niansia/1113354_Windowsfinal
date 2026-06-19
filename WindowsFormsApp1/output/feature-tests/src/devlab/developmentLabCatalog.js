"use strict";
// Catalog of every Development Lab module: linear structures, advanced trees, sorting,
// searching, graph algorithms, and dynamic programming. Labels/descriptions are zh-TW
// (source-as-key i18n); complexity + pseudocode drive the inspector panels.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDevModule = exports.DEV_MODULES = exports.DEV_GROUPS = void 0;
exports.DEV_GROUPS = [
    { id: 'linear', label: '線性結構' },
    { id: 'trees', label: '樹狀結構' },
    { id: 'sorting', label: '排序演算法' },
    { id: 'searching', label: '搜尋演算法' },
    { id: 'graph', label: '圖論演算法' },
    { id: 'dp', label: '動態規劃' }
];
exports.DEV_MODULES = [
    // ---- Linear ----
    {
        id: 'stack', group: 'linear', kind: 'linear', label: '堆疊', short: '後進先出',
        description: '推入、彈出並檢查最近加入的數值。',
        complexity: { best: 'O(1)', average: 'O(1)', worst: 'O(1)', space: 'O(n)' },
        pseudocode: ['push(x)：加入頂端', 'pop()：移除頂端', 'peek()：讀取頂端']
    },
    {
        id: 'queue', group: 'linear', kind: 'linear', label: '佇列', short: '先進先出',
        description: '從後端加入，並由前端移除。',
        complexity: { best: 'O(1)', average: 'O(1)', worst: 'O(1)', space: 'O(n)' },
        pseudocode: ['enqueue(x)：加入後端', 'dequeue()：移除前端', 'front()：讀取前端']
    },
    {
        id: 'linked-list', group: 'linear', kind: 'linear', label: '鏈結串列', short: '節點鏈',
        description: '在線性節點鏈中建立、移除與尋找數值。',
        complexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(n)' },
        pseudocode: ['prepend(x)：插入頭端', 'append(x)：插入尾端', 'find(x)：依序比對節點']
    },
    // ---- Trees ----
    {
        id: 'bst', group: 'trees', kind: 'tree', label: '二元搜尋樹', short: '有序樹',
        description: '插入、尋找與移除節點，左小右大保持有序。',
        complexity: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)', space: 'O(n)' },
        pseudocode: ['比較數值與目前節點', '較小往左子樹', '較大往右子樹', '插入或回傳符合節點']
    },
    {
        id: 'avl', group: 'trees', kind: 'tree', label: 'AVL 平衡樹', short: '高度平衡',
        description: '插入後依平衡因子旋轉，維持高度平衡。',
        complexity: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)', space: 'O(n)' },
        pseudocode: ['以二元搜尋樹規則插入', '更新高度與平衡因子', '|平衡因子| > 1 時旋轉', 'LL/RR/LR/RL 四種情況', '回傳平衡後的子樹']
    },
    {
        id: 'red-black', group: 'trees', kind: 'tree', label: '紅黑樹', short: '近似平衡',
        description: '以節點顏色與旋轉維持近似平衡（左傾實作）。',
        complexity: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)', space: 'O(n)' },
        pseudocode: ['插入紅色節點', '右紅左黑時左旋', '連續左紅時右旋', '左右皆紅時翻轉顏色', '根節點塗黑']
    },
    {
        id: 'heap', group: 'trees', kind: 'heap', label: '二元堆積', short: '優先佇列',
        description: '完全二元樹，支援上浮插入與下沉取出。',
        complexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(n)' },
        pseudocode: ['插入到末端', '與父節點比較並上浮', '取出根節點', '末端移到根並下沉', '恢復堆積性質']
    },
    // ---- Sorting ----
    {
        id: 'bubble-sort', group: 'sorting', kind: 'sort', label: '氣泡排序', short: '穩定 O(n²)',
        description: '反覆交換順序錯誤的相鄰數值。',
        complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
        pseudocode: ['重複掃描未排序範圍', '比較相鄰數值', '左值較大時交換', '每輪固定一個最大值', '完成']
    },
    {
        id: 'insertion-sort', group: 'sorting', kind: 'sort', label: '插入排序', short: '自適應',
        description: '逐一插入鍵值以擴展已排序前綴。',
        complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
        pseudocode: ['取出下一個鍵值', '與已排序前綴比較', '將較大值右移', '插入鍵值', '完成']
    },
    {
        id: 'selection-sort', group: 'sorting', kind: 'sort', label: '選擇排序', short: '原地',
        description: '為每個位置選出剩餘資料中的最小值。',
        complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
        pseudocode: ['選擇下一個輸出位置', '掃描最小值', '記錄新的最小值', '交換至正確位置', '完成']
    },
    {
        id: 'shell-sort', group: 'sorting', kind: 'sort', label: '希爾排序', short: '間隔插入',
        description: '以遞減間隔進行插入排序，加速長距離搬移。',
        complexity: { best: 'O(n log n)', average: 'O(n^1.25)', worst: 'O(n²)', space: 'O(1)' },
        pseudocode: ['選擇遞減的間隔序列', '對每個間隔做插入排序', '比較相隔的數值', '向後搬移較大值', '間隔縮為 1 後完成']
    },
    {
        id: 'quick-sort', group: 'sorting', kind: 'sort', label: '快速排序', short: '分而治之',
        description: '以樞紐分割資料並遞迴排序兩側。',
        complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
        pseudocode: ['選擇樞紐', '比較數值與樞紐', '移入較小值分割區', '放置樞紐', '遞迴兩側']
    },
    {
        id: 'merge-sort', group: 'sorting', kind: 'sort', label: '合併排序', short: '穩定合併',
        description: '分割資料後使用緩衝區合併已排序區段。',
        complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
        pseudocode: ['分割目前範圍', '遞迴排序兩半', '比較緩衝區數值', '寫回較小值', '完成合併']
    },
    {
        id: 'heap-sort', group: 'sorting', kind: 'sort', label: '堆積排序', short: '最大堆積',
        description: '建立最大堆積並逐次取出根節點。',
        complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' },
        pseudocode: ['比較父節點與左子節點', '比較目前最大值與右子節點', '恢復最大堆積', '取出根節點放到末端', '縮小堆積並重整']
    },
    // ---- Searching ----
    {
        id: 'linear-search', group: 'searching', kind: 'search', label: '線性搜尋', short: '循序掃描',
        description: '由左至右檢查，直到找到目標值。',
        complexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)' },
        pseudocode: ['從第一筆資料開始', '比較目前數值', '符合時回傳索引', '前進至下一筆', '回傳找不到']
    },
    {
        id: 'binary-search', group: 'searching', kind: 'search', label: '二元搜尋', short: '折半搜尋',
        description: '在已排序資料上每步排除一半。',
        complexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
        pseudocode: ['設定左右邊界', '檢查中點', '符合時回傳中點', '目標較大移動左界', '目標較小移動右界', '回傳找不到']
    },
    // ---- Graph ----
    {
        id: 'bfs', group: 'graph', kind: 'graph', label: '廣度優先搜尋', short: '佇列走訪',
        description: '使用佇列逐層探索圖形節點。',
        complexity: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)' },
        pseudocode: ['將起點加入佇列', '取出並走訪節點', '加入未走訪的鄰居', '完成']
    },
    {
        id: 'dfs', group: 'graph', kind: 'graph', label: '深度優先搜尋', short: '遞迴走訪',
        description: '深入每條分支後再回溯。',
        complexity: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)' },
        pseudocode: ['走訪目前節點', '沿邊深入未走訪鄰居', '分支結束時回溯', '完成']
    },
    {
        id: 'dijkstra', group: 'graph', kind: 'graph', label: 'Dijkstra 最短路徑', short: '加權最短路',
        description: '以優先佇列鬆弛邊，求單源最短路徑。',
        complexity: { best: 'O(E log V)', average: 'O(E log V)', worst: 'O(E log V)', space: 'O(V)' },
        pseudocode: ['起點距離設為 0', '取出距離最小的節點', '鬆弛相鄰邊', '更新更短距離', '完成最短路徑樹']
    },
    {
        id: 'prim', group: 'graph', kind: 'graph', label: 'Prim 最小生成樹', short: '貪婪生成樹',
        description: '從起點逐步加入跨越切割的最小邊。',
        complexity: { best: 'O(E log V)', average: 'O(E log V)', worst: 'O(E log V)', space: 'O(V)' },
        pseudocode: ['從起點開始', '尋找跨越切割的最小邊', '將節點加入生成樹', '完成']
    },
    {
        id: 'kruskal', group: 'graph', kind: 'graph', label: 'Kruskal 最小生成樹', short: '並查集',
        description: '依權重排序邊，用並查集避免形成環。',
        complexity: { best: 'O(E log E)', average: 'O(E log E)', worst: 'O(E log E)', space: 'O(V)' },
        pseudocode: ['將邊依權重排序', '檢查是否形成環', '不成環則加入生成樹', '完成']
    },
    {
        id: 'topological', group: 'graph', kind: 'graph', label: '拓撲排序', short: '有向無環',
        description: 'Kahn 演算法：反覆移除入度為 0 的節點。',
        complexity: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)', space: 'O(V)' },
        pseudocode: ['計算每個節點的入度', '輸出入度為 0 的節點', '入度歸零時加入佇列', '完成']
    },
    // ---- Dynamic programming ----
    {
        id: 'fibonacci', group: 'dp', kind: 'dp', label: '費氏數列', short: '一維 DP',
        description: '以表格自底向上計算費氏數。',
        complexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)', space: 'O(n)' },
        pseudocode: ['設定基底 F0、F1', 'F(i) = F(i-1) + F(i-2)', '填入表格', '回傳 F(n)']
    },
    {
        id: 'coin-change', group: 'dp', kind: 'dp', label: '硬幣找零', short: '最少硬幣',
        description: '計算湊出目標金額所需的最少硬幣數。',
        complexity: { best: 'O(n·k)', average: 'O(n·k)', worst: 'O(n·k)', space: 'O(n)' },
        pseudocode: ['dp[0] = 0', '對每個金額嘗試每種硬幣', 'dp[a] = min(dp[a], dp[a-coin]+1)', '回傳 dp[amount]']
    },
    {
        id: 'knapsack', group: 'dp', kind: 'dp', label: '0/1 背包', short: '二維 DP',
        description: '在容量限制下選取物品以最大化價值。',
        complexity: { best: 'O(n·W)', average: 'O(n·W)', worst: 'O(n·W)', space: 'O(n·W)' },
        pseudocode: ['逐列加入物品', '裝不下時沿用上一列', 'max(不取, 取此物品)', '回溯選取的物品']
    },
    {
        id: 'lcs', group: 'dp', kind: 'dp', label: '最長共同子序列', short: 'LCS',
        description: '求兩字串的最長共同子序列。',
        complexity: { best: 'O(m·n)', average: 'O(m·n)', worst: 'O(m·n)', space: 'O(m·n)' },
        pseudocode: ['建立 (m+1)×(n+1) 表格', '字元相符取左上 +1', '否則取上方/左方較大值', '回溯取得子序列']
    },
    {
        id: 'edit-distance', group: 'dp', kind: 'dp', label: '編輯距離', short: 'Levenshtein',
        description: '計算字串間的最少插入、刪除、替換次數。',
        complexity: { best: 'O(m·n)', average: 'O(m·n)', worst: 'O(m·n)', space: 'O(m·n)' },
        pseudocode: ['邊界為刪除/插入成本', '字元相符沿用左上', 'min(替換, 刪除, 插入) + 1', '回溯編輯路徑']
    }
];
const getDevModule = (id) => exports.DEV_MODULES.find((module) => module.id === id) ?? exports.DEV_MODULES[0];
exports.getDevModule = getDevModule;
