"""MetroPulse realtime data broker.

This Python process is the data-integration layer that sits between the open
internet and the native C++ engine. For each report request it:

  1. reverse-geocodes the user's coordinates into a real area name (Nominatim),
  2. pulls live weather + air quality (Open-Meteo),
  3. measures local road density (OSM Overpass),
  4. discovers real nearby places -- hospitals, stations, universities, markets,
     parks, malls -- (OSM Overpass) and turns them into a geographic graph,
  5. hands that graph to the C++ engine, which runs the traffic models.

Every network call degrades gracefully: if a source is unavailable the engine
falls back to its own synthetic district so the dashboard always renders.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import math
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


APP_ROOT = Path(__file__).resolve().parent
WEB_ROOT = APP_ROOT / "web"
ENGINE_EXE = APP_ROOT / "build" / "MetroPulseEngine.exe"
ENGINE_SRC = APP_ROOT / "src" / "main.cpp"
DEFAULT_LAT = 25.0330
DEFAULT_LON = 121.5654
USER_AGENT = "FusionOS-MetroPulse/2.0 (smart-city dashboard)"

# OSM tag -> (node type, baseline trip-generation demand, i18n-ish display key)
POI_RULES: list[tuple[str, str, str, float]] = [
    ("amenity", "hospital", "priority", 0.84),
    ("amenity", "clinic", "priority", 0.66),
    ("railway", "station", "transit", 0.90),
    ("station", "subway", "transit", 0.88),
    ("public_transport", "station", "transit", 0.82),
    ("amenity", "university", "education", 0.70),
    ("amenity", "college", "education", 0.62),
    ("amenity", "school", "education", 0.5),
    ("amenity", "marketplace", "commerce", 0.78),
    ("shop", "mall", "retail", 0.74),
    ("shop", "supermarket", "retail", 0.58),
    ("leisure", "park", "green", 0.34),
    ("aeroway", "aerodrome", "gateway", 0.6),
]
# How many of each type we are willing to place, and the overall cap.
TYPE_QUOTA = {"priority": 1, "transit": 2, "education": 1, "commerce": 1, "retail": 1, "green": 1, "gateway": 1}
MAX_POIS = 8


def fetch_json(url: str, timeout: float = 6.0) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8", errors="replace"))


def try_fetch_json(url: str, timeout: float = 6.0) -> tuple[dict[str, Any] | None, str | None]:
    try:
        return fetch_json(url, timeout), None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        return None, str(exc)


# Public Overpass mirrors, tried in order so a single busy server cannot break us.
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


def overpass_fetch(query: str, timeout: float = 12.0) -> tuple[dict[str, Any] | None, str | None]:
    last_error = "no overpass endpoint reachable"
    for base in OVERPASS_ENDPOINTS:
        data, err = try_fetch_json(base + "?data=" + urllib.parse.quote(query), timeout)
        if data is not None and data.get("elements") is not None:
            return data, None
        if err:
            last_error = err
    return None, last_error


def find_executable(name: str) -> str | None:
    for folder in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(folder) / name
        if candidate.exists():
            return str(candidate)
        candidate_exe = Path(folder) / f"{name}.exe"
        if candidate_exe.exists():
            return str(candidate_exe)
    return None


def ensure_engine() -> None:
    if ENGINE_EXE.exists() and ENGINE_EXE.stat().st_mtime >= ENGINE_SRC.stat().st_mtime:
        return
    compiler = find_executable("g++")
    if not compiler:
        raise RuntimeError("g++ not found")
    ENGINE_EXE.parent.mkdir(parents=True, exist_ok=True)
    cmd = [compiler, "-std=c++17", "-O2", "-Wall", "-Wextra", "-pedantic", str(ENGINE_SRC), "-o", str(ENGINE_EXE)]
    subprocess.run(cmd, cwd=str(APP_ROOT), check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                   encoding="utf-8", errors="replace")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def road_length_km(elements: list[dict[str, Any]]) -> float:
    total = 0.0
    for way in elements:
        geometry = way.get("geometry") or []
        for idx in range(len(geometry) - 1):
            total += haversine_km(
                geometry[idx]["lat"], geometry[idx]["lon"],
                geometry[idx + 1]["lat"], geometry[idx + 1]["lon"],
            )
    return total


def ip_locate() -> dict[str, Any] | None:
    """Approximate the user's region from their public IP.

    This is the reliable fallback when WebView2 / browser geolocation fails or
    is denied -- the request is made *server-side* from the user's machine, so
    the detected IP (and therefore the region) is the user's own. It always
    reflects wherever the app is actually running, never a hard-coded city.
    """
    # ip-api.com: free, no key (http on the free tier; fine for a server-side call)
    data, _ = try_fetch_json("http://ip-api.com/json/?fields=status,lat,lon,city,regionName,country", 5)
    if data and data.get("status") == "success" and data.get("lat") is not None:
        label = data.get("city") or data.get("regionName") or data.get("country")
        return {"lat": float(data["lat"]), "lon": float(data["lon"]), "label": label, "source": "ip"}
    # ipapi.co fallback (https)
    data, _ = try_fetch_json("https://ipapi.co/json/", 5)
    if data and data.get("latitude") is not None:
        label = data.get("city") or data.get("region") or data.get("country_name")
        return {"lat": float(data["latitude"]), "lon": float(data["longitude"]), "label": label, "source": "ip"}
    return None


def reverse_geocode(lat: float, lon: float) -> str | None:
    url = "https://nominatim.openstreetmap.org/reverse?" + urllib.parse.urlencode(
        {"lat": f"{lat:.5f}", "lon": f"{lon:.5f}", "format": "jsonv2", "zoom": "14", "accept-language": "zh-TW,en"}
    )
    data, _ = try_fetch_json(url, 6)
    if not data:
        return None
    addr = data.get("address") or {}
    for key in ("suburb", "city_district", "town", "village", "neighbourhood", "quarter", "city", "county", "state"):
        if addr.get(key):
            return str(addr[key])
    name = data.get("name") or data.get("display_name")
    return str(name).split(",")[0] if name else None


def collect_realtime(lat: float, lon: float) -> dict[str, Any]:
    forecast_url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(
        {"latitude": f"{lat:.5f}", "longitude": f"{lon:.5f}",
         "current": "temperature_2m,precipitation,wind_speed_10m", "timezone": "auto"}
    )
    air_url = "https://air-quality-api.open-meteo.com/v1/air-quality?" + urllib.parse.urlencode(
        {"latitude": f"{lat:.5f}", "longitude": f"{lon:.5f}", "current": "pm2_5,us_aqi", "timezone": "auto"}
    )
    bbox = (lat - 0.012, lon - 0.012, lat + 0.012, lon + 0.012)
    overpass_query = (
        "[out:json][timeout:8];"
        'way["highway"]["highway"!~"footway|path|steps|cycleway"]'
        f"({bbox[0]:.5f},{bbox[1]:.5f},{bbox[2]:.5f},{bbox[3]:.5f});out geom 80;"
    )

    # Fetch the three sources concurrently so total latency is the slowest one,
    # not their sum (matters a lot when a public API is timing out).
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        f_forecast = ex.submit(try_fetch_json, forecast_url, 6)
        f_air = ex.submit(try_fetch_json, air_url, 6)
        f_roads = ex.submit(overpass_fetch, overpass_query, 7)
        forecast, forecast_error = f_forecast.result()
        air, air_error = f_air.result()
        roads, roads_error = f_roads.result()

    current_weather = (forecast or {}).get("current") or {}
    current_air = (air or {}).get("current") or {}
    road_elements = (roads or {}).get("elements") or []
    road_count = len(road_elements) if road_elements else 42
    road_km = road_length_km(road_elements) if road_elements else 15.0

    return {
        "temperature": float(current_weather.get("temperature_2m", 27.0) or 27.0),
        "wind": float(current_weather.get("wind_speed_10m", 8.0) or 8.0),
        "precipitation": float(current_weather.get("precipitation", 0.0) or 0.0),
        "pm25": float(current_air.get("pm2_5", 8.0) or 8.0),
        "aqi": int(current_air.get("us_aqi", 32) or 32),
        "roadCount": int(road_count),
        "roadKm": float(max(0.1, road_km)),
        "errors": {"forecast": forecast_error, "air": air_error, "roads": roads_error},
        "live": bool(forecast or air or roads),
    }


def classify(tags: dict[str, Any]) -> tuple[str, float] | None:
    for key, value, node_type, demand in POI_RULES:
        if tags.get(key) == value:
            return node_type, demand
    return None


def discover_pois(lat: float, lon: float, radius_m: int = 2600) -> list[dict[str, Any]]:
    """Find real nearby places and rank the most relevant per category."""
    selectors = [
        'node["amenity"~"hospital|clinic|university|college|marketplace"]',
        'way["amenity"~"hospital|university|college|marketplace"]',
        'node["railway"="station"]', 'node["station"="subway"]', 'node["public_transport"="station"]',
        'way["shop"~"mall|supermarket"]', 'node["shop"~"mall|supermarket"]',
        'way["leisure"="park"]', 'node["aeroway"="aerodrome"]', 'way["aeroway"="aerodrome"]',
    ]
    around = f"(around:{radius_m},{lat:.5f},{lon:.5f})"
    body = "".join(f"{sel}{around};" for sel in selectors)
    query = f"[out:json][timeout:10];({body});out center tags 80;"
    data, _ = overpass_fetch(query, 9)
    if not data:
        return []

    candidates: list[dict[str, Any]] = []
    for el in data.get("elements", []):
        tags = el.get("tags") or {}
        kind = classify(tags)
        if not kind:
            continue
        if el.get("type") == "node":
            plat, plon = el.get("lat"), el.get("lon")
        else:
            center = el.get("center") or {}
            plat, plon = center.get("lat"), center.get("lon")
        if plat is None or plon is None:
            continue
        node_type, demand = kind
        name = tags.get("name") or tags.get("name:en") or tags.get("name:zh")
        if not name:
            continue
        candidates.append({
            "type": node_type, "demand": demand, "name": str(name),
            "lat": float(plat), "lon": float(plon),
            "dist": haversine_km(lat, lon, float(plat), float(plon)),
        })

    candidates.sort(key=lambda c: c["dist"])
    chosen: list[dict[str, Any]] = []
    used_quota: dict[str, int] = {}
    seen_names: set[str] = set()
    for c in candidates:
        if len(chosen) >= MAX_POIS:
            break
        quota = TYPE_QUOTA.get(c["type"], 1)
        if used_quota.get(c["type"], 0) >= quota:
            continue
        key = c["name"].strip().lower()
        if key in seen_names:
            continue
        seen_names.add(key)
        used_quota[c["type"]] = used_quota.get(c["type"], 0) + 1
        chosen.append(c)
    return chosen


def write_graph_file(lat: float, lon: float, place: str, pois: list[dict[str, Any]]) -> str:
    """Serialise the area label + (when found) origin/POIs into the tab-separated
    format the engine reads. Always written as UTF-8 -- this is also how the area
    name reaches the engine, since non-ASCII argv is codepage-mangled on Windows.
    A live node graph is only emitted when >= 2 real places were discovered;
    otherwise the engine keeps its synthetic district but still uses the label."""
    fd, path = tempfile.mkstemp(prefix="mp_graph_", suffix=".tsv")
    os.close(fd)
    label = (place or "Current district").replace("\t", " ").replace("\n", " ").strip()
    lines = [f"L\t{label}"]
    if len(pois) >= 2:
        lines.append(f"N\tuser\t{lat:.6f}\t{lon:.6f}\t0.46\torigin\tn_origin\tCurrent Position")
        priority_id = None
        for i, c in enumerate(pois):
            nid = f"poi{i}"
            if priority_id is None and c["type"] == "priority":
                priority_id = nid
            name = c["name"].replace("\t", " ").strip()
            lines.append(f"N\t{nid}\t{c['lat']:.6f}\t{c['lon']:.6f}\t{c['demand']:.2f}\t{c['type']}\t\t{name}")
        lines.append("O\tuser")
        if priority_id:
            lines.append(f"P\t{priority_id}")
    Path(path).write_text("\n".join(lines), encoding="utf-8")
    return path


def run_engine(lat: float, lon: float, lang: str, place: str, realtime: dict[str, Any], graph_path: str | None) -> dict[str, Any]:
    ensure_engine()
    cmd = [
        str(ENGINE_EXE),
        "--city", "fusion-harbor", "--lang", lang,
        "--lat", f"{lat:.5f}", "--lon", f"{lon:.5f}", "--place", place,
        "--temperature", str(realtime["temperature"]),
        "--wind", str(realtime["wind"]),
        "--precipitation", str(realtime["precipitation"]),
        "--pm25", str(realtime["pm25"]),
        "--aqi", str(realtime["aqi"]),
        "--road-count", str(realtime["roadCount"]),
        "--road-km", str(realtime["roadKm"]),
        "--out", "-",
    ]
    if graph_path:
        cmd += ["--graph", graph_path]
    completed = subprocess.run(cmd, cwd=str(APP_ROOT), check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               encoding="utf-8", errors="replace")
    return json.loads(completed.stdout)


class MetroPulseHandler(SimpleHTTPRequestHandler):
    server_version = "MetroPulse/2.0"

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def log_message(self, *args: Any) -> None:  # quieter console
        return

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/health":
            self.write_json({"ok": True, "engine": ENGINE_EXE.exists(), "time": time.time()})
            return
        if parsed.path == "/api/locate":
            loc = ip_locate() or {"lat": DEFAULT_LAT, "lon": DEFAULT_LON, "label": "Taipei", "source": "default"}
            self.write_json(loc)
            return
        if parsed.path == "/api/report":
            self.handle_report(parsed.query)
            return
        return super().do_GET()

    def handle_report(self, query: str) -> None:
        params = urllib.parse.parse_qs(query)
        lat = safe_float(params.get("lat", [DEFAULT_LAT])[0], DEFAULT_LAT)
        lon = safe_float(params.get("lon", [DEFAULT_LON])[0], DEFAULT_LON)
        lang = params.get("lang", ["zh-TW"])[0]
        requested_place = params.get("place", ["Current district"])[0]
        graph_path = None
        try:
            # weather/air/roads, POI discovery, and reverse-geocoding are all
            # independent network calls -> run them in parallel.
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
                f_rt = ex.submit(collect_realtime, lat, lon)
                f_pois = ex.submit(discover_pois, lat, lon)
                f_place = ex.submit(reverse_geocode, lat, lon)
                realtime = f_rt.result()
                pois = f_pois.result()
                place = f_place.result() or requested_place
            graph_path = write_graph_file(lat, lon, place, pois)
            report = run_engine(lat, lon, lang, place, realtime, graph_path)
            report["broker"] = {
                "language": "Python",
                "realtimeLive": realtime["live"],
                "placesFound": len(pois),
                "geocoded": place != requested_place,
                "errors": realtime["errors"],
            }
            self.write_json(report)
        except Exception as exc:  # noqa: BLE001 - report any failure as a graceful fallback
            fallback = {
                "city": "fusion-harbor",
                "language": lang,
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "location": {"label": requested_place, "lat": lat, "lon": lon},
                "error": str(exc),
                "broker": {"language": "Python", "realtimeLive": False},
            }
            self.write_json(fallback, status=503)
        finally:
            if graph_path:
                try:
                    os.remove(graph_path)
                except OSError:
                    pass

    def write_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def safe_float(value: str, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8791)
    args = parser.parse_args()
    WEB_ROOT.mkdir(parents=True, exist_ok=True)
    try:
        ensure_engine()
    except Exception as exc:  # noqa: BLE001
        print(f"MetroPulse engine warmup skipped: {exc}", flush=True)
    server = ThreadingHTTPServer((args.host, args.port), MetroPulseHandler)
    print(f"MetroPulse broker listening on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
