// FusionOS translation dictionary (source-as-key).
//
// The key is the Traditional-Chinese source string exactly as written in the JSX.
// zh-TW is implicit (return the key). Provide zh-CN / en / ja / ko per entry. Missing
// languages for an entry fall back to the Chinese source, so the UI is always coherent.
// ja / ko are best-effort and safe to refine here in one place.

export type Lang = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko';

export const LANGS: Lang[] = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'];

export const LANG_LABELS: Record<Lang, string> = {
  'zh-TW': '繁體中文',
  'zh-CN': '简体中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어'
};

type Entry = Partial<Record<Exclude<Lang, 'zh-TW'>, string>>;

export const TRANSLATIONS: Record<string, Entry> = {
  // ---------- App names (fusionApps titles) ----------
  '本機': { 'zh-CN': '本机', en: 'This PC', ja: 'PC', ko: '내 PC' },
  '專案檔案': { 'zh-CN': '项目文件', en: 'Project Files', ja: 'プロジェクトファイル', ko: '프로젝트 파일' },
  '鋼琴工作室': { 'zh-CN': '钢琴工作室', en: 'Piano Studio', ja: 'ピアノスタジオ', ko: '피아노 스튜디오' },
  '影音中心': { 'zh-CN': '影音中心', en: 'Media Center', ja: 'メディアセンター', ko: '미디어 센터' },
  '音訊工作室': { 'zh-CN': '音频工作室', en: 'Audio Studio', ja: 'オーディオスタジオ', ko: '오디오 스튜디오' },
  '宇宙手勢': { 'zh-CN': '宇宙手势', en: 'Cosmic Gesture', ja: 'コスミックジェスチャー', ko: '코스믹 제스처' },
  '使用者檔案': { 'zh-CN': '用户文件', en: 'User Files', ja: 'ユーザーファイル', ko: '사용자 파일' },
  '新增檔案': { 'zh-CN': '新增文件', en: 'Add File', ja: 'ファイルを追加', ko: '파일 추가' },
  '語言實驗室': { 'zh-CN': '语言实验室', en: 'Language Lab', ja: '言語ラボ', ko: '언어 연구실' },
  '工具箱': { 'zh-CN': '工具箱', en: 'Toolbox', ja: 'ツールボックス', ko: '도구 상자' },
  '資料庫': { 'zh-CN': '数据库', en: 'Database', ja: 'データベース', ko: '데이터베이스' },
  '網頁區': { 'zh-CN': '网页区', en: 'Web Zone', ja: 'ウェブゾーン', ko: '웹 존' },
  '遊戲室': { 'zh-CN': '游戏室', en: 'Game Room', ja: 'ゲームルーム', ko: '게임 룸' },
  '終端機': { 'zh-CN': '终端机', en: 'Terminal', ja: 'ターミナル', ko: '터미널' },
  '系統設定': { 'zh-CN': '系统设置', en: 'Settings', ja: '設定', ko: '설정' },

  // ---------- App subtitles ----------
  '系統資訊': { 'zh-CN': '系统信息', en: 'System Info', ja: 'システム情報', ko: '시스템 정보' },
  '檔案空間': { 'zh-CN': '文件空间', en: 'File Space', ja: 'ファイルスペース', ko: '파일 공간' },
  '內建應用程式': { 'zh-CN': '内置应用程序', en: 'Built-in App', ja: '内蔵アプリ', ko: '내장 앱' },
  '個人檔案': { 'zh-CN': '个人文件', en: 'Personal Files', ja: '個人ファイル', ko: '개인 파일' },
  '匯入': { 'zh-CN': '导入', en: 'Import', ja: 'インポート', ko: '가져오기' },
  '開發實驗室': { 'zh-CN': '开发实验室', en: 'Dev Lab', ja: '開発ラボ', ko: '개발 연구실' },
  '工具': { 'zh-CN': '工具', en: 'Tools', ja: 'ツール', ko: '도구' },
  '資料': { 'zh-CN': '数据', en: 'Data', ja: 'データ', ko: '데이터' },
  '網路空間': { 'zh-CN': '网络空间', en: 'Web Space', ja: 'ウェブスペース', ko: '웹 공간' },
  '遊戲空間': { 'zh-CN': '游戏空间', en: 'Game Space', ja: 'ゲームスペース', ko: '게임 공간' },
  '命令列': { 'zh-CN': '命令行', en: 'Command Line', ja: 'コマンドライン', ko: '명령줄' },
  '設定': { 'zh-CN': '设置', en: 'Settings', ja: '設定', ko: '설정' },

  // ---------- App statuses ----------
  '線上': { 'zh-CN': '在线', en: 'Online', ja: 'オンライン', ko: '온라인' },
  '已同步': { 'zh-CN': '已同步', en: 'Synced', ja: '同期済み', ko: '동기화됨' },
  '就緒': { 'zh-CN': '就绪', en: 'Ready', ja: '準備完了', ko: '준비됨' },
  '已連結': { 'zh-CN': '已链接', en: 'Linked', ja: 'リンク済み', ko: '연결됨' },
  '可用': { 'zh-CN': '可用', en: 'Available', ja: '利用可能', ko: '사용 가능' },
  '已連線': { 'zh-CN': '已连接', en: 'Connected', ja: '接続済み', ko: '연결됨' },
  '執行中': { 'zh-CN': '运行中', en: 'Running', ja: '実行中', ko: '실행 중' },

  // ---------- Home shell ----------
  '首頁': { 'zh-CN': '首页', en: 'Home', ja: 'ホーム', ko: '홈' },
  '檔案': { 'zh-CN': '文件', en: 'Files', ja: 'ファイル', ko: '파일' },
  '應用程式': { 'zh-CN': '应用程序', en: 'Apps', ja: 'アプリ', ko: '앱' },
  '空間工作區': { 'zh-CN': '空间工作区', en: 'Spatial Workspace', ja: '空間ワークスペース', ko: '공간 작업 영역' },
  '歡迎來到全新的清晰境界。': {
    'zh-CN': '欢迎来到全新的清晰境界。',
    en: 'Welcome to a new realm of clarity.',
    ja: '新しい明晰さの世界へようこそ。',
    ko: '새로운 명료함의 세계에 오신 것을 환영합니다.'
  },
  '開始探索': { 'zh-CN': '开始探索', en: 'Start Exploring', ja: '探索を始める', ko: '탐색 시작' },
  '瀏覽應用程式': { 'zh-CN': '浏览应用程序', en: 'Browse Apps', ja: 'アプリを見る', ko: '앱 둘러보기' },
  '已選取應用程式': { 'zh-CN': '已选取应用程序', en: 'Selected App', ja: '選択中のアプリ', ko: '선택된 앱' },
  '任務': { 'zh-CN': '任务', en: 'Tasks', ja: 'タスク', ko: '작업' },
  '設計審查已同步': { 'zh-CN': '设计审查已同步', en: 'Design review synced', ja: 'デザインレビュー同期済み', ko: '디자인 검토 동기화됨' },
  '系統模組就緒': { 'zh-CN': '系统模块就绪', en: 'System modules ready', ja: 'システムモジュール準備完了', ko: '시스템 모듈 준비됨' },
  '專業使用者': { 'zh-CN': '专业用户', en: 'Pro User', ja: 'プロユーザー', ko: '프로 사용자' },
  '展開側欄': { 'zh-CN': '展开侧栏', en: 'Expand sidebar', ja: 'サイドバーを展開', ko: '사이드바 펼치기' },
  '收合側欄': { 'zh-CN': '收合侧栏', en: 'Collapse sidebar', ja: 'サイドバーを折りたたむ', ko: '사이드바 접기' },
  '上一個應用程式': { 'zh-CN': '上一个应用程序', en: 'Previous app', ja: '前のアプリ', ko: '이전 앱' },
  '下一個應用程式': { 'zh-CN': '下一个应用程序', en: 'Next app', ja: '次のアプリ', ko: '다음 앱' },
  'Fusion OS 導覽': { 'zh-CN': 'Fusion OS 导览', en: 'Fusion OS navigation', ja: 'Fusion OS ナビゲーション', ko: 'Fusion OS 탐색' },
  'Fusion OS 程式塢': { 'zh-CN': 'Fusion OS 程序坞', en: 'Fusion OS dock', ja: 'Fusion OS ドック', ko: 'Fusion OS 독' },

  // Interpolated (use with tf)
  '{0} 個應用程式執行中': {
    'zh-CN': '{0} 个应用程序运行中',
    en: '{0} apps running',
    ja: '{0} 個のアプリが実行中',
    ko: '{0}개 앱 실행 중'
  },
  '工作區已上線。選擇應用程式，或按 Enter 啟動。': {
    'zh-CN': '工作区已上线。选择应用程序，或按 Enter 启动。',
    en: 'Workspace online. Pick an app, or press Enter to launch.',
    ja: 'ワークスペースが起動しました。アプリを選ぶか Enter で起動します。',
    ko: '작업 영역이 준비되었습니다. 앱을 선택하거나 Enter로 실행하세요.'
  },
  '已開啟「{0}」。': {
    'zh-CN': '已打开「{0}」。',
    en: 'Opened "{0}".',
    ja: '「{0}」を開きました。',
    ko: '"{0}"을(를) 열었습니다.'
  },
  '已將「{0}」的啟動要求送至 Fusion 主機。': {
    'zh-CN': '已将「{0}」的启动请求发送至 Fusion 主机。',
    en: 'Sent a launch request for "{0}" to the Fusion host.',
    ja: '「{0}」の起動リクエストを Fusion ホストに送信しました。',
    ko: '"{0}" 실행 요청을 Fusion 호스트로 보냈습니다.'
  },
  '啟動 {0}': { 'zh-CN': '启动 {0}', en: 'Launch {0}', ja: '{0} を起動', ko: '{0} 실행' },
  '手勢狀態：{0}': { 'zh-CN': '手势状态：{0}', en: 'Gesture: {0}', ja: 'ジェスチャー：{0}', ko: '제스처: {0}' },

  // ---------- Gesture status labels ----------
  '滑鼠輔助': { 'zh-CN': '鼠标辅助', en: 'Mouse assist', ja: 'マウス補助', ko: '마우스 보조' },
  '手勢就緒': { 'zh-CN': '手势就绪', en: 'Gesture ready', ja: 'ジェスチャー準備完了', ko: '제스처 준비됨' },
  '已擷取滑動': { 'zh-CN': '已捕获滑动', en: 'Swipe captured', ja: 'スワイプ検出', ko: '스와이프 감지됨' },
  '啟動脈衝': { 'zh-CN': '启动脉冲', en: 'Activation pulse', ja: '起動パルス', ko: '실행 펄스' },
  '相機降級': { 'zh-CN': '相机降级', en: 'Camera fallback', ja: 'カメラ縮退', ko: '카메라 대체 모드' },
  '相機待命': { 'zh-CN': '相机待命', en: 'Camera standby', ja: 'カメラ待機', ko: '카메라 대기' },
  '系統閒置': { 'zh-CN': '系统空闲', en: 'System idle', ja: 'システム待機', ko: '시스템 유휴' },

  // ---------- Desktop context menu ----------
  '檢視桌面內容': { 'zh-CN': '查看桌面内容', en: 'View desktop contents', ja: 'デスクトップの内容を表示', ko: '바탕화면 내용 보기' },
  '依名稱排序': { 'zh-CN': '按名称排序', en: 'Sort by name', ja: '名前で並べ替え', ko: '이름순 정렬' },
  '重新整理': { 'zh-CN': '刷新', en: 'Refresh', ja: '更新', ko: '새로 고침' },
  '新增': { 'zh-CN': '新建', en: 'New', ja: '新規作成', ko: '새로 만들기' },
  '資料夾': { 'zh-CN': '文件夹', en: 'Folder', ja: 'フォルダー', ko: '폴더' },
  '文字文件': { 'zh-CN': '文本文档', en: 'Text Document', ja: 'テキスト文書', ko: '텍스트 문서' },
  'Markdown 檔案': { 'zh-CN': 'Markdown 文件', en: 'Markdown File', ja: 'Markdown ファイル', ko: 'Markdown 파일' },
  'HTML 文件': { 'zh-CN': 'HTML 文档', en: 'HTML Document', ja: 'HTML 文書', ko: 'HTML 문서' },
  'C# 原始碼檔案': { 'zh-CN': 'C# 源代码文件', en: 'C# Source File', ja: 'C# ソースファイル', ko: 'C# 소스 파일' },
  '捷徑...': { 'zh-CN': '快捷方式...', en: 'Shortcut...', ja: 'ショートカット...', ko: '바로 가기...' },
  '開啟 FusionDesktop': { 'zh-CN': '打开 FusionDesktop', en: 'Open FusionDesktop', ja: 'FusionDesktop を開く', ko: 'FusionDesktop 열기' },
  '內容': { 'zh-CN': '属性', en: 'Properties', ja: 'プロパティ', ko: '속성' },

  // ---------- Settings: top bar + categories ----------
  '搜尋設定': { 'zh-CN': '搜索设置', en: 'Search settings', ja: '設定を検索', ko: '설정 검색' },
  '關閉': { 'zh-CN': '关闭', en: 'Close', ja: '閉じる', ko: '닫기' },
  '設定分類': { 'zh-CN': '设置分类', en: 'Settings categories', ja: '設定カテゴリ', ko: '설정 범주' },
  '系統': { 'zh-CN': '系统', en: 'System', ja: 'システム', ko: '시스템' },
  '藍牙與裝置': { 'zh-CN': '蓝牙与设备', en: 'Bluetooth & devices', ja: 'Bluetooth とデバイス', ko: 'Bluetooth 및 장치' },
  '網路與網際網路': { 'zh-CN': '网络和 Internet', en: 'Network & internet', ja: 'ネットワークとインターネット', ko: '네트워크 및 인터넷' },
  '個人化': { 'zh-CN': '个性化', en: 'Personalization', ja: '個人用設定', ko: '개인 설정' },
  '帳戶': { 'zh-CN': '账户', en: 'Accounts', ja: 'アカウント', ko: '계정' },
  '時間與語言': { 'zh-CN': '时间和语言', en: 'Time & language', ja: '時刻と言語', ko: '시간 및 언어' },
  '遊戲': { 'zh-CN': '游戏', en: 'Gaming', ja: 'ゲーム', ko: '게임' },
  '協助工具': { 'zh-CN': '辅助功能', en: 'Accessibility', ja: 'アクセシビリティ', ko: '접근성' },
  '隱私權與安全性': { 'zh-CN': '隐私和安全性', en: 'Privacy & security', ja: 'プライバシーとセキュリティ', ko: '개인정보 및 보안' },
  '系統更新': { 'zh-CN': '系统更新', en: 'System update', ja: 'システム更新', ko: '시스템 업데이트' },

  // ---------- Settings: personalization ----------
  '色彩模式': { 'zh-CN': '颜色模式', en: 'Color mode', ja: 'カラーモード', ko: '색상 모드' },
  '佈景主題': { 'zh-CN': '主题', en: 'Theme', ja: 'テーマ', ko: '테마' },
  '選擇淺色或深色外觀': { 'zh-CN': '选择浅色或深色外观', en: 'Choose a light or dark look', ja: 'ライトまたはダークの外観を選択', ko: '밝게 또는 어둡게 선택' },
  '深色': { 'zh-CN': '深色', en: 'Dark', ja: 'ダーク', ko: '어둡게' },
  '淺色': { 'zh-CN': '浅色', en: 'Light', ja: 'ライト', ko: '밝게' },
  '自動': { 'zh-CN': '自动', en: 'Auto', ja: '自動', ko: '자동' },
  '透明效果': { 'zh-CN': '透明效果', en: 'Transparency effects', ja: '透明効果', ko: '투명 효과' },
  '視窗與面板的玻璃模糊質感': { 'zh-CN': '窗口与面板的玻璃模糊质感', en: 'Glass blur on windows and panels', ja: 'ウィンドウとパネルのすりガラス効果', ko: '창과 패널의 유리 흐림 효과' },
  '強調色': { 'zh-CN': '强调色', en: 'Accent color', ja: 'アクセントカラー', ko: '강조 색' },
  '桌布': { 'zh-CN': '桌面背景', en: 'Wallpaper', ja: '壁紙', ko: '배경 화면' },

  // ---------- Settings: time & language ----------
  '語言': { 'zh-CN': '语言', en: 'Language', ja: '言語', ko: '언어' },
  '顯示語言': { 'zh-CN': '显示语言', en: 'Display language', ja: '表示言語', ko: '표시 언어' },
  '變更整個 FusionOS 桌面的顯示語言': {
    'zh-CN': '更改整个 FusionOS 桌面的显示语言',
    en: 'Changes the display language of the whole FusionOS desktop',
    ja: 'FusionOS デスクトップ全体の表示言語を変更します',
    ko: '전체 FusionOS 데스크톱의 표시 언어를 변경합니다'
  },
  '時間': { 'zh-CN': '时间', en: 'Time', ja: '時刻', ko: '시간' },
  '時區': { 'zh-CN': '时区', en: 'Time zone', ja: 'タイムゾーン', ko: '표준 시간대' },
  '使用 24 小時制': { 'zh-CN': '使用 24 小时制', en: 'Use 24-hour clock', ja: '24 時間表示を使う', ko: '24시간제 사용' },

  // ---------- Settings: accounts ----------
  '個人資料': { 'zh-CN': '个人资料', en: 'Profile', ja: 'プロフィール', ko: '프로필' },
  '顯示名稱': { 'zh-CN': '显示名称', en: 'Display name', ja: '表示名', ko: '표시 이름' },
  '電子郵件': { 'zh-CN': '电子邮件', en: 'Email', ja: 'メールアドレス', ko: '이메일' },
  '儲存變更': { 'zh-CN': '保存更改', en: 'Save changes', ja: '変更を保存', ko: '변경 사항 저장' },
  '已儲存': { 'zh-CN': '已保存', en: 'Saved', ja: '保存しました', ko: '저장됨' },
  '安全性': { 'zh-CN': '安全性', en: 'Security', ja: 'セキュリティ', ko: '보안' },
  '變更密碼': { 'zh-CN': '更改密码', en: 'Change password', ja: 'パスワードを変更', ko: '비밀번호 변경' },
  '目前密碼': { 'zh-CN': '当前密码', en: 'Current password', ja: '現在のパスワード', ko: '현재 비밀번호' },
  '新密碼': { 'zh-CN': '新密码', en: 'New password', ja: '新しいパスワード', ko: '새 비밀번호' },
  '確認新密碼': { 'zh-CN': '确认新密码', en: 'Confirm new password', ja: '新しいパスワードの確認', ko: '새 비밀번호 확인' },
  '更新密碼': { 'zh-CN': '更新密码', en: 'Update password', ja: 'パスワードを更新', ko: '비밀번호 업데이트' },
  '密碼已更新': { 'zh-CN': '密码已更新', en: 'Password updated', ja: 'パスワードを更新しました', ko: '비밀번호가 업데이트되었습니다' },
  '目前密碼不正確': { 'zh-CN': '当前密码不正确', en: 'Current password is incorrect', ja: '現在のパスワードが正しくありません', ko: '현재 비밀번호가 올바르지 않습니다' },
  '兩次輸入的新密碼不一致': { 'zh-CN': '两次输入的新密码不一致', en: 'New passwords do not match', ja: '新しいパスワードが一致しません', ko: '새 비밀번호가 일치하지 않습니다' },
  '密碼至少需 4 個字元': { 'zh-CN': '密码至少需 4 个字符', en: 'Password must be at least 4 characters', ja: 'パスワードは 4 文字以上必要です', ko: '비밀번호는 4자 이상이어야 합니다' },
  '登出並鎖定': { 'zh-CN': '注销并锁定', en: 'Sign out & lock', ja: 'サインアウトしてロック', ko: '로그아웃 및 잠금' },
  '帳戶資料儲存在本機 SQLite 資料庫': {
    'zh-CN': '账户数据保存在本地 SQLite 数据库',
    en: 'Account data is stored in a local SQLite database',
    ja: 'アカウント情報はローカルの SQLite データベースに保存されます',
    ko: '계정 데이터는 로컬 SQLite 데이터베이스에 저장됩니다'
  },

  // ---------- Login / lock screen ----------
  '歡迎使用 FusionOS': { 'zh-CN': '欢迎使用 FusionOS', en: 'Welcome to FusionOS', ja: 'FusionOS へようこそ', ko: 'FusionOS에 오신 것을 환영합니다' },
  '建立你的帳戶': { 'zh-CN': '创建你的账户', en: 'Create your account', ja: 'アカウントを作成', ko: '계정 만들기' },
  '設定名稱與密碼以保護你的桌面': {
    'zh-CN': '设置名称与密码以保护你的桌面',
    en: 'Set a name and password to protect your desktop',
    ja: '名前とパスワードを設定してデスクトップを保護します',
    ko: '이름과 비밀번호를 설정해 데스크톱을 보호하세요'
  },
  '輸入密碼以解鎖': { 'zh-CN': '输入密码以解锁', en: 'Enter your password to unlock', ja: 'パスワードを入力してロック解除', ko: '비밀번호를 입력해 잠금 해제' },
  '密碼': { 'zh-CN': '密码', en: 'Password', ja: 'パスワード', ko: '비밀번호' },
  '名稱': { 'zh-CN': '名称', en: 'Name', ja: '名前', ko: '이름' },
  '解鎖': { 'zh-CN': '解锁', en: 'Unlock', ja: 'ロック解除', ko: '잠금 해제' },
  '建立帳戶': { 'zh-CN': '创建账户', en: 'Create account', ja: 'アカウントを作成', ko: '계정 만들기' },
  '密碼錯誤，請再試一次': { 'zh-CN': '密码错误，请重试', en: 'Wrong password, try again', ja: 'パスワードが違います。もう一度お試しください', ko: '비밀번호가 틀립니다. 다시 시도하세요' },
  '正在驗證…': { 'zh-CN': '正在验证…', en: 'Verifying…', ja: '確認中…', ko: '확인 중…' },
  '在此裝置上重設帳戶': { 'zh-CN': '在此设备上重置账户', en: 'Reset account on this device', ja: 'このデバイスでアカウントをリセット', ko: '이 기기에서 계정 재설정' },
  '這會清除本機帳戶並要求重新設定，確定嗎？': {
    'zh-CN': '这会清除本地账户并要求重新设置，确定吗？',
    en: 'This clears the local account and asks you to set it up again. Continue?',
    ja: 'ローカルアカウントを削除して再設定します。よろしいですか？',
    ko: '로컬 계정을 지우고 다시 설정합니다. 계속할까요?'
  }
};
