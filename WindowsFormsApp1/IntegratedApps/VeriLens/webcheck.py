"""VeriLens web cross-reference track.

Given the article's headline/text, search the open web (DuckDuckGo HTML endpoint,
no API key) and look for coverage by **fact-checking organisations** and debunk
language. This is what lets VeriLens catch claims that are "all over the internet
as a known hoax" rather than judging the text in isolation.

Returns a web-derived misinformation likelihood + the actual fact-check links it
found, so the verdict is evidence-backed and the user can click through. Best-effort
and fully degradable: any network/parse failure just yields a neutral result.
"""
from __future__ import annotations

import re
import urllib.parse
import urllib.request

_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

# Dedicated fact-check / debunk organisations only (a specific article from one of
# these about a claim is strong evidence the claim is contested). General news
# portals are deliberately excluded so ordinary reporting doesn't false-positive.
FACTCHECK = {
    "tfc-taiwan.org.tw": "台灣事實查核中心", "mygopen.com": "MyGoPen", "cofacts.tw": "Cofacts 真的假的",
    "cofacts.g0v.tw": "Cofacts 真的假的", "rumor.mohw.gov.tw": "衛福部食藥闢謠",
    "factchecklab.org": "Factcheck Lab", "tfc-taiwan": "台灣事實查核中心",
    "snopes.com": "Snopes", "politifact.com": "PolitiFact", "factcheck.org": "FactCheck.org",
    "fullfact.org": "Full Fact", "factcheck.afp.com": "AFP Fact Check", "leadstories.com": "Lead Stories",
}
# debunk / true verdict markers (TW fact-checkers tag titles like 【錯誤】【正確】)
DEBUNK_KW = ["【錯誤】", "【部分錯誤】", "【易生誤解】", "【證據不足】", "【假】", "假新聞", "假訊息", "假消息",
             "謠言", "不實", "闢謠", "錯誤訊息", "誤導", "流言", "謠傳", "純屬虛構", "查無",
             "false", "hoax", "debunk", "misleading", "no evidence", "fake news", "misinformation", "fabricated"]
TRUE_KW = ["【正確】", "【真】", "【事實】", "屬實", "證實為真", "確有此事",
           "rated true", "mostly true", "is true", "accurate", "confirmed true"]


def _strip(s: str) -> str:
    import html as _h
    return _h.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def _resolve(href: str) -> str:
    if href.startswith("//"):
        href = "https:" + href
    if "duckduckgo.com/l/" in href or href.startswith("/l/"):
        try:
            qs = urllib.parse.urlparse(href).query
            uddg = urllib.parse.parse_qs(qs).get("uddg", [""])[0]
            if uddg:
                return urllib.parse.unquote(uddg)
        except Exception:
            pass
    return href


def _http(url, data=None, headers=None, timeout=10):
    h = {"User-Agent": _UA, "Accept-Language": "zh-TW,zh,en;q=0.8"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read(600_000).decode("utf-8", "replace")


def _pack(url, title, snippet):
    dom = urllib.parse.urlparse(url).netloc.lower()
    if dom.startswith("www."):
        dom = dom[4:]
    return {"title": title, "url": url, "snippet": snippet, "domain": dom}


def _ddg(query, n, log):
    html = _http("https://html.duckduckgo.com/html/", data=urllib.parse.urlencode({"q": query}).encode())
    a_iter = list(re.finditer(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', html, re.S))
    snips = re.findall(r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>', html, re.S)
    out = []
    for i, m in enumerate(a_iter[:n]):
        title = _strip(m.group(2))
        if title:
            out.append(_pack(_resolve(m.group(1)), title, _strip(snips[i]) if i < len(snips) else ""))
    return out


def _ddg_lite(query, n, log):
    html = _http("https://lite.duckduckgo.com/lite/", data=urllib.parse.urlencode({"q": query}).encode())
    links = re.findall(r'<a[^>]*class=[\'"]result-link[\'"][^>]*href="([^"]+)"[^>]*>(.*?)</a>', html, re.S)
    snips = re.findall(r'<td[^>]*class=[\'"]result-snippet[\'"][^>]*>(.*?)</td>', html, re.S)
    out = []
    for i, (href, title) in enumerate(links[:n]):
        t = _strip(title)
        if t:
            out.append(_pack(_resolve(href), t, _strip(snips[i]) if i < len(snips) else ""))
    return out


def ddg_search(query: str, n: int = 10, log=print):
    """Resilient web search: try DuckDuckGo HTML then its lite endpoint."""
    for engine in (_ddg, _ddg_lite):
        try:
            res = engine(query, n, log)
            if res:
                return res
        except Exception as exc:  # noqa: BLE001
            log("[web] %s failed: %s" % (engine.__name__, exc))
    return []


def _is_homepage(url: str) -> bool:
    path = urllib.parse.urlparse(url).path.strip("/")
    return len(path) < 3   # site root / section chrome, not a specific article


# --------------------------------------------------------------- Cofacts (台灣)
# Cofacts 真的假的 is a crowdsourced Taiwanese hoax/rumor database with a public
# GraphQL API -- purpose-built to answer "is this message a known rumor?". Far more
# reliable + relevant for Chinese content than scraping a search engine.
_COFACTS_Q = ("query($t:String!){ListArticles(filter:{moreLikeThis:{like:$t,"
              "minimumShouldMatch:\"50%\"}},orderBy:[{_score:DESC}],first:8){edges{node{"
              "id text articleReplies(status:NORMAL){reply{type text}}}}}}")
_REPLY_LABEL = {"RUMOR": "含不實訊息", "NOT_RUMOR": "含正確訊息", "OPINIONATED": "個人意見"}


def cofacts_check(text: str, log=print) -> dict:
    text = (text or "").strip()
    if len(text) < 8:
        return {"rumor": 0, "notrumor": 0, "hits": [], "matches": 0}
    try:
        body = __import__("json").dumps({"query": _COFACTS_Q, "variables": {"t": text[:1500]}}).encode()
        raw = _http("https://api.cofacts.tw/graphql", data=body,
                    headers={"Content-Type": "application/json"})
        data = __import__("json").loads(raw)
        edges = (data.get("data") or {}).get("ListArticles", {}).get("edges", []) or []
    except Exception as exc:  # noqa: BLE001
        log("[web] cofacts failed: %s" % exc)
        return {"rumor": 0, "notrumor": 0, "hits": [], "matches": 0}
    rumor = notrumor = 0
    hits = []
    for e in edges:
        node = e.get("node") or {}
        replies = [(r.get("reply") or {}) for r in (node.get("articleReplies") or [])]
        types = [r.get("type") for r in replies]
        if "RUMOR" in types:
            rumor += 1
            rating = "debunk"
        elif "NOT_RUMOR" in types:
            # NB: NOT_RUMOR means "this *message* is accurate" -- but the message is
            # often a debunk report being forwarded, so it does NOT mean the user's
            # claim is true. Treat it only as "related fact-check coverage".
            notrumor += 1
            rating = "related"
        else:
            continue  # only count articles a human actually fact-checked
        rtext = next((r.get("text", "") for r in replies if r.get("type") in ("RUMOR", "NOT_RUMOR")), "")
        hits.append({"title": (node.get("text") or "")[:140], "url": "https://cofacts.tw/article/" + node.get("id", ""),
                     "source": "Cofacts 真的假的", "factCheck": True, "rating": rating,
                     "reply": rtext[:180]})
    return {"rumor": rumor, "notrumor": notrumor, "hits": hits, "matches": len(edges)}


def web_crossref(query: str, log=print) -> dict:
    query = (query or "").strip()
    if len(query) < 6:
        return {"ran": False, "webFake": None, "hits": [], "total": 0}

    # 1) Cofacts crowdsourced rumor DB (reliable, Taiwan/Chinese-focused)
    cof = cofacts_check(query, log=log)
    hits = list(cof["hits"])
    strong_debunk = cof["rumor"]   # RUMOR matches + dedicated fact-check debunk articles
    related = cof["notrumor"]      # related fact-check coverage (ambiguous direction)

    # 2) best-effort general web fact-check coverage (DuckDuckGo; may be unavailable)
    results = ddg_search(query + " 查核", log=log)
    seen = {h["url"] for h in hits}
    for r in results:
        if _is_homepage(r["url"]) or r["url"] in seen:
            continue  # skip site chrome / homepages -- only real articles are evidence
        lower = (r["title"] + " " + r["snippet"]).lower()
        label = next((lbl for dom, lbl in FACTCHECK.items() if dom in r["domain"]), None)
        has_debunk = any(k.lower() in lower for k in DEBUNK_KW)
        has_true = any(k.lower() in lower for k in TRUE_KW)
        if label and has_debunk and not has_true:
            strong_debunk += 1
            hits.append({"title": r["title"][:160], "url": r["url"], "source": label, "factCheck": True, "rating": "debunk"})
        elif label:
            related += 1
            hits.append({"title": r["title"][:160], "url": r["url"], "source": label, "factCheck": True, "rating": "related"})
        elif has_debunk and not has_true:
            related += 1
            hits.append({"title": r["title"][:160], "url": r["url"], "source": r["domain"], "factCheck": False, "rating": "related"})

    if strong_debunk == 0 and related == 0:
        return {"ran": True, "webFake": None, "hits": [], "total": len(results),
                "factCheckCount": 0, "cofactsMatches": cof["matches"]}
    # The web track only raises the misinformation likelihood (never vouches "true"):
    # a known RUMOR is strong evidence; merely-related fact-check coverage means the
    # claim is at least contested, a mild upward nudge. Floor at neutral (0.5).
    score = 0.5 + 0.16 * min(strong_debunk, 3) + 0.05 * min(related, 3)
    score = max(0.5, min(0.95, score))
    return {"ran": True, "webFake": round(score, 3), "hits": hits[:6], "total": len(results),
            "factCheckCount": strong_debunk, "related": related, "cofactsMatches": cof["matches"]}


if __name__ == "__main__":
    import json
    print(json.dumps(web_crossref("缺蛋 雞蛋 致癌 謠言"), ensure_ascii=False, indent=2))
