"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSortModule = exports.isAlgorithmModule = exports.getDevelopmentLabModule = exports.DEVELOPMENT_LAB_MODULES = void 0;
exports.DEVELOPMENT_LAB_MODULES = [
    {
        id: 'stack',
        group: 'structures',
        label: '堆疊',
        shortLabel: '後進先出',
        description: '推入、彈出並檢查最近加入的數值。',
        complexity: { best: 'O(1)', average: 'O(1)', worst: 'O(1)', space: 'O(n)' },
        pseudocode: ['push(value)：加入頂端', 'pop()：移除頂端', 'peek()：讀取頂端']
    },
    {
        id: 'queue',
        group: 'structures',
        label: '佇列',
        shortLabel: '先進先出',
        description: '從後端加入，並由前端移除。',
        complexity: { best: 'O(1)', average: 'O(1)', worst: 'O(1)', space: 'O(n)' },
        pseudocode: ['enqueue(value)：加入後端', 'dequeue()：移除前端', 'front()：讀取前端']
    },
    {
        id: 'linked-list',
        group: 'structures',
        label: '鏈結串列',
        shortLabel: '節點鏈',
        description: '在線性節點鏈中建立、移除與尋找數值。',
        complexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(n)' },
        pseudocode: ['prepend(value)：取代頭節點', 'append(value)：沿 next 移動', 'find(value)：依序比對節點']
    },
    {
        id: 'binary-tree',
        group: 'structures',
        label: '二元搜尋樹',
        shortLabel: '有序樹',
        description: '插入、尋找與移除有序樹節點。',
        complexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(n)', space: 'O(n)' },
        pseudocode: ['比較數值與目前節點', '較小時移至左側', '較大時移至右側', '插入或回傳符合節點']
    },
    {
        id: 'bubble-sort',
        group: 'algorithms',
        label: '氣泡排序',
        shortLabel: '穩定排序',
        description: '反覆交換順序錯誤的相鄰數值。',
        complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
        pseudocode: ['重複掃描未排序範圍', '比較相鄰數值', '左值較大時交換', '縮小未排序範圍', '完成']
    },
    {
        id: 'insertion-sort',
        group: 'algorithms',
        label: '插入排序',
        shortLabel: '自適應',
        description: '逐一插入鍵值以擴展已排序前綴。',
        complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
        pseudocode: ['取出下一個鍵值', '與已排序前綴比較', '將較大值右移', '插入鍵值', '完成']
    },
    {
        id: 'selection-sort',
        group: 'algorithms',
        label: '選擇排序',
        shortLabel: '原地排序',
        description: '為每個位置選出剩餘資料中的最小值。',
        complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
        pseudocode: ['選擇下一個輸出位置', '掃描最小值', '記錄新的最小值', '交換至正確位置', '完成']
    },
    {
        id: 'quick-sort',
        group: 'algorithms',
        label: '快速排序',
        shortLabel: '分而治之',
        description: '以樞紐分割資料並遞迴排序兩側。',
        complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
        pseudocode: ['選擇樞紐', '比較數值與樞紐', '移入較小值分割區', '放置樞紐', '遞迴兩側', '完成']
    },
    {
        id: 'merge-sort',
        group: 'algorithms',
        label: '合併排序',
        shortLabel: '穩定合併',
        description: '分割資料後使用緩衝區合併已排序區段。',
        complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
        pseudocode: ['分割目前範圍', '比較緩衝區數值', '寫回較小值', '完成合併', '遞迴處理', '完成']
    },
    {
        id: 'heap-sort',
        group: 'algorithms',
        label: '堆積排序',
        shortLabel: '最大堆積',
        description: '建立最大堆積並逐次取出根節點。',
        complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' },
        pseudocode: ['比較父節點與左子節點', '比較目前最大值與右子節點', '恢復最大堆積', '取出根節點', '縮小堆積範圍', '完成']
    },
    {
        id: 'linear-search',
        group: 'algorithms',
        label: '線性搜尋',
        shortLabel: '循序掃描',
        description: '由左至右檢查，直到找到目標值。',
        complexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)', space: 'O(1)' },
        pseudocode: ['從第一筆資料開始', '比較目前數值', '符合時回傳索引', '前進至下一筆', '回傳找不到']
    },
    {
        id: 'binary-search',
        group: 'algorithms',
        label: '二元搜尋',
        shortLabel: '折半搜尋',
        description: '每一步排除一半已排序資料。',
        complexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
        pseudocode: ['設定左右邊界', '檢查中點', '符合時回傳中點', '目標較大時移動左界', '目標較小時移動右界', '回傳找不到']
    },
    {
        id: 'bfs',
        group: 'algorithms',
        label: '廣度優先搜尋',
        shortLabel: '佇列走訪',
        description: '使用佇列逐層探索圖形節點。',
        complexity: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)' },
        pseudocode: ['將起始節點加入佇列', '取出並走訪節點', '加入尚未走訪的相鄰節點', '完成']
    },
    {
        id: 'dfs',
        group: 'algorithms',
        label: '深度優先搜尋',
        shortLabel: '遞迴走訪',
        description: '深入每條圖形分支後再回溯。',
        complexity: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)' },
        pseudocode: ['走訪目前節點', '遞迴至未走訪的相鄰節點', '分支結束時回溯', '完成']
    }
];
const getDevelopmentLabModule = (id) => exports.DEVELOPMENT_LAB_MODULES.find((module) => module.id === id) ?? exports.DEVELOPMENT_LAB_MODULES[0];
exports.getDevelopmentLabModule = getDevelopmentLabModule;
const isAlgorithmModule = (id) => [
    'bubble-sort',
    'insertion-sort',
    'selection-sort',
    'quick-sort',
    'merge-sort',
    'heap-sort',
    'linear-search',
    'binary-search',
    'bfs',
    'dfs'
].includes(id);
exports.isAlgorithmModule = isAlgorithmModule;
const isSortModule = (id) => ['bubble-sort', 'insertion-sort', 'selection-sort', 'quick-sort', 'merge-sort', 'heap-sort'].includes(id);
exports.isSortModule = isSortModule;
