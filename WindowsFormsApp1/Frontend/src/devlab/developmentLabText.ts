import type { Lang } from '../i18n/strings.js';

type Entry = Partial<Record<Exclude<Lang, 'zh-TW'>, string>>;

const entry = (en: string, zhCN?: string, ja?: string, ko?: string): Entry => ({
  en,
  ...(zhCN ? { 'zh-CN': zhCN } : {}),
  ...(ja ? { ja } : {}),
  ...(ko ? { ko } : {})
});

const ENGLISH_TEXT: Record<string, string> = {
  '開發實驗室': 'Development Lab',
  '資料結構 × 演算法系統': 'Data Structures × Algorithm Systems',
  '資料結構': 'Data Structures',
  '演算法': 'Algorithms',
  '範例': 'Sample',
  '重設': 'Reset',
  '播放速度': 'Playback speed',
  '執行動畫': 'Run trace',
  '關閉開發實驗室': 'Close Development Lab',
  '系統同步': 'System synced',
  '互動模式': 'Interactive',
  '操作數值': 'Operation value',
  '推入': 'Push',
  '彈出': 'Pop',
  '查看頂端': 'Peek',
  '入列': 'Enqueue',
  '出列': 'Dequeue',
  '查看前端': 'Front',
  '附加': 'Append',
  '前置': 'Prepend',
  '插入': 'Insert',
  '移除': 'Remove',
  '尋找': 'Find',
  '無向邊': 'Undirected edges',
  '起始節點': 'Start node',
  '資料集': 'Dataset',
  '目標值': 'Target',
  '資料分布': 'Dataset shape',
  '資料筆數': 'Dataset size',
  '隨機': 'Random',
  '近乎排序': 'Nearly sorted',
  '反向排序': 'Reversed',
  '重複值': 'Duplicates',
  '產生資料': 'Generate',
  '效能比較': 'Compare',
  '關閉比較': 'Close comparison',
  '影格': 'Frame',
  '筆有效資料': 'active values',
  '操作資料結構以觀察其行為。': 'Manipulate the structure to inspect its behavior.',
  '產生動畫後即可開始逐步解說。': 'Generate a trace to start the visual explanation.',
  '尚未產生動畫': 'No trace',
  '動畫影格': 'Trace frame',
  '複雜度': 'Complexity',
  '最佳': 'Best',
  '平均': 'Average',
  '最差': 'Worst',
  '空間': 'Space',
  '虛擬碼': 'Pseudocode',
  '即時指標': 'Live metrics',
  '比較次數': 'Comparisons',
  '寫入次數': 'Writes',
  '走訪次數': 'Visits',
  '活動紀錄': 'Activity',
  '排序效能比較': 'Sorting comparison',
  '比較目前資料集的實際操作量': 'Measured work for the current dataset',
  '演算法名稱': 'Algorithm',
  '影格數': 'Frames',
  '準備產生動畫': 'Ready to generate a trace',
  '編輯範例資料後，選擇「執行動畫」。': 'Edit the sample data, then choose Run trace.',
  '圖形輸入已變更': 'Graph input changed',
  '修正邊集合後重新執行動畫。': 'Run the trace again after correcting the edge list.',
  '堆疊是空的，推入數值即可開始。': 'The stack is empty. Push a value to begin.',
  '佇列是空的，加入數值即可開始。': 'The queue is empty. Enqueue a value to begin.',
  '樹是空的，插入數值即可開始。': 'The tree is empty. Insert a value to begin.',
  '頂端': 'TOP',
  '前端': 'FRONT',
  '後端': 'REAR',
  '頭節點': 'HEAD',
  '節點': 'NODE',
  '根節點': 'ROOT',
  '左側': 'LEFT',
  '右側': 'RIGHT',
  '等待中': 'WAITING',
  '走訪': 'VISIT',
  '開發實驗室已就緒。': 'Development Lab ready.',
  '選擇模組、調整範例，再執行一項操作。': 'Choose a module, edit the sample, then run an operation.',
  '開啟「{0}」。': 'Opened {0}.',
  '已為「{0}」產生 {1} 個動畫影格。': 'Generated {1} frames for {0}.',
  '已載入「{0}」的引導範例。': 'Loaded a guided sample for {0}.',
  '已重設「{0}」。': 'Reset {0}.',
  '已產生 {0} 筆「{1}」資料。': 'Generated {0} {1} values.',
  '已完成六種排序法的效能比較。': 'Compared all six sorting algorithms.',
  '已將 {0} 插入二元搜尋樹。': 'Inserted {0} into the binary search tree.',
  '已從二元搜尋樹移除 {0}。': 'Removed {0} from the binary search tree.',
  '沿路徑 {1} 找到 {0}。': 'Found {0} along path {1}.',
  '沿路徑 {1} 後仍找不到 {0}。': '{0} was not found after path {1}.',
  '空集合': 'empty',
  '操作失敗。': 'Operation failed.',
  '無法產生此動畫。': 'Unable to build this trace.',
  '樹狀結構操作失敗。': 'Tree operation failed.',
  '請輸入有效的操作數值。': 'Enter a valid operation value.',
  '目前步驟': 'Current phase',
  '準備': 'Ready',
  '比較': 'Compare',
  '寫入': 'Write',
  '樞紐': 'Pivot',
  '走訪中': 'Visit',
  '完成': 'Complete',
  '緩衝區': 'Buffer',
  '當前範圍': 'Active range',
  '堆疊': 'Stack',
  '後進先出': 'LIFO',
  '推入、彈出並檢查最近加入的數值。': 'Push, pop, and inspect the most recently added value.',
  '佇列': 'Queue',
  '先進先出': 'FIFO',
  '從後端加入，並由前端移除。': 'Enqueue at the rear and dequeue from the front.',
  '鏈結串列': 'Linked List',
  '節點鏈': 'Nodes',
  '在線性節點鏈中建立、移除與尋找數值。': 'Create, remove, and locate values in a linear node chain.',
  '二元搜尋樹': 'Binary Search Tree',
  '有序樹': 'BST',
  '插入、尋找與移除有序樹節點。': 'Insert, find, and remove ordered tree nodes.',
  '氣泡排序': 'Bubble Sort',
  '穩定排序': 'Stable',
  '反覆交換順序錯誤的相鄰數值。': 'Repeatedly swap adjacent out-of-order values.',
  '插入排序': 'Insertion Sort',
  '自適應': 'Adaptive',
  '逐一插入鍵值以擴展已排序前綴。': 'Grow a sorted prefix by inserting one key at a time.',
  '選擇排序': 'Selection Sort',
  '原地排序': 'In-place',
  '為每個位置選出剩餘資料中的最小值。': 'Select the smallest remaining value for each position.',
  '快速排序': 'Quick Sort',
  '分而治之': 'Divide',
  '以樞紐分割資料並遞迴排序兩側。': 'Partition around pivots and recursively sort both sides.',
  '合併排序': 'Merge Sort',
  '穩定合併': 'Stable merge',
  '分割資料後使用緩衝區合併已排序區段。': 'Split the dataset and merge sorted ranges with a buffer.',
  '堆積排序': 'Heap Sort',
  '最大堆積': 'Max heap',
  '建立最大堆積並逐次取出根節點。': 'Build a max heap and repeatedly extract the root.',
  '線性搜尋': 'Linear Search',
  '循序掃描': 'Sequential',
  '由左至右檢查，直到找到目標值。': 'Inspect values from left to right until the target is found.',
  '二元搜尋': 'Binary Search',
  '折半搜尋': 'Halving',
  '每一步排除一半已排序資料。': 'Search a sorted dataset by discarding half each step.',
  '廣度優先搜尋': 'Breadth-First Search',
  '佇列走訪': 'Queue',
  '使用佇列逐層探索圖形節點。': 'Explore graph nodes level by level with a queue.',
  '深度優先搜尋': 'Depth-First Search',
  '遞迴走訪': 'Recursive',
  '深入每條圖形分支後再回溯。': 'Follow each graph branch deeply before backtracking.'
  ,
  'push(value)：加入頂端': 'push(value): add value at top',
  'pop()：移除頂端': 'pop(): remove top value',
  'peek()：讀取頂端': 'peek(): read top value',
  'enqueue(value)：加入後端': 'enqueue(value): add value at rear',
  'dequeue()：移除前端': 'dequeue(): remove front value',
  'front()：讀取前端': 'front(): read front value',
  'prepend(value)：取代頭節點': 'prepend(value): replace the head',
  'append(value)：沿 next 移動': 'append(value): follow next links',
  'find(value)：依序比對節點': 'find(value): scan until matched',
  '比較數值與目前節點': 'compare value with current node',
  '較小時移至左側': 'move left when smaller',
  '較大時移至右側': 'move right when larger',
  '插入或回傳符合節點': 'insert or return the match',
  '重複掃描未排序範圍': 'repeat passes through the unsorted range',
  '比較相鄰數值': 'compare adjacent values',
  '左值較大時交換': 'swap when the left value is larger',
  '縮小未排序範圍': 'shrink the unsorted range',
  '取出下一個鍵值': 'take the next key',
  '與已排序前綴比較': 'compare with the sorted prefix',
  '將較大值右移': 'shift larger values right',
  '插入鍵值': 'insert the key',
  '選擇下一個輸出位置': 'choose the next output position',
  '掃描最小值': 'scan for the minimum',
  '記錄新的最小值': 'remember the new minimum',
  '交換至正確位置': 'swap the minimum into place',
  '選擇樞紐': 'choose a pivot',
  '比較數值與樞紐': 'compare the value with the pivot',
  '移入較小值分割區': 'move into the lower partition',
  '放置樞紐': 'place the pivot',
  '遞迴兩側': 'recurse into both sides',
  '分割目前範圍': 'split the current range',
  '比較緩衝區數值': 'compare buffered values',
  '寫回較小值': 'write back the smaller value',
  '完成合併': 'finish the merge',
  '遞迴處理': 'recurse into each range',
  '比較父節點與左子節點': 'compare the parent and left child',
  '比較目前最大值與右子節點': 'compare the current maximum and right child',
  '恢復最大堆積': 'restore the max-heap property',
  '取出根節點': 'extract the root',
  '縮小堆積範圍': 'shrink the heap range',
  '從第一筆資料開始': 'start at the first value',
  '比較目前數值': 'compare the current value',
  '符合時回傳索引': 'return the index on match',
  '前進至下一筆': 'advance to the next value',
  '回傳找不到': 'return not found',
  '設定左右邊界': 'set the left and right bounds',
  '檢查中點': 'inspect the midpoint',
  '符合時回傳中點': 'return the midpoint on match',
  '目標較大時移動左界': 'move the left bound above the midpoint',
  '目標較小時移動右界': 'move the right bound below the midpoint',
  '將起始節點加入佇列': 'enqueue the start node',
  '取出並走訪節點': 'dequeue and visit a node',
  '加入尚未走訪的相鄰節點': 'enqueue unvisited neighbors',
  '走訪目前節點': 'visit the current node',
  '遞迴至未走訪的相鄰節點': 'recurse into an unvisited neighbor',
  '分支結束時回溯': 'backtrack when the branch ends'
};

export const DEVELOPMENT_LAB_TRANSLATIONS: Record<string, Entry> = Object.fromEntries(
  Object.entries(ENGLISH_TEXT).map(([source, en]) => [source, entry(en)])
);

Object.assign(DEVELOPMENT_LAB_TRANSLATIONS, {
  '開發實驗室': entry('Development Lab', '开发实验室', '開発ラボ', '개발 실험실'),
  '資料結構': entry('Data Structures', '数据结构', 'データ構造', '자료 구조'),
  '演算法': entry('Algorithms', '算法', 'アルゴリズム', '알고리즘'),
  '範例': entry('Sample', '示例', 'サンプル', '예제'),
  '重設': entry('Reset', '重置', 'リセット', '초기화'),
  '執行動畫': entry('Run trace', '运行动画', 'トレース実行', '애니메이션 실행'),
  '效能比較': entry('Compare', '性能比较', '性能比較', '성능 비교'),
  '系統同步': entry('System synced', '系统同步', 'システム同期', '시스템 동기화'),
  '互動模式': entry('Interactive', '交互模式', 'インタラクティブ', '대화형')
});

type MessageSet = {
  'zh-TW': string;
  'zh-CN'?: string;
  ja?: string;
  ko?: string;
};

const pick = (lang: Lang, values: MessageSet) => {
  if (lang === 'zh-TW') return values['zh-TW'];
  if (lang === 'zh-CN') return values['zh-CN'] ?? values['zh-TW'];
  if (lang === 'ja') return values.ja ?? values['zh-TW'];
  if (lang === 'ko') return values.ko ?? values['zh-TW'];
  return values['zh-TW'];
};

const exactMessages: Record<string, MessageSet> = {
  'Enter at least one number.': {
    'zh-TW': '請輸入至少一個數值。',
    'zh-CN': '请输入至少一个数值。',
    ja: '1 つ以上の数値を入力してください。',
    ko: '숫자를 하나 이상 입력하세요.'
  },
  'Use only valid numbers separated by commas.': {
    'zh-TW': '請使用逗號分隔有效數值。',
    'zh-CN': '请使用逗号分隔有效数值。',
    ja: '有効な数値をカンマで区切って入力してください。',
    ko: '유효한 숫자를 쉼표로 구분해 입력하세요.'
  },
  'Use 40 numbers or fewer for a readable trace.': {
    'zh-TW': '為維持動畫可讀性，請使用 40 個以下的數值。'
  },
  'The stack is empty.': { 'zh-TW': '堆疊目前是空的。', 'zh-CN': '堆栈目前为空。' },
  'The queue is empty.': { 'zh-TW': '佇列目前是空的。', 'zh-CN': '队列目前为空。' },
  'Tree values must be valid numbers.': { 'zh-TW': '樹節點必須是有效數值。' },
  'Dataset ready. Start the trace.': { 'zh-TW': '資料集已就緒，開始逐步動畫。' },
  'Swap the out-of-order pair.': { 'zh-TW': '交換順序錯誤的相鄰數值。' },
  'Shift the larger value one slot right.': { 'zh-TW': '將較大的數值向右移動一格。' },
  'Move the minimum into the sorted region.': { 'zh-TW': '將最小值移入已排序區域。' },
  'Move the value into the lower partition.': { 'zh-TW': '將數值移入較小值分割區。' },
  'Trace complete. The dataset is sorted.': {
    'zh-TW': '動畫完成，資料集已排序。',
    'zh-CN': '动画完成，数据集已排序。',
    ja: 'トレースが完了し、データセットが整列されました。',
    ko: '애니메이션이 완료되어 데이터가 정렬되었습니다.'
  },
  'Sorted copy prepared for binary search.': { 'zh-TW': '已建立排序副本，準備進行二元搜尋。' },
  'Dataset ready for linear search.': { 'zh-TW': '資料集已就緒，準備進行線性搜尋。' },
  'Discard the lower half.': { 'zh-TW': '排除較小的一半範圍。' },
  'Discard the upper half.': { 'zh-TW': '排除較大的一半範圍。' },
  'Enter at least one graph edge.': { 'zh-TW': '請輸入至少一條圖形邊。' },
  'Self-loop edges are not used in this lab.': { 'zh-TW': '此實驗室不使用連回自身的邊。' },
  'Restore the max-heap property.': { 'zh-TW': '交換節點以恢復最大堆積性質。' },
  'Max heap ready. Extract the root repeatedly.': { 'zh-TW': '最大堆積已就緒，開始逐次取出根節點。' }
};

const replace = (template: string, values: string[]) =>
  values.reduce((output, value, index) => output.replaceAll(`{${index}}`, value), template);

const rules: Array<{
  pattern: RegExp;
  templates: MessageSet;
}> = [
  { pattern: /^Compare (.+) and (.+)\.$/, templates: { 'zh-TW': '比較 {0} 與 {1}。', 'zh-CN': '比较 {0} 与 {1}。', ja: '{0} と {1} を比較します。', ko: '{0}와 {1}을 비교합니다.' } },
  { pattern: /^Compare (.+) with key (.+)\.$/, templates: { 'zh-TW': '比較 {0} 與鍵值 {1}。' } },
  { pattern: /^Compare current minimum (.+) with (.+)\.$/, templates: { 'zh-TW': '比較目前最小值 {0} 與 {1}。' } },
  { pattern: /^Compare (.+) with pivot (.+)\.$/, templates: { 'zh-TW': '比較 {0} 與樞紐 {1}。' } },
  { pattern: /^Compare (.+) and (.+) from the buffer\.$/, templates: { 'zh-TW': '比較緩衝區中的 {0} 與 {1}。' } },
  { pattern: /^Compare parent (.+) with left child (.+)\.$/, templates: { 'zh-TW': '比較父節點 {0} 與左子節點 {1}。' } },
  { pattern: /^Compare largest (.+) with right child (.+)\.$/, templates: { 'zh-TW': '比較目前最大值 {0} 與右子節點 {1}。' } },
  { pattern: /^Pushed (.+) onto the stack\.$/, templates: { 'zh-TW': '已將 {0} 推入堆疊頂端。' } },
  { pattern: /^Popped (.+) from the stack\.$/, templates: { 'zh-TW': '已從堆疊彈出 {0}。' } },
  { pattern: /^Top value is (.+)\.$/, templates: { 'zh-TW': '堆疊頂端數值為 {0}。' } },
  { pattern: /^Enqueued (.+) at the rear\.$/, templates: { 'zh-TW': '已將 {0} 加入佇列後端。' } },
  { pattern: /^Dequeued (.+) from the front\.$/, templates: { 'zh-TW': '已從佇列前端移除 {0}。' } },
  { pattern: /^Front value is (.+)\.$/, templates: { 'zh-TW': '佇列前端數值為 {0}。' } },
  { pattern: /^Appended node (.+)\.$/, templates: { 'zh-TW': '已在尾端附加節點 {0}。' } },
  { pattern: /^Prepended node (.+)\.$/, templates: { 'zh-TW': '已在頭端加入節點 {0}。' } },
  { pattern: /^Removed the first node containing (.+)\.$/, templates: { 'zh-TW': '已移除第一個包含 {0} 的節點。' } },
  { pattern: /^Node (.+) was not found\.$/, templates: { 'zh-TW': '找不到節點 {0}。' } },
  { pattern: /^Found (.+) at position (.+)\.$/, templates: { 'zh-TW': '在位置 {1} 找到 {0}。' } },
  { pattern: /^(.+) is now in its final position\.$/, templates: { 'zh-TW': '{0} 已到達最終位置。' } },
  { pattern: /^Lift (.+) into the sorted prefix\.$/, templates: { 'zh-TW': '取出 {0}，準備插入已排序前綴。' } },
  { pattern: /^Insert (.+) into the prefix\.$/, templates: { 'zh-TW': '將 {0} 插入已排序前綴。' } },
  { pattern: /^(.+) becomes the new minimum\.$/, templates: { 'zh-TW': '{0} 成為新的最小值。' } },
  { pattern: /^Choose (.+) as the pivot\.$/, templates: { 'zh-TW': '選擇 {0} 作為樞紐。' } },
  { pattern: /^Pivot (.+) reaches its partition point\.$/, templates: { 'zh-TW': '樞紐 {0} 已到達分割位置。' } },
  { pattern: /^Split range (.+)-(.+) at (.+)\.$/, templates: { 'zh-TW': '在 {2} 分割範圍 {0}–{1}。' } },
  { pattern: /^Merge ranges (.+)-(.+) and (.+)-(.+)\.$/, templates: { 'zh-TW': '合併範圍 {0}–{1} 與 {2}–{3}。' } },
  { pattern: /^Write (.+) at index (.+)\.$/, templates: { 'zh-TW': '將 {0} 寫入索引 {1}。' } },
  { pattern: /^Move maximum (.+) into its final position\.$/, templates: { 'zh-TW': '將最大值 {0} 移到最終位置。' } },
  { pattern: /^Inspect index (.+): (.+)\.$/, templates: { 'zh-TW': '檢查索引 {0}：{1}。' } },
  { pattern: /^Inspect midpoint (.+): (.+)\.$/, templates: { 'zh-TW': '檢查中點 {0}：{1}。' } },
  { pattern: /^Target (.+) found at index (.+)\.$/, templates: { 'zh-TW': '在索引 {1} 找到目標值 {0}。' } },
  { pattern: /^Target (.+) was not found\.$/, templates: { 'zh-TW': '找不到目標值 {0}。' } },
  { pattern: /^Begin at node (.+)\.$/, templates: { 'zh-TW': '從節點 {0} 開始。' } },
  { pattern: /^Visit (.+)\. Queue: (.+)\.$/, templates: { 'zh-TW': '走訪 {0}。目前佇列：{1}。' } },
  { pattern: /^Discover (.+) and add it to the queue\.$/, templates: { 'zh-TW': '發現 {0}，並加入佇列。' } },
  { pattern: /^Visit (.+) and inspect its neighbors\.$/, templates: { 'zh-TW': '走訪 {0} 並檢查相鄰節點。' } },
  { pattern: /^Follow the edge from (.+) to (.+)\.$/, templates: { 'zh-TW': '沿著邊從 {0} 前往 {1}。' } },
  { pattern: /^(BFS|DFS) traversal complete\.$/, templates: { 'zh-TW': '{0} 走訪完成。' } },
  { pattern: /^Invalid graph edge "(.+)"\. Use A-B format\.$/, templates: { 'zh-TW': '圖形邊「{0}」格式無效，請使用 A-B 格式。' } },
  { pattern: /^Start node (.+) does not exist in the graph\.$/, templates: { 'zh-TW': '起始節點 {0} 不存在於圖形中。' } }
];

export function localizeDevelopmentLabMessage(message: string, lang: Lang): string {
  if (lang === 'en') return message;
  const exact = exactMessages[message];
  if (exact) return pick(lang, exact);

  for (const rule of rules) {
    const match = message.match(rule.pattern);
    if (match) return replace(pick(lang, rule.templates), match.slice(1));
  }

  return pick(lang, {
    'zh-TW': '狀態已更新。',
    'zh-CN': '状态已更新。',
    ja: '状態を更新しました。',
    ko: '상태가 업데이트되었습니다.'
  });
}
