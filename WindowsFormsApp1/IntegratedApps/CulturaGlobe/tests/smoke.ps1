# Cultura -- World Cultures Globe smoke test
#   powershell -ExecutionPolicy Bypass -File tests\smoke.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0; $fail = 0
function Ok($m)  { Write-Host "  [PASS] $m" -ForegroundColor Green; $script:pass++ }
function Bad($m) { Write-Host "  [FAIL] $m" -ForegroundColor Red;   $script:fail++ }

Write-Host "== Cultura globe smoke ==" -ForegroundColor Cyan

# 1) bundled assets present (self-contained / offline)
$assets = @("web\vendor\three.module.js", "web\textures\earth_atmos_2048.jpg",
            "web\textures\earth_lights_2048.png", "web\textures\earth_specular_2048.jpg",
            "web\data.js", "web\audio.js", "web\globe.js", "web\app.js", "web\index.html")
foreach ($a in $assets) {
    $p = Join-Path $root $a
    if ((Test-Path $p) -and (Get-Item $p).Length -gt 0) { Ok "asset $a ($([math]::Round((Get-Item $p).Length/1kb))KB)" }
    else { Bad "missing asset $a" }
}

# 2) boot the static server + health + key routes
$port = 18895
$proc = Start-Process -FilePath "python" -ArgumentList @((Join-Path $root "server.py"), "--port", "$port") -WorkingDirectory $root -PassThru -WindowStyle Hidden
try {
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        try { $h = Invoke-RestMethod "http://127.0.0.1:$port/api/health" -TimeoutSec 2; if ($h.ok) { $ready = $true; break } } catch { Start-Sleep -Milliseconds 300 }
    }
    if ($ready) { Ok "server /api/health responded" } else { Bad "server not ready" }
    if ($ready) {
        foreach ($route in @("/", "/data.js", "/globe.js", "/vendor/three.module.js", "/textures/earth_atmos_2048.jpg")) {
            try {
                $r = Invoke-WebRequest "http://127.0.0.1:$port$route" -TimeoutSec 5 -UseBasicParsing
                if ($r.StatusCode -eq 200 -and $r.RawContentLength -gt 0) { Ok "served $route" } else { Bad "route $route" }
            } catch { Bad "route $route ($_)" }
        }
    }
} finally {
    if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
}

Write-Host ""
$col = if ($fail -eq 0) { "Green" } else { "Red" }
Write-Host "Result: $pass passed, $fail failed" -ForegroundColor $col
exit $fail
