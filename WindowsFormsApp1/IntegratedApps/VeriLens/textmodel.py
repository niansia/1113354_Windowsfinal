"""VeriLens text track -- a real (small) supervised text classifier.

A character n-gram TF-IDF + logistic-regression model (scikit-learn) trained on a
compact bundled bilingual corpus of fake/sensational vs. credible/sourced writing.
Character n-grams (analyzer='char_wb') work for both Chinese (no segmentation
needed) and English. The trained model is pickled to models/textmodel.pkl and
reused on subsequent starts. P(fake) is fed to the C++ fusion engine as one of the
modalities -- independent of the engine's own rule-based linguistic features.
"""
from __future__ import annotations

import pickle
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent / "models"
CACHE = MODEL_DIR / "textmodel.pkl"

# (text, label)  label 1 = fake/misinformation style, 0 = credible/sourced style
CORPUS = [
    # ---- fake / sensational (zh) ----
    ("震驚！醫生不敢告訴你的驚人真相，這個方法100%治癒所有疾病", 1),
    ("瘋傳！吃這個竟然能一週瘦十公斤，不轉不是中國人", 1),
    ("獨家內幕曝光！政府隱瞞多年的秘密終於被揭穿", 1),
    ("太可怕了！這種食物千萬別再吃，會致癌！！！", 1),
    ("緊急擴散！喝這個絕對能防止所有病毒入侵", 1),
    ("史上最強偏方，醫院都在用卻不敢公開", 1),
    ("驚爆！名人私下的醜聞畫面流出，看完淚崩", 1),
    ("快看！刪前秒存，這個天大的秘密只有1%的人知道", 1),
    ("專家證實是假的！其實真相是這個，你一定要知道", 1),
    ("不看後悔一輩子！這個方法讓你瞬間致富", 1),
    ("恐怖！全台都在瘋傳的可怕真相終於曝光", 1),
    ("神奇配方無副作用，保證一吃見效根治百病", 1),
    ("驚！這個習慣讓你折壽十年，九成的人都中招", 1),
    ("內幕大公開，他們絕對不想讓你看到這篇", 1),
    ("瘋狂轉發中！這張照片證明了驚人的陰謀", 1),
    ("醫界震撼！這款神藥一夜爆紅，效果好到嚇人", 1),
    ("100%有效！古老秘方讓白髮三天變黑", 1),
    ("快分享給家人！這個東西有毒大家都不知道", 1),
    ("獨家踢爆！某大廠產品驚人黑幕全都是真的", 1),
    ("看到第三點我哭了，這才是世界最殘酷的真相", 1),
    # ---- fake / sensational (en) ----
    ("SHOCKING: Doctors HATE this one weird trick that cures everything instantly", 1),
    ("You won't believe what happened next, this secret will change your life forever", 1),
    ("BREAKING: The government has been hiding this terrifying truth from you", 1),
    ("This miracle food melts fat overnight, scientists are stunned and furious", 1),
    ("Exposed! The shocking conspiracy they don't want you to know about", 1),
    ("Share before it's deleted! This proves the unbelievable cover-up", 1),
    ("Mind-blowing discovery guarantees you will get rich in just one week", 1),
    ("URGENT: Drink this and you will absolutely never get sick again", 1),
    ("The number one secret that 99% of people will never find out", 1),
    ("Insane! This celebrity scandal photo leaked and it's totally real", 1),
    ("Proven 100% effective, this ancient remedy destroys all diseases", 1),
    ("They are lying to you, the real truth is far more horrific than you think", 1),
    ("This common habit is killing you and nobody is talking about it", 1),
    ("Jaw-dropping footage finally reveals the disaster they covered up", 1),
    ("Must see before it vanishes, the truth about vaccines exposed", 1),
    # ---- credible / sourced (zh) ----
    ("根據中央氣象署today發布的資料，週末鋒面將為北部帶來約30毫米降雨", 0),
    ("衛福部表示，最新統計顯示流感疫苗接種率較去年同期上升百分之五", 0),
    ("經濟部今日公布，第二季出口金額較去年成長百分之三點二", 0),
    ("台大研究團隊在期刊發表論文，指出該療法在臨床試驗中具部分療效", 0),
    ("市政府發言人說明，捷運延伸線預計於2027年完工通車", 0),
    ("根據主計總處數據，上月失業率為百分之三點四，較前月持平", 0),
    ("教育部宣布，新學年將調整課綱，相關細節已於官網公告", 0),
    ("中央銀行理事會決議維持利率不變，並表示將持續關注通膨情勢", 0),
    ("環保署指出，今日空氣品質為普通等級，敏感族群宜減少戶外活動", 0),
    ("研究顯示適度運動有助於降低心血管疾病風險，專家建議每週三次", 0),
    ("交通部統計，連假期間國道車流量較平日增加約四成", 0),
    ("醫師指出，民眾如有持續症狀應就醫評估，切勿自行服藥", 0),
    ("根據世界衛生組織報告，全球該疾病通報病例呈現下降趨勢", 0),
    ("地方政府表示，本次補助申請將於下月一日開放，名額有限", 0),
    ("學者分析，近期物價波動主要受國際原物料價格影響", 0),
    # ---- credible / sourced (en) ----
    ("According to the weather agency, a cold front is expected to bring light rain this weekend", 0),
    ("The health ministry reported that vaccination rates rose five percent compared with last year", 0),
    ("Official data showed second-quarter exports grew 3.2 percent year on year", 0),
    ("A study published in the journal found the treatment had partial efficacy in clinical trials", 0),
    ("The city spokesperson said the metro extension is scheduled to open in 2027", 0),
    ("The central bank held interest rates steady and said it would monitor inflation", 0),
    ("Researchers said moderate exercise may reduce cardiovascular risk, recommending three sessions a week", 0),
    ("The transport department reported highway traffic rose about 40 percent during the holiday", 0),
    ("According to the WHO report, globally reported cases showed a declining trend", 0),
    ("Officials stated the subsidy application will open next month with limited quotas", 0),
    ("Analysts said recent price changes were mainly driven by international commodity costs", 0),
    ("The statistics bureau said the unemployment rate was 3.4 percent, unchanged from last month", 0),
    ("Doctors advised people with persistent symptoms to seek medical evaluation", 0),
    ("The education ministry announced curriculum adjustments published on its website", 0),
    ("The environmental agency said air quality was moderate and sensitive groups should limit outdoor activity", 0),
]


class TextModel:
    def __init__(self, log=print):
        self.log = log
        self.vec = None
        self.clf = None
        self._load_or_train()

    def _load_or_train(self):
        if CACHE.exists():
            try:
                self.vec, self.clf = pickle.loads(CACHE.read_bytes())
                self.log("[text] loaded cached classifier")
                return
            except Exception:
                pass
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.linear_model import LogisticRegression
            X = [t for t, _ in CORPUS]
            y = [lab for _, lab in CORPUS]
            self.vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=1)
            Xv = self.vec.fit_transform(X)
            self.clf = LogisticRegression(max_iter=1000, C=4.0)
            self.clf.fit(Xv, y)
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            CACHE.write_bytes(pickle.dumps((self.vec, self.clf)))
            self.log("[text] trained classifier on %d examples (acc=%.2f)" %
                     (len(X), self.clf.score(Xv, y)))
        except Exception as exc:  # noqa: BLE001
            self.log("[text] sklearn unavailable, classifier disabled: %s" % exc)
            self.vec = self.clf = None

    @property
    def ready(self) -> bool:
        return self.clf is not None

    def prob_fake(self, text: str) -> float:
        if not self.ready or not text.strip():
            return None
        try:
            Xv = self.vec.transform([text])
            return float(self.clf.predict_proba(Xv)[0][1])
        except Exception:
            return None


if __name__ == "__main__":
    m = TextModel()
    print("ready:", m.ready)
    for s in ["震驚！這個秘方100%有效，醫生都不敢說，快分享！",
              "根據氣象署資料，週末將有鋒面通過帶來降雨。",
              "SHOCKING secret doctors hate, share before deleted!",
              "The ministry reported exports grew 3 percent this quarter."]:
        print("  %.2f  %s" % (m.prob_fake(s), s[:40]))
