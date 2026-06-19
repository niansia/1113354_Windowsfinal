# Fusion IoT Nexus -- smoke test
# Compiles the C++ engine, runs one analytics tick, boots the server, and checks
# the HTTP surface + that the from-scratch MQTT broker accepts a real TCP client.
#
#   powershell -ExecutionPolicy Bypass -File tests\smoke.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0; $fail = 0
function Ok($m)   { Write-Host "  [PASS] $m" -ForegroundColor Green; $script:pass++ }
function Bad($m)  { Write-Host "  [FAIL] $m" -ForegroundColor Red;   $script:fail++ }

Write-Host "== Fusion IoT Nexus smoke ==" -ForegroundColor Cyan

# 1) build the engine -----------------------------------------------------------
$src = Join-Path $root "engine\edge_core.cpp"
$exe = Join-Path $root "build\EdgeCore.exe"
$gpp = (Get-Command g++ -ErrorAction SilentlyContinue)
if ($gpp) {
    New-Item -ItemType Directory -Force (Join-Path $root "build") | Out-Null
    & g++ -std=c++17 -O2 $src -o $exe
    if ($LASTEXITCODE -eq 0 -and (Test-Path $exe)) { Ok "engine compiled" } else { Bad "engine compile" }
} else {
    Write-Host "  [skip] g++ not found -- server will use the Python fallback" -ForegroundColor Yellow
}

# 2) one analytics tick through the native engine -------------------------------
if (Test-Path $exe) {
    $tsv = @(
        "G`tdt`t60", "G`tclock`t43200", "G`toutdoorTemp`t30", "G`tsolar`t0.8", "G`ttick`t5",
        "D`thvac-1`thvac`tlobby`t1`t-55`t100`ttemp=27,setpoint=23,mode=1,on=0,filter=0.9,rated=2400",
        "D`tair-1`tair`tlobby`t1`t-58`t90`tco2=900,pm25=10",
        "D`tpv-1`tsolar`troof`t1`t-50`t100`tcapacity=12000",
        "D`tmtr-1`tmeter`tmain`t1`t-40`t100`t"
    ) -join "`n"
    $out = $tsv | & $exe
    if ($out -match '"engine":"native"' -and $out -match '"kpi"' -and $out -match '"twin"') {
        Ok "engine produced a valid analytics tick"
    } else { Bad "engine tick output" }
}

# 3) boot the server ------------------------------------------------------------
$port = 18799; $mqtt = 11899
$proc = Start-Process -FilePath "python" -ArgumentList @((Join-Path $root "server.py"), "--port", "$port", "--mqtt-port", "$mqtt") -WorkingDirectory $root -PassThru -WindowStyle Hidden
try {
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        try {
            $h = Invoke-RestMethod "http://127.0.0.1:$port/api/health" -TimeoutSec 2
            if ($h) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 400 }
    }
    if ($ready) { Ok "server /api/health responded (engine=$($h.engine))" } else { Bad "server did not become ready" }

    if ($ready) {
        $snap = Invoke-RestMethod "http://127.0.0.1:$port/api/snapshot" -TimeoutSec 4
        if ($snap.devices.Count -ge 30) { Ok "snapshot has $($snap.devices.Count) devices" } else { Bad "snapshot device count ($($snap.devices.Count))" }
        if ($snap.twin.zones.Count -ge 5) { Ok "digital twin has $($snap.twin.zones.Count) zones" } else { Bad "twin zones" }
        if ($snap.kpi.online -ge 1) { Ok "KPIs present (online=$($snap.kpi.online))" } else { Bad "kpi online" }

        # 4) MQTT broker accepts a real TCP client (CONNECT -> CONNACK) ----------
        try {
            $cli = New-Object System.Net.Sockets.TcpClient("127.0.0.1", $mqtt)
            $ns = $cli.GetStream()
            $cid = [Text.Encoding]::ASCII.GetBytes("smoke-test")
            $payload = (,0x00 + ,0x04) + [Text.Encoding]::ASCII.GetBytes("MQTT") + (,0x04 + ,0x02 + ,0x00 + ,0x3c) + (,0x00 + ,$cid.Length) + $cid
            $packet = (,0x10 + ,$payload.Length) + $payload
            $ns.Write([byte[]]$packet, 0, $packet.Length); $ns.Flush()
            Start-Sleep -Milliseconds 300
            $buf = New-Object byte[] 4
            $n = $ns.Read($buf, 0, 4)
            if ($n -ge 4 -and $buf[0] -eq 0x20 -and $buf[3] -eq 0x00) { Ok "MQTT broker CONNECT -> CONNACK accepted" } else { Bad "MQTT CONNACK" }
            $cli.Close()
        } catch { Bad "MQTT broker connect ($_)" }
    }
} finally {
    if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
}

Write-Host ""
$col = if ($fail -eq 0) { "Green" } else { "Red" }
Write-Host "Result: $pass passed, $fail failed" -ForegroundColor $col
exit $fail
