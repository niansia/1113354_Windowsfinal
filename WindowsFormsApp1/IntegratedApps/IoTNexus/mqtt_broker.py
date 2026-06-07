"""A small but real MQTT 3.1.1 broker, implemented from scratch on raw TCP.

No third-party dependencies -- it parses the MQTT control-packet wire format
(CONNECT / PUBLISH / SUBSCRIBE / UNSUBSCRIBE / PINGREQ / DISCONNECT) directly
from the socket byte stream. It supports:

  * QoS 0 and QoS 1 (PUBACK),
  * topic-filter wildcards ``+`` (single level) and ``#`` (multi level),
  * retained messages (delivered on subscribe),
  * a shared publish fabric so *in-process* subscribers (the WebSocket bridge,
    the analytics tap) sit on the exact same bus as real TCP clients.

This means an external device -- an ESP32, ``mosquitto_pub``, a Node-RED flow --
can connect to this broker and its messages show up live in the dashboard, and
commands the dashboard issues are published back over the same broker.

The broker is deliberately permissive (anonymous connect allowed) because it is
meant for a trusted lab/LAN demo; bind it to 127.0.0.1 unless you explicitly
want LAN devices to reach it.
"""
from __future__ import annotations

import socket
import threading
import time
from typing import Callable, Dict, List, Optional, Tuple

# MQTT control packet types (high nibble of byte 1)
CONNECT, CONNACK, PUBLISH, PUBACK = 1, 2, 3, 4
SUBSCRIBE, SUBACK, UNSUBSCRIBE, UNSUBACK = 8, 9, 10, 11
PINGREQ, PINGRESP, DISCONNECT = 12, 13, 14


# --------------------------------------------------------------------------- wire
def encode_remaining_length(n: int) -> bytes:
    out = bytearray()
    while True:
        b = n % 128
        n //= 128
        if n > 0:
            b |= 0x80
        out.append(b)
        if n == 0:
            break
    return bytes(out)


def read_remaining_length(sock: socket.socket) -> int:
    multiplier = 1
    value = 0
    while True:
        b = recv_exact(sock, 1)[0]
        value += (b & 0x7F) * multiplier
        if (b & 0x80) == 0:
            break
        multiplier *= 128
        if multiplier > 128 ** 3:
            raise ValueError("malformed remaining length")
    return value


def recv_exact(sock: socket.socket, n: int) -> bytes:
    buf = bytearray()
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("peer closed")
        buf += chunk
    return bytes(buf)


def _u16(buf: bytes, i: int) -> Tuple[int, int]:
    return (buf[i] << 8) | buf[i + 1], i + 2


def _str(buf: bytes, i: int) -> Tuple[str, int]:
    n, i = _u16(buf, i)
    s = buf[i:i + n].decode("utf-8", "replace")
    return s, i + n


# --------------------------------------------------------------------- topic match
def topic_matches(filt: str, topic: str) -> bool:
    f = filt.split("/")
    t = topic.split("/")
    i = 0
    for i, seg in enumerate(f):
        if seg == "#":
            return True
        if i >= len(t):
            return False
        if seg == "+":
            continue
        if seg != t[i]:
            return False
    return len(f) == len(t)


# --------------------------------------------------------------------------- client
class MqttClient:
    def __init__(self, sock: socket.socket, addr):
        self.sock = sock
        self.addr = addr
        self.client_id = ""
        self.subs: List[Tuple[str, int]] = []   # (filter, qos)
        self.send_lock = threading.Lock()
        self.alive = True
        self.connected_at = time.time()
        self.last_seen = time.time()
        self.rx = 0
        self.tx = 0

    def send(self, data: bytes):
        with self.send_lock:
            try:
                self.sock.sendall(data)
                self.tx += 1
            except OSError:
                self.alive = False


# --------------------------------------------------------------------------- broker
class MqttBroker:
    def __init__(self, host: str = "127.0.0.1", port: int = 1883, log=None):
        self.host = host
        self.port = port
        self.log = log or (lambda *a: None)
        self.clients: Dict[socket.socket, MqttClient] = {}
        self.inproc_subs: List[Tuple[str, Callable[[str, bytes], None]]] = []
        self.retained: Dict[str, bytes] = {}
        self.lock = threading.RLock()
        self._server: Optional[socket.socket] = None
        self._packet_id = 0
        self.stats = {"published": 0, "delivered": 0, "connects": 0}
        self.started = False

    # ---- lifecycle ----
    def start(self):
        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind((self.host, self.port))
        srv.listen(64)
        self._server = srv
        self.started = True
        threading.Thread(target=self._accept_loop, daemon=True).start()
        self.log(f"[mqtt] broker listening on {self.host}:{self.port}")

    def _accept_loop(self):
        while self.started:
            try:
                sock, addr = self._server.accept()
            except OSError:
                break
            sock.settimeout(120)
            threading.Thread(target=self._client_loop, args=(sock, addr), daemon=True).start()

    # ---- in-process pub/sub (WS bridge, analytics tap, command router) ----
    def subscribe_inproc(self, filt: str, cb: Callable[[str, bytes], None]):
        with self.lock:
            self.inproc_subs.append((filt, cb))

    # ---- publish fabric ----
    def publish(self, topic: str, payload, qos: int = 0, retain: bool = False):
        if isinstance(payload, str):
            payload = payload.encode("utf-8")
        with self.lock:
            self.stats["published"] += 1
            if retain:
                if payload:
                    self.retained[topic] = payload
                else:
                    self.retained.pop(topic, None)
            tcp_targets: List[Tuple[MqttClient, int]] = []
            for c in list(self.clients.values()):
                if not c.alive:
                    continue
                for f, sub_qos in c.subs:
                    if topic_matches(f, topic):
                        tcp_targets.append((c, min(qos, sub_qos)))
                        break
            inproc = [cb for (f, cb) in self.inproc_subs if topic_matches(f, topic)]
        for c, dqos in tcp_targets:
            c.send(_encode_publish(topic, payload, dqos, self._next_id() if dqos else 0))
            self.stats["delivered"] += 1
        for cb in inproc:
            try:
                cb(topic, payload)
            except Exception as exc:  # noqa: BLE001 - never let a tap kill the bus
                self.log(f"[mqtt] inproc subscriber error: {exc}")

    def _next_id(self) -> int:
        with self.lock:
            self._packet_id = (self._packet_id % 65535) + 1
            return self._packet_id

    # ---- per-client protocol loop ----
    def _client_loop(self, sock: socket.socket, addr):
        client = MqttClient(sock, addr)
        try:
            while client.alive:
                header = recv_exact(sock, 1)[0]
                ptype = header >> 4
                flags = header & 0x0F
                rlen = read_remaining_length(sock)
                body = recv_exact(sock, rlen) if rlen else b""
                client.last_seen = time.time()
                client.rx += 1

                if ptype == CONNECT:
                    self._handle_connect(client, body)
                elif ptype == PUBLISH:
                    self._handle_publish(client, flags, body)
                elif ptype == SUBSCRIBE:
                    self._handle_subscribe(client, body)
                elif ptype == UNSUBSCRIBE:
                    self._handle_unsubscribe(client, body)
                elif ptype == PINGREQ:
                    client.send(bytes([PINGRESP << 4, 0]))
                elif ptype == DISCONNECT:
                    break
                else:
                    # unsupported packet -> ignore but stay connected
                    pass
        except (ConnectionError, OSError, ValueError, IndexError):
            pass
        finally:
            with self.lock:
                self.clients.pop(sock, None)
            client.alive = False
            try:
                sock.close()
            except OSError:
                pass

    def _handle_connect(self, client: MqttClient, body: bytes):
        i = 0
        try:
            _proto, i = _str(body, i)   # "MQTT" / "MQIsdp"
            _level = body[i]; i += 1
            flags = body[i]; i += 1
            _keepalive, i = _u16(body, i)
            client.client_id, i = _str(body, i)
        except (IndexError, ValueError):
            client.client_id = f"anon-{int(time.time()*1000)%100000}"
        if not client.client_id:
            client.client_id = f"anon-{int(time.time()*1000)%100000}"
        with self.lock:
            self.clients[client.sock] = client
            self.stats["connects"] += 1
        # CONNACK: session-present=0, return code 0 (accepted)
        client.send(bytes([CONNACK << 4, 0x02, 0x00, 0x00]))
        self.log(f"[mqtt] client connected: {client.client_id} from {client.addr}")

    def _handle_publish(self, client: MqttClient, flags: int, body: bytes):
        retain = bool(flags & 0x01)
        qos = (flags >> 1) & 0x03
        i = 0
        topic, i = _str(body, i)
        pid = 0
        if qos > 0:
            pid, i = _u16(body, i)
        payload = body[i:]
        self.publish(topic, payload, qos=qos, retain=retain)
        if qos == 1:
            client.send(bytes([PUBACK << 4, 0x02, pid >> 8, pid & 0xFF]))

    def _handle_subscribe(self, client: MqttClient, body: bytes):
        i = 0
        pid, i = _u16(body, i)
        granted = bytearray()
        new_filters = []
        while i < len(body):
            filt, i = _str(body, i)
            req_qos = body[i] & 0x03; i += 1
            with self.lock:
                client.subs.append((filt, req_qos))
            new_filters.append(filt)
            granted.append(min(req_qos, 1))   # we grant up to QoS 1
        # SUBACK
        payload = bytes([pid >> 8, pid & 0xFF]) + bytes(granted)
        client.send(bytes([SUBACK << 4]) + encode_remaining_length(len(payload)) + payload)
        # deliver retained messages matching the new subscriptions
        with self.lock:
            matches = [(t, p) for t, p in self.retained.items()
                       if any(topic_matches(f, t) for f in new_filters)]
        for t, p in matches:
            client.send(_encode_publish(t, p, 0, 0))

    def _handle_unsubscribe(self, client: MqttClient, body: bytes):
        i = 0
        pid, i = _u16(body, i)
        drop = []
        while i < len(body):
            filt, i = _str(body, i)
            drop.append(filt)
        with self.lock:
            client.subs = [(f, q) for (f, q) in client.subs if f not in drop]
        client.send(bytes([UNSUBACK << 4, 0x02, pid >> 8, pid & 0xFF]))

    # ---- introspection for the dashboard ----
    def snapshot(self) -> dict:
        with self.lock:
            clients = [{
                "id": c.client_id,
                "addr": f"{c.addr[0]}:{c.addr[1]}",
                "subs": [f for f, _ in c.subs],
                "rx": c.rx,
                "tx": c.tx,
                "uptime": round(time.time() - c.connected_at, 1),
            } for c in self.clients.values()]
            return {
                "listening": self.started,
                "endpoint": f"{self.host}:{self.port}",
                "clients": clients,
                "clientCount": len(clients),
                "retained": len(self.retained),
                "stats": dict(self.stats),
            }

    def stop(self):
        self.started = False
        try:
            if self._server:
                self._server.close()
        except OSError:
            pass


def _encode_publish(topic: str, payload: bytes, qos: int, pid: int) -> bytes:
    tb = topic.encode("utf-8")
    vh = bytearray([len(tb) >> 8, len(tb) & 0xFF]) + tb
    if qos > 0:
        vh += bytes([pid >> 8, pid & 0xFF])
    fixed = (PUBLISH << 4) | (qos << 1)
    body = bytes(vh) + payload
    return bytes([fixed]) + encode_remaining_length(len(body)) + body
