"""Fusion IoT Nexus -- broker / digital-twin / dashboard backend.

One Python process that ties the whole stack together:

  * a from-scratch MQTT 3.1.1 broker (mqtt_broker.py) on TCP so real devices can
    join the same message fabric the simulated fleet publishes on,
  * a from-scratch WebSocket push channel (no third-party libs) for the live
    dashboard, layered on the stdlib HTTP server,
  * a simulation loop that, every tick, drives the native C++ EdgeCore engine
    (digital-twin physics + edge analytics), falling back to a pure-Python
    engine if the native one cannot be built,
  * an HTTP/REST surface that serves the web UI and accepts commands / config.

Run:  python server.py --port 8793
Build is automatic on first run (g++ -> build/EdgeCore.exe); without g++ the
pure-Python engine takes over so the dashboard always works.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import socket
import struct
import subprocess
import sys
import threading
import time
from collections import deque
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mqtt_broker import MqttBroker, topic_matches  # noqa: E402
import simcore  # noqa: E402

APP_ROOT = Path(__file__).resolve().parent
WEB_ROOT = APP_ROOT / "web"
ENGINE_SRC = APP_ROOT / "engine" / "edge_core.cpp"
ENGINE_EXE = APP_ROOT / "build" / ("EdgeCore.exe" if os.name == "nt" else "EdgeCore")
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
TOPIC_BASE = "fusion/iot"

MIME = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml", ".ico": "image/x-icon", ".png": "image/png",
        ".woff2": "font/woff2", ".map": "application/json"}


def log(*a):
    print(*a, flush=True)


# --------------------------------------------------------------------- WS hub
class WsClient:
    def __init__(self, sock):
        self.sock = sock
        self.lock = threading.Lock()
        self.alive = True

    def send_text(self, text: str):
        data = text.encode("utf-8")
        n = len(data)
        if n < 126:
            header = struct.pack("!BB", 0x81, n)
        elif n < 65536:
            header = struct.pack("!BBH", 0x81, 126, n)
        else:
            header = struct.pack("!BBQ", 0x81, 127, n)
        with self.lock:
            try:
                self.sock.sendall(header + data)
            except OSError:
                self.alive = False

    def send_pong(self, payload: bytes):
        with self.lock:
            try:
                self.sock.sendall(struct.pack("!BB", 0x8A, len(payload)) + payload)
            except OSError:
                self.alive = False


class WsHub:
    def __init__(self):
        self.clients = set()
        self.lock = threading.Lock()

    def add(self, c):
        with self.lock:
            self.clients.add(c)

    def remove(self, c):
        with self.lock:
            self.clients.discard(c)

    def broadcast(self, text: str):
        with self.lock:
            targets = list(self.clients)
        for c in targets:
            if c.alive:
                c.send_text(text)
            else:
                self.remove(c)

    def count(self):
        with self.lock:
            return len(self.clients)


# --------------------------------------------------------------------- the app
class IoTNexus:
    def __init__(self, args):
        self.args = args
        self.broker = MqttBroker(args.mqtt_host, args.mqtt_port, log=log)
        self.hub = WsHub()
        self.world = simcore.build_world(seed=args.seed)
        self.rules = simcore.default_rules()
        self.history = {}            # id -> {metric -> deque}
        self.pending = []            # pending control commands for next tick
        self.pending_lock = threading.Lock()
        self.timescale = args.timescale
        self.cloud = 1.0
        self.tick = 0
        # start sim clock at the real local time-of-day so the building feels live;
        # but if it is currently outside working hours the building would look dead,
        # so fall back to a lively mid-morning so the demo opens with sun + people.
        now = datetime.now()
        if 7 <= now.hour <= 19:
            self.clock = now.hour * 3600 + now.minute * 60 + now.second
        else:
            self.clock = 10 * 3600
        self.engine_mode = "starting"
        self.latest = {}
        self.daily = {"energyKwh": 0.0, "solarKwh": 0.0, "carbonKg": 0.0,
                      "costUsd": 0.0, "peakKw": 0.0, "day": int(self.clock // 86400)}
        self.events = deque(maxlen=60)
        self.running = True

    # ---- engine build ----
    def ensure_engine(self):
        if ENGINE_EXE.exists():
            return True
        gpp = self._find_gpp()
        if not gpp:
            log("[engine] g++ not found -- using pure-Python fallback engine")
            return False
        ENGINE_EXE.parent.mkdir(parents=True, exist_ok=True)
        try:
            log("[engine] compiling EdgeCore ...")
            r = subprocess.run([gpp, "-std=c++17", "-O2", str(ENGINE_SRC), "-o", str(ENGINE_EXE)],
                               capture_output=True, text=True, timeout=120)
            if r.returncode != 0:
                log("[engine] compile failed:\n" + r.stderr)
                return False
            log("[engine] built " + str(ENGINE_EXE))
            return True
        except Exception as exc:  # noqa: BLE001
            log("[engine] compile error: " + str(exc))
            return False

    @staticmethod
    def _find_gpp():
        for name in ("g++", "g++.exe", "c++"):
            for d in os.environ.get("PATH", "").split(os.pathsep):
                p = Path(d) / name
                if p.exists():
                    return str(p)
        return None

    # ---- history ----
    def _push_history(self, dev_id, metric, value):
        d = self.history.setdefault(dev_id, {})
        q = d.get(metric)
        if q is None:
            q = d[metric] = deque(maxlen=80)
        q.append(value)

    # ---- engine driver ----
    def _build_stdin(self, g, commands):
        lines = []
        for k, v in g.items():
            lines.append(f"G\t{k}\t{v}")
        for d in self.world:
            st = ",".join(f"{k}={v}" for k, v in d["state"].items())
            lines.append(f"D\t{d['id']}\t{d['type']}\t{d['zone']}\t{int(d['online'])}\t"
                         f"{d['rssi']:.1f}\t{d['battery']:.1f}\t{st}")
        for c in commands:
            lines.append(f"C\t{c['device']}\t{c['field']}\t{c['value']}")
        for r in self.rules:
            lines.append(f"R\t{r['id']}\t{int(r['enabled'])}\t{r['mDev']}\t{r['metric']}\t{r['op']}\t"
                         f"{r['thr']}\t{r['aDev']}\t{r['aField']}\t{r['aVal']}\t{r['name']}")
        for dev_id, metrics in self.history.items():
            for metric, q in metrics.items():
                if len(q) >= 5:
                    lines.append(f"H\t{dev_id}\t{metric}\t" + ",".join(f"{v:.3f}" for v in q))
        return "\n".join(lines) + "\n"

    def _run_native(self, g, commands):
        stdin = self._build_stdin(g, commands)
        r = subprocess.run([str(ENGINE_EXE)], input=stdin.encode("utf-8"),
                           capture_output=True, timeout=5)
        out = r.stdout.decode("utf-8", "replace").strip()
        if not out:
            raise RuntimeError("engine produced no output: " + r.stderr.decode("utf-8", "replace")[:200])
        return json.loads(out.splitlines()[-1])

    def step(self):
        # advance sim clock
        dt = max(1.0, self.args.interval * self.timescale)
        self.clock += dt
        self.tick += 1
        env = simcore.environment(self.clock, self.cloud)
        g = {"dt": round(dt, 2), "clock": round(self.clock % 86400, 1), "tick": self.tick,
             "outdoorTemp": env["outdoorTemp"], "solar": env["solar"],
             "gridIntensity": env["gridIntensity"], "tariff": env["tariff"], "seed": self.args.seed}

        with self.pending_lock:
            commands = self.pending
            self.pending = []

        try:
            if ENGINE_EXE.exists():
                result = self._run_native(g, commands)
                self.engine_mode = "native"
            else:
                raise RuntimeError("no native engine")
        except Exception as exc:  # noqa: BLE001 -- any native failure -> python fallback
            if self.engine_mode == "native":
                log("[engine] native failed, switching to python fallback: " + str(exc))
            result = simcore.py_engine(self.world, commands, self.rules, g, self._hist_view())
            self.engine_mode = "python"

        self._apply_result(result, env)
        return result

    def _hist_view(self):
        return {did: {m: list(q) for m, q in metrics.items()} for did, metrics in self.history.items()}

    def _apply_result(self, result, env):
        by_id = {d["id"]: d for d in self.world}
        for rd in result.get("devices", []):
            d = by_id.get(rd["id"])
            if not d:
                continue
            d["state"] = rd.get("state", d["state"])
            d["online"] = rd.get("online", d["online"])
            d["rssi"] = rd.get("rssi", d["rssi"])
            d["battery"] = rd.get("battery", d["battery"])
            d["telemetry"] = rd.get("telemetry", {})
            # feed anomaly-relevant signals into history
            for metric in ("power", "co2", "pm25"):
                if metric in d["telemetry"]:
                    self._push_history(d["id"], metric, d["telemetry"][metric])
            # publish telemetry on the MQTT fabric (retained -> new subscribers get latest)
            topic = f"{TOPIC_BASE}/{d['zone']}/{d['id']}/telemetry"
            self.broker.publish(topic, json.dumps({
                "id": d["id"], "type": d["type"], "zone": d["zone"],
                "online": d["online"], "rssi": round(d["rssi"], 1),
                "battery": round(d["battery"], 1), "telemetry": d["telemetry"],
                "ts": time.time()}), retain=True)

        # daily rollups (reset at sim midnight)
        kpi = result.get("kpi", {})
        en = result.get("energy", {})
        day = int(self.clock // 86400)
        if day != self.daily["day"]:
            self.daily = {"energyKwh": 0.0, "solarKwh": 0.0, "carbonKg": 0.0,
                          "costUsd": 0.0, "peakKw": 0.0, "day": day}
            self._event("info", "新的一天，每日統計已重置")
        h = result.get("dt", 60) / 3600.0
        self.daily["energyKwh"] += kpi.get("powerKw", 0) * h
        self.daily["solarKwh"] += kpi.get("solarKw", 0) * h
        self.daily["carbonKg"] += kpi.get("carbonKgPerH", 0) * h
        self.daily["costUsd"] += en.get("tariffCostPerH", 0) * h
        self.daily["peakKw"] = max(self.daily["peakKw"], kpi.get("powerKw", 0))

        # surface events from analytics
        for a in result.get("anomalies", []):
            if a["severity"] >= 2:
                self._event("anomaly", f"{a['device']} {a['metric']} 偏離基線 (z={a['z']:.1f})",
                            dev=a["device"], sev=a["severity"])
        for rid in result.get("automations", {}).get("triggered", []):
            rule = next((r for r in self.rules if r["id"] == rid), None)
            if rule:
                self._event("automation", f"自動化觸發：{rule['name']}", sev=1)

        gw = next((d for d in self.world if d["type"] == "gateway"), None)
        if gw:
            gw["state"]["clients"] = self.broker.snapshot()["clientCount"] + self.hub.count()

        self.latest = self._snapshot(result, env)
        bsnap = self.broker.snapshot()
        self.broker.publish(f"{TOPIC_BASE}/_system/snapshot",
                            json.dumps({"kpi": kpi, "broker": bsnap, "ts": time.time()}), retain=True)
        self.hub.broadcast(json.dumps({"type": "snapshot", "data": self.latest}))

    def _event(self, kind, message, dev=None, sev=0):
        self.events.appendleft({"kind": kind, "message": message, "device": dev,
                                "severity": sev, "clock": round(self.clock % 86400),
                                "ts": time.time()})

    def _snapshot(self, result, env):
        return {
            "generatedAt": time.time(),
            "engine": self.engine_mode,
            "tick": self.tick,
            "clock": round(self.clock % 86400, 1),
            "timescale": self.timescale,
            "cloud": self.cloud,
            "environment": env,
            "building": {"name": "Fusion Tower", "zones": simcore.ZONES},
            "devices": result.get("devices", []),
            "twin": result.get("twin", {}),
            "anomalies": result.get("anomalies", []),
            "energy": result.get("energy", {}),
            "health": result.get("health", []),
            "automations": result.get("automations", {}),
            "kpi": result.get("kpi", {}),
            "daily": self.daily,
            "rules": self.rules,
            "events": list(self.events)[:30],
            "broker": self.broker.snapshot(),
            "ws": self.hub.count(),
        }

    # ---- command + config routing ----
    def enqueue_command(self, device, field, value):
        try:
            value = float(value)
        except (TypeError, ValueError):
            return False
        # route through the MQTT fabric: the in-proc subscriber appends to pending
        dev = next((d for d in self.world if d["id"] == device), None)
        zone = dev["zone"] if dev else "main"
        self.broker.publish(f"{TOPIC_BASE}/{zone}/{device}/cmd/{field}", str(value))
        self._event("control", f"指令：{device}.{field} = {value:g}", dev=device)
        return True

    def _on_cmd_topic(self, topic, payload):
        parts = topic.split("/")
        if len(parts) >= 6 and parts[4] == "cmd":
            device, field = parts[3], parts[5]
            try:
                value = float(payload.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                return
            with self.pending_lock:
                self.pending.append({"device": device, "field": field, "value": value})

    def apply_config(self, cfg):
        action = cfg.get("action")
        if action == "timescale":
            self.timescale = max(1.0, min(600.0, float(cfg.get("value", 120))))
            self._event("config", f"時間倍率設為 {self.timescale:g}×")
        elif action == "cloud":
            self.cloud = max(0.0, min(1.0, float(cfg.get("value", 1.0))))
            self._event("config", f"日照係數設為 {self.cloud:.2f}")
        elif action == "rule.toggle":
            for r in self.rules:
                if r["id"] == cfg.get("id"):
                    r["enabled"] = 0 if r["enabled"] else 1
                    self._event("config", f"規則 {r['name']} {'啟用' if r['enabled'] else '停用'}")
        elif action == "rule.add":
            rule = cfg.get("rule", {})
            rule.setdefault("id", f"r-{int(time.time()*1000)%100000}")
            rule.setdefault("enabled", 1)
            self.rules.append(rule)
            self._event("config", f"新增規則：{rule.get('name','規則')}")
        elif action == "rule.delete":
            self.rules = [r for r in self.rules if r["id"] != cfg.get("id")]
            self._event("config", "刪除規則")
        elif action == "fault.inject":
            self._inject_fault(cfg.get("device"), cfg.get("kind"))
        elif action == "reset":
            self.world = simcore.build_world(seed=self.args.seed)
            self.history = {}
            self._event("config", "已重新初始化裝置艦隊")
        return {"ok": True, "rules": self.rules, "timescale": self.timescale, "cloud": self.cloud}

    def _inject_fault(self, device, kind):
        d = next((x for x in self.world if x["id"] == device), None)
        if not d:
            return
        if kind == "offline":
            d["online"] = 0
            self._event("fault", f"注入故障：{device} 離線", dev=device, sev=2)
        elif kind == "filter" and d["type"] == "hvac":
            d["state"]["filter"] = 0.45
            self._event("fault", f"注入故障：{device} 濾網阻塞", dev=device, sev=2)
        elif kind == "leak" and d["type"] == "water":
            d["state"]["leak"] = 1
            self._event("fault", f"注入故障：{device} 漏水", dev=device, sev=3)
        elif kind == "battery":
            d["battery"] = 12.0
            self._event("fault", f"注入故障：{device} 低電量", dev=device, sev=2)
        elif kind == "online":
            d["online"] = 1
            self._event("info", f"{device} 已恢復上線", dev=device)

    # ---- main loop ----
    def run_sim(self):
        self.broker.subscribe_inproc(f"{TOPIC_BASE}/+/+/cmd/#", self._on_cmd_topic)
        # warm history so anomaly detection has a baseline quickly
        for _ in range(8):
            self.step()
        log(f"[sim] warmed; engine={self.engine_mode}")
        while self.running:
            t0 = time.time()
            try:
                self.step()
            except Exception as exc:  # noqa: BLE001
                log("[sim] step error: " + str(exc))
            dt = self.args.interval - (time.time() - t0)
            if dt > 0:
                time.sleep(dt)


# --------------------------------------------------------------------- HTTP + WS
def make_handler(app: IoTNexus):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *a):
            pass

        # -- WS upgrade lives on GET /ws --
        def do_GET(self):
            path = self.path.split("?", 1)[0]
            if path == "/ws" and self.headers.get("Upgrade", "").lower() == "websocket":
                return self._do_ws()
            if path == "/api/snapshot":
                return self._json(app.latest or {"status": "warming"})
            if path == "/api/broker":
                return self._json(app.broker.snapshot())
            if path == "/api/health":
                return self._json({"engine": app.engine_mode, "tick": app.tick,
                                   "online": app.latest.get("kpi", {}).get("online", 0),
                                   "broker": app.broker.snapshot()["clientCount"]})
            return self._static(path)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0) or 0)
            raw = self.rfile.read(length) if length else b""
            try:
                body = json.loads(raw.decode("utf-8")) if raw else {}
            except json.JSONDecodeError:
                return self._json({"ok": False, "error": "bad json"}, 400)
            path = self.path.split("?", 1)[0]
            if path == "/api/command":
                ok = app.enqueue_command(body.get("device"), body.get("field"), body.get("value"))
                return self._json({"ok": ok})
            if path == "/api/config":
                return self._json(app.apply_config(body))
            return self._json({"ok": False, "error": "not found"}, 404)

        # -- helpers --
        def _json(self, obj, code=200):
            data = json.dumps(obj).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def _static(self, path):
            if path == "/" or path == "":
                path = "/index.html"
            target = (WEB_ROOT / path.lstrip("/")).resolve()
            if not str(target).startswith(str(WEB_ROOT.resolve())) or not target.is_file():
                self.send_error(404)
                return
            data = target.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", MIME.get(target.suffix, "application/octet-stream"))
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)

        def _do_ws(self):
            key = self.headers.get("Sec-WebSocket-Key", "")
            accept = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
            self.send_response(101, "Switching Protocols")
            self.send_header("Upgrade", "websocket")
            self.send_header("Connection", "Upgrade")
            self.send_header("Sec-WebSocket-Accept", accept)
            self.end_headers()
            self.close_connection = True
            client = WsClient(self.connection)
            app.hub.add(client)
            if app.latest:
                client.send_text(json.dumps({"type": "snapshot", "data": app.latest}))
            try:
                self._ws_loop(client)
            finally:
                app.hub.remove(client)
                client.alive = False

        def _ws_loop(self, client):
            sock = self.connection
            while client.alive:
                b = self._recv_exact(sock, 2)
                if not b:
                    break
                b1, b2 = b[0], b[1]
                opcode = b1 & 0x0F
                masked = b2 & 0x80
                length = b2 & 0x7F
                if length == 126:
                    length = struct.unpack("!H", self._recv_exact(sock, 2))[0]
                elif length == 127:
                    length = struct.unpack("!Q", self._recv_exact(sock, 8))[0]
                mask = self._recv_exact(sock, 4) if masked else b"\x00\x00\x00\x00"
                payload = bytearray(self._recv_exact(sock, length))
                for i in range(len(payload)):
                    payload[i] ^= mask[i % 4]
                if opcode == 0x8:        # close
                    break
                if opcode == 0x9:        # ping
                    client.send_pong(bytes(payload))
                    continue
                if opcode == 0x1:        # text
                    self._ws_message(bytes(payload))

        def _ws_message(self, payload):
            try:
                msg = json.loads(payload.decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                return
            if msg.get("type") == "command":
                app.enqueue_command(msg.get("device"), msg.get("field"), msg.get("value"))
            elif msg.get("type") == "config":
                app.apply_config(msg.get("payload", {}))

        @staticmethod
        def _recv_exact(sock, n):
            buf = bytearray()
            while len(buf) < n:
                try:
                    chunk = sock.recv(n - len(buf))
                except OSError:
                    return b""
                if not chunk:
                    return b""
                buf += chunk
            return bytes(buf)

    return Handler


def main():
    ap = argparse.ArgumentParser(description="Fusion IoT Nexus backend")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8793)
    ap.add_argument("--mqtt-host", default="127.0.0.1")
    ap.add_argument("--mqtt-port", type=int, default=1883)
    ap.add_argument("--interval", type=float, default=1.0, help="real seconds per tick")
    ap.add_argument("--timescale", type=float, default=60.0, help="sim seconds per real second")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    app = IoTNexus(args)
    app.ensure_engine()
    try:
        app.broker.start()
    except OSError as exc:
        log(f"[mqtt] could not bind {args.mqtt_host}:{args.mqtt_port} ({exc}); broker disabled")

    threading.Thread(target=app.run_sim, daemon=True).start()

    httpd = ThreadingHTTPServer((args.host, args.port), make_handler(app))
    log(f"[http] IoT Nexus dashboard on http://{args.host}:{args.port}")
    log(f"[mqtt] MQTT broker endpoint {args.mqtt_host}:{args.mqtt_port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        app.running = False
        app.broker.stop()
        httpd.shutdown()


if __name__ == "__main__":
    main()
