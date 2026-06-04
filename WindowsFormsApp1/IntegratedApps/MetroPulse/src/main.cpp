// MetroPulse native engine.
//
// This is the brain of the smart-city traffic command center. Python feeds it
// real geographic points (from OpenStreetMap) plus live weather/air data; this
// engine builds a road graph and runs genuine transportation models on it:
//
//   * k-nearest-neighbour graph construction with connectivity repair
//   * BPR (Bureau of Public Roads) volume-delay travel-time model
//   * Dijkstra shortest-time routing + full accessibility tree (isochrones)
//   * Webster signal-cycle optimisation
//   * a time-of-day demand model that drives a real short-term forecast
//   * bottleneck ranking and network KPIs (avg speed, delay, reliability)
//
// It emits one self-contained JSON report consumed by the Leaflet front-end.
#include <algorithm>
#include <array>
#include <cmath>
#include <ctime>
#include <fstream>
#include <functional>
#include <iomanip>
#include <iostream>
#include <limits>
#include <map>
#include <queue>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace {

constexpr double kPi = 3.14159265358979323846;
constexpr double kEarthKm = 6371.0;
constexpr double kCapacityPerLane = 620.0;     // veh/h per lane (urban arterial)
constexpr double kSaturationPerLane = 1800.0;  // veh/h per lane (Webster)
constexpr double kInf = std::numeric_limits<double>::infinity();

struct Args {
    std::string city = "fusion-harbor";
    std::string lang = "zh-TW";
    std::string out = "-";
    std::string place = "Current district";
    std::string graphPath;
    double lat = 25.0330;
    double lon = 121.5654;
    double temperature = 27.0;
    double wind = 8.0;
    double precipitation = 0.0;
    double pm25 = 8.0;
    int aqi = 32;
    int roadCount = 48;
    double roadKm = 18.0;
    int nowMinutes = -1;  // minutes since local midnight; -1 -> derive
    int dow = -1;         // 0=Sun .. 6=Sat; -1 -> derive
    int horizon = 120;
    bool js = false;
};

struct Node {
    std::string id;
    std::string name;
    std::string nameKey;  // i18n key for synthetic nodes; empty for live POIs
    std::string type;
    double lat = 0.0;
    double lon = 0.0;
    double demand = 0.5;  // baseline trip generation 0..1
    // computed
    double flow = 0.0;
    double safety = 1.0;
    double reachMinutes = -1.0;  // travel time from origin
};

struct Edge {
    int a = 0;
    int b = 0;
    double lengthKm = 0.0;
    double speedKmh = 40.0;
    int lanes = 2;
    // computed
    double volume = 0.0;
    double vc = 0.0;
    double freeMinutes = 0.0;
    double minutes = 0.0;
    double congestion = 1.0;
    bool incident = false;
};

// ---------------------------------------------------------------- arg parsing

std::string valueAfter(const std::vector<std::string>& args, const std::string& key, const std::string& fallback) {
    for (size_t i = 0; i + 1 < args.size(); ++i) {
        if (args[i] == key) return args[i + 1];
    }
    return fallback;
}

double doubleAfter(const std::vector<std::string>& args, const std::string& key, double fallback) {
    std::string value = valueAfter(args, key, "");
    if (value.empty()) return fallback;
    try { return std::stod(value); } catch (...) { return fallback; }
}

int intAfter(const std::vector<std::string>& args, const std::string& key, int fallback) {
    std::string value = valueAfter(args, key, "");
    if (value.empty()) return fallback;
    try { return std::stoi(value); } catch (...) { return fallback; }
}

Args parseArgs(int argc, char** argv) {
    std::vector<std::string> raw;
    for (int i = 1; i < argc; ++i) raw.push_back(argv[i]);
    Args a;
    a.city = valueAfter(raw, "--city", a.city);
    a.lang = valueAfter(raw, "--lang", a.lang);
    a.out = valueAfter(raw, "--out", a.out);
    a.place = valueAfter(raw, "--place", a.place);
    a.graphPath = valueAfter(raw, "--graph", a.graphPath);
    a.lat = doubleAfter(raw, "--lat", a.lat);
    a.lon = doubleAfter(raw, "--lon", a.lon);
    a.temperature = doubleAfter(raw, "--temperature", a.temperature);
    a.wind = doubleAfter(raw, "--wind", a.wind);
    a.precipitation = doubleAfter(raw, "--precipitation", a.precipitation);
    a.pm25 = doubleAfter(raw, "--pm25", a.pm25);
    a.aqi = intAfter(raw, "--aqi", a.aqi);
    a.roadCount = intAfter(raw, "--road-count", a.roadCount);
    a.roadKm = doubleAfter(raw, "--road-km", a.roadKm);
    a.nowMinutes = intAfter(raw, "--now-minutes", a.nowMinutes);
    a.dow = intAfter(raw, "--dow", a.dow);
    a.horizon = intAfter(raw, "--horizon", a.horizon);
    a.js = std::find(raw.begin(), raw.end(), "--js") != raw.end();
    return a;
}

// ----------------------------------------------------------------- json utils

std::string jsonEscape(const std::string& s) {
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
                    out << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c);
                } else {
                    out << c;
                }
        }
    }
    return out.str();
}

std::string q(const std::string& s) { return "\"" + jsonEscape(s) + "\""; }

std::string fixed(double value, int digits = 2) {
    if (!std::isfinite(value)) value = 0.0;
    std::ostringstream out;
    out << std::fixed << std::setprecision(digits) << value;
    return out.str();
}

std::string nowIso() {
    std::time_t t = std::time(nullptr);
    std::tm tmValue {};
#if defined(_WIN32)
    gmtime_s(&tmValue, &t);
#else
    gmtime_r(&t, &tmValue);
#endif
    std::ostringstream out;
    out << std::put_time(&tmValue, "%Y-%m-%dT%H:%M:%SZ");
    return out.str();
}

std::string clockLabel(int minuteOfDay) {
    int m = ((minuteOfDay % 1440) + 1440) % 1440;
    std::ostringstream out;
    out << std::setw(2) << std::setfill('0') << (m / 60) << ":" << std::setw(2) << std::setfill('0') << (m % 60);
    return out.str();
}

// --------------------------------------------------------------- geo helpers

double deg2rad(double d) { return d * kPi / 180.0; }

double haversineKm(double la1, double lo1, double la2, double lo2) {
    double p1 = deg2rad(la1), p2 = deg2rad(la2);
    double dp = deg2rad(la2 - la1), dl = deg2rad(lo2 - lo1);
    double a = std::sin(dp / 2) * std::sin(dp / 2) + std::cos(p1) * std::cos(p2) * std::sin(dl / 2) * std::sin(dl / 2);
    return kEarthKm * 2 * std::atan2(std::sqrt(a), std::sqrt(1 - a));
}

std::pair<double, double> destPoint(double lat, double lon, double dKm, double bearingDeg) {
    double br = deg2rad(bearingDeg);
    double dr = dKm / kEarthKm;
    double la1 = deg2rad(lat), lo1 = deg2rad(lon);
    double la2 = std::asin(std::sin(la1) * std::cos(dr) + std::cos(la1) * std::sin(dr) * std::cos(br));
    double lo2 = lo1 + std::atan2(std::sin(br) * std::sin(dr) * std::cos(la1), std::cos(dr) - std::sin(la1) * std::sin(la2));
    return {la2 * 180.0 / kPi, lo2 * 180.0 / kPi};
}

// ---------------------------------------------------------------- graph build

struct Graph {
    std::vector<Node> nodes;
    std::vector<Edge> edges;
    int origin = 0;
    int priority = 1;
    std::string source = "synthetic";
};

std::vector<std::string> splitTabs(const std::string& line) {
    std::vector<std::string> out;
    std::string cur;
    for (char c : line) {
        if (c == '\t') { out.push_back(cur); cur.clear(); }
        else cur.push_back(c);
    }
    out.push_back(cur);
    return out;
}

// Load a graph the Python broker discovered from OpenStreetMap.
// Lines (tab separated):  L label     (UTF-8 area name; avoids Windows argv codepage)
//                         N id lat lon demand type nameKey name
//                         O id        (origin)
//                         P id        (priority / destination)
// outLabel is filled from the L line even when too few nodes are present (so a
// UTF-8 place name survives a synthetic fallback). Returns true only when the
// file carries a usable live graph (>= 3 nodes).
bool loadGraphFile(const std::string& path, Graph& g, std::string& outLabel) {
    std::ifstream file(path.c_str());
    if (!file) return false;
    std::unordered_map<std::string, int> index;
    std::string originId, priorityId;
    std::string line;
    while (std::getline(file, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (line.empty()) continue;
        auto f = splitTabs(line);
        if (f[0] == "L" && f.size() >= 2) {
            outLabel = f[1];
        } else if (f[0] == "N" && f.size() >= 8) {
            Node n;
            n.id = f[1];
            try { n.lat = std::stod(f[2]); n.lon = std::stod(f[3]); n.demand = std::stod(f[4]); }
            catch (...) { continue; }
            n.type = f[5];
            n.nameKey = f[6];
            n.name = f[7];
            index[n.id] = static_cast<int>(g.nodes.size());
            g.nodes.push_back(n);
        } else if (f[0] == "O" && f.size() >= 2) {
            originId = f[1];
        } else if (f[0] == "P" && f.size() >= 2) {
            priorityId = f[1];
        }
    }
    if (g.nodes.size() < 3) return false;
    g.origin = index.count(originId) ? index[originId] : 0;
    g.priority = index.count(priorityId) ? index[priorityId] : -1;
    g.source = "live-osm";
    return true;
}

// Honest fallback used only when no live OSM data is reachable: directional
// road-network zones around the user at REAL coordinates. Labelled by compass
// direction so the model never pretends a real landmark (hospital, harbour...)
// exists where it does not.
Graph syntheticGraph(const Args& a) {
    struct Spec { double dist, bearing, demand; const char* id; const char* key; };
    static const std::array<Spec, 9> specs = {{
        {0.0,   0.0, 0.46, "origin", "z_origin"},
        {1.3,   0.0, 0.70, "z_n",  "z_n"},
        {1.5,  45.0, 0.64, "z_ne", "z_ne"},
        {1.7,  90.0, 0.72, "z_e",  "z_e"},
        {1.4, 135.0, 0.58, "z_se", "z_se"},
        {1.6, 180.0, 0.66, "z_s",  "z_s"},
        {1.5, 225.0, 0.60, "z_sw", "z_sw"},
        {1.8, 270.0, 0.74, "z_w",  "z_w"},
        {1.5, 315.0, 0.56, "z_nw", "z_nw"},
    }};
    Graph g;
    g.source = "synthetic";
    for (const auto& s : specs) {
        Node n;
        n.id = s.id;
        n.type = (std::string(s.id) == "origin") ? "origin" : "zone";
        n.nameKey = s.key;
        n.name = s.id;
        n.demand = s.demand;
        if (s.dist <= 0.0001) { n.lat = a.lat; n.lon = a.lon; }
        else { auto p = destPoint(a.lat, a.lon, s.dist, s.bearing); n.lat = p.first; n.lon = p.second; }
        g.nodes.push_back(n);
    }
    g.origin = 0;
    g.priority = -1;  // auto-pick the busiest zone as the priority target
    return g;
}

void buildEdges(Graph& g) {
    const auto& n = g.nodes;
    int N = static_cast<int>(n.size());
    std::set<std::pair<int, int>> seen;

    auto addEdge = [&](int i, int j) {
        if (i == j) return;
        auto key = std::minmax(i, j);
        if (seen.count(key)) return;
        seen.insert(key);
        Edge e;
        e.a = key.first;
        e.b = key.second;
        e.lengthKm = std::max(0.08, haversineKm(n[i].lat, n[i].lon, n[j].lat, n[j].lon));
        e.speedKmh = e.lengthKm > 2.5 ? 58.0 : e.lengthKm > 1.4 ? 48.0 : 38.0;
        auto major = [](const std::string& t) {
            return t == "transit" || t == "priority" || t == "origin" || t == "gateway" || t == "road";
        };
        e.lanes = (major(n[i].type) || major(n[j].type)) ? 3 : 2;
        g.edges.push_back(e);
    };

    // connect each node to its 3 nearest neighbours
    for (int i = 0; i < N; ++i) {
        std::vector<std::pair<double, int>> d;
        for (int j = 0; j < N; ++j) {
            if (j != i) d.push_back({haversineKm(n[i].lat, n[i].lon, n[j].lat, n[j].lon), j});
        }
        std::sort(d.begin(), d.end());
        int k = std::min<int>(3, static_cast<int>(d.size()));
        for (int t = 0; t < k; ++t) addEdge(i, d[t].second);
    }

    // connectivity repair: union-find then bridge nearest cross-component pair
    std::vector<int> par(N);
    for (int i = 0; i < N; ++i) par[i] = i;
    std::function<int(int)> find = [&](int x) {
        while (par[x] != x) { par[x] = par[par[x]]; x = par[x]; }
        return x;
    };
    auto uni = [&](int x, int y) { par[find(x)] = find(y); };
    for (const auto& e : g.edges) uni(e.a, e.b);
    while (true) {
        int comps = 0;
        for (int i = 0; i < N; ++i) if (find(i) == i) ++comps;
        if (comps <= 1) break;
        double best = kInf; int bi = -1, bj = -1;
        for (int i = 0; i < N; ++i) {
            for (int j = i + 1; j < N; ++j) {
                if (find(i) == find(j)) continue;
                double dd = haversineKm(n[i].lat, n[i].lon, n[j].lat, n[j].lon);
                if (dd < best) { best = dd; bi = i; bj = j; }
            }
        }
        if (bi < 0) break;
        addEdge(bi, bj);
        uni(bi, bj);
    }
}

// -------------------------------------------------------------- traffic model

// Bimodal weekday demand curve (morning + evening peaks); flatter on weekends.
double timeOfDayFactor(int minuteOfDay, int dow) {
    double t = ((minuteOfDay % 1440) + 1440) % 1440;
    double morning = std::exp(-std::pow(t - 480.0, 2) / (2 * 70.0 * 70.0));   // 08:00
    double evening = std::exp(-std::pow(t - 1080.0, 2) / (2 * 85.0 * 85.0));  // 18:00
    double midday = std::exp(-std::pow(t - 765.0, 2) / (2 * 120.0 * 120.0));  // 12:45
    bool weekend = (dow == 0 || dow == 6);
    double f = weekend
        ? 0.24 + 0.42 * morning + 0.58 * evening + 0.34 * midday
        : 0.22 + 0.80 * morning + 0.96 * evening + 0.26 * midday;
    return std::min(1.18, std::max(0.16, f));
}

double weatherPressure(const Args& a) {
    double roadDensity = a.roadKm <= 0.1 ? 1.0 : static_cast<double>(a.roadCount) / a.roadKm;
    double weather = 1.0 + std::min(0.35, std::max(0.0, a.precipitation) * 0.08)
                         + std::min(0.20, std::max(0.0, a.wind - 20.0) * 0.01);
    double air = 1.0 + std::min(0.20, std::max(0, a.aqi - 50) / 250.0);
    double density = 1.0 + std::min(0.28, roadDensity / 140.0);
    return weather * air * density;
}

// Apply the BPR volume-delay model to every edge for a given demand level.
void applyTraffic(Graph& g, const Args& a, double tod, double pressure) {
    for (auto& e : g.edges) {
        double dem = 0.5 * (g.nodes[e.a].demand + g.nodes[e.b].demand);
        double cap = e.lanes * kCapacityPerLane;
        double volume = cap * std::min(1.35, dem * tod * pressure * 1.18);
        if (e.incident) volume *= 1.45;
        e.volume = volume;
        e.vc = volume / cap;
        e.freeMinutes = e.lengthKm / std::max(8.0, e.speedKmh) * 60.0;
        e.congestion = 1.0 + 0.15 * std::pow(e.vc, 4.0);  // BPR alpha=0.15 beta=4
        e.minutes = e.freeMinutes * e.congestion;
    }
    for (auto& n : g.nodes) {
        n.flow = std::min(1.0, n.demand * tod * pressure / 1.15);
        n.safety = std::max(0.05, 1.0 - n.flow * 0.6 - std::max(0, a.aqi - 80) / 400.0);
    }
}

// ------------------------------------------------------------------- routing

struct Adj { int to; double w; };

std::vector<std::vector<Adj>> adjacency(const Graph& g) {
    std::vector<std::vector<Adj>> adj(g.nodes.size());
    for (const auto& e : g.edges) {
        adj[e.a].push_back({e.b, e.minutes});
        adj[e.b].push_back({e.a, e.minutes});
    }
    return adj;
}

struct Dijkstra {
    std::vector<double> dist;
    std::vector<int> parent;
};

Dijkstra dijkstra(const std::vector<std::vector<Adj>>& adj, int start) {
    int N = static_cast<int>(adj.size());
    Dijkstra r;
    r.dist.assign(N, kInf);
    r.parent.assign(N, -1);
    if (start < 0 || start >= N) return r;
    r.dist[start] = 0.0;
    using Entry = std::pair<double, int>;
    std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> pq;
    pq.push({0.0, start});
    while (!pq.empty()) {
        auto cur = pq.top();
        pq.pop();
        if (cur.first > r.dist[cur.second]) continue;
        for (const auto& nb : adj[cur.second]) {
            double next = cur.first + nb.w;
            if (next < r.dist[nb.to]) {
                r.dist[nb.to] = next;
                r.parent[nb.to] = cur.second;
                pq.push({next, nb.to});
            }
        }
    }
    return r;
}

std::vector<int> reconstruct(const Dijkstra& d, int goal) {
    std::vector<int> path;
    if (goal < 0 || goal >= static_cast<int>(d.dist.size()) || !std::isfinite(d.dist[goal])) return path;
    for (int at = goal; at != -1; at = d.parent[at]) path.push_back(at);
    std::reverse(path.begin(), path.end());
    return path;
}

const Edge* findEdge(const Graph& g, int a, int b) {
    for (const auto& e : g.edges) {
        if ((e.a == a && e.b == b) || (e.a == b && e.b == a)) return &e;
    }
    return nullptr;
}

// Recompute the origin->goal ETA for a hypothetical future demand level.
double routeEtaAt(Graph g, const Args& a, double tod, double pressure, int origin, int goal) {
    applyTraffic(g, a, tod, pressure);
    auto d = dijkstra(adjacency(g), origin);
    return (goal >= 0 && std::isfinite(d.dist[goal])) ? d.dist[goal] : 0.0;
}

// --------------------------------------------------------------------- report

std::string reportJson(const Args& a) {
    Graph g;
    std::string label = a.place;
    std::string fileLabel;
    bool haveGraph = !a.graphPath.empty() && loadGraphFile(a.graphPath, g, fileLabel);
    if (!fileLabel.empty()) label = fileLabel;  // UTF-8 from file beats codepage-mangled argv
    if (!haveGraph) g = syntheticGraph(a);
    buildEdges(g);

    int nowMin = a.nowMinutes;
    int dow = a.dow;
    if (nowMin < 0 || dow < 0) {
        std::time_t t = std::time(nullptr);
        std::tm lt {};
#if defined(_WIN32)
        localtime_s(&lt, &t);
#else
        localtime_r(&t, &lt);
#endif
        if (nowMin < 0) nowMin = lt.tm_hour * 60 + lt.tm_min;
        if (dow < 0) dow = lt.tm_wday;
    }

    double pressure = weatherPressure(a);
    double tod = timeOfDayFactor(nowMin, dow);

    // Mark the busiest freight/transit edge as the active incident.
    {
        int worst = -1; double worstScore = -1.0;
        for (size_t i = 0; i < g.edges.size(); ++i) {
            const auto& e = g.edges[i];
            const std::string& ta = g.nodes[e.a].type;
            const std::string& tb = g.nodes[e.b].type;
            double score = (g.nodes[e.a].demand + g.nodes[e.b].demand) * e.lengthKm;
            if (ta == "freight" || tb == "freight" || ta == "transit" || tb == "transit") score *= 1.4;
            if (score > worstScore) { worstScore = score; worst = static_cast<int>(i); }
        }
        if (worst >= 0) g.edges[worst].incident = true;
    }

    applyTraffic(g, a, tod, pressure);

    int origin = g.origin;
    int priority = g.priority;
    if (priority < 0) {  // pick a hospital-like node, else the highest-demand non-origin
        for (size_t i = 0; i < g.nodes.size(); ++i) {
            if (g.nodes[i].type == "priority") { priority = static_cast<int>(i); break; }
        }
        if (priority < 0) {
            double best = -1.0;
            for (size_t i = 0; i < g.nodes.size(); ++i) {
                if (static_cast<int>(i) != origin && g.nodes[i].demand > best) { best = g.nodes[i].demand; priority = static_cast<int>(i); }
            }
        }
    }

    auto adj = adjacency(g);
    auto fromOrigin = dijkstra(adj, origin);
    for (size_t i = 0; i < g.nodes.size(); ++i) {
        g.nodes[i].reachMinutes = std::isfinite(fromOrigin.dist[i]) ? fromOrigin.dist[i] : -1.0;
    }
    auto routePath = reconstruct(fromOrigin, priority);
    double routeMinutes = (priority >= 0 && std::isfinite(fromOrigin.dist[priority])) ? fromOrigin.dist[priority] : 0.0;

    // route distance + segments
    double routeKm = 0.0;
    std::vector<const Edge*> routeEdges;
    for (size_t i = 0; i + 1 < routePath.size(); ++i) {
        const Edge* e = findEdge(g, routePath[i], routePath[i + 1]);
        routeEdges.push_back(e);
        if (e) routeKm += e->lengthKm;
    }

    // ---- network KPIs
    double sumLen = 0.0, sumTimeHr = 0.0, sumDelayVehHr = 0.0;
    double cgMean = 0.0; int cgN = 0;
    for (const auto& e : g.edges) {
        sumLen += e.lengthKm;
        sumTimeHr += e.minutes / 60.0;
        sumDelayVehHr += e.volume * (e.minutes - e.freeMinutes) / 60.0;
        cgMean += e.congestion; ++cgN;
    }
    cgMean = cgN ? cgMean / cgN : 1.0;
    double cgVar = 0.0;
    for (const auto& e : g.edges) cgVar += std::pow(e.congestion - cgMean, 2);
    cgVar = cgN ? cgVar / cgN : 0.0;
    double avgSpeed = sumTimeHr > 1e-6 ? sumLen / sumTimeHr : 0.0;
    double reliability = std::max(0.0, std::min(1.0, 1.0 - std::sqrt(cgVar) / std::max(0.6, cgMean)));

    // ---- accessibility
    int reach15 = 0, reach30 = 0;
    for (const auto& n : g.nodes) {
        if (n.reachMinutes >= 0 && n.reachMinutes <= 15.0) ++reach15;
        if (n.reachMinutes >= 0 && n.reachMinutes <= 30.0) ++reach30;
    }

    // ---- forecast over the horizon
    struct Frame { int minute; double flow, speed, risk, vc; };
    std::vector<Frame> frames;
    double peakFlow = 0.0; int peakMinute = nowMin;
    for (int m = 0; m <= a.horizon; m += 10) {
        double ftod = timeOfDayFactor(nowMin + m, dow);
        Graph future = g;
        applyTraffic(future, a, ftod, pressure);
        double vcSum = 0.0; double tHr = 0.0; double len = 0.0;
        for (const auto& e : future.edges) { vcSum += e.vc; tHr += e.minutes / 60.0; len += e.lengthKm; }
        double avgVc = future.edges.empty() ? 0.0 : vcSum / future.edges.size();
        double spd = tHr > 1e-6 ? len / tHr : avgSpeed;
        double risk = std::min(1.0, 0.12 + avgVc * 0.55 + std::max(0, a.aqi - 60) / 220.0
                                    + std::min(0.18, a.precipitation * 0.03));
        double flow = std::min(1.0, avgVc);
        frames.push_back({nowMin + m, flow, spd, risk, avgVc});
        if (flow > peakFlow) { peakFlow = flow; peakMinute = nowMin + m; }
    }
    double eta30 = routeEtaAt(g, a, timeOfDayFactor(nowMin + 30, dow), pressure, origin, priority);
    double eta60 = routeEtaAt(g, a, timeOfDayFactor(nowMin + 60, dow), pressure, origin, priority);

    // ---- bottlenecks (top edges by vehicle-hours of delay)
    std::vector<int> order(g.edges.size());
    for (size_t i = 0; i < order.size(); ++i) order[i] = static_cast<int>(i);
    std::sort(order.begin(), order.end(), [&](int x, int y) {
        double dx = g.edges[x].volume * (g.edges[x].minutes - g.edges[x].freeMinutes);
        double dy = g.edges[y].volume * (g.edges[y].minutes - g.edges[y].freeMinutes);
        return dx > dy;
    });

    // ---- Webster signal optimisation for major intersections
    struct Signal { int node; int cycle; int green; double load; int phases; };
    std::vector<Signal> signals;
    for (size_t i = 0; i < g.nodes.size(); ++i) {
        const std::string& t = g.nodes[i].type;
        bool signalised = t == "transit" || t == "priority" || t == "commerce" || t == "retail"
                       || t == "gateway" || t == "road" || t == "zone";
        if (!signalised) continue;
        std::vector<double> approachVc;
        for (const auto& e : g.edges) {
            if (e.a == static_cast<int>(i) || e.b == static_cast<int>(i)) {
                double sat = e.lanes * kSaturationPerLane;
                approachVc.push_back(e.volume / sat);  // flow ratio y = v/s
            }
        }
        if (approachVc.size() < 2) continue;
        std::sort(approachVc.rbegin(), approachVc.rend());
        double y1 = approachVc[0], y2 = approachVc[1];
        double Y = std::min(0.92, y1 + y2);
        int phases = 2;
        double L = 4.0 * phases + 2.0;  // total lost time
        double cycle = (1.5 * L + 5.0) / std::max(0.08, 1.0 - Y);
        cycle = std::min(150.0, std::max(60.0, cycle));
        double effGreen = cycle - L;
        double greenMajor = (y1 / std::max(1e-6, y1 + y2)) * effGreen;
        signals.push_back({static_cast<int>(i),
                           static_cast<int>(std::round(cycle)),
                           static_cast<int>(std::round(greenMajor)),
                           std::min(0.99, Y / 0.92), phases});
    }

    // ---- incident response timing
    int incidentEdge = -1;
    for (size_t i = 0; i < g.edges.size(); ++i) if (g.edges[i].incident) { incidentEdge = static_cast<int>(i); break; }
    double incidentLat = a.lat, incidentLon = a.lon;
    std::string incidentName = "Network hotspot";
    double responseMinutes = routeMinutes * 0.7 + 4.0;
    if (incidentEdge >= 0) {
        const Edge& e = g.edges[incidentEdge];
        incidentLat = 0.5 * (g.nodes[e.a].lat + g.nodes[e.b].lat);
        incidentLon = 0.5 * (g.nodes[e.a].lon + g.nodes[e.b].lon);
        incidentName = g.nodes[e.a].name + " <-> " + g.nodes[e.b].name;
        auto fromPriority = dijkstra(adj, priority);
        double da = std::isfinite(fromPriority.dist[e.a]) ? fromPriority.dist[e.a] : routeMinutes;
        double db = std::isfinite(fromPriority.dist[e.b]) ? fromPriority.dist[e.b] : routeMinutes;
        responseMinutes = std::min(da, db) + e.freeMinutes * 0.5 + 2.5;
    }

    // ================================================================= output
    std::ostringstream out;
    out << std::fixed << std::setprecision(2);
    out << "{";
    out << "\"city\":" << q(a.city) << ",";
    out << "\"language\":" << q(a.lang) << ",";
    out << "\"generatedAt\":" << q(nowIso()) << ",";
    out << "\"graphSource\":" << q(g.source) << ",";
    out << "\"nowMinutes\":" << nowMin << ",";
    out << "\"clock\":" << q(clockLabel(nowMin)) << ",";
    out << "\"location\":{\"label\":" << q(label) << ",\"lat\":" << fixed(a.lat, 6) << ",\"lon\":" << fixed(a.lon, 6) << "},";

    out << "\"realtime\":{\"temperature\":" << fixed(a.temperature, 1)
        << ",\"wind\":" << fixed(a.wind, 1)
        << ",\"precipitation\":" << fixed(a.precipitation, 2)
        << ",\"pm25\":" << fixed(a.pm25, 1)
        << ",\"aqi\":" << a.aqi
        << ",\"roadCount\":" << a.roadCount
        << ",\"roadKm\":" << fixed(a.roadKm, 2)
        << ",\"pressure\":" << fixed(pressure, 3)
        << ",\"timeFactor\":" << fixed(tod, 3)
        << ",\"sources\":[\"Browser Geolocation\",\"Open-Meteo\",\"Open-Meteo Air Quality\",\"OSM Overpass\",\"OSM Nominatim\"]},";

    // nodes
    out << "\"nodes\":[";
    for (size_t i = 0; i < g.nodes.size(); ++i) {
        const Node& n = g.nodes[i];
        if (i) out << ",";
        out << "{\"id\":" << q(n.id)
            << ",\"name\":" << q(n.name)
            << ",\"nameKey\":" << q(n.nameKey)
            << ",\"type\":" << q(n.type)
            << ",\"lat\":" << fixed(n.lat, 6)
            << ",\"lon\":" << fixed(n.lon, 6)
            << ",\"demand\":" << fixed(n.demand, 2)
            << ",\"flow\":" << fixed(n.flow, 2)
            << ",\"safety\":" << fixed(n.safety, 2)
            << ",\"reachMinutes\":" << fixed(n.reachMinutes, 1)
            << ",\"isOrigin\":" << (static_cast<int>(i) == origin ? "true" : "false")
            << ",\"isPriority\":" << (static_cast<int>(i) == priority ? "true" : "false")
            << "}";
    }
    out << "],";

    // edges
    out << "\"edges\":[";
    for (size_t i = 0; i < g.edges.size(); ++i) {
        const Edge& e = g.edges[i];
        if (i) out << ",";
        out << "{\"from\":" << q(g.nodes[e.a].name)
            << ",\"to\":" << q(g.nodes[e.b].name)
            << ",\"coords\":[[" << fixed(g.nodes[e.a].lat, 6) << "," << fixed(g.nodes[e.a].lon, 6) << "],["
            << fixed(g.nodes[e.b].lat, 6) << "," << fixed(g.nodes[e.b].lon, 6) << "]]"
            << ",\"lengthKm\":" << fixed(e.lengthKm, 2)
            << ",\"speedKmh\":" << fixed(e.speedKmh, 0)
            << ",\"lanes\":" << e.lanes
            << ",\"vc\":" << fixed(e.vc, 2)
            << ",\"congestion\":" << fixed(e.congestion, 2)
            << ",\"minutes\":" << fixed(e.minutes, 1)
            << ",\"incident\":" << (e.incident ? "true" : "false")
            << "}";
    }
    out << "],";

    // optimized route
    out << "\"optimizedRoute\":{\"from\":" << q(g.nodes[origin].name)
        << ",\"to\":" << q(priority >= 0 ? g.nodes[priority].name : std::string("--"))
        << ",\"etaMinutes\":" << fixed(routeMinutes, 1)
        << ",\"distanceKm\":" << fixed(routeKm, 2)
        << ",\"nodes\":[";
    for (size_t i = 0; i < routePath.size(); ++i) { if (i) out << ","; out << q(g.nodes[routePath[i]].name); }
    out << "],\"path\":[";
    for (size_t i = 0; i < routePath.size(); ++i) {
        if (i) out << ",";
        out << "[" << fixed(g.nodes[routePath[i]].lat, 6) << "," << fixed(g.nodes[routePath[i]].lon, 6) << "]";
    }
    out << "],\"segments\":[";
    for (size_t i = 0; i + 1 < routePath.size(); ++i) {
        const Edge* e = routeEdges[i];
        if (i) out << ",";
        out << "{\"from\":" << q(g.nodes[routePath[i]].name)
            << ",\"to\":" << q(g.nodes[routePath[i + 1]].name)
            << ",\"minutes\":" << fixed(e ? e->minutes : 0.0, 1)
            << ",\"congestion\":" << fixed(e ? e->congestion : 1.0, 2)
            << ",\"vc\":" << fixed(e ? e->vc : 0.0, 2) << "}";
    }
    out << "]},";

    out << "\"predictedRoute\":{\"now\":" << fixed(routeMinutes, 1)
        << ",\"in30\":" << fixed(eta30, 1)
        << ",\"in60\":" << fixed(eta60, 1) << "},";

    // signals
    out << "\"signalPlan\":[";
    for (size_t i = 0; i < signals.size(); ++i) {
        const Signal& s = signals[i];
        if (i) out << ",";
        out << "{\"intersection\":" << q(g.nodes[s.node].name)
            << ",\"lat\":" << fixed(g.nodes[s.node].lat, 6)
            << ",\"lon\":" << fixed(g.nodes[s.node].lon, 6)
            << ",\"greenSeconds\":" << s.green
            << ",\"cycleSeconds\":" << s.cycle
            << ",\"phases\":" << s.phases
            << ",\"load\":" << fixed(s.load, 2) << "}";
    }
    out << "],";

    // incident response
    out << "\"incidentResponse\":{\"incident\":" << q(incidentName)
        << ",\"priority\":\"high\""
        << ",\"lat\":" << fixed(incidentLat, 6)
        << ",\"lon\":" << fixed(incidentLon, 6)
        << ",\"etaMinutes\":" << fixed(responseMinutes, 1)
        << ",\"units\":[";
    std::vector<std::pair<std::string, double>> units = {
        {"Medical drone relay", responseMinutes * 0.62},
        {"Traffic police unit", responseMinutes * 0.95},
        {"Signal override team", responseMinutes * 0.78},
    };
    for (size_t i = 0; i < units.size(); ++i) {
        if (i) out << ",";
        out << "{\"name\":" << q(units[i].first) << ",\"etaMinutes\":" << fixed(units[i].second, 1) << "}";
    }
    out << "]},";

    // accessibility ranking (nearest first)
    std::vector<int> reachOrder;
    for (size_t i = 0; i < g.nodes.size(); ++i) if (static_cast<int>(i) != origin && g.nodes[i].reachMinutes >= 0) reachOrder.push_back(static_cast<int>(i));
    std::sort(reachOrder.begin(), reachOrder.end(), [&](int x, int y) { return g.nodes[x].reachMinutes < g.nodes[y].reachMinutes; });
    out << "\"accessibility\":{\"reach15\":" << reach15 << ",\"reach30\":" << reach30 << ",\"total\":" << g.nodes.size() << ",\"ranking\":[";
    for (size_t i = 0; i < reachOrder.size(); ++i) {
        int idx = reachOrder[i];
        if (i) out << ",";
        out << "{\"name\":" << q(g.nodes[idx].name) << ",\"nameKey\":" << q(g.nodes[idx].nameKey)
            << ",\"type\":" << q(g.nodes[idx].type) << ",\"minutes\":" << fixed(g.nodes[idx].reachMinutes, 1) << "}";
    }
    out << "]},";

    // bottlenecks
    out << "\"bottlenecks\":[";
    int shown = 0;
    for (int idx : order) {
        const Edge& e = g.edges[idx];
        if (e.minutes - e.freeMinutes <= 0.01 && shown >= 3) break;
        if (shown >= 5) break;
        if (shown) out << ",";
        out << "{\"from\":" << q(g.nodes[e.a].name) << ",\"to\":" << q(g.nodes[e.b].name)
            << ",\"vc\":" << fixed(e.vc, 2) << ",\"congestion\":" << fixed(e.congestion, 2)
            << ",\"delayMin\":" << fixed(e.minutes - e.freeMinutes, 1) << ",\"incident\":" << (e.incident ? "true" : "false") << "}";
        ++shown;
    }
    out << "],";

    // KPIs
    out << "\"kpis\":{\"avgSpeed\":" << fixed(avgSpeed, 1)
        << ",\"totalDelay\":" << fixed(sumDelayVehHr, 1)
        << ",\"reliability\":" << fixed(reliability, 2)
        << ",\"networkPressure\":" << fixed(pressure, 2)
        << ",\"peakClock\":" << q(clockLabel(peakMinute))
        << ",\"peakFlow\":" << fixed(peakFlow, 2) << "},";

    // forecast
    out << "\"forecast\":[";
    for (size_t i = 0; i < frames.size(); ++i) {
        const Frame& f = frames[i];
        if (i) out << ",";
        out << "{\"minute\":" << f.minute % 1440
            << ",\"offset\":" << (f.minute - nowMin)
            << ",\"clock\":" << q(clockLabel(f.minute))
            << ",\"flow\":" << fixed(f.flow, 2)
            << ",\"speed\":" << fixed(f.speed, 1)
            << ",\"risk\":" << fixed(f.risk, 2)
            << ",\"vc\":" << fixed(f.vc, 2) << "}";
    }
    out << "]";
    out << "}";
    return out.str();
}

}  // namespace

int main(int argc, char** argv) {
    try {
        Args args = parseArgs(argc, argv);
        std::string json = reportJson(args);
        std::string payload = args.js ? "window.METROPULSE_REPORT = " + json + ";\n" : json + "\n";
        if (args.out == "-") {
            std::cout << payload;
            return 0;
        }
        std::ofstream file(args.out.c_str(), std::ios::binary);
        if (!file) throw std::runtime_error("could not open output file");
        file << payload;
        return 0;
    } catch (const std::exception& ex) {
        std::cerr << "MetroPulseEngine error: " << ex.what() << "\n";
        return 2;
    }
}
