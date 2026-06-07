// ============================================================================
//  VeriLens -- Misinformation Forensics Core (native C++ analysis + fusion)
// ----------------------------------------------------------------------------
//  The "brain" of the fake-news detector. The Python server (server.py) runs the
//  heavy AI/CV (real YOLO via ONNX, OpenCV image forensics, an sklearn text
//  classifier) and feeds the resulting numeric signals + the raw article text to
//  this engine on stdin. The engine then:
//
//    * extracts language-level forensic features from the headline + body
//      (clickbait / sensational / emotional lexicons, ALL-CAPS & punctuation
//      excess, hedging vs. absolute-certainty markers, numeric-claim density,
//      source-attribution density, readability),
//    * extracts the most check-worthy factual claims,
//    * fuses every modality (text classifier, writing style, image tampering,
//      YOLO image content, source credibility) with a naive-Bayes-style
//      log-odds combiner into one credibility score + an explainable,
//      per-factor breakdown.
//
//  Output is a single JSON document on stdout. Verdict / factor names are stable
//  KEYS (not prose) so the web UI owns all i18n.
//
//  stdin format:
//    S <key> <value>          # numeric signals from the Python AI layer
//    ...
//    ---HEADLINE---
//    <headline text ...>
//    ---BODY---
//    <body text ...>
//
//  Build:  g++ -std=c++17 -O2 forensics_core.cpp -o build/ForensicsCore.exe
// ============================================================================
#include <algorithm>
#include <cctype>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

// ------------------------------------------------------------------ json utils
static std::string jsonEscape(const std::string& s) {
    std::ostringstream o;
    for (char c : s) {
        switch (c) {
            case '\\': o << "\\\\"; break;
            case '"': o << "\\\""; break;
            case '\n': o << "\\n"; break;
            case '\r': o << "\\r"; break;
            case '\t': o << "\\t"; break;
            default:
                if (static_cast<unsigned char>(c) < 0x20)
                    o << "\\u" << std::hex << std::setw(4) << std::setfill('0') << (int)c;
                else o << c;
        }
    }
    return o.str();
}
static std::string q(const std::string& s) { return "\"" + jsonEscape(s) + "\""; }
static std::string num(double v, int d = 3) {
    if (!std::isfinite(v)) v = 0.0;
    std::ostringstream o; o << std::fixed << std::setprecision(d) << v;
    std::string s = o.str();
    if (s.find('.') != std::string::npos) {
        size_t last = s.find_last_not_of('0'); if (s[last] == '.') last--; s.erase(last + 1);
    }
    return s;
}

static std::string toLower(const std::string& s) {
    std::string r = s;
    for (char& c : r) c = (char)std::tolower((unsigned char)c);
    return r;
}
// count non-overlapping occurrences of needle in hay
static int countOcc(const std::string& hay, const std::string& needle) {
    if (needle.empty()) return 0;
    int n = 0; size_t pos = 0;
    while ((pos = hay.find(needle, pos)) != std::string::npos) { n++; pos += needle.size(); }
    return n;
}
static int countAny(const std::string& hay, const std::vector<std::string>& list) {
    int n = 0; for (auto& w : list) n += countOcc(hay, w); return n;
}
static double clampd(double v, double lo, double hi) { return v < lo ? lo : (v > hi ? hi : v); }
static double sigmoid(double x) { return 1.0 / (1.0 + std::exp(-x)); }
static double logit(double p) { p = clampd(p, 1e-4, 1.0 - 1e-4); return std::log(p / (1.0 - p)); }

// ------------------------------------------------------------------ lexicons
// Multilingual (zh + en). Chinese is matched as UTF-8 substrings; English is
// matched against a lower-cased copy of the text.
static const std::vector<std::string> CLICKBAIT = {
    "震驚","驚呆","驚爆","必看","瘋傳","別再","你不知道","太可怕","居然","竟然",
    "史上最","一定要","快轉","刪前快看","真相","內幕","曝光","獨家","緊急","速看",
    "不轉不是","看完淚崩","秒懂","神反轉","嚇傻",
    "shocking","you won't believe","you wont believe","must see","must-see","secret",
    "exposed","breaking","urgent","this is why","doctors hate","gone viral","the truth about",
    "what happened next","mind-blowing","mind blowing","never seen","jaw-dropping","number will shock"
};
static const std::vector<std::string> SENSATIONAL = {
    "可怕","恐怖","憤怒","崩潰","悲劇","災難","瘋狂","震撼","駭人","噁心","醜聞",
    "陰謀","毀滅","血腥","殘忍","痛哭","絕望","恐慌",
    "terrifying","outrageous","disaster","catastrophe","insane","horrific","scandal",
    "conspiracy","slammed","blasted","destroyed","furious","panic","chaos","bloodbath"
};
static const std::vector<std::string> CERTAINTY = {
    "一定","絕對","必然","百分之百","100%","鐵證","確定無疑","毫無疑問","完全","保證","千真萬確",
    "definitely","absolutely","certainly","undeniable","proven","guaranteed","completely",
    "totally","without doubt","100 percent","irrefutable"
};
static const std::vector<std::string> HEDGE = {
    "可能","據稱","據傳","疑似","傳聞","似乎","或許","推測","尚未證實","涉嫌","傳出","恐",
    "may ","might ","possibly","allegedly","reportedly","claimed","rumored","rumoured",
    "seems","appears to","unconfirmed","suspected","could be"
};
static const std::vector<std::string> SOURCE = {
    "根據","表示","指出","研究顯示","報導","引述","證實","官方","數據顯示","受訪","發言人","聲明",
    "according to","said","stated","study","research","report","cited","confirmed","official",
    "data shows","told reporters","spokesperson","press release"
};

// crude UTF-8 codepoint count (for "length" of CJK text)
static int cpLen(const std::string& s) {
    int n = 0;
    for (size_t i = 0; i < s.size();) {
        unsigned char c = s[i];
        i += (c < 0x80) ? 1 : (c < 0xE0) ? 2 : (c < 0xF0) ? 3 : 4;
        n++;
    }
    return n;
}

struct Feat {
    int clickbait = 0, sensational = 0, certainty = 0, hedge = 0, source = 0;
    int exclaim = 0, question = 0, repeatPunct = 0, numeric = 0;
    int capsTokens = 0, alphaTokens = 0;
    double capsRatio = 0, lingRisk = 0;
    int sentences = 0, bodyLen = 0, titleLen = 0;
    double titleRisk = 0;
};

static int countNumeric(const std::string& s) {
    int n = 0; bool in = false;
    for (char c : s) {
        if (std::isdigit((unsigned char)c)) { if (!in) { n++; in = true; } }
        else in = false;
    }
    n += countOcc(s, "%") + countOcc(s, "百分");
    return n;
}
static void countPunct(const std::string& s, Feat& f) {
    f.exclaim = countOcc(s, "!") + countOcc(s, "！");
    f.question = countOcc(s, "?") + countOcc(s, "？");
    f.repeatPunct += countOcc(s, "!!") + countOcc(s, "！！") + countOcc(s, "??") + countOcc(s, "？？");
}
static void countCaps(const std::string& body, Feat& f) {
    std::istringstream is(body); std::string tok;
    while (is >> tok) {
        bool hasAlpha = false; for (char c : tok) if (std::isalpha((unsigned char)c)) hasAlpha = true;
        if (!hasAlpha) continue;
        f.alphaTokens++;
        int up = 0, lo = 0;
        for (char c : tok) { if (std::isupper((unsigned char)c)) up++; else if (std::islower((unsigned char)c)) lo++; }
        if (up >= 3 && lo == 0) f.capsTokens++;
    }
    f.capsRatio = f.alphaTokens ? (double)f.capsTokens / f.alphaTokens : 0.0;
}

// split body into sentences for claim extraction
static std::vector<std::string> splitSentences(const std::string& body) {
    std::vector<std::string> out; std::string cur;
    auto flush = [&]() {
        // trim
        size_t a = cur.find_first_not_of(" \t\r\n");
        size_t b = cur.find_last_not_of(" \t\r\n");
        if (a != std::string::npos) out.push_back(cur.substr(a, b - a + 1));
        cur.clear();
    };
    for (size_t i = 0; i < body.size();) {
        // detect CJK terminators (3-byte UTF-8): 。！？
        if (i + 3 <= body.size()) {
            std::string ch = body.substr(i, 3);
            if (ch == "。" || ch == "！" || ch == "？" || ch == "；") { cur += ch; flush(); i += 3; continue; }
        }
        char c = body[i];
        if (c == '\n') { flush(); i++; continue; }
        cur += c;
        if (c == '.' || c == '!' || c == '?') {
            // ascii terminator followed by space/EOL
            if (i + 1 >= body.size() || body[i + 1] == ' ' || body[i + 1] == '\n') flush();
        }
        i++;
    }
    flush();
    return out;
}

static double claimScore(const std::string& s, const std::string& sLower) {
    double sc = 0.0;
    bool hasDigit = false; for (char c : s) if (std::isdigit((unsigned char)c)) { hasDigit = true; break; }
    if (hasDigit) sc += 0.4;
    if (countOcc(s, "%") || countOcc(s, "百分")) sc += 0.2;
    if (countAny(sLower, SOURCE) > 0) sc += 0.3;
    int len = cpLen(s);
    if (len >= 10 && len <= 160) sc += 0.2;
    if (countOcc(s, "「") || countOcc(s, "\"") || countOcc(s, "”")) sc += 0.15;
    return clampd(sc, 0.0, 1.0);
}

int main() {
    std::ios::sync_with_stdio(false);
    std::map<std::string, double> sig;
    std::map<std::string, std::string> sigStr;
    std::string headline, body;

    std::string line; int mode = 0; // 0 signals, 1 headline, 2 body
    while (std::getline(std::cin, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (line == "---HEADLINE---") { mode = 1; continue; }
        if (line == "---BODY---") { mode = 2; continue; }
        if (mode == 0) {
            if (line.size() > 2 && line[0] == 'S' && line[1] == '\t') {
                std::string rest = line.substr(2);
                size_t tab = rest.find('\t');
                if (tab != std::string::npos) {
                    std::string k = rest.substr(0, tab), v = rest.substr(tab + 1);
                    try { sig[k] = std::stod(v); } catch (...) { sigStr[k] = v; }
                }
            }
        } else if (mode == 1) { headline += (headline.empty() ? "" : "\n") + line; }
        else { body += (body.empty() ? "" : "\n") + line; }
    }

    std::string full = headline + "\n" + body;
    std::string fullLower = toLower(full);
    std::string headLower = toLower(headline);

    Feat f;
    // Match against the lower-cased text only: tolower leaves CJK bytes untouched
    // (so Chinese lexicon entries still match) while English entries (stored
    // lower-case) match too -- no double counting.
    f.clickbait = countAny(fullLower, CLICKBAIT);
    f.sensational = countAny(fullLower, SENSATIONAL);
    f.certainty = countAny(fullLower, CERTAINTY);
    f.hedge = countAny(fullLower, HEDGE);
    f.source = countAny(fullLower, SOURCE);
    countPunct(full, f);
    countCaps(body, f);
    f.numeric = countNumeric(full);
    f.bodyLen = cpLen(body);
    f.titleLen = cpLen(headline);

    auto sentences = splitSentences(body);
    f.sentences = (int)sentences.size();

    // headline-specific sensational pressure (titles carry most clickbait)
    int titleClick = countAny(headLower, CLICKBAIT);
    int titleSens = countAny(headLower, SENSATIONAL);
    int titleExcl = countOcc(headline, "!") + countOcc(headline, "！") +
                    countOcc(headline, "?") + countOcc(headline, "？");
    f.titleRisk = clampd(titleClick * 0.25 + titleSens * 0.18 + titleExcl * 0.12, 0.0, 1.0);

    // ---- linguistic risk (0..1) ----
    double exclDensity = f.sentences ? (double)(f.exclaim + f.repeatPunct * 2) / std::max(1, f.sentences) : 0;
    double risk = 0.0;
    risk += clampd(f.clickbait * 0.11, 0.0, 0.40);
    risk += clampd(f.sensational * 0.07, 0.0, 0.28);
    risk += clampd(f.capsRatio * 0.6, 0.0, 0.20);
    risk += clampd(exclDensity * 0.5, 0.0, 0.20);
    risk += clampd(f.certainty * 0.06, 0.0, 0.18);
    risk += 0.35 * f.titleRisk;
    risk -= clampd(f.source * 0.05, 0.0, 0.28);   // credible sourcing lowers risk
    risk -= clampd(f.hedge * 0.015, 0.0, 0.08);
    f.lingRisk = clampd(risk + 0.12, 0.0, 1.0);    // small base offset

    // ---- claim extraction ----
    struct Claim { std::string text; double score; };
    std::vector<Claim> claims;
    for (auto& s : sentences) {
        double sc = claimScore(s, toLower(s));
        if (sc >= 0.3) claims.push_back({s, sc});
    }
    std::sort(claims.begin(), claims.end(), [](const Claim& a, const Claim& b) { return a.score > b.score; });
    if (claims.size() > 6) claims.resize(6);

    // ---- incoming AI signals ----
    bool hasImage = sig.count("hasImage") && sig["hasImage"] > 0.5;
    bool hasML    = sig.count("mlFake");
    double mlFake = hasML ? clampd(sig["mlFake"], 0.0, 1.0) : 0.5;
    double imgTamper = sig.count("imgTamper") ? clampd(sig["imgTamper"], 0.0, 1.0) : 0.0;
    double srcCred = sig.count("srcCred") ? clampd(sig["srcCred"], 0.0, 1.0) : 0.5;
    int yoloPersons = sig.count("yoloPersons") ? (int)sig["yoloPersons"] : 0;
    int yoloObjects = sig.count("yoloObjects") ? (int)sig["yoloObjects"] : 0;

    // ---- multimodal log-odds fusion (toward "fake") ----
    struct Factor { std::string key; double contrib; double value; };
    std::vector<Factor> factors;
    double L = 0.0;

    if (hasML) {
        double c = 1.0 * logit(mlFake);
        L += c; factors.push_back({"text_model", c, mlFake});
    }
    {
        double c = 2.2 * (f.lingRisk - 0.45);
        L += c; factors.push_back({"writing_style", c, f.lingRisk});
    }
    {
        double c = 1.6 * (0.5 - srcCred);
        L += c; factors.push_back({"source_credibility", c, srcCred});
    }
    if (sig.count("webFake")) {
        // evidence from fact-check databases / the web (Cofacts etc.) -- high quality
        double wf = clampd(sig["webFake"], 0.02, 0.98);
        double c = 1.8 * logit(wf);
        L += c; factors.push_back({"web_crossref", c, wf});
    }
    if (hasImage) {
        double c = 2.0 * (imgTamper - 0.35);
        L += c; factors.push_back({"image_tampering", c, imgTamper});
        if (yoloPersons > 0 && imgTamper > 0.5) {
            double c2 = 0.45; L += c2;
            factors.push_back({"image_content", c2, (double)yoloPersons});
        }
    }

    double pFake = sigmoid(L);
    double credibility = (1.0 - pFake) * 100.0;
    std::string verdict = credibility >= 66 ? "credible"
                        : credibility >= 40 ? "questionable" : "likely_false";

    int signalsUsed = 1 + (hasML ? 1 : 0) + 1 + (hasImage ? 1 : 0);
    double confidence = clampd(std::fabs(pFake - 0.5) * 2.0 * 100.0 * (0.6 + 0.1 * signalsUsed), 0.0, 99.0);

    std::sort(factors.begin(), factors.end(),
              [](const Factor& a, const Factor& b) { return std::fabs(a.contrib) > std::fabs(b.contrib); });

    // ============================= emit JSON =================================
    std::ostringstream o;
    o << "{";
    o << "\"engine\":\"native\",";
    o << "\"verdict\":" << q(verdict) << ",";
    o << "\"credibility\":" << num(credibility, 1) << ",";
    o << "\"pFake\":" << num(pFake, 4) << ",";
    o << "\"confidence\":" << num(confidence, 1) << ",";

    o << "\"factors\":[";
    for (size_t i = 0; i < factors.size(); ++i) {
        auto& fa = factors[i]; if (i) o << ",";
        o << "{\"key\":" << q(fa.key) << ",\"contribution\":" << num(fa.contrib, 3)
          << ",\"value\":" << num(fa.value, 3)
          << ",\"direction\":" << q(fa.contrib > 0 ? "fake" : "credible") << "}";
    }
    o << "],";

    o << "\"claims\":[";
    for (size_t i = 0; i < claims.size(); ++i) {
        if (i) o << ","; o << "{\"text\":" << q(claims[i].text) << ",\"score\":" << num(claims[i].score, 2) << "}";
    }
    o << "],";

    o << "\"features\":{"
      << "\"clickbait\":" << f.clickbait << ",\"sensational\":" << f.sensational
      << ",\"certainty\":" << f.certainty << ",\"hedge\":" << f.hedge
      << ",\"source\":" << f.source << ",\"exclaim\":" << f.exclaim
      << ",\"question\":" << f.question << ",\"repeatPunct\":" << f.repeatPunct
      << ",\"numeric\":" << f.numeric << ",\"capsRatio\":" << num(f.capsRatio, 3)
      << ",\"capsTokens\":" << f.capsTokens << ",\"sentences\":" << f.sentences
      << ",\"bodyLen\":" << f.bodyLen << ",\"titleLen\":" << f.titleLen
      << ",\"titleRisk\":" << num(f.titleRisk, 3) << ",\"lingRisk\":" << num(f.lingRisk, 3)
      << "},";

    o << "\"signals\":{"
      << "\"hasImage\":" << (hasImage ? 1 : 0) << ",\"mlFake\":" << num(mlFake, 3)
      << ",\"imgTamper\":" << num(imgTamper, 3) << ",\"srcCred\":" << num(srcCred, 3)
      << ",\"yoloPersons\":" << yoloPersons << ",\"yoloObjects\":" << yoloObjects << "}";

    o << "}";
    std::cout << o.str() << "\n";
    return 0;
}
