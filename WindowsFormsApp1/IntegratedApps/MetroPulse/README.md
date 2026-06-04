# MetroPulse

MetroPulse is a Fusion OS integrated work: a smart-city traffic command center with a native C++17 simulation engine and a WebView visualization surface.

The visible product is not a C++ demo. C++ is the foundation used to compute route optimization, signal timing, incident response, district load, and simulation frames. Fusion OS launches the generated report through the home shell.

## Build

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\smoke.ps1
```

The smoke test compiles `src/main.cpp` with `g++`, runs the engine, and writes `web/report.generated.js`.

## Engine

```powershell
.\build\MetroPulseEngine.exe --city fusion-harbor --lang zh-TW --out .\web\report.generated.js
```

## Fusion OS Integration

WinForms prebuilds the engine in the background, regenerates the report on launch, and opens `web/index.html` inside a Fusion OS WebView. The app reads language/time settings from Fusion OS and listens for later locale updates.
