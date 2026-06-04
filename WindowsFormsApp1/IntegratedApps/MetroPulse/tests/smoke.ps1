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
    '"graphSource"',
    '"nodes"',
    '"edges"',
    '"optimizedRoute"',
    '"predictedRoute"',
    '"signalPlan"',
    '"incidentResponse"',
    '"accessibility"',
    '"bottlenecks"',
    '"kpis"',
    '"forecast"',
    '"language":"zh-TW"'
)) {
    if ($text -notlike "*$needle*") {
        throw "Report missing expected marker: $needle"
    }
}

# A live geographic graph fed via --graph must round-trip through the engine.
$graphFile = Join-Path $build "_smoke_graph.tsv"
@(
    "N`tuser`t25.0330`t121.5654`t0.46`torigin`tn_origin`tCurrent Position",
    "N`tpoi0`t25.0480`t121.5170`t0.90`ttransit`t`tTaipei Main Station",
    "N`tpoi1`t25.0410`t121.5650`t0.84`tpriority`t`tCity Hospital",
    "N`tpoi2`t25.0330`t121.5430`t0.78`tcommerce`t`tCentral Market",
    "O`tuser",
    "P`tpoi1"
) -join "`n" | Out-File -LiteralPath $graphFile -Encoding utf8

$live = & $exe --city fusion-harbor --lang zh-TW --lat 25.0330 --lon 121.5654 --graph $graphFile --out -
if ($LASTEXITCODE -ne 0) { throw "MetroPulse engine failed on live graph with exit code $LASTEXITCODE" }
if ($live -notlike '*"graphSource":"live-osm"*') { throw "Engine did not accept the live --graph input" }
if ($live -notlike '*Taipei Main Station*') { throw "Live graph node name missing from report" }
Remove-Item -LiteralPath $graphFile -Force -ErrorAction SilentlyContinue

Write-Output "MetroPulse smoke test passed."
