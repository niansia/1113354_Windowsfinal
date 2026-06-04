#include <algorithm>
#include <cmath>
#include <ctime>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <map>
#include <queue>
#include <sstream>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

namespace {

struct Args {
    std::string city = "fusion-harbor";
    std::string lang = "zh-TW";
    std::string out = "-";
    std::string place = "Current district";
    double lat = 25.0330;
    double lon = 121.5654;
    double temperature = 27.0;
    double wind = 8.0;
    double precipitation = 0.0;
    double pm25 = 8.0;
    int aqi = 32;
    int roadCount = 48;
    double roadKm = 18.0;
    bool js = false;
};

struct Node {
    std::string id;
    std::string name;
    double x;
    double y;
    double demand;
    std::string type;
};

struct Edge {
    std::string from;
    std::string to;
    double km;
    double speed;
    double capacity;
};

struct Segment {
    std::string from;
    std::string to;
    double minutes;
    double congestion;
};

static std::string valueAfter(const std::vector<std::string>& args, const std::string& key, const std::string& fallback) {
    for (size_t i = 0; i + 1 < args.size(); ++i) {
        if (args[i] == key) return args[i + 1];
    }
    return fallback;
}

static double doubleAfter(const std::vector<std::string>& args, const std::string& key, double fallback) {
    std::string value = valueAfter(args, key, "");
    if (value.empty()) return fallback;
    try { return std::stod(value); } catch (...) { return fallback; }
}

static int intAfter(const std::vector<std::string>& args, const std::string& key, int fallback) {
    std::string value = valueAfter(args, key, "");
    if (value.empty()) return fallback;
    try { return std::stoi(value); } catch (...) { return fallback; }
}

static Args parseArgs(int argc, char** argv) {
    std::vector<std::string> raw;
    for (int i = 1; i < argc; ++i) raw.push_back(argv[i]);
    Args a;
    a.city = valueAfter(raw, "--city", a.city);
    a.lang = valueAfter(raw, "--lang", a.lang);
    a.out = valueAfter(raw, "--out", a.out);
    a.place = valueAfter(raw, "--place", a.place);
    a.lat = doubleAfter(raw, "--lat", a.lat);
    a.lon = doubleAfter(raw, "--lon", a.lon);
    a.temperature = doubleAfter(raw, "--temperature", a.temperature);
    a.wind = doubleAfter(raw, "--wind", a.wind);
    a.precipitation = doubleAfter(raw, "--precipitation", a.precipitation);
    a.pm25 = doubleAfter(raw, "--pm25", a.pm25);
    a.aqi = intAfter(raw, "--aqi", a.aqi);
    a.roadCount = intAfter(raw, "--road-count", a.roadCount);
    a.roadKm = doubleAfter(raw, "--road-km", a.roadKm);
    a.js = std::find(raw.begin(), raw.end(), "--js") != raw.end();
    return a;
}

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
                    out << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c);
                } else {
                    out << c;
                }
        }
    }
    return out.str();
}

static std::string q(const std::string& s) {
    return "\"" + jsonEscape(s) + "\"";
}

static std::string nowIso() {
    std::time_t t = std::time(nullptr);
    std::tm tmValue;
#if defined(_WIN32)
    gmtime_s(&tmValue, &t);
#else
    gmtime_r(&t, &tmValue);
#endif
    std::ostringstream out;
    out << std::put_time(&tmValue, "%Y-%m-%dT%H:%M:%SZ");
    return out.str();
}

static std::string fixed(double value, int digits = 2) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(digits) << value;
    return out.str();
}

static std::vector<Node> buildNodes() {
    return {
        {"user", "Current Position", 0.12, 0.74, 0.46, "origin"},
        {"harbor", "Harbor Logistics", 0.18, 0.32, 0.72, "freight"},
        {"station", "Central Station", 0.42, 0.50, 0.92, "transit"},
        {"hospital", "Medical District", 0.68, 0.42, 0.84, "priority"},
        {"campus", "University Campus", 0.60, 0.72, 0.66, "education"},
        {"market", "Civic Market", 0.34, 0.76, 0.78, "commerce"},
        {"airport", "Sky Terminal", 0.82, 0.20, 0.62, "gateway"},
        {"park", "Riverside Park", 0.78, 0.78, 0.38, "green"}
    };
}

static std::vector<Edge> buildEdges() {
    return {
        {"user", "market", 2.1, 38, 700}, {"user", "harbor", 3.4, 44, 620},
        {"harbor", "station", 4.2, 50, 850}, {"harbor", "market", 2.7, 32, 540},
        {"station", "hospital", 3.0, 36, 760}, {"station", "campus", 2.9, 34, 680},
        {"market", "campus", 2.2, 28, 560}, {"market", "station", 2.4, 30, 620},
        {"hospital", "airport", 4.8, 54, 780}, {"hospital", "park", 2.7, 40, 520},
        {"campus", "park", 2.1, 28, 460}, {"airport", "park", 5.8, 58, 840},
        {"station", "airport", 5.2, 52, 820}
    };
}

static double realtimePressure(const Args& args) {
    double roadDensity = args.roadKm <= 0.1 ? 1.0 : static_cast<double>(args.roadCount) / args.roadKm;
    double weather = 1.0 + std::min(0.35, std::max(0.0, args.precipitation) * 0.08) + std::min(0.20, std::max(0.0, args.wind - 20.0) * 0.01);
    double air = 1.0 + std::min(0.20, std::max(0, args.aqi - 50) / 250.0);
    double density = 1.0 + std::min(0.28, roadDensity / 140.0);
    return weather * air * density;
}

static std::map<std::string, Node> nodeMap(const std::vector<Node>& nodes) {
    std::map<std::string, Node> m;
    for (const auto& n : nodes) m[n.id] = n;
    return m;
}

static double edgeCongestion(const Edge& edge, const std::map<std::string, Node>& nodes, const Args& args) {
    double demand = 0.5;
    auto a = nodes.find(edge.from);
    auto b = nodes.find(edge.to);
    if (a != nodes.end() && b != nodes.end()) demand = (a->second.demand + b->second.demand) * 0.5;
    double pressure = realtimePressure(args);
    double capacityEffect = std::max(0.15, 900.0 / std::max(280.0, edge.capacity));
    return std::min(2.35, 0.62 + demand * 0.72 * pressure * capacityEffect);
}

static std::pair<std::vector<std::string>, std::vector<Segment>> shortestRoute(
    const std::vector<Node>& nodes,
    const std::vector<Edge>& edges,
    const Args& args,
    const std::string& start,
    const std::string& goal
) {
    std::map<std::string, Node> nodesById = nodeMap(nodes);
    std::map<std::string, std::vector<Edge>> adj;
    for (const auto& e : edges) {
        adj[e.from].push_back(e);
        adj[e.to].push_back({e.to, e.from, e.km, e.speed, e.capacity});
    }

    std::map<std::string, double> dist;
    std::map<std::string, std::string> parent;
    for (const auto& n : nodes) dist[n.id] = std::numeric_limits<double>::infinity();
    dist[start] = 0.0;

    using Entry = std::pair<double, std::string>;
    std::priority_queue<Entry, std::vector<Entry>, std::greater<Entry>> pq;
    pq.push({0.0, start});
    while (!pq.empty()) {
        auto current = pq.top();
        pq.pop();
        if (current.first > dist[current.second]) continue;
        if (current.second == goal) break;
        for (const auto& e : adj[current.second]) {
            double congestion = edgeCongestion(e, nodesById, args);
            double incidentPenalty = (e.from == "station" && e.to == "hospital") || (e.from == "hospital" && e.to == "station") ? 1.18 : 1.0;
            double minutes = (e.km / std::max(8.0, e.speed / congestion)) * 60.0 * incidentPenalty;
            double next = current.first + minutes;
            if (next < dist[e.to]) {
                dist[e.to] = next;
                parent[e.to] = current.second;
                pq.push({next, e.to});
            }
        }
    }

    std::vector<std::string> path;
    std::string at = goal;
    path.push_back(at);
    while (at != start && parent.count(at)) {
        at = parent[at];
        path.push_back(at);
    }
    std::reverse(path.begin(), path.end());

    std::vector<Segment> segments;
    for (size_t i = 0; i + 1 < path.size(); ++i) {
        for (const auto& e : edges) {
            bool match = (e.from == path[i] && e.to == path[i + 1]) || (e.to == path[i] && e.from == path[i + 1]);
            if (!match) continue;
            double congestion = edgeCongestion(e, nodesById, args);
            double minutes = (e.km / std::max(8.0, e.speed / congestion)) * 60.0;
            segments.push_back({path[i], path[i + 1], minutes, congestion});
            break;
        }
    }

    return {path, segments};
}

static double totalMinutes(const std::vector<Segment>& segments) {
    double total = 0.0;
    for (const auto& s : segments) total += s.minutes;
    return total;
}

static std::string reportJson(const Args& args) {
    auto nodes = buildNodes();
    auto edges = buildEdges();
    auto nodesById = nodeMap(nodes);
    auto route = shortestRoute(nodes, edges, args, "user", "hospital");
    auto response = shortestRoute(nodes, edges, args, "hospital", "harbor");
    double pressure = realtimePressure(args);
    double routeMinutes = totalMinutes(route.second);
    double responseMinutes = totalMinutes(response.second) * 0.72;

    std::ostringstream out;
    out << std::fixed << std::setprecision(2);
    out << "{";
    out << "\"city\":" << q(args.city) << ",";
    out << "\"language\":" << q(args.lang) << ",";
    out << "\"generatedAt\":" << q(nowIso()) << ",";
    out << "\"location\":{\"label\":" << q(args.place) << ",\"lat\":" << fixed(args.lat, 5) << ",\"lon\":" << fixed(args.lon, 5) << "},";
    out << "\"realtime\":{\"temperature\":" << fixed(args.temperature, 1)
        << ",\"wind\":" << fixed(args.wind, 1)
        << ",\"precipitation\":" << fixed(args.precipitation, 2)
        << ",\"pm25\":" << fixed(args.pm25, 1)
        << ",\"aqi\":" << args.aqi
        << ",\"roadCount\":" << args.roadCount
        << ",\"roadKm\":" << fixed(args.roadKm, 2)
        << ",\"pressure\":" << fixed(pressure, 3)
        << ",\"sources\":[\"Browser Geolocation\",\"Open-Meteo\",\"Open-Meteo Air Quality\",\"OSM Overpass\"]},";

    out << "\"optimizedRoute\":{\"from\":\"Current Position\",\"to\":\"Medical District\",\"etaMinutes\":" << fixed(routeMinutes, 1) << ",\"nodes\":[";
    for (size_t i = 0; i < route.first.size(); ++i) {
        if (i) out << ",";
        out << q(nodesById[route.first[i]].name);
    }
    out << "],\"segments\":[";
    for (size_t i = 0; i < route.second.size(); ++i) {
        const auto& s = route.second[i];
        if (i) out << ",";
        out << "{\"from\":" << q(nodesById[s.from].name)
            << ",\"to\":" << q(nodesById[s.to].name)
            << ",\"minutes\":" << fixed(s.minutes, 1)
            << ",\"congestion\":" << fixed(s.congestion, 2) << "}";
    }
    out << "]},";

    out << "\"signalPlan\":[";
    std::vector<std::string> intersections = {"station", "market", "hospital", "campus", "airport"};
    for (size_t i = 0; i < intersections.size(); ++i) {
        const Node& n = nodesById[intersections[i]];
        int green = static_cast<int>(std::round(24 + n.demand * 42 * std::min(1.45, pressure)));
        int cycle = 92 + static_cast<int>(std::round(n.demand * 26));
        if (i) out << ",";
        out << "{\"intersection\":" << q(n.name)
            << ",\"greenSeconds\":" << green
            << ",\"cycleSeconds\":" << cycle
            << ",\"load\":" << fixed(std::min(0.99, n.demand * pressure / 1.55), 2)
            << "}";
    }
    out << "],";

    out << "\"incidentResponse\":{\"incident\":\"Harbor freight slowdown\",\"priority\":\"high\",\"etaMinutes\":" << fixed(responseMinutes, 1) << ",\"units\":[";
    std::vector<std::pair<std::string, double>> units = {
        {"Medical drone relay", responseMinutes * 0.64},
        {"Traffic police unit", responseMinutes * 0.92},
        {"Signal override team", responseMinutes * 0.78}
    };
    for (size_t i = 0; i < units.size(); ++i) {
        if (i) out << ",";
        out << "{\"name\":" << q(units[i].first) << ",\"etaMinutes\":" << fixed(units[i].second, 1) << "}";
    }
    out << "]},";

    out << "\"districts\":[";
    for (size_t i = 0; i < nodes.size(); ++i) {
        const Node& n = nodes[i];
        if (i) out << ",";
        double flow = std::min(1.0, n.demand * pressure / 1.42);
        double safety = std::max(0.04, 1.0 - flow * 0.62 - std::max(0, args.aqi - 80) / 400.0);
        out << "{\"id\":" << q(n.id)
            << ",\"name\":" << q(n.name)
            << ",\"x\":" << fixed(n.x, 3)
            << ",\"y\":" << fixed(n.y, 3)
            << ",\"type\":" << q(n.type)
            << ",\"flow\":" << fixed(flow, 2)
            << ",\"safety\":" << fixed(safety, 2)
            << "}";
    }
    out << "],";

    out << "\"simulationFrames\":[";
    for (int minute = 0; minute <= 120; minute += 10) {
        if (minute) out << ",";
        double wave = 0.5 + 0.5 * std::sin(minute / 120.0 * 3.14159265358979323846);
        double flow = std::min(1.0, 0.38 + pressure * 0.28 + wave * 0.22);
        double speed = std::max(12.0, 54.0 - flow * 31.0 - args.precipitation * 1.8);
        double risk = std::min(1.0, 0.18 + flow * 0.52 + std::max(0, args.aqi - 60) / 220.0);
        out << "{\"minute\":" << minute
            << ",\"flow\":" << fixed(flow, 2)
            << ",\"speed\":" << fixed(speed, 1)
            << ",\"risk\":" << fixed(risk, 2)
            << "}";
    }
    out << "]";
    out << "}";
    return out.str();
}

} // namespace

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
