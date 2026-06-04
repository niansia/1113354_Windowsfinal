param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$app = Join-Path $root "MetroPulse"
$src = Join-Path $app "src\main.cpp"
$build = Join-Path $app "build"
$exe = Join-Path $build "MetroPulseEngine.exe"
$report = Join-Path $app "web\report.generated.js"

if (-not (Test-Path -LiteralPath $src)) {
    throw "Missing MetroPulse C++ source: $src"
}

$compiler = (Get-Command g++ -ErrorAction SilentlyContinue)
if (-not $compiler) {
    throw "g++ is required for MetroPulse smoke test"
}

New-Item -ItemType Directory -Force -Path $build | Out-Null
& $compiler.Source -std=c++17 -O2 -Wall -Wextra -pedantic $src -o $exe
if ($LASTEXITCODE -ne 0) {
    throw "MetroPulse C++ compile failed with exit code $LASTEXITCODE"
}

& $exe --city fusion-harbor --lang zh-TW --out $report --js
if ($LASTEXITCODE -ne 0) {
    throw "MetroPulse engine failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path -LiteralPath $report)) {
    throw "Report was not generated: $report"
}

$text = Get-Content -LiteralPath $report -Raw -Encoding UTF8
foreach ($needle in @(
    "window.METROPULSE_REPORT",
    '"city":"fusion-harbor"',
    '"optimizedRoute"',
    '"signalPlan"',
    '"incidentResponse"',
    '"districts"',
    '"simulationFrames"',
    '"language":"zh-TW"'
)) {
    if ($text -notlike "*$needle*") {
        throw "Report missing expected marker: $needle"
    }
}

Write-Output "MetroPulse smoke test passed."
