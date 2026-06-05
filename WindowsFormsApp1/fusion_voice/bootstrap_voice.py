#!/usr/bin/env python3
"""Install missing lightweight dependencies, then run the Fusion voice service."""

import argparse
import importlib.util
import os
import subprocess
import sys


RUNTIME_PACKAGES = [
    ("websockets", "websockets>=15,<16"),
    ("vosk", "vosk>=0.3.45"),
    ("webrtcvad", "webrtcvad-wheels>=2.0.14"),
    ("faster_whisper", "faster-whisper>=1.1,<2"),
]

AI_PACKAGES = [
    ("accelerate", "accelerate>=1.0"),
    ("bitsandbytes", "bitsandbytes>=0.49"),
    ("sentencepiece", "sentencepiece>=0.2"),
]


def missing(packages):
    return [
        requirement
        for module, requirement in packages
        if importlib.util.find_spec(module) is None
    ]


def install(requirements, required):
    if not requirements:
        return True
    command = [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--disable-pip-version-check",
        "--quiet",
        *requirements,
    ]
    try:
        subprocess.check_call(command)
        return True
    except subprocess.CalledProcessError as exc:
        label = "required voice" if required else "optional AI"
        print(
            f"[bootstrap] {label} dependency install failed: {exc}",
            file=sys.stderr,
            flush=True,
        )
        return not required


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-gemma", action="store_true")
    parser.add_argument("--gemma-model", default="google/gemma-4-12B-it")
    args = parser.parse_args()

    if not install(missing(RUNTIME_PACKAGES), required=True):
        return 1
    if not args.no_gemma:
        install(missing(AI_PACKAGES), required=False)

    service_root = os.path.dirname(os.path.abspath(__file__))
    if service_root not in sys.path:
        sys.path.insert(0, service_root)
    command = ["fusion_voice_server.py"]
    if args.no_gemma:
        command.append("--no-gemma")
    else:
        command.extend(["--gemma-model", args.gemma_model])
    sys.argv = command
    from fusion_voice_server import main as run_service

    run_service()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
