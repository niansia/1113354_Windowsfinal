# MetroPulse

MetroPulse is a Fusion OS integrated work: a smart-city traffic command center
built around a native **C++17 simulation engine**, a **Python realtime data
broker**, and a **Leaflet map front-end**. It shows a real map of the user's
area, locates them, predicts traffic, and runs several transportation analyses.

The visible product is not a C++ demo. C++ is the brain that computes everything
on a real geographic road graph; the other languages exist to feed it live data
and to visualise its output.

## What each language does

| Layer | Language | Responsibility |
| --- | --- | --- |
| Engine (`src/main.cpp`) | C++17 | Builds a geographic road graph, then runs Dijkstra routing, the BPR volume-delay model, Webster signal-cycle optimisation, a time-of-day demand forecast, accessibility/bottleneck analysis, and network KPIs. Emits one JSON report. |
| Broker (`server.py`) | Python | Resolves the area (Nominatim reverse-geocode + IP geolocation), pulls weather + air quality (Open-Meteo), measures road density and **discovers real nearby places** — hospitals, stations, universities, markets, parks (OSM Overpass) — and hands that graph to the engine. All sources are fetched concurrently. Serves the web app + `/api/report` + `/api/locate`. |
| Surface (`web/`) | JavaScript + Leaflet + MapLibre GL | A **2D** Leaflet map (dark tiles, route/network/heat/reach layers) and a **3D** MapLibre city view with extruded OSM buildings, toggled live; KPI cards, tabbed analyses, a clock-labelled forecast chart, and 5-language i18n. |

**Positioning** cascades GPS → IP region → default, so the view tracks the
user's real area even when WebView2 geolocation is denied or unavailable.

Every network call degrades gracefully: when an open-data source is slow or
down, the engine falls back to a synthetic district laid out at **real
coordinates around the user**, so the map always renders.

## Run

```powershell
# Compile the engine + run the full smoke test (engine, JSON markers, live graph)
powershell -ExecutionPolicy Bypass -File .\tests\smoke.ps1

# Or start the broker yourself and open http://127.0.0.1:8791/
python .\server.py --port 8791
```

## Engine CLI

```powershell
.\build\MetroPulseEngine.exe --lat 25.0330 --lon 121.5654 --place "Taipei" `
    --aqi 78 --precipitation 1.2 --now-minutes 1080 --dow 3 --out -
```

Key flags: `--graph <file>` feeds a live OSM graph (tab-separated `N/O/P`
records) discovered by the broker; without it the engine generates its own
geographic district around `--lat/--lon`. `--now-minutes` / `--dow` drive the
time-of-day forecast; `--js` wraps the report as `window.METROPULSE_REPORT`.

## Fusion OS Integration

WinForms prebuilds the engine in the background, launches the Python broker, and
opens `web/index.html` inside a Fusion OS WebView at
`http://127.0.0.1:8791/?host=fusionos&lang=...&timezone=...`. The app reads
language/time settings from Fusion OS and listens for later locale updates.
