# VeriLens -- smoke test
# Compiles the C++ fusion engine, runs one verdict, then boots the server and checks
# the AI components (YOLO / text model / engine) and the /api/analyze pipeline.
#
#   powershell -ExecutionPolicy Bypass -File tests\smoke.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0; $fail = 0
function Ok($m)  { Write-Host "  [PASS] $m" -ForegroundColor Green; $script:pass++ }
function Bad($m) { Write-Host "  [FAIL] $m" -ForegroundColor Red;   $script:fail++ }

Write-Host "== VeriLens smoke ==" -ForegroundColor Cyan

# 1) build the engine -----------------------------------------------------------
$src = Join-Path $root "engine\forensics_core.cpp"
$exe = Join-Path $root "build\ForensicsCore.exe"
if (Get-Command g++ -ErrorAction SilentlyContinue) {
    New-Item -ItemType Directory -Force (Join-Path $root "build") | Out-Null
    & g++ -std=c++17 -O2 $src -o $exe
    if ($LASTEXITCODE -eq 0 -and (Test-Path $exe)) { Ok "engine compiled" } else { Bad "engine compile" }
} else {
    Write-Host "  [skip] g++ not found -- server uses the Python fusion fallback" -ForegroundColor Yellow
}

# 2) one fusion verdict through the engine --------------------------------------
if (Test-Path $exe) {
    # ASCII-only sample (PowerShell 5.1 reads .ps1 as the system codepage, so the
    # English clickbait lexicon is used here to keep the script encoding-safe).
    $stdin = @"
S`tmlFake`t0.85
S`tsrcCred`t0.25
S`thasImage`t0
---HEADLINE---
SHOCKING! Exposed secret, this method is 100% proven, doctors hate it, must see!!!
---BODY---
This shocking secret has gone viral, allegedly 100% effective, you won't believe it.
"@
    $out = $stdin | & $exe
    if ($out -match '"verdict":"likely_false"' -and $out -match '"factors"') { Ok "engine flagged the fake sample (likely_false)" }
    else { Bad "engine verdict ($out)" }
}

# 3) boot the server + AI -------------------------------------------------------
$port = 18894
$proc = Start-Process -FilePath "python" -ArgumentList @((Join-Path $root "server.py"), "--port", "$port") -WorkingDirectory $root -PassThru -WindowStyle Hidden
try {
    $h = $null
    for ($i = 0; $i -lt 60; $i++) {
        try { $h = Invoke-RestMethod "http://127.0.0.1:$port/api/health" -TimeoutSec 2; if ($h.yolo -and $h.textModel) { break } } catch {}
        Start-Sleep -Milliseconds 700
    }
    if ($h) { Ok "server health responded" } else { Bad "server did not respond" }
    if ($h.yolo)      { Ok "YOLO model ready ($($h.yoloClasses) classes)" } else { Bad "YOLO not ready" }
    if ($h.textModel) { Ok "text classifier ready" } else { Bad "text model not ready" }
    if ($h.db)        { Ok "case database ready" } else { Bad "db not ready" }

    if ($h) {
        $body = @{ headline = "SHOCKING 100% effective secret doctors hate, share now!"; body = "Gone viral, allegedly proven, you won't believe it."; source = "facebook" } | ConvertTo-Json
        $r = Invoke-RestMethod "http://127.0.0.1:$port/api/analyze" -Method Post -Body $body -ContentType "application/json; charset=utf-8" -TimeoutSec 15
        if ($r.verdict) { Ok "analyze returned verdict=$($r.verdict) credibility=$([math]::Round($r.credibility))%" } else { Bad "analyze failed" }
        if ($r.factors.Count -ge 2) { Ok "explainable factors returned ($($r.factors.Count))" } else { Bad "no factors" }
    }
} finally {
    if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
}

Write-Host ""
$col = if ($fail -eq 0) { "Green" } else { "Red" }
Write-Host "Result: $pass passed, $fail failed" -ForegroundColor $col
exit $fail
