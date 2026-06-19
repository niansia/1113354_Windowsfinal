param(
    [string]$AssemblyPath = (Join-Path $PSScriptRoot '..\bin\Debug\WindowsFormsApp1.exe')
)

$resolvedAssembly = (Resolve-Path $AssemblyPath).Path
$assembly = [Reflection.Assembly]::LoadFrom($resolvedAssembly)
$localeType = $assembly.GetType('WindowsFormsApp1.FusionLocale', $true)
$nowMethod = $localeType.GetMethod('Now', [Reflection.BindingFlags]'Public,Static')

$script:timeZoneExceptions = 0
$handler = [System.EventHandler[System.Runtime.ExceptionServices.FirstChanceExceptionEventArgs]] {
    param($sender, $eventArgs)
    if ($eventArgs.Exception -is [System.TimeZoneNotFoundException]) {
        $script:timeZoneExceptions++
    }
}

[AppDomain]::CurrentDomain.add_FirstChanceException($handler)
try {
    $result = $nowMethod.Invoke($null, @('Asia/Taipei'))
}
finally {
    [AppDomain]::CurrentDomain.remove_FirstChanceException($handler)
}

if ($null -eq $result) {
    throw 'FusionLocale.Now did not return a date.'
}

if ($script:timeZoneExceptions -ne 0) {
    throw "FusionLocale.Now threw $script:timeZoneExceptions TimeZoneNotFoundException event(s) for Asia/Taipei."
}

Write-Output 'FusionLocale known-IANA lookup completed without first-chance timezone exceptions.'
