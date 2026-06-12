#!/usr/bin/env python3
"""Local speech and Gemma service for the Fusion OS WebView shell."""

import argparse
import asyncio
import datetime
import json
import os
import re
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from audio_diagnostics import dbfs_levels
from voice_activity import VoiceActivitySegmenter


HTTP_PORT = 8770
WS_PORT = 8771
DEFAULT_GEMMA_MODEL = "google/gemma-4-12B-it"

VOSK_LANG = {
    "zh-TW": "cn",
    "zh-CN": "cn",
    "en": "en-us",
    "ja": "ja",
    "ko": "ko",
}

# --- Security: only the FusionOS WebView (and the dev/preview servers) may reach this
# service. A browser ALWAYS sends a truthful Origin header on cross-origin fetch and on
# WebSocket connections, so an Origin allowlist blocks arbitrary web pages the user might
# visit — and also DNS-rebinding, whose Origin remains the attacker's domain. The Host
# check is a second line against rebinding by hostname. Requests with no Origin (local
# non-browser tools) are allowed, since a remote web page can never make a readable
# no-Origin fetch/WebSocket to us. Bound to 127.0.0.1 so the ports are not on the network.
_DEFAULT_ALLOWED_ORIGINS = {
    "https://fusion.local",     # production WebView2 virtual host (SetVirtualHostNameToFolderMapping)
    "http://localhost:5173",    # Vite dev server
    "http://127.0.0.1:5173",
    "http://localhost:4173",    # Vite preview
    "http://127.0.0.1:4173",
}
ALLOWED_ORIGINS = {
    origin.strip().rstrip("/")
    for origin in os.environ.get("FUSION_VOICE_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
} or _DEFAULT_ALLOWED_ORIGINS
_ALLOWED_HOSTS = {"localhost", "127.0.0.1", "::1"}

MAX_UNDERSTAND_BYTES = 64 * 1024  # reject oversized /understand bodies (memory-exhaustion guard)
MAX_UTTERANCE_CHARS = 4000        # cap text handed to the model
MAX_APPS = 64                     # cap the app list size
MAX_WS_SESSIONS = 16              # cap concurrent recognition sessions (local DoS guard)


def _origin_allowed(origin):
    return bool(origin) and origin.rstrip("/") in ALLOWED_ORIGINS


def _host_allowed(host_header):
    if not host_header:
        return True
    hostname = host_header.rsplit(":", 1)[0].strip().lower().strip("[]")
    return hostname in _ALLOWED_HOSTS


def _request_allowed(origin, host):
    """Block cross-origin browser callers; permit the WebView, dev servers, and local tools."""
    if not _host_allowed(host):
        return False
    if origin in (None, ""):
        return True  # non-browser local caller (browsers always send Origin cross-origin)
    return _origin_allowed(origin)


def _short_error(error):
    """One short, single-line error summary — never a full stack trace or local path."""
    if not error:
        return ""
    return str(error).splitlines()[0][:160]


def _write_response_body(writer, body):
    try:
        writer.write(body)
        return True
    except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
        return False


_args = None
_vosk_models = {}
_vosk_lock = threading.Lock()
_whisper_lock = threading.Lock()
_whisper = {
    "model": None,
    "loading": False,
    "error": None,
    "device": None,
    "model_id": "small",
}
_gemma_lock = threading.Lock()
_gemma = {
    "ready": False,
    "loading": False,
    "error": None,
    "tokenizer": None,
    "model": None,
    "model_id": DEFAULT_GEMMA_MODEL,
}
_audio_lock = threading.Lock()
_audio = {
    "active_sessions": 0,
    "total_packets": 0,
    "total_bytes": 0,
    "device_label": "",
    "device_id": "",
    "client_sample_rate": 0,
    "rms_dbfs": -120.0,
    "peak_dbfs": -120.0,
    "speech_active": False,
    "last_packet_at": "",
    "last_text": "",
    "last_error": "",
}
_log_lock = threading.Lock()
_log_path = os.path.join(os.path.dirname(__file__), "fusion_voice.log")


def _now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def log_event(message):
    line = f"{_now_iso()} {message}"
    print(message, flush=True)
    try:
        with _log_lock:
            with open(_log_path, "a", encoding="utf-8") as handle:
                handle.write(line + "\n")
    except OSError:
        pass


def update_audio(**values):
    with _audio_lock:
        _audio.update(values)


def increment_audio(key, amount=1):
    with _audio_lock:
        _audio[key] += amount
        return _audio[key]


def audio_snapshot():
    with _audio_lock:
        return dict(_audio)


def public_audio_snapshot():
    """Audio telemetry safe to return over HTTP: never the recognized text (the user's actual
    speech) or raw error strings (which can contain local paths)."""
    with _audio_lock:
        snapshot = dict(_audio)
    snapshot["last_text"] = ""   # spoken content stays internal / on the live WS only
    snapshot["last_error"] = ""  # avoid leaking exception text / paths via /health
    return snapshot


def hf_authenticated():
    if os.environ.get("HF_TOKEN"):
        return True
    try:
        from huggingface_hub import get_token

        return bool(get_token())
    except Exception:
        return False


def _disable_broken_torchvision():
    """The text-only assistant does not need the incompatible local torchvision wheel."""
    import transformers
    import transformers.utils
    import transformers.utils.import_utils

    transformers.utils.is_torchvision_available = lambda: False
    transformers.utils.import_utils.is_torchvision_available = lambda: False


def get_vosk_model(fusion_lang):
    import vosk

    vosk.SetLogLevel(-1)
    lang_id = VOSK_LANG.get(fusion_lang, "cn")
    with _vosk_lock:
        if lang_id not in _vosk_models:
            print(f"[vosk] loading '{lang_id}' model; first use may download it", flush=True)
            _vosk_models[lang_id] = vosk.Model(lang=lang_id)
            print(f"[vosk] '{lang_id}' ready", flush=True)
        return _vosk_models[lang_id]


def new_recognizer(vosk, model):
    recognizer = vosk.KaldiRecognizer(model, 16000)
    recognizer.SetWords(False)
    return recognizer


def _cuda_runtime_available():
    if os.name != "nt":
        return True
    try:
        import ctypes

        ctypes.WinDLL("cublas64_12.dll")
        return True
    except Exception:
        return False


def get_whisper_model():
    with _whisper_lock:
        if _whisper["model"] is not None:
            return _whisper["model"]
        _whisper["loading"] = True
        try:
            from faster_whisper import WhisperModel

            preference = os.environ.get("FUSION_STT_DEVICE", "auto").lower()
            use_cuda = preference == "cuda" or (
                preference == "auto" and _cuda_runtime_available()
            )
            device = "cuda" if use_cuda else "cpu"
            compute_type = "float16" if use_cuda else "int8"
            print(
                f"[whisper] loading {_whisper['model_id']} on {device} ({compute_type})",
                flush=True,
            )
            model = WhisperModel(
                _whisper["model_id"],
                device=device,
                compute_type=compute_type,
                cpu_threads=max(2, min(8, (os.cpu_count() or 4) - 1)),
            )
            _whisper["model"] = model
            _whisper["device"] = device
            _whisper["error"] = None
            print("[whisper] ready", flush=True)
            return model
        except Exception as exc:
            _whisper["error"] = str(exc)
            print(f"[whisper] unavailable, using Vosk fallback: {exc}", flush=True)
            return None
        finally:
            _whisper["loading"] = False


def preload_whisper_async():
    threading.Thread(
        target=get_whisper_model,
        daemon=True,
        name="FusionWhisperLoader",
    ).start()


WHISPER_LANG = {
    "zh-TW": "zh",
    "zh-CN": "zh",
    "en": "en",
    "ja": "ja",
    "ko": "ko",
}

WHISPER_PROMPT = (
    "嗨 Fusion。嘿 Fusion。Hey Fusion。OK Fusion。現在幾點？今天天氣如何？"
    "打開系統設定。ねえ Fusion。헤이 Fusion."
)


def transcribe_vosk(pcm, fusion_lang):
    import vosk

    model = get_vosk_model(fusion_lang)
    recognizer = new_recognizer(vosk, model)
    recognizer.AcceptWaveform(pcm)
    return json.loads(recognizer.FinalResult()).get("text", "").strip()


def transcribe_pcm(pcm, fusion_lang):
    model = get_whisper_model()
    if model is None:
        return transcribe_vosk(pcm, fusion_lang)

    import numpy as np

    audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
    segments, _info = model.transcribe(
        audio,
        language=WHISPER_LANG.get(fusion_lang),
        beam_size=5,
        condition_on_previous_text=False,
        vad_filter=False,
        initial_prompt=WHISPER_PROMPT,
        temperature=0,
    )
    return "".join(segment.text for segment in segments).strip()


async def _ws_send(websocket, payload):
    try:
        await websocket.send(json.dumps(payload, ensure_ascii=False))
    except Exception:
        pass


async def stt_handler(websocket):
    raw_path = (
        getattr(getattr(websocket, "request", None), "path", None)
        or getattr(websocket, "path", "")
        or ""
    )
    query = parse_qs(urlparse(raw_path).query)
    fusion_lang = query.get("lang", ["zh-TW"])[0]

    # Authorize the WebSocket the same way as HTTP: a foreign web page's Origin won't match.
    headers = getattr(getattr(websocket, "request", None), "headers", None)
    ws_origin = headers.get("Origin") if headers else None
    ws_host = headers.get("Host") if headers else None
    if not _request_allowed(ws_origin, ws_host):
        log_event(f"[stt] rejected WebSocket from disallowed origin={ws_origin!r}")
        await websocket.close(1008, "forbidden origin")
        return

    with _audio_lock:
        at_capacity = _audio["active_sessions"] >= MAX_WS_SESSIONS
    if at_capacity:
        log_event("[stt] rejected WebSocket: too many concurrent sessions")
        await websocket.close(1013, "server busy")
        return

    segmenter = VoiceActivitySegmenter(
        frame_ms=20,
        pre_roll_ms=180,
        trailing_silence_ms=620,
    )
    utterance = bytearray()
    session_id = uuid.uuid4().hex[:8]
    speech_active = False
    last_level_sent = 0.0
    signal_logged = False
    increment_audio("active_sessions")
    update_audio(last_error="")
    log_event(f"[stt:{session_id}] session started (lang={fusion_lang})")

    async def finish_utterance():
        nonlocal utterance
        pcm = bytes(utterance)
        utterance = bytearray()
        if len(pcm) < 6400:
            return
        try:
            text = await asyncio.get_running_loop().run_in_executor(
                None, transcribe_pcm, pcm, fusion_lang
            )
        except Exception as exc:
            update_audio(last_error=str(exc), speech_active=False)
            log_event(f"[stt:{session_id}] recognition failed: {exc}")
            await _ws_send(websocket, {"error": f"speech recognition failed: {exc}"})
            return
        if text:
            update_audio(last_text=text, last_error="", speech_active=False)
            # Log only the length, never the transcript content, so the on-disk log file
            # never accumulates a record of what the user said.
            log_event(f"[stt:{session_id}] recognized ({len(text)} chars)")
            await _ws_send(websocket, {"text": text, "final": True})

    try:
        async for message in websocket:
            if isinstance(message, (bytes, bytearray)):
                rms_dbfs, peak_dbfs = dbfs_levels(bytes(message))
                packet_count = increment_audio("total_packets")
                increment_audio("total_bytes", len(message))
                update_audio(
                    rms_dbfs=rms_dbfs,
                    peak_dbfs=peak_dbfs,
                    speech_active=speech_active,
                    last_packet_at=_now_iso(),
                )
                if not signal_logged and peak_dbfs > -75:
                    signal_logged = True
                    log_event(
                        f"[stt:{session_id}] audio received "
                        f"(rms={rms_dbfs:.1f} dBFS, peak={peak_dbfs:.1f} dBFS)"
                    )
                now = time.monotonic()
                if now - last_level_sent >= 0.2:
                    last_level_sent = now
                    await _ws_send(websocket, {
                        "event": "audio_level",
                        "rms_dbfs": rms_dbfs,
                        "peak_dbfs": peak_dbfs,
                        "speech": speech_active,
                        "packets": packet_count,
                    })
                for event in segmenter.feed(bytes(message)):
                    if event.kind == "speech_start":
                        speech_active = True
                        utterance = bytearray()
                        update_audio(speech_active=True)
                        log_event(f"[stt:{session_id}] speech started")
                        await _ws_send(websocket, {"event": "speech_start"})
                    elif event.kind == "audio":
                        utterance.extend(event.data)
                    elif event.kind == "speech_end":
                        await finish_utterance()
                        speech_active = False
                        update_audio(speech_active=False)
                        log_event(f"[stt:{session_id}] speech ended")
                        await _ws_send(websocket, {"event": "speech_end"})
                continue

            try:
                control = json.loads(message)
            except (ValueError, TypeError):
                control = {}
            if control.get("action") == "session_info":
                device_label = str(control.get("device_label", ""))
                update_audio(
                    device_label=device_label,
                    device_id=str(control.get("device_id", "")),
                    client_sample_rate=int(control.get("sample_rate", 0) or 0),
                )
                log_event(
                    f"[stt:{session_id}] microphone selected: "
                    f"{device_label or '(unknown device)'}"
                )
            elif control.get("action") == "eof":
                for event in segmenter.flush():
                    if event.kind == "speech_end":
                        await finish_utterance()
                speech_active = False
                update_audio(speech_active=False)
                await _ws_send(websocket, {"event": "speech_end"})
    except Exception as exc:
        update_audio(last_error=str(exc), speech_active=False)
        log_event(f"[stt:{session_id}] session error: {exc}")
    finally:
        with _audio_lock:
            _audio["active_sessions"] = max(0, _audio["active_sessions"] - 1)
            _audio["speech_active"] = False
        log_event(f"[stt:{session_id}] session ended")


def load_gemma_async(model_id):
    def _load():
        _gemma["loading"] = True
        _gemma["model_id"] = model_id
        try:
            import torch

            _disable_broken_torchvision()
            from transformers import (
                AutoTokenizer,
                BitsAndBytesConfig,
                Gemma4ForConditionalGeneration,
            )

            try:
                import bitsandbytes  # noqa: F401
            except ImportError as exc:
                raise RuntimeError(
                    "bitsandbytes is required for the 4-bit Gemma 4 runtime"
                ) from exc

            token = os.environ.get("HF_TOKEN") or None
            compute_dtype = (
                torch.bfloat16
                if torch.cuda.is_available() and torch.cuda.is_bf16_supported()
                else torch.float16
            )
            quantization = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
                bnb_4bit_compute_dtype=compute_dtype,
            )
            max_memory = {"cpu": "10GiB"}
            if torch.cuda.is_available():
                max_memory[0] = "7GiB"

            cache_dir = os.path.join(os.path.dirname(__file__), ".cache")
            offload_dir = os.path.join(cache_dir, "offload")
            os.makedirs(offload_dir, exist_ok=True)

            print(
                f"[gemma] loading {model_id} in 4-bit mode; HF_TOKEN is optional",
                flush=True,
            )
            tokenizer = AutoTokenizer.from_pretrained(
                model_id,
                token=token,
                cache_dir=cache_dir,
            )
            model = Gemma4ForConditionalGeneration.from_pretrained(
                model_id,
                token=token,
                cache_dir=cache_dir,
                device_map="auto",
                max_memory=max_memory,
                offload_folder=offload_dir,
                low_cpu_mem_usage=True,
                quantization_config=quantization,
                dtype=compute_dtype,
            )
            model.eval()
            _gemma["tokenizer"] = tokenizer
            _gemma["model"] = model
            _gemma["ready"] = True
            _gemma["error"] = None
            print("[gemma] ready", flush=True)
        except Exception as exc:
            _gemma["ready"] = False
            _gemma["error"] = str(exc)
            print(f"[gemma] load failed: {exc}", flush=True)
        finally:
            _gemma["loading"] = False

    threading.Thread(target=_load, daemon=True, name="FusionGemmaLoader").start()


SYSTEM_PROMPT = (
    "You are the intent router for the Fusion OS voice assistant. Reply with ONLY one JSON "
    "object and no markdown. Schema: "
    '{"action":"open_app|weather|time|date|setting|search|chat","app":"","setting":'
    '"theme|night|brightness|volume|transparency|animations|contrast|wallpaper|language|",'
    '"value":"","query":"","reply":""}. '
    "Use open_app for a matching app id; weather puts a city in query; setting values are "
    "dark/light, on/off/toggle, up/down, mute/unmute, 0-100, or a language code. "
    "Use chat for general conversation. Reply briefly in language {lang}. App ids: {apps}."
)


def gemma_understand(utterance, lang, apps):
    if not _gemma["ready"]:
        return None
    import torch

    tokenizer = _gemma["tokenizer"]
    model = _gemma["model"]
    app_list = ", ".join(
        f"{app.get('id')}={app.get('name')}" for app in apps
    ) if apps else ""
    prompt = SYSTEM_PROMPT.replace("{lang}", lang).replace("{apps}", app_list)
    messages = [{
        "role": "user",
        "content": f"{prompt}\n\nUser: {utterance}",
    }]

    with _gemma_lock:
        inputs = tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
        )
        device = next(model.parameters()).device
        inputs = {
            key: value.to(device) if hasattr(value, "to") else value
            for key, value in inputs.items()
        }
        input_length = inputs["input_ids"].shape[-1]
        with torch.inference_mode():
            output = model.generate(
                **inputs,
                max_new_tokens=192,
                do_sample=False,
                use_cache=True,
            )
        text = tokenizer.batch_decode(
            output[:, input_length:],
            skip_special_tokens=True,
        )[0]

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return {"action": "chat", "reply": text.strip()}
    try:
        return json.loads(match.group(0))
    except ValueError:
        return {"action": "chat", "reply": text.strip()}


def vad_engine_name():
    try:
        import webrtcvad  # noqa: F401

        return "WebRTC VAD"
    except ImportError:
        return "Energy VAD"


def stt_engine_name():
    if _whisper["model"] is not None:
        return f"Faster-Whisper {_whisper['model_id']} ({_whisper['device']})"
    if _whisper["loading"]:
        return f"Faster-Whisper {_whisper['model_id']} (loading)"
    return "Vosk fallback" if _whisper["error"] else f"Faster-Whisper {_whisper['model_id']}"


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def _cors(self, origin):
        # Reflect ONLY an allowlisted origin (never "*"), so other web pages cannot read us.
        if _origin_allowed(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code, payload, origin=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors(origin)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        _write_response_body(self.wfile, body)

    def _authorize(self):
        """Return (origin, ok). Foreign web pages are rejected with 403."""
        origin = self.headers.get("Origin")
        if not _request_allowed(origin, self.headers.get("Host")):
            self._json(403, {"error": "forbidden"}, origin)
            return origin, False
        return origin, True

    def do_OPTIONS(self):
        origin = self.headers.get("Origin")
        if origin is not None and not _origin_allowed(origin):
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(204)
        self._cors(origin)
        # Honor Chrome Private Network Access preflight so https://fusion.local can reach localhost.
        if self.headers.get("Access-Control-Request-Private-Network") == "true" and _origin_allowed(origin):
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()

    def do_GET(self):
        origin, ok = self._authorize()
        if not ok:
            return
        if urlparse(self.path).path != "/health":
            self._json(404, {"error": "not found"}, origin)
            return
        # Minimal, sanitized status. No transcripts, no raw error text/paths.
        self._json(200, {
            "ok": True,
            "service": "fusion-voice",
            "stt": True,
            "stt_engine": stt_engine_name(),
            "stt_loading": bool(_whisper["loading"]),
            "stt_error": _short_error(_whisper["error"]),
            "vad_engine": vad_engine_name(),
            "ws_port": WS_PORT,
            "gemma": bool(_gemma["ready"]),
            "gemma_loading": bool(_gemma["loading"]),
            "gemma_error": _short_error(_gemma["error"]),
            "gemma_model": _gemma["model_id"],
            "hf_authenticated": hf_authenticated(),
            "audio": public_audio_snapshot(),
        }, origin)

    def do_POST(self):
        origin, ok = self._authorize()
        if not ok:
            return
        if urlparse(self.path).path != "/understand":
            self._json(404, {"error": "not found"}, origin)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
        except (TypeError, ValueError):
            length = 0
        if length <= 0 or length > MAX_UNDERSTAND_BYTES:
            self._json(413, {"error": "request too large"}, origin)
            return
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, TypeError):
            self._json(400, {"error": "bad json"}, origin)
            return
        if not isinstance(body, dict):
            self._json(400, {"error": "bad json"}, origin)
            return

        if not _gemma["ready"]:
            self._json(503, {"error": "model not ready", "loading": bool(_gemma["loading"])}, origin)
            return

        utterance = str(body.get("utterance", ""))[:MAX_UTTERANCE_CHARS]
        lang = str(body.get("lang", "zh-TW"))[:16]
        apps = body.get("apps", [])
        if not isinstance(apps, list):
            apps = []
        apps = apps[:MAX_APPS]
        try:
            result = gemma_understand(utterance, lang, apps)
            self._json(200, result or {"action": "chat", "reply": ""}, origin)
        except Exception as exc:
            # Log details server-side; return a generic message (no stack/paths to the client).
            log_event(f"[understand] error: {exc}")
            self._json(500, {"error": "internal error"}, origin)


def start_http():
    server = ThreadingHTTPServer(("127.0.0.1", HTTP_PORT), Handler)
    print(f"[http] http://127.0.0.1:{HTTP_PORT}", flush=True)
    server.serve_forever()


async def main_async():
    import websockets

    print(f"[ws] ws://127.0.0.1:{WS_PORT}/stt", flush=True)
    async with websockets.serve(
        stt_handler,
        "127.0.0.1",
        WS_PORT,
        max_size=2 ** 22,
        ping_interval=20,
        ping_timeout=20,
    ):
        await asyncio.Future()


def main():
    global _args
    parser = argparse.ArgumentParser(
        description="Fusion Voice Server (Vosk + WebRTC VAD + Gemma 4)"
    )
    parser.add_argument("--no-gemma", action="store_true")
    parser.add_argument(
        "--gemma-model",
        default=DEFAULT_GEMMA_MODEL,
        help="Hugging Face model id",
    )
    _args = parser.parse_args()

    try:
        import vosk  # noqa: F401
    except ImportError:
        print("ERROR: voice runtime is missing; run bootstrap_voice.py", file=sys.stderr)
        sys.exit(1)

    threading.Thread(
        target=start_http,
        daemon=True,
        name="FusionVoiceHttp",
    ).start()
    preload_whisper_async()
    if not _args.no_gemma:
        load_gemma_async(_args.gemma_model)

    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
