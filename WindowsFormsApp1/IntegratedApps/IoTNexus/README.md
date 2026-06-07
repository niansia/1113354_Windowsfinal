# Fusion IoT Nexus — 物聯網中樞

A smart-building **IoT operations center** integrated into FusionOS. It simulates
and live-monitors a fleet of ~40 building IoT devices across a multi-floor digital
twin, runs real edge analytics, and exposes everything over a **real MQTT broker**
so external devices can join the same fabric.

Everything here is written from scratch with **zero third-party dependencies**
(Python standard library + a single C++ file + vanilla JS).

## Architecture

```
                       ┌──────────────────────────────────────────────┐
  external MQTT        │  server.py  (one Python process)             │
  devices  ──TCP────▶  │  ┌────────────┐  publish/subscribe fabric    │
  (ESP32, mosquitto)   │  │ MqttBroker │◀───────┬───────────┐         │
                       │  │ (mqtt_broker.py, MQTT 3.1.1 / TCP 1883)    │
                       │  └────────────┘        │           │         │
                       │        ▲               │ in-proc   │ in-proc │
                       │        │ telemetry     ▼ tap       ▼ cmd     │
                       │   ┌────┴─────┐   ┌──────────┐  ┌──────────┐  │
  browser  ◀──WebSocket───│ sim loop │──▶│ WS bridge│  │ cmd route│  │
  dashboard   /ws  HTTP   │  (1 Hz)  │   └──────────┘  └──────────┘  │
                       │   └────┬─────┘                               │
                       │        │ stdin (TSV) / stdout (JSON)         │
                       │        ▼                                     │
                       │   EdgeCore.exe  ← built from engine/edge_core.cpp
                       │   (digital-twin physics + edge analytics)    │
                       └──────────────────────────────────────────────┘
```

* **`engine/edge_core.cpp`** — the native "brain". One-shot per tick: reads the
  current world (devices + commands + rules + history) as TSV on stdin, advances a
  multi-zone **digital-twin thermal model**, simulates ~12 device classes, runs
  **robust anomaly detection** (median + MAD Hampel z-score), **NILM-style energy
  disaggregation**, **predictive-maintenance health scoring**, and an **automation
  rule engine**, then prints one JSON document. Build:
  `g++ -std=c++17 -O2 engine/edge_core.cpp -o build/EdgeCore.exe`.
  If g++ is unavailable, `simcore.py:py_engine` is a pure-Python fallback.

* **`mqtt_broker.py`** — a from-scratch MQTT 3.1.1 broker over raw TCP:
  CONNECT/PUBLISH/SUBSCRIBE/UNSUBSCRIBE/PING/DISCONNECT, QoS 0/1, `+`/`#`
  wildcards, retained messages, and a shared publish fabric so in-process
  subscribers (the WS bridge, the command router) sit on the same bus as real TCP
  clients.

* **`simcore.py`** — the building/device fleet definition, the environment model
  (diurnal outdoor temperature, solar irradiance, grid carbon intensity, time-of-use
  tariff) and the pure-Python fallback engine.

* **`server.py`** — ties it together: builds/warms the C++ engine, runs the 1 Hz
  simulation loop, publishes per-device telemetry on `fusion/iot/<zone>/<id>/telemetry`,
  bridges live snapshots to the browser over a **hand-rolled WebSocket** (with an
  HTTP `/api/snapshot` poll fallback), and accepts commands / scenario config.

* **`web/`** — a dependency-free dashboard: digital-twin floor plan, live Canvas
  charts, device fleet, energy disaggregation donut, anomaly/event feed, predictive
  maintenance, an automation rule editor, the MQTT bus view and a scenario console.
  Full 5-language i18n (`web/i18n.js`, source-as-key like the rest of FusionOS).

## Run

```bash
python server.py --port 8793                 # dashboard at http://127.0.0.1:8793
python server.py --mqtt-host 0.0.0.0         # let LAN devices reach the broker
```

Inside FusionOS it launches as the **物聯網中樞** app (desktop icon / start menu /
voice "開啟物聯網"); the WinForms host (`Form1.cs` `LaunchIoTNexus`) starts this
server on port 8793 and opens the dashboard in an in-app WebView window.

## Talk to the broker from outside

```bash
mosquitto_sub -h 127.0.0.1 -p 1883 -t 'fusion/iot/#' -v       # watch all telemetry
mosquitto_pub -h 127.0.0.1 -p 1883 -t 'fusion/iot/lab/my-esp32/telemetry' \
              -m '{"id":"my-esp32","telemetry":{"temp":24.2}}'   # appears live
```

## Endpoints

| Method | Path             | Purpose                                  |
|--------|------------------|------------------------------------------|
| GET    | `/`              | dashboard                                |
| GET    | `/ws`            | WebSocket live snapshot push             |
| GET    | `/api/snapshot`  | latest full snapshot (poll fallback)     |
| GET    | `/api/broker`    | MQTT broker status                       |
| GET    | `/api/health`    | engine / tick / client count             |
| POST   | `/api/command`   | `{device, field, value}` actuator command|
| POST   | `/api/config`    | scenario config (timescale/cloud/rules/faults) |

## Tests

`tests/smoke.ps1` compiles the engine, runs one analytics tick, and checks the
MQTT broker accepts a real client and the HTTP/WS surface responds.
