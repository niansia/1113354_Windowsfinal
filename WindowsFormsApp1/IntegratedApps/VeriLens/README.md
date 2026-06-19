# VeriLens — 真偽鑑識中心 (Misinformation Forensics Lab)

A multimodal **fake-news detector** built into FusionOS — the capstone-of-capstones
that ties together a CS degree's worth of coursework around one task: deciding how
much to trust a piece of news.

It combines the author's final-year project (**YOLO** for fake-news detection) with
classic image forensics, NLP, a native fusion engine and a relational case store.

## What it does

Give VeriLens an article one of three ways — **paste a URL** (it fetches the page and
auto-extracts the headline, body text and lead image), type/paste the **headline +
body** manually, and/or **drop in an image** — and it runs three tracks and fuses them
into one explainable credibility verdict:

| Track | Tech | Signals |
|-------|------|---------|
| **Image (CV)** | **YOLOv8** via ONNX Runtime (+ hand-written NMS); OpenCV | object/person detection, **ELA** error-level analysis, noise-inconsistency, ORB copy-move → tamper score + heatmaps |
| **Text (NLP/ML)** | scikit-learn char n-gram TF-IDF + logistic regression; C++ lexicon engine | P(fake), clickbait / sensational / absolute-certainty / hedging / source-attribution counts, readability, claim extraction |
| **Web cross-reference** | Cofacts 真的假的 GraphQL API (+ best-effort web search) | matches the claim against a crowdsourced fact-check database; surfaces debunk articles + only ever raises the misinformation likelihood (never vouches "true") |
| **Source** | heuristic credibility table | reputable vs. content-farm/forward priors |
| **Fusion** | **C++** (`forensics_core.cpp`) | naive-Bayes **log-odds** combiner → credibility 0–100 + per-factor contributions |

Every analysis is written to a **SQLite** case database with aggregate stats.

## Curriculum it exercises

* **Computer Vision / capstone** — real YOLOv8 object detection (ONNX inference,
  letterbox pre-processing, custom Non-Maximum-Suppression).
* **Image processing / DSP** — Error-Level Analysis, noise-residual statistics,
  ORB keypoint copy-move detection (OpenCV).
* **Machine learning / NLP** — TF-IDF + logistic-regression text classifier.
* **Algorithms** — NMS, log-odds fusion, sentence segmentation & claim scoring.
* **Systems / C++** — a native analysis engine driven over stdin/stdout.
* **Databases** — SQLite schema, parameterized queries, indexes, aggregates.
* **Networking / web / SE** — client–server, REST, a dependency-free SPA, 5-language
  i18n, clean module boundaries, tests.

## Architecture

```
 browser (web/)                              server.py
 ┌──────────────┐   POST /api/analyze   ┌────────────────────────────────┐
 │ headline     │ ────────────────────▶ │ detector.py  YOLO(ONNX)+OpenCV  │──┐
 │ body         │                       │ textmodel.py sklearn classifier │  │ signals
 │ image (b64)  │                       │ source heuristic                │  ▼
 │ source       │ ◀──────────────────── │            ForensicsCore.exe (C++ fusion)
 └──────────────┘   verdict + factors   │                 │
        ▲           + annotated/ELA      │            casedb.py  SQLite
        │             images (b64)       └────────────────────────────────┘
   gauge · factor bars · YOLO boxes · ELA heatmap · text signals · case DB · methodology
```

* `engine/forensics_core.cpp` → `build/ForensicsCore.exe` — C++ linguistic features +
  claim extraction + multimodal log-odds fusion. stdin = `S` signal lines +
  `---HEADLINE---`/`---BODY---`; stdout = JSON. Verdict/factor names are stable keys
  (the web UI owns all i18n). A pure-Python fallback (`server.py:_py_fuse`) keeps the
  app working without g++.
* `models/` — bundled so the app is **self-contained / offline**: `yolov8n.onnx`
  (+`.data`), `coco_names.json`, `textmodel.pkl` (trained on first run).

## Run

```bash
python server.py --port 8794      # dashboard at http://127.0.0.1:8794
```

Inside FusionOS it launches as the **真偽鑑識中心** app (desktop icon / start menu /
voice "假新聞" or "查證"); the WinForms host (`Form1.cs` `LaunchVeriLens`) starts this
server on port 8794 and opens the dashboard in an in-app WebView window. Language,
clock format and timezone follow the system **Settings → 語言與時間** (default 繁體中文).

## i18n

`web/i18n.js` is source-as-key (zh-TW default + zh-CN/en/ja/ko). Locale is **system
-driven** — read from the launch URL and kept in sync via the host's
`FUSION_LOCALE_CHANGED` message (with the `chrome.webview` bridge) — there is no
in-app language selector, consistent with the rest of FusionOS.

## Notes

* The bundled YOLO model was exported from `yolov8n.pt` to ONNX so it runs under
  **onnxruntime** — this deliberately sidesteps a torch/torchvision NMS version issue
  on this machine, and the NMS is re-implemented in numpy/C++.
* This tool surfaces **risk signals to assist judgment**, it is not an absolute
  truth oracle — always cross-check.

## Tests

`tests/smoke.ps1` compiles the engine, runs a verdict, boots the server, and checks
YOLO / text-model / DB readiness plus the `/api/analyze` pipeline.
