// VeriLens -- source-as-key i18n (zh-TW default, system-driven like the rest of FusionOS).
(function (global) {
  const DICT = {
    // shell
    '真偽鑑識中心': { 'zh-CN': '真伪鉴识中心', en: 'VeriLens', ja: 'ベリレンズ', ko: '베리렌즈' },
    '多模態假新聞鑑識（YOLO 影像 + NLP 文字）': {
      'zh-CN': '多模态假新闻鉴识（YOLO 影像 + NLP 文字）',
      en: 'Multimodal fake-news forensics (YOLO vision + NLP text)',
      ja: 'マルチモーダル偽ニュース鑑識（YOLO 画像 + NLP テキスト）',
      ko: '멀티모달 가짜뉴스 포렌식 (YOLO 영상 + NLP 텍스트)' },
    '鑑識引擎': { 'zh-CN': '鉴识引擎', en: 'Engine', ja: 'エンジン', ko: '엔진' },
    '原生': { 'zh-CN': '原生', en: 'native', ja: 'ネイティブ', ko: '네이티브' },
    '就緒': { 'zh-CN': '就绪', en: 'ready', ja: '準備完了', ko: '준비됨' },
    '載入中': { 'zh-CN': '加载中', en: 'loading', ja: '読込中', ko: '로딩 중' },

    // input
    '輸入待驗新聞': { 'zh-CN': '输入待验新闻', en: 'Submit news to verify', ja: '検証するニュースを入力', ko: '검증할 뉴스 입력' },
    '新聞標題': { 'zh-CN': '新闻标题', en: 'Headline', ja: '見出し', ko: '제목' },
    '新聞內文': { 'zh-CN': '新闻内文', en: 'Article body', ja: '本文', ko: '본문' },
    '來源（網域或媒體名稱，選填）': { 'zh-CN': '来源（网域或媒体名称，选填）', en: 'Source (domain or outlet, optional)', ja: '出典（ドメインや媒体名、任意）', ko: '출처 (도메인/매체, 선택)' },
    '貼上或拖放新聞圖片（選填）': { 'zh-CN': '粘贴或拖放新闻图片（选填）', en: 'Drop or click to add a news image (optional)', ja: '画像をドロップ/クリックで追加（任意）', ko: '이미지를 끌어놓거나 클릭 (선택)' },
    '開始鑑識': { 'zh-CN': '开始鉴识', en: 'Analyze', ja: '鑑識開始', ko: '분석 시작' },
    '貼上新聞 / 文章連結，自動擷取': { 'zh-CN': '粘贴新闻 / 文章链接，自动提取', en: 'Paste a news / article URL to auto-extract', ja: 'ニュース/記事のURLを貼り付けて自動取得', ko: '뉴스/기사 링크를 붙여 자동 추출' },
    '擷取連結': { 'zh-CN': '提取链接', en: 'Fetch URL', ja: '取得', ko: '가져오기' },
    '或手動輸入': { 'zh-CN': '或手动输入', en: 'or enter manually', ja: 'または手動入力', ko: '또는 직접 입력' },
    '例如：震驚！某產品驚人真相曝光': { 'zh-CN': '例如：震惊！某产品惊人真相曝光', en: 'e.g. SHOCKING! The truth about this product exposed', ja: '例：衝撃！ある製品の驚きの真実', ko: '예: 충격! 어떤 제품의 놀라운 진실' },
    '貼上新聞或文章的完整內文…': { 'zh-CN': '粘贴新闻或文章的完整内文…', en: 'Paste the full article text…', ja: '記事の本文を貼り付け…', ko: '기사 본문을 붙여넣기…' },
    '例如：reuters.com、中央社、line 群組': { 'zh-CN': '例如：reuters.com、中央社、line 群组', en: 'e.g. reuters.com, AP, a LINE group', ja: '例：reuters.com、通信社、LINEグループ', ko: '예: reuters.com, 통신사, 라인 그룹' },
    '擷取中…': { 'zh-CN': '提取中…', en: 'Fetching…', ja: '取得中…', ko: '가져오는 중…' },
    '無法擷取此連結，請改用手動貼上': { 'zh-CN': '无法提取此链接，请改用手动粘贴', en: 'Could not fetch this link — please paste manually', ja: 'このリンクを取得できません。手動で貼り付けてください', ko: '이 링크를 가져올 수 없습니다 — 직접 붙여넣어 주세요' },
    '請貼上有效的新聞連結': { 'zh-CN': '请粘贴有效的新闻链接', en: 'Please paste a valid news URL', ja: '有効なURLを貼り付けてください', ko: '유효한 URL을 붙여넣어 주세요' },
    '已從連結擷取內容並完成鑑識': { 'zh-CN': '已从链接提取内容并完成鉴识', en: 'Extracted from the link and analyzed', ja: 'リンクから取得して鑑識しました', ko: '링크에서 추출해 분석했습니다' },
    '清除': { 'zh-CN': '清除', en: 'Clear', ja: 'クリア', ko: '지우기' },
    '載入範例': { 'zh-CN': '加载示例', en: 'Load example', ja: 'サンプル', ko: '예시' },
    '假新聞範例': { 'zh-CN': '假新闻示例', en: 'Fake example', ja: '偽の例', ko: '가짜 예시' },
    '真新聞範例': { 'zh-CN': '真新闻示例', en: 'Real example', ja: '本物の例', ko: '진짜 예시' },
    '分析中…': { 'zh-CN': '分析中…', en: 'Analyzing…', ja: '解析中…', ko: '분석 중…' },
    '請先輸入新聞標題或內文': { 'zh-CN': '请先输入新闻标题或内文', en: 'Enter a headline or body first', ja: '見出しか本文を入力してください', ko: '제목 또는 본문을 입력하세요' },

    // verdict
    '可信': { 'zh-CN': '可信', en: 'Likely Credible', ja: '信頼できる', ko: '신뢰 가능' },
    '存疑': { 'zh-CN': '存疑', en: 'Questionable', ja: '疑わしい', ko: '의심스러움' },
    '可能不實': { 'zh-CN': '可能不实', en: 'Likely False', ja: '虚偽の可能性', ko: '허위 가능성' },
    '可信度': { 'zh-CN': '可信度', en: 'Credibility', ja: '信頼度', ko: '신뢰도' },
    '判定信心': { 'zh-CN': '判定信心', en: 'Confidence', ja: '判定信頼度', ko: '판정 신뢰도' },
    '假訊息機率': { 'zh-CN': '假信息概率', en: 'P(fake)', ja: '偽の確率', ko: '가짜 확률' },
    '尚未分析': { 'zh-CN': '尚未分析', en: 'Not analyzed yet', ja: '未解析', ko: '미분석' },
    '在左側輸入新聞並按「開始鑑識」': { 'zh-CN': '在左侧输入新闻并按"开始鉴识"', en: 'Enter news on the left and press Analyze', ja: '左側に入力して鑑識開始を押してください', ko: '왼쪽에 입력 후 분석 시작을 누르세요' },

    // factors
    '判定依據': { 'zh-CN': '判定依据', en: 'Why this verdict', ja: '判定根拠', ko: '판정 근거' },
    '文字模型': { 'zh-CN': '文字模型', en: 'Text classifier', ja: 'テキスト分類器', ko: '텍스트 분류기' },
    '寫作風格': { 'zh-CN': '写作风格', en: 'Writing style', ja: '文体', ko: '문체' },
    '來源可信度': { 'zh-CN': '来源可信度', en: 'Source credibility', ja: '出典の信頼性', ko: '출처 신뢰도' },
    '影像竄改': { 'zh-CN': '影像篡改', en: 'Image tampering', ja: '画像改ざん', ko: '이미지 변조' },
    '影像內容': { 'zh-CN': '影像内容', en: 'Image content', ja: '画像内容', ko: '이미지 내용' },
    '網路查證': { 'zh-CN': '网络查证', en: 'Web cross-reference', ja: 'ウェブ照合', ko: '웹 교차검증' },
    '提高可信': { 'zh-CN': '提高可信', en: 'raises credibility', ja: '信頼度を上げる', ko: '신뢰도 상승' },
    '降低可信': { 'zh-CN': '降低可信', en: 'lowers credibility', ja: '信頼度を下げる', ko: '신뢰도 하락' },
    // factor reasoning templates
    'AI 文字分類器：假訊息機率 {0}%': { 'zh-CN': 'AI 文本分类器：假信息概率 {0}%', en: 'AI text classifier: {0}% fake probability', ja: 'AIテキスト分類器：偽の確率 {0}%', ko: 'AI 텍스트 분류기: 가짜 확률 {0}%' },
    '寫作風格風險 {0}%（誘餌、聳動、來源引用等）': { 'zh-CN': '写作风格风险 {0}%（诱饵、耸动、来源引用等）', en: 'Writing-style risk {0}% (clickbait, sensationalism, sourcing)', ja: '文体リスク {0}%（クリックベイト等）', ko: '문체 위험 {0}% (낚시·선정성·출처)' },
    '來源可信度 {0}%': { 'zh-CN': '来源可信度 {0}%', en: 'Source credibility {0}%', ja: '出典の信頼性 {0}%', ko: '출처 신뢰도 {0}%' },
    '網路查證：查核資料庫顯示相關不實訊息（風險 {0}%）': { 'zh-CN': '网络查证：查核数据库显示相关不实信息（风险 {0}%）', en: 'Web check: fact-check databases flag related misinformation (risk {0}%)', ja: 'ウェブ照合：ファクトチェックDBが関連する虚偽を指摘（リスク {0}%）', ko: '웹 검증: 팩트체크 DB가 관련 허위정보 표시 (위험 {0}%)' },
    '網路查證：查核結果偏向屬實（風險 {0}%）': { 'zh-CN': '网络查证：查核结果偏向属实（风险 {0}%）', en: 'Web check: fact-checks lean true (risk {0}%)', ja: 'ウェブ照合：おおむね事実（リスク {0}%）', ko: '웹 검증: 대체로 사실 (위험 {0}%)' },
    '影像竄改跡象 {0}%': { 'zh-CN': '影像篡改迹象 {0}%', en: 'Image-tamper signs {0}%', ja: '画像改ざんの兆候 {0}%', ko: '이미지 변조 흔적 {0}%' },
    '影像中偵測到 {0} 個主體': { 'zh-CN': '影像中检测到 {0} 个主体', en: '{0} subjects detected in image', ja: '画像内に {0} 個の被写体', ko: '이미지에서 {0}개 객체 감지' },
    // web evidence
    '發現 {0} 則相關事實查核': { 'zh-CN': '发现 {0} 则相关事实查核', en: 'Found {0} related fact-check(s)', ja: '関連するファクトチェック {0} 件', ko: '관련 팩트체크 {0}건' },
    '未在查核資料庫找到相關紀錄': { 'zh-CN': '未在查核数据库找到相关记录', en: 'No matching record in fact-check databases', ja: 'ファクトチェックDBに該当なし', ko: '팩트체크 DB에 기록 없음' },
    '不實': { 'zh-CN': '不实', en: 'False', ja: '虚偽', ko: '허위' },
    '屬實': { 'zh-CN': '属实', en: 'True', ja: '事実', ko: '사실' },
    '相關查核': { 'zh-CN': '相关查核', en: 'Related', ja: '関連', ko: '관련' },
    '網路查證：找到相關事實查核報導，此說法受到質疑（風險 {0}%）': { 'zh-CN': '网络查证：找到相关事实查核报导，此说法受到质疑（风险 {0}%）', en: 'Web check: related fact-check coverage found — claim is contested (risk {0}%)', ja: 'ウェブ照合：関連するファクトチェックあり（リスク {0}%）', ko: '웹 검증: 관련 팩트체크 발견 — 주장 논란 (위험 {0}%)' },
    '查看': { 'zh-CN': '查看', en: 'View', ja: '表示', ko: '보기' },
    // thin-content warning
    '⚠ 此連結內容無法完整擷取（可能為社群平台或需登入），目前判定僅依少量資訊。建議手動複製貼上貼文內文，以進行完整的文字與網路查證。': {
      'zh-CN': '⚠ 此链接内容无法完整提取（可能为社群平台或需登录），目前判定仅依少量信息。建议手动复制粘贴贴文内文，以进行完整的文字与网络查证。',
      en: '⚠ This link\'s content could not be fully extracted (likely a social platform or login-gated). The verdict is based on limited info — please paste the post text manually for full text + web cross-reference analysis.',
      ja: '⚠ このリンクの内容を完全に取得できませんでした（SNSやログインが必要な可能性）。判定は限られた情報に基づきます。投稿本文を手動で貼り付けてください。',
      ko: '⚠ 이 링크의 내용을 완전히 추출하지 못했습니다(소셜 플랫폼/로그인 필요 가능). 판정은 제한된 정보 기반입니다 — 게시글 본문을 직접 붙여넣어 주세요.' },

    // claims
    '可查證主張': { 'zh-CN': '可查证主张', en: 'Check-worthy claims', ja: '検証可能な主張', ko: '검증 가능 주장' },
    '未偵測到明確的事實主張': { 'zh-CN': '未检测到明确的事实主张', en: 'No clear factual claims detected', ja: '明確な事実主張は検出されません', ko: '명확한 사실 주장 없음' },

    // image forensics
    '影像鑑識': { 'zh-CN': '影像鉴识', en: 'Image Forensics', ja: '画像鑑識', ko: '이미지 포렌식' },
    '原圖': { 'zh-CN': '原图', en: 'Original', ja: '元画像', ko: '원본' },
    'YOLO 物件偵測': { 'zh-CN': 'YOLO 物体检测', en: 'YOLO detection', ja: 'YOLO 検出', ko: 'YOLO 검출' },
    'ELA 誤差熱圖': { 'zh-CN': 'ELA 误差热图', en: 'ELA heatmap', ja: 'ELA ヒートマップ', ko: 'ELA 히트맵' },
    '竄改可能性': { 'zh-CN': '篡改可能性', en: 'Tamper score', ja: '改ざんスコア', ko: '변조 점수' },
    '誤差層級分析': { 'zh-CN': '误差层级分析', en: 'Error-Level Analysis', ja: '誤差レベル解析', ko: '오차 수준 분석' },
    '雜訊不一致': { 'zh-CN': '噪声不一致', en: 'Noise inconsistency', ja: 'ノイズ不一致', ko: '노이즈 불일치' },
    '複製貼上': { 'zh-CN': '复制粘贴', en: 'Copy-move', ja: 'コピー＆ムーブ', ko: '복제-이동' },
    '偵測物件': { 'zh-CN': '检测物体', en: 'Detected objects', ja: '検出物体', ko: '검출 객체' },
    '未上傳圖片': { 'zh-CN': '未上传图片', en: 'No image provided', ja: '画像なし', ko: '이미지 없음' },
    'YOLO 模型未就緒': { 'zh-CN': 'YOLO 模型未就绪', en: 'YOLO model not ready', ja: 'YOLO モデル未準備', ko: 'YOLO 모델 미준비' },

    // text signals
    '文字訊號': { 'zh-CN': '文字信号', en: 'Text Signals', ja: 'テキスト信号', ko: '텍스트 신호' },
    '誘餌標題詞': { 'zh-CN': '诱饵标题词', en: 'Clickbait terms', ja: 'クリックベイト語', ko: '낚시성 단어' },
    '聳動情緒詞': { 'zh-CN': '耸动情绪词', en: 'Sensational words', ja: '扇情的な語', ko: '선정적 단어' },
    '絕對化用語': { 'zh-CN': '绝对化用语', en: 'Absolute claims', ja: '断定表現', ko: '단정 표현' },
    '模糊推測詞': { 'zh-CN': '模糊推测词', en: 'Hedging words', ja: 'ぼかし表現', ko: '완곡 표현' },
    '來源引用': { 'zh-CN': '来源引用', en: 'Source citations', ja: '出典引用', ko: '출처 인용' },
    '驚嘆/問號': { 'zh-CN': '惊叹/问号', en: 'Exclaim/question', ja: '感嘆/疑問符', ko: '느낌/물음표' },
    '全大寫詞': { 'zh-CN': '全大写词', en: 'ALL-CAPS words', ja: '全大文字語', ko: '대문자 단어' },
    '數字主張': { 'zh-CN': '数字主张', en: 'Numeric claims', ja: '数値主張', ko: '수치 주장' },
    '句數': { 'zh-CN': '句数', en: 'Sentences', ja: '文数', ko: '문장 수' },
    '語言風險指數': { 'zh-CN': '语言风险指数', en: 'Linguistic risk', ja: '言語リスク', ko: '언어 위험도' },

    // case db
    '案件庫': { 'zh-CN': '案件库', en: 'Case Database', ja: '案件データベース', ko: '사례 DB' },
    '總分析數': { 'zh-CN': '总分析数', en: 'Total cases', ja: '総件数', ko: '총 건수' },
    '平均可信度': { 'zh-CN': '平均可信度', en: 'Avg credibility', ja: '平均信頼度', ko: '평균 신뢰도' },
    '含圖片': { 'zh-CN': '含图片', en: 'With image', ja: '画像あり', ko: '이미지 포함' },
    '最近案件': { 'zh-CN': '最近案件', en: 'Recent cases', ja: '最近の案件', ko: '최근 사례' },
    '時間': { 'zh-CN': '时间', en: 'Time', ja: '時刻', ko: '시간' },
    '標題': { 'zh-CN': '标题', en: 'Headline', ja: '見出し', ko: '제목' },
    '判定': { 'zh-CN': '判定', en: 'Verdict', ja: '判定', ko: '판정' },
    '尚無案件': { 'zh-CN': '暂无案件', en: 'No cases yet', ja: '案件なし', ko: '사례 없음' },

    // methodology
    '方法論': { 'zh-CN': '方法论', en: 'Methodology', ja: '方法論', ko: '방법론' },
    '本系統如何運作': { 'zh-CN': '本系统如何运作', en: 'How this works', ja: '仕組み', ko: '작동 원리' },
    '影像軌道（電腦視覺）': { 'zh-CN': '影像轨道（计算机视觉）', en: 'Image track (computer vision)', ja: '画像トラック（CV）', ko: '이미지 트랙 (CV)' },
    '以 YOLOv8 進行物件偵測（ONNX Runtime 推論 + 自寫 NMS），並以 ELA 誤差層級分析、雜訊不一致與 ORB 複製貼上偵測找出影像竄改痕跡。': {
      'zh-CN': '以 YOLOv8 进行物体检测（ONNX Runtime 推理 + 自写 NMS），并以 ELA 误差层级分析、噪声不一致与 ORB 复制粘贴检测找出影像篡改痕迹。',
      en: 'YOLOv8 object detection (ONNX Runtime inference + custom NMS), plus Error-Level Analysis, noise-inconsistency and ORB copy-move detection to surface image manipulation.',
      ja: 'YOLOv8 物体検出（ONNX Runtime 推論 + 自作 NMS）に加え、ELA・ノイズ不一致・ORB コピームーブ検出で画像改ざんを検出。',
      ko: 'YOLOv8 객체 검출(ONNX Runtime + 자체 NMS)과 ELA·노이즈 불일치·ORB 복제이동 검출로 이미지 조작을 탐지.' },
    '文字軌道（自然語言處理）': { 'zh-CN': '文字轨道（自然语言处理）', en: 'Text track (NLP)', ja: 'テキストトラック（NLP）', ko: '텍스트 트랙 (NLP)' },
    '結合 scikit-learn 字元 n-gram TF-IDF 分類器與 C++ 語言學特徵（誘餌、聳動、絕對化、來源引用、可讀性）。': {
      'zh-CN': '结合 scikit-learn 字符 n-gram TF-IDF 分类器与 C++ 语言学特征（诱饵、耸动、绝对化、来源引用、可读性）。',
      en: 'A scikit-learn char n-gram TF-IDF classifier combined with C++ linguistic features (clickbait, sensationalism, absolutes, sourcing, readability).',
      ja: 'scikit-learn の文字 n-gram TF-IDF 分類器と C++ 言語特徴（クリックベイト等）を組み合わせ。',
      ko: 'scikit-learn 문자 n-gram TF-IDF 분류기와 C++ 언어 특징을 결합.' },
    '多模態融合': { 'zh-CN': '多模态融合', en: 'Multimodal fusion', ja: 'マルチモーダル融合', ko: '멀티모달 융합' },
    'C++ 核心以單純貝氏對數機率將各模態信號融合為單一可信度，並輸出可解釋的因子貢獻。每次分析皆存入 SQLite 案件庫。': {
      'zh-CN': 'C++ 核心以朴素贝叶斯对数概率将各模态信号融合为单一可信度，并输出可解释的因子贡献。每次分析皆存入 SQLite 案件库。',
      en: 'A C++ core fuses every modality with naive-Bayes log-odds into one credibility score with explainable factor contributions; each analysis is stored in a SQLite case database.',
      ja: 'C++ コアが各モダリティをナイーブベイズの対数オッズで融合し、説明可能な要因とともに信頼度を算出。各分析は SQLite に保存。',
      ko: 'C++ 코어가 나이브베이즈 로그오즈로 모달리티를 융합해 설명 가능한 신뢰도를 산출하고 SQLite에 저장.' },
    '注意：本工具提供風險訊號輔助判讀，非絕對真假認定，請搭配查證。': {
      'zh-CN': '注意：本工具提供风险信号辅助判读，非绝对真假认定，请搭配查证。',
      en: 'Note: this tool surfaces risk signals to assist judgment — not an absolute truth verdict. Always cross-check.',
      ja: '注意：本ツールはリスク信号を提示する補助であり、絶対的な真偽判定ではありません。',
      ko: '참고: 본 도구는 판단을 돕는 위험 신호를 제공할 뿐 절대적 진위 판정이 아닙니다.' },

    '個': { 'zh-CN': '个', en: '', ja: '個', ko: '개' },
    '人': { 'zh-CN': '人', en: 'people', ja: '人', ko: '명' },
  };

  const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'];
  let current = 'zh-TW';
  function setLang(l) { if (LANGS.indexOf(l) >= 0) current = l; }
  function getLang() { return current; }
  function t(zh) { if (current === 'zh-TW') return zh; const e = DICT[zh]; return (e && e[current]) || zh; }
  function tf(zh) { const a = [].slice.call(arguments, 1); return t(zh).replace(/\{(\d+)\}/g, (m, i) => a[i] !== undefined ? a[i] : m); }
  global.I18N = { t, tf, setLang, getLang, LANGS, DICT };
})(window);
