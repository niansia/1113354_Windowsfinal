"""Device fleet, environment model and a pure-Python fallback edge engine.

The native C++ ``EdgeCore.exe`` is the real brain; this module supplies the
world it operates on plus a graceful-degradation fallback so the dashboard still
runs (with slightly simpler physics) if the native engine cannot be built.
"""
from __future__ import annotations

import math
import random
from typing import Dict, List

# ----------------------------------------------------------------- building model
# Each zone has a floor + a normalized rectangle (0..1) used by the digital-twin
# floor plan in the web UI.
ZONES = [
    {"id": "lobby",     "label": "大廳",      "floor": "L1", "x": 0.05, "y": 0.55, "w": 0.40, "h": 0.38},
    {"id": "reception", "label": "接待區",    "floor": "L1", "x": 0.50, "y": 0.55, "w": 0.45, "h": 0.38},
    {"id": "office",    "label": "開放辦公區", "floor": "L2", "x": 0.05, "y": 0.10, "w": 0.55, "h": 0.80},
    {"id": "meetingA",  "label": "會議室 A",   "floor": "L2", "x": 0.64, "y": 0.10, "w": 0.31, "h": 0.38},
    {"id": "meetingB",  "label": "會議室 B",   "floor": "L2", "x": 0.64, "y": 0.52, "w": 0.31, "h": 0.38},
    {"id": "cafe",      "label": "員工餐廳",   "floor": "L3", "x": 0.05, "y": 0.10, "w": 0.50, "h": 0.80},
    {"id": "lab",       "label": "研發實驗室", "floor": "L3", "x": 0.58, "y": 0.10, "w": 0.37, "h": 0.80},
    {"id": "serverroom","label": "機房",      "floor": "B1", "x": 0.05, "y": 0.10, "w": 0.40, "h": 0.55},
    {"id": "parking",   "label": "地下停車場", "floor": "B1", "x": 0.50, "y": 0.10, "w": 0.45, "h": 0.80},
    {"id": "roof",      "label": "頂樓能源區", "floor": "RF", "x": 0.05, "y": 0.10, "w": 0.90, "h": 0.80},
    {"id": "main",      "label": "全棟",      "floor": "--", "x": 0.0,  "y": 0.0,  "w": 0.0,  "h": 0.0},
]

ZONE_LABELS = {z["id"]: z["label"] for z in ZONES}

VENDORS = ["AetherSense", "NimbusIO", "VoltEdge", "PhotonGrid", "TerraNode", "PulseWorks"]


def _fw():
    return f"{random.randint(1,4)}.{random.randint(0,9)}.{random.randint(0,9)}"


def _dev(did, dtype, zone, name, state, battery=100.0, rssi=-55.0, powered="mains"):
    return {
        "id": did, "type": dtype, "zone": zone, "name": name,
        "vendor": random.choice(VENDORS), "firmware": _fw(),
        "powered": powered, "online": 1, "rssi": rssi, "battery": battery,
        "state": state,
    }


def build_world(seed: int = 7) -> List[dict]:
    random.seed(seed)
    w: List[dict] = []

    def hvac(did, zone, name, setp=23.0, rated=2400.0, mode=1):
        return _dev(did, "hvac", zone, name, {
            "temp": setp + random.uniform(1.5, 4.0), "setpoint": setp, "mode": mode,
            "on": 0, "filter": random.uniform(0.62, 0.99), "rated": rated, "runtime": random.uniform(0, 3500),
        })

    def light(did, zone, name, rated=320.0):
        return _dev(did, "light", zone, name, {"bright": 0.0, "auto": 1, "rated": rated})

    def occ(did, zone, name, cap=12):
        return _dev(did, "occupancy", zone, name, {"capacity": cap, "count": 0}, battery=random.uniform(40, 100), rssi=-62, powered="battery")

    def air(did, zone, name):
        return _dev(did, "air", zone, name, {
            "co2": random.uniform(430, 520), "pm25": random.uniform(6, 14),
            "voc": random.uniform(90, 180), "humidity": random.uniform(42, 55),
        }, battery=random.uniform(45, 100), rssi=-64, powered="battery")

    def plug(did, zone, name, rated=90.0):
        return _dev(did, "plug", zone, name, {"on": 1, "rated": rated})

    def water(did, zone, name):
        return _dev(did, "water", zone, name, {"valve": 1, "leak": 0}, battery=random.uniform(50, 100), rssi=-66, powered="battery")

    def lock(did, zone, name):
        return _dev(did, "lock", zone, name, {"locked": 1}, battery=random.uniform(35, 95), rssi=-60, powered="battery")

    # L1
    w += [hvac("hvac-lobby", "lobby", "大廳空調"), light("light-lobby", "lobby", "大廳照明", 540),
          occ("occ-lobby", "lobby", "大廳人流", 20), air("air-lobby", "lobby", "大廳空氣品質"),
          lock("lock-main", "lobby", "正門電子鎖"), plug("plug-kiosk", "reception", "互動資訊站", 140),
          occ("occ-recep", "reception", "接待人流", 8)]
    # L2
    w += [hvac("hvac-office", "office", "辦公區空調", 23.5, 3200), light("light-office", "office", "辦公區照明", 760),
          occ("occ-office", "office", "辦公區人流", 40), air("air-office", "office", "辦公區空氣品質"),
          plug("plug-office", "office", "茶水間電源", 1500),
          hvac("hvac-meetA", "meetingA", "會議室 A 空調", 22.5, 1600), light("light-meetA", "meetingA", "會議室 A 照明"),
          occ("occ-meetA", "meetingA", "會議室 A 人流", 10), air("air-meetA", "meetingA", "會議室 A 空氣品質"),
          hvac("hvac-meetB", "meetingB", "會議室 B 空調", 22.5, 1600), occ("occ-meetB", "meetingB", "會議室 B 人流", 10),
          air("air-meetB", "meetingB", "會議室 B 空氣品質")]
    # L3
    w += [hvac("hvac-cafe", "cafe", "餐廳空調", 23.0, 2600), light("light-cafe", "cafe", "餐廳照明", 620),
          occ("occ-cafe", "cafe", "餐廳人流", 30), air("air-cafe", "cafe", "餐廳空氣品質"),
          plug("plug-fridge", "cafe", "商用冰箱", 350), water("water-cafe", "cafe", "餐廳水流感測"),
          hvac("hvac-lab", "lab", "實驗室空調", 21.0, 2200), light("light-lab", "lab", "實驗室照明"),
          occ("occ-lab", "lab", "實驗室人流", 12), air("air-lab", "lab", "實驗室空氣品質"),
          plug("plug-lab", "lab", "實驗設備電源", 1800)]
    # B1
    w += [hvac("crac-server", "serverroom", "機房精密空調", 18.0, 4200), air("air-server", "serverroom", "機房環境"),
          plug("rack-server", "serverroom", "伺服器機櫃", 3600), water("water-server", "serverroom", "地板漏水偵測"),
          occ("occ-park", "parking", "停車場人流", 6), light("light-park", "parking", "停車場照明", 900),
          _dev("ev-1", "evcharger", "parking", "充電樁 #1", {"connected": 0, "soc": random.uniform(20, 60), "rated": 7.4}),
          _dev("ev-2", "evcharger", "parking", "充電樁 #2", {"connected": 1, "soc": random.uniform(30, 70), "rated": 11.0})]
    # Roof / energy
    w += [_dev("pv-roof", "solar", "roof", "屋頂太陽能陣列", {"capacity": 18000.0, "energy": 0.0}, rssi=-48),
          _dev("ess-roof", "battery", "roof", "儲能電池組", {"soc": random.uniform(40, 70), "capacity": 40.0, "maxPower": 10.0}, rssi=-50),
          _dev("gw-roof", "gateway", "roof", "邊緣閘道器", {"uptime": 0, "clients": 0}, rssi=-46)]
    # Main meter
    w += [_dev("meter-main", "meter", "main", "全棟智慧電表", {"energy": 0.0}, rssi=-42)]
    return w


def default_rules() -> List[dict]:
    return [
        {"id": "r-co2-meetA", "enabled": 1, "name": "會議室 A CO₂ 換氣",
         "mDev": "air-meetA", "metric": "co2", "op": ">", "thr": 1000,
         "aDev": "hvac-meetA", "aField": "mode", "aVal": 3},
        {"id": "r-leak-valve", "enabled": 1, "name": "機房漏水自動關閥",
         "mDev": "water-server", "metric": "leak", "op": ">", "thr": 0.5,
         "aDev": "water-server", "aField": "valve", "aVal": 0},
        {"id": "r-server-heat", "enabled": 1, "name": "機房高溫降溫",
         "mDev": "crac-server", "metric": "temp", "op": ">", "thr": 22,
         "aDev": "crac-server", "aField": "setpoint", "aVal": 18},
        {"id": "r-night-office", "enabled": 0, "name": "辦公區夜間關燈",
         "mDev": "occ-office", "metric": "count", "op": "<", "thr": 1,
         "aDev": "light-office", "aField": "auto", "aVal": 0},
    ]


# --------------------------------------------------------------------- environment
def environment(clock_s: float, cloud: float = 1.0) -> Dict[str, float]:
    h = (clock_s / 3600.0) % 24.0
    outdoor = 27.5 + 5.5 * math.cos((h - 15.0) * 2.0 * math.pi / 24.0)
    if 6.0 <= h <= 19.0:
        solar = max(0.0, math.sin((h - 6.0) / 13.0 * math.pi)) * cloud
    else:
        solar = 0.0
    grid = 520.0 - 150.0 * min(1.0, solar)
    if 18.0 <= h <= 22.0:
        grid += 90.0
        tariff = 0.32
    elif h >= 23.0 or h < 7.0:
        tariff = 0.10
    else:
        tariff = 0.18
    return {"outdoorTemp": round(outdoor, 2), "solar": round(solar, 3),
            "gridIntensity": round(grid, 1), "tariff": tariff}


# ------------------------------------------------------------- pure-python fallback
def py_engine(world, commands, rules, g, history):
    """A simplified mirror of edge_core.cpp for when the native engine is absent."""
    dt = g.get("dt", 60.0)
    clock = g.get("clock", 43200.0)
    outdoor = g.get("outdoorTemp", 24.0)
    solar = g.get("solar", 0.0)
    grid = g.get("gridIntensity", 480.0)
    tariff = g.get("tariff", 0.18)
    h = (clock / 3600.0) % 24.0

    by_id = {d["id"]: d for d in world}
    for c in commands:
        d = by_id.get(c["device"])
        if d:
            if c["field"] == "online":
                d["online"] = int(c["value"])
            else:
                d["state"][c["field"]] = c["value"]

    zone_occ = {}
    for d in world:
        if d["type"] == "occupancy":
            cap = d["state"].get("capacity", 12)
            base = 0.0
            if 6.5 <= h <= 20.0:
                base = max(0.0, min((h - 6.5) / 2.5, (20.0 - h) / 3.0, 1.0))
            target = base * cap * (0.7 + 0.6 * random.random())
            prev = d["state"].get("count", 0)
            nxt = max(0.0, min(cap, prev + (target - prev) * 0.3 + random.gauss(0, 0.6)))
            if nxt < 0.4:
                nxt = 0.0
            d["state"]["count"] = nxt
            d["state"]["occupied"] = 1.0 if nxt >= 1 else 0.0
            d["telemetry"] = {"count": round(nxt), "occupied": d["state"]["occupied"], "online": d["online"]}
            zone_occ[d["zone"]] = nxt

    sums = {"hvac": 0, "lighting": 0, "plug": 0, "ev": 0}
    solar_kw = battery_kw = 0.0
    ztemp, zset, zco2, zlux, zpow = {}, {}, {}, {}, {}

    for d in world:
        if d["type"] == "occupancy":
            continue
        st = d["state"]
        d.setdefault("telemetry", {})
        tel = d["telemetry"] = {"online": d["online"], "rssi": d["rssi"]}
        occ = zone_occ.get(d["zone"], 0)
        if not d["online"] and d["type"] != "gateway":
            continue
        t = d["type"]
        if t == "hvac":
            temp = st.get("temp", outdoor); setp = st.get("setpoint", 23); mode = int(st.get("mode", 1))
            on = int(st.get("on", 0)); filt = st.get("filter", 1.0); rated = st.get("rated", 2400)
            temp += (outdoor - temp) * min(1.0, dt / 7200.0) + solar * 0.0009 * dt + occ * 0.00007 * dt
            flux = 0.0045 * (rated / 2400.0)
            cooling = mode == 1 or (mode == 3 and temp > setp)
            if cooling:
                if not on and temp > setp + 0.4:
                    on = 1
                if on and temp < setp - 0.4:
                    on = 0
                if on:
                    temp -= flux * dt
            else:
                on = 0
            duty = min(1.0, 0.55 + abs(temp - setp) * 0.3) if on else 0.0
            power = (rated * duty / max(0.45, filt) + 60) if on else 18
            filt = max(0.4, filt - (dt / (3600 * 900) if on else 0))
            st.update(temp=temp, on=on, filter=filt)
            tel.update(temp=temp, setpoint=setp, power=power, duty=duty * 100, mode=mode, on=on, filter=filt * 100)
            sums["hvac"] += power / 1000; ztemp[d["zone"]] = temp; zset[d["zone"]] = setp
            zpow[d["zone"]] = zpow.get(d["zone"], 0) + power / 1000
        elif t == "light":
            rated = st.get("rated", 320); daylight = min(1.0, solar * 1.1)
            target = (max(0.15, 1 - daylight * 0.8) if occ > 0 else 0.0) if st.get("auto", 1) else (1.0 if st.get("on", 0) else 0)
            bright = st.get("bright", 0); bright += (target - bright) * min(1.0, dt / 30)
            bright = max(0, min(1, bright)); power = bright * rated + (3 if bright > 0.01 else 0)
            st["bright"] = bright; st["on"] = 1 if bright > 0.02 else 0
            tel.update(bright=bright * 100, power=power, lux=daylight * 9000 + bright * 520, on=st["on"])
            sums["lighting"] += power / 1000; zlux[d["zone"]] = tel["lux"]
        elif t == "air":
            tau_vent = 700.0 if occ > 0 else 1500.0
            co2 = st.get("co2", 430) + occ * 0.025 * dt - (st.get("co2", 430) - 420) * min(1.0, dt / tau_vent)
            co2 = max(400, min(3000, co2 + random.gauss(0, 3)))
            pm = max(2, min(160, st.get("pm25", 8) + occ * 0.04 + random.gauss(0, 0.5) - 0.3))
            st.update(co2=co2, pm25=pm)
            tel.update(co2=co2, pm25=pm, voc=st.get("voc", 120), humidity=st.get("humidity", 48),
                       aqi=max(0, min(500, pm * 4 + (co2 - 600) * 0.05)))
            zco2[d["zone"]] = co2
        elif t == "solar":
            cap = st.get("capacity", 12000); derate = 1 - min(0.3, max(0, (outdoor + solar * 22 - 25) * 0.004))
            power = max(0, cap * min(1, solar) * derate + random.gauss(0, 40))
            st["energy"] = st.get("energy", 0) + power / 1000 * dt / 3600
            tel.update(power=power, energy=st["energy"], efficiency=derate * 100)
            solar_kw += power / 1000
        elif t == "battery":
            soc = st.get("soc", 55); cap = st.get("capacity", 13.5); mp = st.get("maxPower", 5)
            p = 0.0
            if solar > 0.45 and soc < 96:
                p = min(mp, (solar - 0.45) * mp * 2)
            elif 18 <= h <= 22 and soc > 12:
                p = -mp * 0.7
            soc = max(5, min(100, soc + (p * dt / 3600) / cap * 100 * (0.95 if p > 0 else 1.05)))
            st["soc"] = soc
            tel.update(soc=soc, power=p, mode=1 if p > 0.05 else (2 if p < -0.05 else 0))
            battery_kw += p
        elif t == "evcharger":
            conn = int(st.get("connected", 0)); soc = st.get("soc", 40); rated = st.get("rated", 7.4)
            if conn and soc >= 99.5:
                conn = 0
            p = rated if (conn and soc < 99.5) else 0
            if p:
                soc = min(100, soc + (p * dt / 3600) / 60 * 100)
            st.update(connected=conn, soc=soc)
            tel.update(connected=conn, soc=soc, power=p * 1000)
            sums["ev"] += p
        elif t == "plug":
            rated = st.get("rated", 90); on = int(st.get("on", 1))
            duty = max(0, min(1, 0.4 + 0.5 * math.sin(clock / 900))) if on else 0
            power = max(0, rated * duty + 1.5 + random.gauss(0, 2)) if on else 0.6
            tel.update(on=on, power=power, duty=duty * 100)
            sums["plug"] += power / 1000; zpow[d["zone"]] = zpow.get(d["zone"], 0) + power / 1000
        elif t == "water":
            valve = int(st.get("valve", 1)); leak = int(st.get("leak", 0)); flow = 0.0
            if valve and random.random() > 0.86:
                flow = 2 + random.gauss(0, 0.6)
            if not leak and random.random() > 0.997:
                leak = 1
            if leak:
                flow = max(flow, 0.8)
            st.update(valve=valve, leak=leak)
            tel.update(flow=max(0, flow), leak=leak, valve=valve)
        elif t == "lock":
            d["battery"] = max(0, d["battery"] - dt / 3600 * 0.02)
            tel.update(locked=int(st.get("locked", 1)), battery=d["battery"])
        elif t == "gateway":
            st["uptime"] = st.get("uptime", 0) + dt
            tel.update(cpu=max(2, min(100, 18 + occ * 1.2 + random.gauss(0, 4))), uptime=st["uptime"],
                       clients=st.get("clients", 0), mqttUp=1)

    base = 0.9
    gross = sum(sums.values()) + base
    net = max(0.0, gross - solar_kw + battery_kw)
    for d in world:
        if d["type"] == "meter":
            d["state"]["energy"] = d["state"].get("energy", 0) + net * dt / 3600
            d["telemetry"] = {"power": net * 1000, "gross": gross * 1000, "energy": d["state"]["energy"],
                              "voltage": 230, "current": net * 1000 / 230, "pf": 0.93, "online": 1}

    zcomfort = {}
    for z, t in ztemp.items():
        sp = zset.get(z, 23); co2 = zco2.get(z, 500)
        zcomfort[z] = 0.6 * max(0, min(100, 100 - abs(t - sp) * 14)) + 0.4 * max(0, min(100, 100 - max(0, co2 - 600) * 0.06))

    # anomalies via robust z over history
    anomalies = []

    def rz(win, x):
        if len(win) < 8:
            return 0.0
        alpha = 0.25
        m, d = win[0], 0.0
        for v in win[1:]:
            d = alpha * abs(v - m) + (1 - alpha) * d
            m = alpha * v + (1 - alpha) * m
        sigma = max(1.4826 * d, 0.05 * abs(m) + 1e-3)
        return max(-99.0, min(99.0, (x - m) / sigma))

    for d in world:
        if not d.get("online"):
            continue
        hist = history.get(d["id"], {})
        # z-score only the building meter (whole-building load) + ventilation CO2.
        # Per-unit HVAC/plug power cycles on its own; those faults surface via the
        # predictive-maintenance health score, not as anomaly alerts.
        check = (["power"] if d["type"] == "meter" else
                 ["co2"] if d["type"] == "air" else [])
        for metric in check:
            if metric in d.get("telemetry", {}) and metric in hist:
                z = rz(hist[metric], d["telemetry"][metric])
                sev = 3 if abs(z) >= 6 else 2 if abs(z) >= 4 else 1 if abs(z) >= 3 else 0
                if sev:
                    anomalies.append({"device": d["id"], "zone": d["zone"], "metric": metric,
                                      "value": d["telemetry"][metric], "z": z, "severity": sev})
        if d["type"] == "water" and d.get("telemetry", {}).get("leak", 0) > 0.5:
            anomalies.append({"device": d["id"], "zone": d["zone"], "metric": "leak", "value": 1, "z": 9, "severity": 3})

    # health
    health = []
    for d in world:
        score = 100.0; reason = "nominal"; st = d["state"]
        if d["type"] == "hvac":
            score = max(0, min(100, st.get("filter", 1) * 100 - st.get("runtime", 0) * 0.002))
            if st.get("filter", 1) < 0.7:
                reason = "filter"
        elif d["type"] in ("lock", "occupancy", "air", "water"):
            score = d["battery"]
            if d["battery"] < 25:
                reason = "battery"
        elif d["type"] == "gateway":
            score = max(0, 100 - d.get("telemetry", {}).get("cpu", 20) * 0.3)
        if not d["online"]:
            score = 0; reason = "offline"
        if d["rssi"] < -82:
            score = min(score, 55)
        status = 0 if score >= 80 else 1 if score >= 60 else 2 if score >= 35 else 3
        health.append({"id": d["id"], "score": score, "status": status,
                       "etaDays": 9999 if status == 0 else max(1, score * 1.5), "reason": reason})

    # automations
    triggered, issued = [], []
    for r in rules:
        if not r.get("enabled"):
            continue
        d = by_id.get(r["mDev"])
        v = (d.get("telemetry", {}).get(r["metric"]) if d else None)
        if v is None and d:
            v = d["state"].get(r["metric"], 0)
        if v is None:
            continue
        op = r["op"]; thr = r["thr"]
        fire = (op == ">" and v > thr) or (op == "<" and v < thr) or (op == ">=" and v >= thr) or \
               (op == "<=" and v <= thr) or (op == "==" and abs(v - thr) < 1e-6)
        if fire:
            triggered.append(r["id"])
            ad = by_id.get(r["aDev"])
            if ad and abs(ad["state"].get(r["aField"], 1e18) - r["aVal"]) > 1e-6:
                ad["state"][r["aField"]] = r["aVal"]
                issued.append({"device": r["aDev"], "field": r["aField"], "value": r["aVal"]})

    power_kw = net
    online = sum(1 for d in world if d["online"])
    zones_out = []
    allz = set(list(ztemp) + list(zco2) + list(zone_occ) + list(zlux))
    for z in allz:
        zones_out.append({"zone": z, "climate": 1 if z in ztemp else 0,
                          "temp": round(ztemp.get(z, outdoor), 2), "setpoint": zset.get(z, 0),
                          "co2": round(zco2[z]) if z in zco2 else -1, "occupancy": round(zone_occ.get(z, 0)),
                          "lux": round(zlux.get(z, 0)), "power": round(zpow.get(z, 0), 3),
                          "comfort": round(zcomfort[z], 1) if z in zcomfort else -1})

    return {
        "engine": "python", "tick": g.get("tick", 0), "clock": clock, "dt": dt,
        "hourOfDay": h, "outdoor": outdoor, "solar": solar,
        "devices": [{"id": d["id"], "type": d["type"], "zone": d["zone"], "online": d["online"],
                     "rssi": d["rssi"], "battery": d["battery"], "state": d["state"],
                     "telemetry": d.get("telemetry", {})} for d in world],
        "twin": {"zones": zones_out},
        "anomalies": anomalies,
        "energy": {"totalKw": power_kw, "grossKw": gross, "solarKw": solar_kw, "batteryKw": battery_kw,
                   "gridKw": power_kw, "carbonKgPerH": power_kw * grid / 1000,
                   "selfConsumption": min(100, solar_kw / gross * 100) if gross else 0,
                   "tariffCostPerH": power_kw * tariff,
                   "breakdown": {"hvac": sums["hvac"], "lighting": sums["lighting"], "plug": sums["plug"],
                                 "ev": sums["ev"], "base": base, "other": 0}},
        "health": health,
        "automations": {"triggered": triggered, "commands": issued},
        "kpi": {"powerKw": power_kw, "solarKw": solar_kw, "carbonKgPerH": power_kw * grid / 1000,
                "selfConsumption": min(100, solar_kw / gross * 100) if gross else 0,
                "online": online, "total": len(world), "anomalies": len(anomalies),
                "comfortAvg": round(sum(zcomfort.values()) / len(zcomfort), 1) if zcomfort else 0,
                "co2Avg": round(sum(zco2.values()) / len(zco2)) if zco2 else 0},
    }
