"""SportsScout - local market-value proxy for the Fusion Global Sports Center.

This is "Layer 3" of the player-strength stack. ESPN's free feed has no per-player
rating, so this small local service fetches REAL squad market values from Transfermarkt
(the value the user asked for - "球員身價") and serves them to the browser, which cannot
scrape cross-origin itself. The Fusion frontend calls it when available and degrades
gracefully to its built-in star table when it is not.

Notes / etiquette:
  * Standard-library only (no pip install required), like the other Fusion backends.
  * Sends CORS '*' so the WebView2 / dev-server frontend can read it.
  * Caches every squad on disk for 12h - market values move slowly and we do not want to
    hammer the source. A small min-interval throttle spaces out live fetches.
  * Unofficial source; for personal / educational analysis only.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

APP_ROOT = Path(__file__).resolve().parent
CACHE_DIR = APP_ROOT / "cache"
CACHE_TTL = 12 * 60 * 60  # seconds
NEG_CACHE_TTL = 10 * 60  # remember "couldn't get this team" briefly to avoid re-hitting
MIN_FETCH_INTERVAL = 1.0  # seconds between live Transfermarkt requests (politeness)
FETCH_TIMEOUT = 12.0  # bound each scrape so a stalled/rate-limited source fails fast
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# Verified Transfermarkt "verein" ids for national teams (men's). Keyed by ESPN-style
# English name; aliases below fold spelling variants in. Unmapped teams fall back to a
# best-effort search, and failing that the frontend uses its own star table.
NATIONAL_TEAM_IDS: dict[str, int] = {
    "Germany": 3262, "France": 3377, "Spain": 3375, "England": 3299, "Brazil": 3439,
    "Argentina": 3437, "Portugal": 3300, "Netherlands": 3379, "Italy": 3376,
    "Belgium": 3382, "Croatia": 3556, "South Korea": 3589, "USA": 3505, "Mexico": 6303,
    "Sweden": 3557, "Tunisia": 3670, "Australia": 3433, "Senegal": 3499, "Morocco": 3575,
    "Switzerland": 3384, "Colombia": 3816, "Uruguay": 3449, "Scotland": 3380,
    "Nigeria": 3444, "Norway": 3440, "Saudi Arabia": 3807, "Cameroon": 3434,
    "Ivory Coast": 3591, "Poland": 3442, "Algeria": 3614, "Ghana": 3441, "Egypt": 3672,
    "Serbia": 3438, "Denmark": 3436, "Austria": 3383, "Iran": 3582, "Curacao": 32364,
}
NAME_ALIASES: dict[str, str] = {
    "United States": "USA",
    "Korea Republic": "South Korea",
    "Republic of Korea": "South Korea",
    "Czech Republic": "Czechia",
    "Turkey": "Turkiye",
    "IR Iran": "Iran",
    "Cote d'Ivoire": "Ivory Coast",
    "Cote d Ivoire": "Ivory Coast",
}

_fetch_lock = threading.Lock()
_last_fetch_ts = 0.0
_mem_cache: dict[int, dict[str, Any]] = {}
_neg_cache: dict[str, float] = {}  # normalized team name -> expiry timestamp
_resolved_path = CACHE_DIR / "resolved.json"
try:
    _resolved_ids: dict[str, int] = json.loads(_resolved_path.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError):
    _resolved_ids = {}


def normalize(name: str) -> str:
    """Lowercase, strip accents/punctuation, collapse spaces (matches the frontend)."""
    decomposed = unicodedata.normalize("NFD", name or "")
    ascii_only = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    cleaned = re.sub(r"[^a-z0-9 ]", " ", ascii_only.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


_NORMALIZED_IDS = {normalize(k): v for k, v in NATIONAL_TEAM_IDS.items()}
_NORMALIZED_ALIASES = {normalize(k): normalize(v) for k, v in NAME_ALIASES.items()}


def fetch_html(url: str, timeout: float = FETCH_TIMEOUT) -> str | None:
    """Polite, throttled GET that returns decoded HTML or None on any failure."""
    global _last_fetch_ts
    with _fetch_lock:
        wait = MIN_FETCH_INTERVAL - (time.time() - _last_fetch_ts)
        if wait > 0:
            time.sleep(wait)
        _last_fetch_ts = time.time()
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError, OSError):
        return None


def resolve_team_id(team: str) -> int | None:
    key = normalize(team)
    key = _NORMALIZED_ALIASES.get(key, key)
    if key in _NORMALIZED_IDS:
        return _NORMALIZED_IDS[key]
    # Remember teams resolved by search so we never pay the search round-trip twice (and so
    # a temporarily blocked search cannot lose an id we already know).
    if key in _resolved_ids:
        return _resolved_ids[key]
    found = search_team_id(team)
    if found is not None:
        _resolved_ids[key] = found
        try:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            _resolved_path.write_text(json.dumps(_resolved_ids), encoding="utf-8")
        except OSError:
            pass
    return found


def search_team_id(team: str) -> int | None:
    """Best-effort: pick the search result whose visible name equals the query exactly."""
    html = fetch_html(
        "https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query="
        + urllib.parse.quote(team)
    )
    if not html:
        return None
    target = normalize(team)
    for match in re.finditer(
        r'/[a-z0-9-]+/startseite/verein/(\d+)"[^>]*>([^<]{2,40})</a>', html
    ):
        if normalize(match.group(2)) == target:
            return int(match.group(1))
    return None


def parse_value(text: str) -> float | None:
    """'40.00m' / '900k' / '1.50bn' -> euros. Returns None for '-' or unparseable."""
    cleaned = text.replace("&euro;", "").replace("€", "").strip()
    match = re.match(r"([\d.,]+)\s*(bn|m|k|th\.?|tsd\.?)?", cleaned, re.IGNORECASE)
    if not match:
        return None
    try:
        number = float(match.group(1).replace(",", ""))
    except ValueError:
        return None
    unit = (match.group(2) or "").lower()
    if unit.startswith("bn"):
        return number * 1_000_000_000
    if unit == "m":
        return number * 1_000_000
    if unit and (unit.startswith("k") or unit.startswith("th") or unit.startswith("tsd")):
        return number * 1_000
    return number


def value_label(euros: float) -> str:
    if euros >= 1_000_000_000:
        return f"€{euros / 1_000_000_000:.2f}bn"
    if euros >= 1_000_000:
        return f"€{euros / 1_000_000:.1f}m"
    if euros >= 1_000:
        return f"€{euros / 1_000:.0f}k"
    return f"€{euros:.0f}"


def parse_squad(html: str) -> list[dict[str, Any]]:
    """Pull (name, market value) per player row from a Transfermarkt squad page.

    Splitting on the row markers across the whole document (rather than the items table,
    whose non-greedy slice truncates) is the reliable approach. A squad row carries both a
    player profile link with visible text AND a 'rechts hauptlink' market-value cell.
    """
    rows = re.split(r'<tr class="(?:odd|even)"', html)
    players: list[dict[str, Any]] = []
    for row in rows[1:]:
        value_cell = re.search(r'class="rechts hauptlink"[^>]*>(.*?)</td>', row, re.S)
        if not value_cell:
            continue
        # First profile link with visible text = the player name (photo links wrap an <img>).
        name_match = re.search(r'profil/spieler/\d+"[^>]*>\s*([^<]+?)\s*</a>', row)
        if not name_match:
            continue
        name = re.sub(r"\s+", " ", name_match.group(1)).strip()
        if not name:
            continue
        raw = re.sub(r"<[^>]+>", " ", value_cell.group(1))
        euros = parse_value(raw)
        label = value_label(euros) if euros is not None else None
        players.append({"name": name, "marketValue": euros, "valueLabel": label})
    # De-dup by name, keep the first (table order) occurrence.
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for player in players:
        key = normalize(player["name"])
        if key and key not in seen:
            seen.add(key)
            unique.append(player)
    return unique


def cache_path(team_id: int) -> Path:
    return CACHE_DIR / f"squad_{team_id}.json"


def load_cached(team_id: int) -> dict[str, Any] | None:
    entry = _mem_cache.get(team_id)
    if entry and time.time() - entry["savedAt"] <= CACHE_TTL:
        return entry
    path = cache_path(team_id)
    if path.exists():
        try:
            entry = json.loads(path.read_text(encoding="utf-8"))
            if time.time() - entry.get("savedAt", 0) <= CACHE_TTL:
                _mem_cache[team_id] = entry
                return entry
        except (OSError, json.JSONDecodeError):
            return None
    return None


def store_cache(team_id: int, entry: dict[str, Any]) -> None:
    _mem_cache[team_id] = entry
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_path(team_id).write_text(json.dumps(entry, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass


def get_squad(team: str) -> dict[str, Any]:
    neg_key = normalize(team)
    if _neg_cache.get(neg_key, 0) > time.time():
        return {"team": team, "teamId": None, "players": [], "source": "unavailable", "found": False}
    team_id = resolve_team_id(team)
    if team_id is None:
        _neg_cache[neg_key] = time.time() + NEG_CACHE_TTL
        return {"team": team, "teamId": None, "players": [], "source": "unmapped", "found": False}
    cached = load_cached(team_id)
    if cached:
        return {**cached, "cached": True}
    html = fetch_html(
        f"https://www.transfermarkt.com/x/kader/verein/{team_id}/plus/1"
    )
    players = parse_squad(html) if html else []
    valued = sum(1 for p in players if p.get("marketValue"))
    entry = {
        "team": team,
        "teamId": team_id,
        "players": players,
        "valued": valued,
        "source": "Transfermarkt",
        "found": valued > 0,
        "savedAt": time.time(),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if valued:
        store_cache(team_id, entry)
    else:
        # Source unreachable / rate-limited: don't retry every request for a while.
        _neg_cache[neg_key] = time.time() + NEG_CACHE_TTL
    return entry


class SportsScoutHandler(SimpleHTTPRequestHandler):
    server_version = "SportsScout/1.0"

    def log_message(self, *args: Any) -> None:
        return

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        if parsed.path == "/health":
            self.write_json({"ok": True, "service": "sports-scout", "time": time.time()})
            return
        if parsed.path == "/api/squad":
            team = params.get("team", [""])[0]
            self.write_json(get_squad(team) if team else {"error": "team required"},
                            status=200 if team else 400)
            return
        if parsed.path == "/api/values":
            home = params.get("home", [""])[0]
            away = params.get("away", [""])[0]
            payload: dict[str, Any] = {}
            # Fetch both squads concurrently so a match resolves in one round-trip rather
            # than two serial scrapes.
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                futures = {}
                if home:
                    futures["home"] = pool.submit(get_squad, home)
                if away:
                    futures["away"] = pool.submit(get_squad, away)
                for side, future in futures.items():
                    try:
                        payload[side] = future.result()
                    except Exception:  # noqa: BLE001 - never fail the whole response
                        payload[side] = {"team": "", "players": [], "found": False, "source": "error"}
            self.write_json(payload)
            return
        self.write_json({"error": "not found"}, status=404)

    def write_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> int:
    parser = argparse.ArgumentParser(description="Fusion SportsScout market-value proxy")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8796)
    args = parser.parse_args()
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((args.host, args.port), SportsScoutHandler)
    print(f"SportsScout market-value proxy on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
