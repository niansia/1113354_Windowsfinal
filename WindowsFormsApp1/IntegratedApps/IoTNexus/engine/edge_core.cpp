// ============================================================================
//  Fusion IoT Nexus -- Edge Compute Core (native C++ digital-twin + analytics)
// ----------------------------------------------------------------------------
//  This is the "brain" that the Python broker (server.py) drives once per tick.
//  It is intentionally stateless across invocations: the broker owns the
//  canonical device state and feeds the previous state in on stdin; the engine
//  advances the physics one timestep, runs the edge analytics, evaluates the
//  automation rules, and prints ONE self-contained JSON document on stdout.
//
//  What it computes every tick:
//    * a multi-zone digital-twin thermal model (lumped RC envelope coupling
//      driven by outdoor temperature, solar gain, occupancy and HVAC flux),
//    * physically-plausible dynamics for ~12 device classes (HVAC, lighting,
//      occupancy, air quality, power meter, PV inverter, battery ESS, EV
//      charger, smart plug, water/leak, smart lock, edge gateway),
//    * robust streaming anomaly detection (median + MAD Hampel z-score),
//    * NILM-style energy disaggregation + carbon / self-consumption KPIs,
//    * predictive-maintenance health scoring (drift + duty-cycle + battery),
//    * an automation rule engine (condition -> actuator command).
//
//  Wire format -- stdin (tab-separated, one record per line):
//    G  <key> <value>                              global/environment scalar
//    D  <id> <type> <zone> <online> <rssi> <batt> <k=v,k=v,...>   device + state
//    C  <deviceId> <field> <value>                 pending control command
//    R  <id> <enabled> <mDev> <metric> <op> <thr> <aDev> <aField> <aVal> <name>
//    H  <deviceId> <metric> <v0,v1,...>            recent history window
//
//  Build:  g++ -std=c++17 -O2 edge_core.cpp -o EdgeCore.exe
// ============================================================================
#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdint>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <map>
#include <random>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

// ----------------------------------------------------------------- json utils
static std::string jsonEscape(const std::string& s) {
    std::ostringstream out;
    for (char c : s) {
        switch (c) {
            case '\\': out << "\\\\"; break;
            case '"': out << "\\\""; break;
            case '\n': out << "\\n"; break;
            case '\r': out << "\\r"; break;
            case '\t': out << "\\t"; break;
            default:
                if (static_cast<unsigned char>(c) < 0x20) {
                    out << "\\u" << std::hex << std::setw(4) << std::setfill('0')
                        << static_cast<int>(c);
                } else {
                    out << c;
                }
        }
    }
    return out.str();
}
static std::string q(const std::string& s) { return "\"" + jsonEscape(s) + "\""; }
static std::string num(double v, int digits = 2) {
    if (!std::isfinite(v)) v = 0.0;
    std::ostringstream out;
    out << std::fixed << std::setprecision(digits) << v;
    std::string s = out.str();
    // trim trailing zeros for compactness
    if (s.find('.') != std::string::npos) {
        size_t last = s.find_last_not_of('0');
        if (s[last] == '.') last--;
        s.erase(last + 1);
    }
    return s;
}

// ----------------------------------------------------------------- string utils
static std::vector<std::string> split(const std::string& s, char d) {
    std::vector<std::string> out;
    std::string cur;
    std::istringstream is(s);
    while (std::getline(is, cur, d)) out.push_back(cur);
    return out;
}
static double toD(const std::string& s, double def = 0.0) {
    if (s.empty()) return def;
    try { return std::stod(s); } catch (...) { return def; }
}
static double clampd(double v, double lo, double hi) {
    return v < lo ? lo : (v > hi ? hi : v);
}

// ----------------------------------------------------------------- model types
struct Device {
    std::string id, type, zone;
    int online = 1;
    double rssi = -55, battery = 100;
    std::map<std::string, double> st;   // persistent numeric state (round-tripped)
    std::map<std::string, double> tel;  // computed telemetry for this tick
};
struct Command { std::string dev, field; double val = 0; };
struct Rule {
    std::string id, mDev, metric, op, aDev, aField, name;
    int enabled = 1; double thr = 0, aVal = 0;
};
struct Anomaly {
    std::string dev, zone, metric; double value = 0, z = 0; int sev = 0;
};

// deterministic per-key jitter so each device has its own character
static double hashUnit(const std::string& key, uint32_t salt) {
    uint64_t h = 1469598103934665603ULL;
    for (char c : key) { h ^= (unsigned char)c; h *= 1099511628211ULL; }
    h ^= salt + 0x9e3779b97f4a7c15ULL; h *= 1099511628211ULL;
    return ((h >> 11) & 0xFFFFFF) / double(0xFFFFFF);
}

// Streaming anomaly score over a history window using an EWMA baseline.
// An EWMA mean + EWMA mean-abs-deviation tracks gradual diurnal ramps closely
// (so the daily occupancy/CO2/load cycle does NOT look anomalous), while a
// sudden step (an injected fault, a stuck actuator) jumps ahead of the baseline
// and yields a large z. The window holds PRIOR values; x is the current sample.
static double robustZ(const std::vector<double>& w, double x) {
    if (w.size() < 8) return 0.0;
    const double alpha = 0.25;
    double m = w[0], d = 0.0;
    for (size_t i = 1; i < w.size(); ++i) {
        double e = std::fabs(w[i] - m);
        d = alpha * e + (1 - alpha) * d;
        m = alpha * w[i] + (1 - alpha) * m;
    }
    double sigma = 1.4826 * d;
    double floor = 0.05 * std::fabs(m) + 1e-3;   // avoid divide-by-tiny on flat signals
    if (sigma < floor) sigma = floor;
    double z = (x - m) / sigma;
    if (z > 99.0) z = 99.0;
    if (z < -99.0) z = -99.0;
    return z;
}

int main() {
    std::ios::sync_with_stdio(false);

    std::map<std::string, double> G;
    std::vector<Device> devices;
    std::vector<Command> commands;
    std::vector<Rule> rules;
    // history[deviceId][metric] = window of recent values
    std::map<std::string, std::map<std::string, std::vector<double>>> history;

    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        auto f = split(line, '\t');
        if (f.empty()) continue;
        const std::string& tag = f[0];
        if (tag == "G" && f.size() >= 3) {
            G[f[1]] = toD(f[2]);
        } else if (tag == "D" && f.size() >= 7) {
            Device d;
            d.id = f[1]; d.type = f[2]; d.zone = f[3];
            d.online = (int)toD(f[4], 1);
            d.rssi = toD(f[5], -55);
            d.battery = toD(f[6], 100);
            if (f.size() >= 8) {
                for (auto& kv : split(f[7], ',')) {
                    auto p = split(kv, '=');
                    if (p.size() == 2) d.st[p[0]] = toD(p[1]);
                }
            }
            devices.push_back(d);
        } else if (tag == "C" && f.size() >= 4) {
            Command c; c.dev = f[1]; c.field = f[2]; c.val = toD(f[3]);
            commands.push_back(c);
        } else if (tag == "R" && f.size() >= 11) {
            Rule r;
            r.id = f[1]; r.enabled = (int)toD(f[2], 1);
            r.mDev = f[3]; r.metric = f[4]; r.op = f[5]; r.thr = toD(f[6]);
            r.aDev = f[7]; r.aField = f[8]; r.aVal = toD(f[9]); r.name = f[10];
            rules.push_back(r);
        } else if (tag == "H" && f.size() >= 4) {
            std::vector<double> w;
            for (auto& v : split(f[3], ',')) if (!v.empty()) w.push_back(toD(v));
            history[f[1]][f[2]] = w;
        }
    }

    const double dt        = G.count("dt") ? G["dt"] : 60.0;          // sim seconds / tick
    const double clock     = G.count("clock") ? G["clock"] : 43200.0; // seconds since midnight
    const double tick      = G.count("tick") ? G["tick"] : 0.0;
    const double outdoor   = G.count("outdoorTemp") ? G["outdoorTemp"] : 24.0;
    const double solar     = clampd(G.count("solar") ? G["solar"] : 0.0, 0.0, 1.2);
    const double gridInt   = G.count("gridIntensity") ? G["gridIntensity"] : 480.0; // gCO2/kWh
    const double tariff    = G.count("tariff") ? G["tariff"] : 0.18;  // $/kWh
    const double hourOfDay = std::fmod(clock / 3600.0, 24.0);
    std::mt19937 rng((uint32_t)(G.count("seed") ? G["seed"] : 7) ^ (uint32_t)(tick * 2654435761u));
    auto noise = [&](double amp) {
        std::normal_distribution<double> nd(0.0, amp); return nd(rng);
    };

    // apply pending commands onto device state up-front
    std::unordered_map<std::string, Device*> byId;
    for (auto& d : devices) byId[d.id] = &d;
    for (auto& c : commands) {
        auto it = byId.find(c.dev);
        if (it != byId.end()) {
            if (c.field == "online") it->second->online = (int)c.val;
            else it->second->st[c.field] = c.val;
        }
    }

    // ---- pass 1: per-zone occupancy (drives climate, lighting, CO2) ----------
    std::map<std::string, double> zoneOcc, zoneArea;
    for (auto& d : devices) {
        if (d.type == "occupancy") {
            // diurnal building occupancy: ramp 7-9h, plateau, decay 17-20h
            double base = 0.0;
            if (hourOfDay >= 6.5 && hourOfDay <= 20.0) {
                double peak = 1.0;
                double am = clampd((hourOfDay - 6.5) / 2.5, 0.0, 1.0);
                double pm = clampd((20.0 - hourOfDay) / 3.0, 0.0, 1.0);
                base = peak * std::min(am, pm);
            }
            double cap = d.st.count("capacity") ? d.st["capacity"] : 12.0;
            double phase = hashUnit(d.id, 1) * 0.6 + 0.7;       // per-zone busy-ness
            double target = base * cap * phase;
            double prev = d.st.count("count") ? d.st["count"] : 0.0;
            // people move gradually + Poisson-ish flicker
            double next = prev + (target - prev) * clampd(dt / 600.0, 0.05, 1.0)
                          + noise(0.6);
            next = clampd(next, 0.0, cap);
            if (next < 0.4) next = 0.0;
            d.st["count"] = next;
            d.st["occupied"] = next >= 1.0 ? 1.0 : 0.0;
            d.tel["count"] = std::round(next);
            d.tel["occupied"] = d.st["occupied"];
            zoneOcc[d.zone] = next;
        }
    }
    auto occOf = [&](const std::string& z) {
        auto it = zoneOcc.find(z); return it == zoneOcc.end() ? 0.0 : it->second;
    };

    // ---- pass 2: device dynamics --------------------------------------------
    double sumLoadKw = 0, hvacKw = 0, lightKw = 0, plugKw = 0, evKw = 0, otherKw = 0;
    double solarKw = 0, batteryKw = 0;
    std::map<std::string, double> zoneTemp, zoneSet, zoneCo2, zoneLux,
                                  zonePower, zoneComfort;

    for (auto& d : devices) {
        if (!d.online && d.type != "gateway") {
            // an offline node reports nothing this tick
            d.tel["online"] = 0;
            continue;
        }
        const double occ = occOf(d.zone);

        if (d.type == "hvac") {
            double temp = d.st.count("temp") ? d.st["temp"] : outdoor;
            double setp = d.st.count("setpoint") ? d.st["setpoint"] : 23.0;
            int mode    = (int)(d.st.count("mode") ? d.st["mode"] : 1); // 0 off 1 cool 2 heat 3 auto
            int on      = (int)(d.st.count("on") ? d.st["on"] : 0);
            double filt = d.st.count("filter") ? d.st["filter"] : 1.0;  // 1=clean..0=clogged
            double rated = d.st.count("rated") ? d.st["rated"] : 2400.0; // W
            double runtime = d.st.count("runtime") ? d.st["runtime"] : 0.0;

            // envelope coupling toward outdoor + solar + occupancy gains
            double tau = 7200.0;                        // ~2 h envelope time constant
            temp += (outdoor - temp) * clampd(dt / tau, 0.0, 1.0);
            temp += solar * 0.0009 * dt;               // solar heat gain
            temp += occ * 0.00007 * dt;                // metabolic heat
            // hysteresis compressor control (deadband +-0.4C); cooling/heating
            // flux scales with rated capacity so larger units overcome bigger loads.
            double flux = 0.0045 * (rated / 2400.0);
            bool cooling = (mode == 1) || (mode == 3 && temp > setp);
            bool heating = (mode == 2) || (mode == 3 && temp < setp);
            if (cooling) {
                if (!on && temp > setp + 0.4) on = 1;
                if (on && temp < setp - 0.4) on = 0;
                if (on) temp -= flux * dt;             // cooling flux
            } else if (heating) {
                if (!on && temp < setp - 0.4) on = 1;
                if (on && temp > setp + 0.4) on = 0;
                if (on) temp += flux * dt;
            } else { on = 0; }

            double duty = on ? clampd(0.55 + std::fabs(temp - setp) * 0.3, 0.3, 1.0) : 0.0;
            // clogged filter draws more power for the same cooling => efficiency loss
            double power = on ? rated * duty / clampd(filt, 0.45, 1.0) + 60.0 : 18.0;
            power += noise(8.0);
            // filter slowly clogs while running; faults raise power
            filt = clampd(filt - (on ? dt / (3600.0 * 900.0) : 0), 0.4, 1.0);
            runtime += on ? dt / 3600.0 : 0.0;

            d.st["temp"] = temp; d.st["setpoint"] = setp; d.st["mode"] = mode;
            d.st["on"] = on; d.st["filter"] = filt; d.st["rated"] = rated;
            d.st["runtime"] = runtime;
            d.tel["temp"] = temp; d.tel["setpoint"] = setp; d.tel["power"] = power;
            d.tel["duty"] = duty * 100.0; d.tel["mode"] = mode; d.tel["on"] = on;
            d.tel["filter"] = filt * 100.0;
            hvacKw += power / 1000.0; sumLoadKw += power / 1000.0;
            zoneTemp[d.zone] = temp; zoneSet[d.zone] = setp;
            zonePower[d.zone] += power / 1000.0;

        } else if (d.type == "light") {
            int autoM = (int)(d.st.count("auto") ? d.st["auto"] : 1);
            double bright = d.st.count("bright") ? d.st["bright"] : 0.0;
            double rated = d.st.count("rated") ? d.st["rated"] : 320.0;
            // daylight harvesting: more daylight -> dimmer artificial light
            double daylight = clampd(solar * 1.1, 0.0, 1.0);
            double target = autoM ? (occ > 0 ? clampd(1.0 - daylight * 0.8, 0.15, 1.0) : 0.0)
                                  : (d.st.count("on") && d.st["on"] > 0.5 ? 1.0 : 0.0);
            bright += (target - bright) * clampd(dt / 30.0, 0.1, 1.0);
            bright = clampd(bright, 0.0, 1.0);
            double power = bright * rated + (bright > 0.01 ? 3.0 : 0.0);
            double lux = daylight * 9000.0 + bright * 520.0;
            d.st["bright"] = bright; d.st["auto"] = autoM; d.st["rated"] = rated;
            d.st["on"] = bright > 0.02 ? 1.0 : 0.0;
            d.tel["bright"] = bright * 100.0; d.tel["power"] = power;
            d.tel["lux"] = lux; d.tel["on"] = d.st["on"];
            lightKw += power / 1000.0; sumLoadKw += power / 1000.0;
            zoneLux[d.zone] = lux; zonePower[d.zone] += power / 1000.0;

        } else if (d.type == "air") {
            double co2 = d.st.count("co2") ? d.st["co2"] : 430.0;
            double pm = d.st.count("pm25") ? d.st["pm25"] : 8.0;
            double voc = d.st.count("voc") ? d.st["voc"] : 120.0;
            double hum = d.st.count("humidity") ? d.st["humidity"] : 48.0;
            // CO2 mass balance: occupants generate, ventilation flushes toward
            // ambient. Steady state ~ 420 + occ * gen * tauVent  (dt-robust).
            double tauVent = occ > 0 ? 700.0 : 1500.0;   // faster air exchange when in use
            co2 += occ * 0.025 * dt;
            co2 -= (co2 - 420.0) * clampd(dt / tauVent, 0.0, 1.0);
            co2 = clampd(co2 + noise(3.0), 400.0, 3000.0);
            pm = clampd(pm + occ * 0.04 + noise(0.5) - 0.3, 2.0, 160.0);
            voc = clampd(voc + occ * 1.5 + noise(4.0) - 2.0, 60.0, 1200.0);
            hum = clampd(hum + noise(0.4) + (occ > 0 ? 0.05 : -0.05), 25.0, 80.0);
            // air-quality index (0..500 EPA-ish from pm2.5)
            double aqi = clampd(pm * 4.0 + (co2 - 600.0) * 0.05, 0.0, 500.0);
            d.st["co2"] = co2; d.st["pm25"] = pm; d.st["voc"] = voc; d.st["humidity"] = hum;
            d.tel["co2"] = co2; d.tel["pm25"] = pm; d.tel["voc"] = voc;
            d.tel["humidity"] = hum; d.tel["aqi"] = aqi;
            if (!zoneTemp.count(d.zone)) zoneTemp[d.zone] = outdoor; // fallback
            zoneCo2[d.zone] = co2;

        } else if (d.type == "solar") {
            double cap = d.st.count("capacity") ? d.st["capacity"] : 12000.0; // W peak
            double cellT = outdoor + solar * 22.0;
            double derate = 1.0 - clampd((cellT - 25.0) * 0.0040, 0.0, 0.30);
            double power = cap * clampd(solar, 0.0, 1.0) * derate;
            power = std::max(0.0, power + noise(40.0));
            double e = d.st.count("energy") ? d.st["energy"] : 0.0;
            e += power / 1000.0 * dt / 3600.0;
            d.st["energy"] = e;
            d.tel["power"] = power; d.tel["energy"] = e;
            d.tel["efficiency"] = derate * 100.0; d.tel["cellTemp"] = cellT;
            solarKw += power / 1000.0;

        } else if (d.type == "battery") {
            double soc = d.st.count("soc") ? d.st["soc"] : 55.0;
            double cap = d.st.count("capacity") ? d.st["capacity"] : 13.5; // kWh
            double maxP = d.st.count("maxPower") ? d.st["maxPower"] : 5.0;  // kW
            // charge off midday solar surplus, discharge at evening peak
            double p = 0.0; // +charge -discharge (kW from grid perspective handled later)
            if (solar > 0.45 && soc < 96.0) p = std::min(maxP, (solar - 0.45) * maxP * 2.0);
            else if ((hourOfDay >= 18.0 && hourOfDay <= 22.0) && soc > 12.0) p = -maxP * 0.7;
            soc += (p * dt / 3600.0) / cap * 100.0 * (p > 0 ? 0.95 : 1.05);
            soc = clampd(soc, 5.0, 100.0);
            d.st["soc"] = soc;
            d.tel["soc"] = soc; d.tel["power"] = p; d.tel["capacity"] = cap;
            d.tel["mode"] = p > 0.05 ? 1 : (p < -0.05 ? 2 : 0); // charge/discharge/idle
            batteryKw += p; // +charging consumes, -discharging supplies

        } else if (d.type == "evcharger") {
            int conn = (int)(d.st.count("connected") ? d.st["connected"] : 0);
            double soc = d.st.count("soc") ? d.st["soc"] : 40.0;
            double rated = d.st.count("rated") ? d.st["rated"] : 7.4; // kW
            // plug in during work hours stochastically
            if (!conn && hourOfDay > 8 && hourOfDay < 10 && hashUnit(d.id, (uint32_t)tick) > 0.8)
                conn = 1;
            if (conn && soc >= 99.5) conn = 0;
            double p = 0.0;
            if (conn && soc < 99.5) { p = rated; soc += (p * dt / 3600.0) / 60.0 * 100.0; }
            soc = clampd(soc, 0.0, 100.0);
            double sess = d.st.count("session") ? d.st["session"] : 0.0;
            sess = conn ? sess + p * dt / 3600.0 : 0.0;
            d.st["connected"] = conn; d.st["soc"] = soc; d.st["session"] = sess; d.st["rated"] = rated;
            d.tel["connected"] = conn; d.tel["soc"] = soc; d.tel["power"] = p * 1000.0;
            d.tel["session"] = sess;
            evKw += p; sumLoadKw += p;

        } else if (d.type == "plug") {
            int on = (int)(d.st.count("on") ? d.st["on"] : 1);
            double rated = d.st.count("rated") ? d.st["rated"] : 90.0;
            // appliance duty pattern + standby
            double duty = on ? (0.4 + 0.5 * std::sin(clock / 900.0 + hashUnit(d.id, 3) * 6.28)) : 0.0;
            duty = clampd(duty, 0.0, 1.0);
            double power = on ? rated * duty + 1.5 + noise(2.0) : 0.6;
            power = std::max(0.0, power);
            d.st["on"] = on; d.st["rated"] = rated;
            d.tel["on"] = on; d.tel["power"] = power; d.tel["duty"] = duty * 100.0;
            plugKw += power / 1000.0; sumLoadKw += power / 1000.0;
            zonePower[d.zone] += power / 1000.0;

        } else if (d.type == "water") {
            int valve = (int)(d.st.count("valve") ? d.st["valve"] : 1);
            double flow = 0.0;
            // occasional consumption pulses + rare leak event
            if (valve && hashUnit(d.id, (uint32_t)tick) > 0.86) flow = 2.0 + noise(0.6);
            int leak = (int)(d.st.count("leak") ? d.st["leak"] : 0);
            if (!leak && hashUnit(d.id, (uint32_t)tick + 99) > 0.997) leak = 1; // rare
            if (leak) flow = std::max(flow, 0.8 + noise(0.2));
            flow = std::max(0.0, flow);
            d.st["valve"] = valve; d.st["leak"] = leak;
            d.tel["flow"] = flow; d.tel["leak"] = leak; d.tel["valve"] = valve;

        } else if (d.type == "lock") {
            int locked = (int)(d.st.count("locked") ? d.st["locked"] : 1);
            d.battery = clampd(d.battery - dt / 3600.0 * 0.02 + noise(0.01), 0.0, 100.0);
            d.tel["locked"] = locked; d.tel["battery"] = d.battery;

        } else if (d.type == "gateway") {
            double cpu = 18.0 + occ * 1.2 + noise(4.0);
            cpu = clampd(cpu, 2.0, 100.0);
            double up = d.st.count("uptime") ? d.st["uptime"] : 0.0;
            up += dt;
            double clients = d.st.count("clients") ? d.st["clients"] : 0.0;
            d.st["uptime"] = up;
            d.tel["cpu"] = cpu; d.tel["uptime"] = up; d.tel["clients"] = clients;
            d.tel["mqttUp"] = 1;
        }

        // radio + battery jitter for all wireless nodes
        d.rssi = clampd(d.rssi + noise(1.2), -92.0, -38.0);
        if (d.type == "occupancy" || d.type == "air" || d.type == "water") {
            d.battery = clampd(d.battery - dt / 3600.0 * 0.01 + noise(0.005), 0.0, 100.0);
        }
        d.tel["rssi"] = d.rssi;
        d.tel["online"] = d.online;
    }

    // building main power meter = sum of loads - solar - battery discharge + base
    double baseLoad = 0.9; // always-on infrastructure kW
    for (auto& d : devices) {
        if (d.type == "meter") {
            double gross = sumLoadKw + baseLoad;
            double net = gross - solarKw + (batteryKw); // batteryKw>0 charging adds load
            double e = d.st.count("energy") ? d.st["energy"] : 0.0;
            e += std::max(0.0, net) * dt / 3600.0;
            double volts = 230.0 + noise(1.5);
            double pf = clampd(0.93 + noise(0.01), 0.8, 1.0);
            double amps = net > 0 ? net * 1000.0 / (volts * pf) : 0.0;
            d.st["energy"] = e;
            d.tel["power"] = net * 1000.0; d.tel["gross"] = gross * 1000.0;
            d.tel["energy"] = e; d.tel["voltage"] = volts; d.tel["current"] = amps;
            d.tel["pf"] = pf;
        }
    }

    // ---- comfort per zone (temp deviation + CO2) ----
    for (auto& kv : zoneTemp) {
        const std::string& z = kv.first;
        double t = kv.second;
        double sp = zoneSet.count(z) ? zoneSet[z] : 23.0;
        double co2 = zoneCo2.count(z) ? zoneCo2[z] : 500.0;
        double tComfort = clampd(100.0 - std::fabs(t - sp) * 14.0, 0.0, 100.0);
        double aComfort = clampd(100.0 - std::max(0.0, co2 - 600.0) * 0.06, 0.0, 100.0);
        zoneComfort[z] = 0.6 * tComfort + 0.4 * aComfort;
    }

    // ---- anomaly detection (robust Hampel z over passed history) ----
    std::vector<Anomaly> anomalies;
    auto checkAnom = [&](Device& d, const std::string& metric, double value) {
        auto di = history.find(d.id);
        if (di == history.end()) return;
        auto mi = di->second.find(metric);
        if (mi == di->second.end()) return;
        double z = robustZ(mi->second, value);
        int sev = 0;
        if (std::fabs(z) >= 6.0) sev = 3;
        else if (std::fabs(z) >= 4.0) sev = 2;
        else if (std::fabs(z) >= 3.0) sev = 1;
        if (sev > 0) anomalies.push_back({d.id, d.zone, metric, value, z, sev});
    };
    for (auto& d : devices) {
        if (!d.online) continue;
        // Only z-score the building meter (sudden whole-building load) and CO2
        // (ventilation problems). Per-unit HVAC/plug power cycles on its own
        // duty + startup transients, so equipment faults there surface through
        // the predictive-maintenance health score instead, not as alerts.
        if (d.type == "meter") checkAnom(d, "power", d.tel["power"]);
        else if (d.type == "air") checkAnom(d, "co2", d.tel["co2"]);
        // discrete-event anomalies
        if (d.type == "water" && d.tel.count("leak") && d.tel["leak"] > 0.5)
            anomalies.push_back({d.id, d.zone, "leak", 1, 9, 3});
    }

    // ---- predictive-maintenance health per device ----
    struct Health { std::string id; double score; int status; double eta; std::string reason; };
    std::vector<Health> health;
    for (auto& d : devices) {
        double score = 100.0; std::string reason = "nominal";
        if (d.type == "hvac") {
            double filt = d.st.count("filter") ? d.st["filter"] : 1.0;
            double rt = d.st.count("runtime") ? d.st["runtime"] : 0.0;
            score = clampd(filt * 100.0 - rt * 0.002, 0.0, 100.0);
            if (filt < 0.7) reason = "filter";
            if (rt > 4000) reason = "runtime";
        } else if (d.type == "battery") {
            score = clampd(d.st.count("soc") ? 70 + d.st["soc"] * 0.3 : 80, 0, 100);
        } else if (d.type == "lock" || d.type == "occupancy" || d.type == "air" || d.type == "water") {
            score = clampd(d.battery, 0.0, 100.0);
            if (d.battery < 25) reason = "battery";
        } else if (d.type == "gateway") {
            score = clampd(100.0 - d.tel["cpu"] * 0.3, 0.0, 100.0);
        }
        if (!d.online) { score = 0; reason = "offline"; }
        // signal penalty
        if (d.rssi < -82) score = std::min(score, 55.0);
        int status = score >= 80 ? 0 : (score >= 60 ? 1 : (score >= 35 ? 2 : 3));
        // crude ETA-to-maintenance from current degradation slope
        double eta = status == 0 ? 9999 : clampd(score * 1.5, 1, 9999);
        health.push_back({d.id, score, status, eta, reason});
    }

    // ---- automation rule engine ----
    std::vector<Command> issued;
    std::vector<std::string> triggered;
    auto metricOf = [&](const std::string& dev, const std::string& m) -> double {
        auto it = byId.find(dev);
        if (it == byId.end()) return 0.0;
        if (it->second->tel.count(m)) return it->second->tel[m];
        if (it->second->st.count(m)) return it->second->st[m];
        return 0.0;
    };
    for (auto& r : rules) {
        if (!r.enabled) continue;
        double v = metricOf(r.mDev, r.metric);
        bool fire = false;
        if (r.op == ">") fire = v > r.thr;
        else if (r.op == "<") fire = v < r.thr;
        else if (r.op == ">=") fire = v >= r.thr;
        else if (r.op == "<=") fire = v <= r.thr;
        else if (r.op == "==") fire = std::fabs(v - r.thr) < 1e-6;
        if (fire) {
            auto it = byId.find(r.aDev);
            if (it != byId.end()) {
                // only emit a command if it actually changes the state (debounce)
                double cur = it->second->st.count(r.aField) ? it->second->st[r.aField] : 1e18;
                if (std::fabs(cur - r.aVal) > 1e-6) {
                    issued.push_back({r.aDev, r.aField, r.aVal});
                    it->second->st[r.aField] = r.aVal; // reflect immediately
                }
            }
            triggered.push_back(r.id);
        }
    }

    // ---- KPI rollups (instantaneous; broker accumulates daily totals) ----
    double powerKw = std::max(0.0, sumLoadKw + baseLoad - solarKw + batteryKw);
    double carbonKgPerH = powerKw * gridInt / 1000.0; // kW * gCO2/kWh /1000 = kg/h
    double selfCons = (sumLoadKw + baseLoad) > 0
        ? clampd(std::min(solarKw, sumLoadKw + baseLoad) / (sumLoadKw + baseLoad) * 100.0, 0, 100) : 0;
    int online = 0; for (auto& d : devices) if (d.online) online++;
    double comfortSum = 0; int comfortN = 0;
    for (auto& kv : zoneComfort) { comfortSum += kv.second; comfortN++; }
    double co2Sum = 0; int co2N = 0;
    for (auto& kv : zoneCo2) { co2Sum += kv.second; co2N++; }

    // ============================ emit JSON ===================================
    std::ostringstream o;
    o << "{";
    o << "\"engine\":\"native\",";
    o << "\"tick\":" << num(tick, 0) << ",";
    o << "\"clock\":" << num(clock, 0) << ",";
    o << "\"dt\":" << num(dt, 0) << ",";
    o << "\"hourOfDay\":" << num(hourOfDay, 3) << ",";
    o << "\"outdoor\":" << num(outdoor, 2) << ",";
    o << "\"solar\":" << num(solar, 3) << ",";

    // devices
    o << "\"devices\":[";
    for (size_t i = 0; i < devices.size(); ++i) {
        auto& d = devices[i];
        if (i) o << ",";
        o << "{" << "\"id\":" << q(d.id) << ",\"type\":" << q(d.type)
          << ",\"zone\":" << q(d.zone) << ",\"online\":" << d.online
          << ",\"rssi\":" << num(d.rssi, 1) << ",\"battery\":" << num(d.battery, 1);
        o << ",\"state\":{";
        bool f1 = true;
        for (auto& kv : d.st) { if (!f1) o << ","; f1 = false; o << q(kv.first) << ":" << num(kv.second, 4); }
        o << "},\"telemetry\":{";
        bool f2 = true;
        for (auto& kv : d.tel) { if (!f2) o << ","; f2 = false; o << q(kv.first) << ":" << num(kv.second, 3); }
        o << "}}";
    }
    o << "],";

    // twin zones
    o << "\"twin\":{\"zones\":[";
    {
        // union of all zones we have any info about
        std::map<std::string, bool> zs;
        for (auto& kv : zoneTemp) zs[kv.first] = true;
        for (auto& kv : zoneCo2) zs[kv.first] = true;
        for (auto& kv : zoneOcc) zs[kv.first] = true;
        for (auto& kv : zoneLux) zs[kv.first] = true;
        bool first = true;
        for (auto& z : zs) {
            if (!first) o << ","; first = false;
            const std::string& k = z.first;
            o << "{\"zone\":" << q(k)
              << ",\"climate\":" << (zoneTemp.count(k) ? 1 : 0)
              << ",\"temp\":" << num(zoneTemp.count(k) ? zoneTemp[k] : outdoor, 2)
              << ",\"setpoint\":" << num(zoneSet.count(k) ? zoneSet[k] : 0, 1)
              << ",\"co2\":" << num(zoneCo2.count(k) ? zoneCo2[k] : -1, 0)
              << ",\"occupancy\":" << num(zoneOcc.count(k) ? zoneOcc[k] : 0, 0)
              << ",\"lux\":" << num(zoneLux.count(k) ? zoneLux[k] : 0, 0)
              << ",\"power\":" << num(zonePower.count(k) ? zonePower[k] : 0, 3)
              << ",\"comfort\":" << num(zoneComfort.count(k) ? zoneComfort[k] : -1, 1)
              << "}";
        }
    }
    o << "]},";

    // anomalies
    o << "\"anomalies\":[";
    for (size_t i = 0; i < anomalies.size(); ++i) {
        auto& a = anomalies[i]; if (i) o << ",";
        o << "{\"device\":" << q(a.dev) << ",\"zone\":" << q(a.zone)
          << ",\"metric\":" << q(a.metric) << ",\"value\":" << num(a.value, 2)
          << ",\"z\":" << num(a.z, 2) << ",\"severity\":" << a.sev << "}";
    }
    o << "],";

    // energy
    o << "\"energy\":{"
      << "\"totalKw\":" << num(powerKw, 3)
      << ",\"grossKw\":" << num(sumLoadKw + baseLoad, 3)
      << ",\"solarKw\":" << num(solarKw, 3)
      << ",\"batteryKw\":" << num(batteryKw, 3)
      << ",\"gridKw\":" << num(powerKw, 3)
      << ",\"carbonKgPerH\":" << num(carbonKgPerH, 3)
      << ",\"selfConsumption\":" << num(selfCons, 1)
      << ",\"tariffCostPerH\":" << num(powerKw * tariff, 3)
      << ",\"breakdown\":{"
      << "\"hvac\":" << num(hvacKw, 3) << ",\"lighting\":" << num(lightKw, 3)
      << ",\"plug\":" << num(plugKw, 3) << ",\"ev\":" << num(evKw, 3)
      << ",\"base\":" << num(baseLoad, 3) << ",\"other\":" << num(otherKw, 3)
      << "}},";

    // health
    o << "\"health\":[";
    for (size_t i = 0; i < health.size(); ++i) {
        auto& h = health[i]; if (i) o << ",";
        o << "{\"id\":" << q(h.id) << ",\"score\":" << num(h.score, 1)
          << ",\"status\":" << h.status << ",\"etaDays\":" << num(h.eta, 0)
          << ",\"reason\":" << q(h.reason) << "}";
    }
    o << "],";

    // automations
    o << "\"automations\":{\"triggered\":[";
    for (size_t i = 0; i < triggered.size(); ++i) { if (i) o << ","; o << q(triggered[i]); }
    o << "],\"commands\":[";
    for (size_t i = 0; i < issued.size(); ++i) {
        auto& c = issued[i]; if (i) o << ",";
        o << "{\"device\":" << q(c.dev) << ",\"field\":" << q(c.field)
          << ",\"value\":" << num(c.val, 3) << "}";
    }
    o << "]},";

    // kpi
    o << "\"kpi\":{"
      << "\"powerKw\":" << num(powerKw, 3)
      << ",\"solarKw\":" << num(solarKw, 3)
      << ",\"carbonKgPerH\":" << num(carbonKgPerH, 3)
      << ",\"selfConsumption\":" << num(selfCons, 1)
      << ",\"online\":" << online
      << ",\"total\":" << devices.size()
      << ",\"anomalies\":" << anomalies.size()
      << ",\"comfortAvg\":" << num(comfortN ? comfortSum / comfortN : 0, 1)
      << ",\"co2Avg\":" << num(co2N ? co2Sum / co2N : 0, 0)
      << "}";

    o << "}";
    std::cout << o.str() << "\n";
    return 0;
}
