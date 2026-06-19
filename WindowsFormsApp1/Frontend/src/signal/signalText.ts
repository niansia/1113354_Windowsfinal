import type { Lang } from '../i18n/strings.js';

type Entry = Partial<Record<Exclude<Lang, 'zh-TW'>, string>>;

const entry = (zhCN: string, en: string, ja: string, ko: string): Entry => ({
  'zh-CN': zhCN,
  en,
  ja,
  ko
});

export const SIGNAL_TRANSLATIONS: Record<string, Entry> = {
  SignalForge: entry('SignalForge', 'SignalForge', 'SignalForge', 'SignalForge'),
  '通訊與硬體實驗場': entry('通信与硬件实验场', 'Communication and hardware lab', '通信とハードウェア実験場', '통신 및 하드웨어 실험장'),
  '把訊號、位元、處理器與物理通道整合成可操作的系統實驗。': entry(
    '把信号、位、处理器与物理通道整合成可操作的系统实验。',
    'Combine signals, bits, processors, and physical channels into an operable systems lab.',
    '信号、ビット、プロセッサ、物理チャネルを操作可能なシステム実験に統合します。',
    '신호, 비트, 프로세서, 물리 채널을 조작 가능한 시스템 실험으로 통합합니다.'
  ),
  '資料鏈路': entry('数据链路', 'Data link', 'データリンク', '데이터 링크'),
  '處理器': entry('处理器', 'Processor', 'プロセッサ', '프로세서'),
  '物理通道': entry('物理通道', 'Physical channel', '物理チャネル', '물리 채널'),
  '封包分析': entry('封包分析', 'Packet analysis', 'パケット分析', '패킷 분석'),
  '系統實驗': entry('系统实验', 'Systems lab', 'システム実験', '시스템 실험'),
  '系統時間': entry('系统时间', 'System time', 'システム時刻', '시스템 시간'),
  '關閉': entry('关闭', 'Close', '閉じる', '닫기'),
  '訊號工作台': entry('信号工作台', 'Signal workspace', '信号ワークスペース', '신호 작업대'),
  '輸入訊息、選擇通道，立即看見封包、延遲與暫存器變化。': entry(
    '输入消息、选择通道，立即看见封包、延迟与寄存器变化。',
    'Enter a message, choose a channel, and see packets, latency, and register changes instantly.',
    'メッセージとチャネルを選ぶと、パケット、遅延、レジスタ変化が即座に見えます。',
    '메시지와 채널을 선택하면 패킷, 지연, 레지스터 변화를 즉시 볼 수 있습니다.'
  ),
  '訊息內容': entry('消息内容', 'Message payload', 'メッセージ内容', '메시지 내용'),
  '通道介質': entry('通道介质', 'Channel medium', 'チャネル媒体', '채널 매체'),
  '距離': entry('距离', 'Distance', '距離', '거리'),
  '資料率': entry('数据率', 'Data rate', 'データレート', '데이터 전송률'),
  '載波頻率': entry('载波频率', 'Carrier frequency', '搬送波周波数', '반송파 주파수'),
  '雜訊': entry('噪声', 'Noise', 'ノイズ', '잡음'),
  '公尺': entry('米', 'm', 'm', 'm'),
  'Mbps': entry('Mbps', 'Mbps', 'Mbps', 'Mbps'),
  'MHz': entry('MHz', 'MHz', 'MHz', 'MHz'),
  'dB': entry('dB', 'dB', 'dB', 'dB'),
  '鏈路摘要': entry('链路摘要', 'Link brief', 'リンク概要', '링크 요약'),
  '封包建構': entry('封包构建', 'Packet builder', 'パケットビルダー', '패킷 빌더'),
  '位元': entry('位', 'bits', 'ビット', '비트'),
  '位元組': entry('字节', 'bytes', 'バイト', '바이트'),
  '訊框位元組': entry('帧字节', 'framed bytes', 'フレームバイト', '프레임 바이트'),
  '偶同位檢查': entry('偶校验', 'Even parity', '偶数パリティ', '짝수 패리티'),
  '校驗碼': entry('校验码', 'Checksum', 'チェックサム', '체크섬'),
  '訊框 Hex': entry('帧 Hex', 'Frame hex', 'フレーム Hex', '프레임 Hex'),
  '二進位預覽': entry('二进制预览', 'Binary preview', 'バイナリプレビュー', '이진 미리보기'),
  '通道物理': entry('通道物理', 'Channel physics', 'チャネル物理', '채널 물리'),
  '傳播延遲': entry('传播延迟', 'Propagation delay', '伝搬遅延', '전파 지연'),
  '傳輸延遲': entry('传输延迟', 'Transmission delay', '送信遅延', '전송 지연'),
  '波長': entry('波长', 'Wavelength', '波長', '파장'),
  '衰減': entry('衰减', 'Attenuation', '減衰', '감쇠'),
  '餘裕': entry('余量', 'Margin', 'マージン', '여유'),
  '穩定': entry('稳定', 'Steady', '安定', '안정'),
  '觀察': entry('观察', 'Watch', 'Watch', '관찰'),
  '需要調整': entry('需要调整', 'Needs adjustment', '調整が必要', '조정 필요'),
  '處理器追蹤': entry('处理器追踪', 'Processor trace', 'プロセッサトレース', '프로세서 추적'),
  '暫存器': entry('寄存器', 'Registers', 'レジスタ', '레지스터'),
  '指令流水': entry('指令流水', 'Instruction flow', '命令フロー', '명령 흐름'),
  '整合模型': entry('整合模型', 'Integrated model', '統合モデル', '통합 모델'),
  '資料在這裡先被切成位元與訊框，讓錯誤檢查有明確邊界。': entry(
    '数据在这里先被切成位与帧，让错误检查有明确边界。',
    'Data is split into bits and frames first, giving error checks clear boundaries.',
    'データをビットとフレームに分け、誤り検査の境界を明確にします。',
    '데이터를 비트와 프레임으로 나누어 오류 검사의 경계를 명확히 합니다.'
  ),
  '處理器追蹤顯示長度、校驗碼與同位元如何進入暫存器。': entry(
    '处理器追踪显示长度、校验码与校验位如何进入寄存器。',
    'The processor trace shows how length, checksum, and parity enter registers.',
    'プロセッサトレースは長さ、チェックサム、パリティがレジスタへ入る流れを示します。',
    '프로세서 추적은 길이, 체크섬, 패리티가 레지스터에 들어가는 과정을 보여줍니다.'
  ),
  '物理通道把距離、波速、頻率與雜訊轉成延遲與可靠度。': entry(
    '物理通道把距离、波速、频率与噪声转换成延迟与可靠度。',
    'The physical channel turns distance, wave speed, frequency, and noise into latency and reliability.',
    '物理チャネルは距離、波速、周波数、ノイズを遅延と信頼性に変換します。',
    '물리 채널은 거리, 파동 속도, 주파수, 잡음을 지연과 신뢰도로 변환합니다.'
  ),
  '依系統語言與日期格式同步顯示。': entry(
    '依系统语言与日期格式同步显示。',
    'Shown using the system language and date format.',
    'システムの言語と日付形式に合わせて表示します。',
    '시스템 언어와 날짜 형식에 맞춰 표시됩니다.'
  ),
  '光纖鏈路': entry('光纤链路', 'Fiber link', '光ファイバーリンク', '광섬유 링크'),
  '銅線鏈路': entry('铜线链路', 'Copper link', '銅線リンク', '구리선 링크'),
  '無線鏈路': entry('无线链路', 'Wireless link', '無線リンク', '무선 링크'),
  '聲波通道': entry('声波通道', 'Acoustic channel', '音響チャネル', '음향 채널'),
  '負載位元組': entry('负载字节', 'payload bytes', 'ペイロードバイト', '페이로드 바이트'),
  '負載位元': entry('负载位', 'payload bits', 'ペイロードビット', '페이로드 비트'),
  '偶同位元': entry('偶校验位', 'even parity bit', '偶数パリティビット', '짝수 패리티 비트'),
  '已平衡': entry('已平衡', 'balanced', '均衡', '균형'),
  '已加入同位元': entry('已加入校验位', 'parity bit added', 'パリティビット追加', '패리티 비트 추가')
};
