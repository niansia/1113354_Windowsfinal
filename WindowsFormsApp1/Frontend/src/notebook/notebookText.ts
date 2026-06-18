import type { Lang } from '../i18n/strings.js';

type Entry = Partial<Record<Exclude<Lang, 'zh-TW'>, string>>;

const entry = (zhCN: string, en: string, ja: string, ko: string): Entry => ({ 'zh-CN': zhCN, en, ja, ko });

// Source-as-key i18n for the Notes & Calendar app (default zh-TW returns the key itself).
export const NOTEBOOK_TRANSLATIONS: Record<string, Entry> = {
  '上個月': entry('上个月', 'Previous month', '前の月', '이전 달'),
  '下個月': entry('下个月', 'Next month', '次の月', '다음 달'),
  '今天': entry('今天', 'Today', '今日', '오늘'),
  '當日事項': entry('当日事项', 'Items for the day', 'その日の予定', '오늘 일정'),
  '這一天還沒有任何事項。': entry('这一天还没有任何事项。', 'Nothing scheduled for this day yet.', 'この日の予定はまだありません。', '이 날에는 아직 일정이 없습니다.'),
  '標記完成': entry('标记完成', 'Mark done', '完了にする', '완료 표시'),
  '語音': entry('语音', 'Voice', '音声', '음성'),
  '刪除': entry('删除', 'Delete', '削除', '삭제'),
  '要做什麼？': entry('要做什么？', 'What to do?', '何をする？', '무엇을 할까요?'),
  '備註': entry('备注', 'Note', 'メモ', '메모'),
  '備註（可選）': entry('备注（可选）', 'Note (optional)', 'メモ（任意）', '메모(선택)'),
  '新增事項': entry('新增事项', 'Add item', '項目を追加', '항목 추가'),
  '也可以對語音助理說「幫我在明天下午三點標註開會」，事項會立即出現在這裡。': entry(
    '也可以对语音助理说「帮我在明天下午三点标注开会」，事项会立即出现在这里。',
    'You can also tell the assistant “add a meeting tomorrow at 3pm” and it appears here instantly.',
    '音声アシスタントに「明日の午後3時に会議を入れて」と話すと、ここにすぐ表示されます。',
    '음성 비서에게 “내일 오후 3시에 회의 표시해 줘”라고 말하면 여기에 바로 나타납니다.'
  ),
  '新記事': entry('新记事', 'New note', '新規メモ', '새 메모'),
  '還沒有記事，建立第一篇吧。': entry('还没有记事，先建立第一篇吧。', 'No notes yet — create your first one.', 'メモはまだありません。最初の1件を作成しましょう。', '메모가 아직 없습니다. 첫 메모를 만들어 보세요.'),
  '未命名記事': entry('未命名记事', 'Untitled note', '無題のメモ', '제목 없는 메모'),
  '（空白）': entry('（空白）', '(empty)', '（空）', '(비어 있음)'),
  '記事標題…': entry('记事标题…', 'Note title…', 'メモのタイトル…', '메모 제목…'),
  '開始輸入…': entry('开始输入…', 'Start typing…', '入力を始める…', '입력을 시작하세요…'),
  '選擇或建立一篇記事': entry('选择或创建一篇记事', 'Select or create a note', 'メモを選択または作成', '메모를 선택하거나 만드세요'),
  '在左側挑選記事，或建立新的一篇開始書寫。': entry('在左侧挑选记事，或创建新的一篇开始书写。', 'Pick a note on the left, or create a new one to start writing.', '左側でメモを選ぶか、新規作成して書き始めましょう。', '왼쪽에서 메모를 고르거나 새로 만들어 작성을 시작하세요.')
};
