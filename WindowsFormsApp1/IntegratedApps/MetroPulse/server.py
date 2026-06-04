from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
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


def fetch_json(url: str, timeout: float = 5.0) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": "FusionOS-MetroPulse/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8", errors="replace"))


def try_fetch_json(url: str, timeout: float = 5.0) -> tuple[dict[str, Any] | None, str | None]:
    try:
        return fetch_json(url, timeout), None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        return None, str(exc)


def ensure_engine() -> None:
    if ENGINE_EXE.exists() and ENGINE_EXE.stat().st_mtime >= ENGINE_SRC.stat().st_mtime:
        return
    compiler = find_executable("g++")
    if not compiler:
        raise RuntimeError("g++ not found")
    ENGINE_EXE.parent.mkdir(parents=True, exist_ok=True)
    cmd = [compiler, "-std=c++17", "-O2", "-Wall", "-Wextra", "-pedantic", str(ENGINE_SRC), "-o", str(ENGINE_EXE)]
    subprocess.run(cmd, cwd=str(APP_ROOT), check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def find_executable(name: str) -> str | None:
    for folder in os.environ.get("PATH", "").split(os.pathsep):
        candidate = Path(folder) / name
        if candidate.exists():
            return str(candidate)
        candidate_exe = Path(folder) / f"{name}.exe"
        if candidate_exe.exists():
            return str(candidate_exe)
    return None


def road_length_km(elements: list[dict[str, Any]]) -> float:
    total = 0.0
    for way in elements:
        geometry = way.get("geometry") or []
        for idx in range(len(geometry) - 1):
            total += haversine_km(geometry[idx]["lat"], geometry[idx]["lon"], geometry[idx + 1]["lat"], geometry[idx + 1]["lon"])
    return total


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def collect_realtime(lat: float, lon: float) -> dict[str, Any]:
    forecast_url = (
        "https://api.open-meteo.com/v1/forecast?"
        + urllib.parse.urlencode(
            {
                "latitude": f"{lat:.5f}",
                "longitude": f"{lon:.5f}",
                "current": "temperature_2m,precipitation,wind_speed_10m",
                "timezone": "auto",
            }
        )
    )
    air_url = (
        "https://air-quality-api.open-meteo.com/v1/air-quality?"
        + urllib.parse.urlencode(
            {
                "latitude": f"{lat:.5f}",
                "longitude": f"{lon:.5f}",
                "current": "pm2_5,us_aqi",
                "timezone": "auto",
            }
        )
    )
    bbox = (lat - 0.012, lon - 0.012, lat + 0.012, lon + 0.012)
    overpass_query = f"""
    [out:json][timeout:5];
    way["highway"]["highway"!~"footway|path|steps|cycleway"]({bbox[0]:.5f},{bbox[1]:.5f},{bbox[2]:.5f},{bbox[3]:.5f});
    out geom 80;
    """
    overpass_url = "https://overpass-api.de/api/interpreter?data=" + urllib.parse.quote(overpass_query)

    forecast, forecast_error = try_fetch_json(forecast_url, 5)
    air, air_error = try_fetch_json(air_url, 5)
    roads, roads_error = try_fetch_json(overpass_url, 6)

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
        "errors": {
            "forecast": forecast_error,
            "air": air_error,
            "roads": roads_error,
        },
        "live": bool(forecast or air or roads),
    }


def run_engine(lat: float, lon: float, lang: str, place: str, realtime: dict[str, Any]) -> dict[str, Any]:
    ensure_engine()
    cmd = [
        str(ENGINE_EXE),
        "--city",
        "fusion-harbor",
        "--lang",
        lang,
        "--lat",
        f"{lat:.5f}",
        "--lon",
        f"{lon:.5f}",
        "--place",
        place,
        "--temperature",
        str(realtime["temperature"]),
        "--wind",
        str(realtime["wind"]),
        "--precipitation",
        str(realtime["precipitation"]),
        "--pm25",
        str(realtime["pm25"]),
        "--aqi",
        str(realtime["aqi"]),
        "--road-count",
        str(realtime["roadCount"]),
        "--road-km",
        str(realtime["roadKm"]),
        "--out",
        "-",
    ]
    completed = subprocess.run(cmd, cwd=str(APP_ROOT), check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return json.loads(completed.stdout)


class MetroPulseHandler(SimpleHTTPRequestHandler):
    server_version = "MetroPulse/1.0"

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/health":
            self.write_json({"ok": True, "engine": ENGINE_EXE.exists(), "time": time.time()})
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
        place = params.get("place", ["Current district"])[0]
        try:
            realtime = collect_realtime(lat, lon)
            report = run_engine(lat, lon, lang, place, realtime)
            report["broker"] = {
                "language": "Python",
                "realtimeLive": realtime["live"],
                "errors": realtime["errors"],
            }
            self.write_json(report)
        except Exception as exc:
            fallback = {
                "city": "fusion-harbor",
                "language": lang,
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "location": {"label": place, "lat": lat, "lon": lon},
                "error": str(exc),
                "broker": {"language": "Python", "realtimeLive": False},
            }
            self.write_json(fallback, status=503)

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
    server = ThreadingHTTPServer((args.host, args.port), MetroPulseHandler)
    print(f"MetroPulse broker listening on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
