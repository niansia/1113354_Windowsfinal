"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGAL_DOMAIN_LABELS = exports.LEGAL_PROVISIONS = exports.LEGAL_SOURCES = exports.LEGAL_VERIFIED_AT = void 0;
const lawUrl = (pcode) => `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${pcode}`;
exports.LEGAL_VERIFIED_AT = '2026-06-19T00:00:00+08:00';
exports.LEGAL_SOURCES = [
    { id: 'civil', name: '民法', authority: '法務部全國法規資料庫', url: lawUrl('B0000001') },
    { id: 'criminal', name: '中華民國刑法', authority: '法務部全國法規資料庫', url: lawUrl('C0000001') },
    { id: 'labor', name: '勞動基準法', authority: '法務部全國法規資料庫', url: lawUrl('N0030001') },
    { id: 'consumer', name: '消費者保護法', authority: '法務部全國法規資料庫', url: lawUrl('J0170001') },
    { id: 'privacy', name: '個人資料保護法', authority: '法務部全國法規資料庫', url: lawUrl('I0050021') },
    { id: 'gender', name: '性別平等工作法', authority: '法務部全國法規資料庫', url: lawUrl('N0030014') },
    { id: 'domestic', name: '家庭暴力防治法', authority: '法務部全國法規資料庫', url: lawUrl('D0050071') },
    { id: 'civil-procedure', name: '民事訴訟法', authority: '法務部全國法規資料庫', url: lawUrl('B0010001') },
    { id: 'traffic', name: '道路交通管理處罰條例', authority: '法務部全國法規資料庫', url: lawUrl('K0040012') },
    { id: 'legal-aid', name: '法律扶助基金會', authority: '財團法人法律扶助基金會', url: 'https://www.laf.org.tw/' }
];
exports.LEGAL_PROVISIONS = [
    {
        id: 'labor-24', domain: 'employment', lawName: '勞動基準法', article: '第 24 條', title: '延長工時工資',
        summary: '雇主延長勞工工作時間時，應依法律規定加給延長工時工資。',
        keywords: ['加班', '加班費', '超時工作', '延長工時', '沒有加班費', '責任制'],
        evidence: ['薪資單與匯款紀錄', '加班申請、訊息與電子郵件', '出勤與門禁紀錄'],
        actions: ['整理每日實際工作時間', '以書面向雇主確認工時與工資', '必要時向地方勞工主管機關申訴'], sourceUrl: lawUrl('N0030001')
    },
    {
        id: 'labor-30', domain: 'employment', lawName: '勞動基準法', article: '第 30 條', title: '正常工時與出勤紀錄',
        summary: '法律規範正常工作時間，並要求雇主保存勞工出勤紀錄。',
        keywords: ['打卡', '出勤', '工時', '上下班', '排班', '超過八小時'],
        evidence: ['打卡、門禁或定位紀錄', '班表與工作群組訊息', '同事可證明的實際工作情形'],
        actions: ['自行備份工時紀錄', '比對班表與薪資明細', '避免只依賴公司單一系統'], sourceUrl: lawUrl('N0030001')
    },
    {
        id: 'labor-16', domain: 'employment', lawName: '勞動基準法', article: '第 16 條', title: '終止契約預告',
        summary: '雇主依特定法定事由終止勞動契約時，預告期間會依年資而異。',
        keywords: ['資遣', '突然解雇', '預告', '遣散', '被開除', '非自願離職'],
        evidence: ['勞動契約與員工規章', '資遣通知與離職證明', '薪資及年資資料'],
        actions: ['要求書面說明終止事由', '確認預告工資與資遣費', '保留非自願離職證明'], sourceUrl: lawUrl('N0030001')
    },
    {
        id: 'gender-11', domain: 'employment', lawName: '性別平等工作法', article: '第 11 條', title: '性別與家庭責任歧視禁止',
        summary: '雇主不得因性別、性傾向、婚姻、懷孕或育兒等因素為差別待遇。',
        keywords: ['懷孕被解雇', '育嬰', '性別歧視', '結婚離職', '性傾向', '產假'],
        evidence: ['差別待遇的公告或訊息', '考績、調職與解雇紀錄', '可比較的同職務人員資料'],
        actions: ['保存具體言詞與決定紀錄', '向公司申訴窗口提出書面申訴', '洽詢地方勞工主管機關'], sourceUrl: lawUrl('N0030014')
    },
    {
        id: 'consumer-19', domain: 'consumer', lawName: '消費者保護法', article: '第 19 條', title: '通訊交易解除權',
        summary: '通訊或訪問交易原則上有收受商品或接受服務後七日內解除契約的制度，但法律另有合理例外。',
        keywords: ['網路購物', '網購', '退貨', '七天', '七日', '拆箱', '到貨', '直播購物'],
        evidence: ['訂單、商品頁與退貨政策截圖', '到貨日期與物流紀錄', '與賣家的完整對話'],
        actions: ['確認是否屬法定例外商品或服務', '在期間內以可保存方式通知解除', '保留寄回與退款紀錄'], sourceUrl: lawUrl('J0170001')
    },
    {
        id: 'consumer-7', domain: 'consumer', lawName: '消費者保護法', article: '第 7 條', title: '商品與服務安全',
        summary: '企業經營者提供商品或服務時，應確保符合當時科技或專業水準可合理期待的安全性。',
        keywords: ['瑕疵商品', '商品受傷', '產品爆炸', '服務受傷', '安全問題', '缺陷'],
        evidence: ['商品、包裝與序號照片', '購買證明與醫療單據', '事故現場與損害紀錄'],
        actions: ['停止使用並保存原物', '通知業者並要求書面回覆', '重大傷害先就醫並保存單據'], sourceUrl: lawUrl('J0170001')
    },
    {
        id: 'civil-179', domain: 'housing', lawName: '民法', article: '第 179 條', title: '無法律上原因受利益',
        summary: '無法律上原因受利益而使他人受損害者，可能負返還利益的義務。',
        keywords: ['押金不退', '保證金不退', '房東扣押金', '多收租金', '重複付款'],
        evidence: ['租約、押金收據與匯款紀錄', '退租點交照片或影片', '房東主張扣款的明細'],
        actions: ['要求房東列出扣款依據', '以書面定期催告返還', '評估調解或小額訴訟'], sourceUrl: lawUrl('B0000001')
    },
    {
        id: 'civil-425', domain: 'housing', lawName: '民法', article: '第 425 條', title: '租賃物所有權移轉',
        summary: '租賃物交付且承租人占有中，所有權移轉後租約在法定條件下可能仍對受讓人存在。',
        keywords: ['房東賣房', '新屋主趕人', '租約還沒到', '換房東', '帶租約買賣'],
        evidence: ['租賃契約與付款紀錄', '實際入住及交付證明', '房屋移轉與新屋主通知'],
        actions: ['確認租約期限與形式', '向新屋主提供租約影本', '不要在未釐清前自行放棄占有'], sourceUrl: lawUrl('B0000001')
    },
    {
        id: 'civil-184', domain: 'contracts', lawName: '民法', article: '第 184 條', title: '侵權行為損害賠償',
        summary: '因故意或過失不法侵害他人權利者，可能負損害賠償責任。',
        keywords: ['侵權', '受傷求償', '財物損壞', '撞傷', '過失', '損害賠償'],
        evidence: ['事故現場照片與影像', '醫療、修繕與收入損失單據', '證人及雙方聯絡紀錄'],
        actions: ['先保全事故證據', '逐項整理損害金額', '留意請求權時效並儘早諮詢'], sourceUrl: lawUrl('B0000001')
    },
    {
        id: 'civil-227', domain: 'contracts', lawName: '民法', article: '第 227 條', title: '不完全給付',
        summary: '債務人未依債務本旨提出給付時，債權人可能依規定請求補正或損害賠償。',
        keywords: ['合約沒做好', '施工瑕疵', '交付不完整', '服務不符', '履約瑕疵'],
        evidence: ['契約、報價單與規格', '驗收、瑕疵照片與修補紀錄', '要求改善的往來訊息'],
        actions: ['列出與契約不符之處', '以書面給予合理補正期限', '保存另行修繕或替代履行費用'], sourceUrl: lawUrl('B0000001')
    },
    {
        id: 'civil-767', domain: 'housing', lawName: '民法', article: '第 767 條', title: '所有物返還與妨害排除',
        summary: '所有人對無權占有或妨害其所有權者，可能請求返還、除去或防止妨害。',
        keywords: ['占用土地', '不還東西', '越界', '侵占房屋', '妨害所有權'],
        evidence: ['所有權證明與地籍資料', '占用範圍照片及測量資料', '催告返還或排除妨害紀錄'],
        actions: ['確認權利範圍與占有事實', '先以書面通知對方', '土地界址爭議可先尋求測量或調解'], sourceUrl: lawUrl('B0000001')
    },
    {
        id: 'privacy-19', domain: 'privacy', lawName: '個人資料保護法', article: '第 19 條', title: '非公務機關蒐集個資',
        summary: '非公務機關蒐集個人資料，應有特定目的並符合至少一項法定基礎。',
        keywords: ['亂收個資', '要求身分證', '蒐集個資', '未經同意', '會員資料'],
        evidence: ['蒐集頁面與告知內容截圖', '同意紀錄或契約', '業者說明蒐集目的的文件'],
        actions: ['確認蒐集目的與必要性', '要求說明法定依據', '保存提出查詢或刪除要求的紀錄'], sourceUrl: lawUrl('I0050021')
    },
    {
        id: 'privacy-20', domain: 'privacy', lawName: '個人資料保護法', article: '第 20 條', title: '個資利用範圍',
        summary: '非公務機關利用個人資料原則上應在蒐集的特定目的必要範圍內。',
        keywords: ['個資被拿去廣告', '目的外利用', '資料轉賣', '陌生行銷', '電話騷擾'],
        evidence: ['原始蒐集目的與隱私政策', '收到行銷的時間、號碼與內容', '拒絕行銷或撤回同意紀錄'],
        actions: ['要求停止特定目的外利用', '保存業者回覆與後續行銷紀錄', '必要時向主管機關申訴'], sourceUrl: lawUrl('I0050021')
    },
    {
        id: 'privacy-27', domain: 'privacy', lawName: '個人資料保護法', article: '第 27 條', title: '個資安全維護',
        summary: '保有個人資料檔案的非公務機關，應採行適當安全措施防止資料被竊取、竄改或洩漏。',
        keywords: ['個資外洩', '資料庫被駭', '帳號外洩', '身分證外流', '資安事件'],
        evidence: ['外洩通知與業者公告', '異常登入或詐騙訊息', '受影響資料種類與時間'],
        actions: ['立即變更相關密碼並開啟多因素驗證', '向業者確認影響範圍與補救', '留意冒名申辦及金融異常'], sourceUrl: lawUrl('I0050021')
    },
    {
        id: 'privacy-29', domain: 'privacy', lawName: '個人資料保護法', article: '第 29 條', title: '違法個資處理的損害賠償',
        summary: '非公務機關違反個資法致當事人受損害時，可能負損害賠償責任。',
        keywords: ['個資求償', '外洩損失', '冒名申辦', '個資被盜用'],
        evidence: ['實際金錢損失與處理費用', '個資外洩與損害間的時間關聯', '報案、聯徵或金融機構紀錄'],
        actions: ['建立事件時間線', '保留損害與處理成本證明', '評估向業者或專業人士提出請求'], sourceUrl: lawUrl('I0050021')
    },
    {
        id: 'domestic-10', domain: 'family', lawName: '家庭暴力防治法', article: '第 10 條', title: '保護令聲請',
        summary: '被害人得依法律規定向法院聲請通常保護令；有急迫危險時另有緊急保護機制。',
        keywords: ['家暴', '伴侶威脅', '堵門', '不讓離開', '跟蹤騷擾', '保護令', '打我'],
        evidence: ['傷勢、現場與毀損照片', '威脅訊息、錄音與通聯紀錄', '就醫、報案或社工紀錄'],
        actions: ['先移動到安全且可求助的位置', '與可信任的人建立安全聯絡方式', '保留威脅與受傷證據'], sourceUrl: lawUrl('D0050071')
    },
    {
        id: 'criminal-305', domain: 'criminal', lawName: '中華民國刑法', article: '第 305 條', title: '恐嚇危害安全',
        summary: '以加害生命、身體、自由、名譽或財產之事恐嚇他人，致生危害於安全者，可能涉及刑事責任。',
        keywords: ['恐嚇', '威脅殺人', '威脅傷害', '威脅公布', '讓我害怕', '堵門'],
        evidence: ['完整訊息、錄音或影片原檔', '帳號、電話與傳送時間', '當時求助及後續行為紀錄'],
        actions: ['不要刪除原始訊息', '保全帳號與時間資訊', '有立即危險先撥 110'], sourceUrl: lawUrl('C0000001')
    },
    {
        id: 'criminal-310', domain: 'criminal', lawName: '中華民國刑法', article: '第 310 條', title: '誹謗',
        summary: '意圖散布於眾而指摘或傳述足以毀損他人名譽之事，可能涉及誹謗；仍應一併檢視真實性與公共利益等規定。',
        keywords: ['網路造謠', '誹謗', '散布不實', '公開抹黑', '社群貼文'],
        evidence: ['貼文、網址與完整頁面截圖', '發布帳號及分享範圍', '內容真偽與造成影響的資料'],
        actions: ['先保存完整網頁證據', '避免以相同內容互相攻擊', '評估平台申訴、澄清與法律途徑'], sourceUrl: lawUrl('C0000001')
    },
    {
        id: 'criminal-339', domain: 'criminal', lawName: '中華民國刑法', article: '第 339 條', title: '詐欺取財',
        summary: '以詐術使人交付本人或第三人之物者，可能涉及詐欺取財。',
        keywords: ['被詐騙', '假投資', '匯款後失聯', '假客服', '騙錢', '詐欺'],
        evidence: ['對話、廣告與網站畫面', '匯款、虛擬資產與交易紀錄', '收款帳戶、電話與平台帳號'],
        actions: ['立即聯絡金融機構', '撥打 165 反詐騙諮詢', '攜帶完整資料報案'], sourceUrl: lawUrl('C0000001')
    },
    {
        id: 'procedure-277', domain: 'procedure', lawName: '民事訴訟法', article: '第 277 條', title: '舉證責任',
        summary: '當事人主張有利於己的事實，原則上負舉證責任，但法律另有規定或顯失公平時可能例外。',
        keywords: ['怎麼舉證', '沒有證據', '民事訴訟', '誰要證明', '對方不承認'],
        evidence: ['依時間排序的原始文件', '可識別來源的電子資料', '證人姓名與可證明事項'],
        actions: ['先列出每項主張需要證明的事實', '保留原檔而非只留裁切截圖', '評估是否需要聲請調查證據'], sourceUrl: lawUrl('B0010001')
    },
    {
        id: 'traffic-62', domain: 'traffic', lawName: '道路交通管理處罰條例', article: '第 62 條', title: '交通事故處置義務',
        summary: '汽車駕駛人肇事後未依規定處置或逃逸，可能受行政處罰；如有人傷亡還可能涉及其他法律。',
        keywords: ['車禍', '肇事逃逸', '擦撞離開', '交通事故', '撞車沒報警'],
        evidence: ['行車記錄器與現場照片', '警方事故資料與當事人聯絡資料', '醫療及車損單據'],
        actions: ['有人受傷先救護並報警', '交換資料並保全現場證據', '不要自行刪改行車記錄'], sourceUrl: lawUrl('K0040012')
    }
];
exports.LEGAL_DOMAIN_LABELS = {
    employment: '勞動職場', consumer: '消費交易', housing: '租屋與財產', contracts: '契約與損害',
    privacy: '個資與數位', family: '家庭安全', criminal: '刑事風險', procedure: '訴訟與舉證', traffic: '交通事故'
};
