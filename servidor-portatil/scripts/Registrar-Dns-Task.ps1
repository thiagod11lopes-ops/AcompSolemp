$ErrorActionPreference = 'Stop'
$ps1 = Join-Path $PSScriptRoot 'Dns-Alias-Servidor.ps1'
$arg = "-NoProfile -ExecutionPolicy Bypass -File `"$ps1`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn
try { $trigger.Delay = 'PT45S' } catch { }
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
# User atual com Highest (SYSTEM as vezes falha sem policy)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
Register-ScheduledTask -TaskName 'AcompOPMS-DnsAlias' -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force `
  -Description 'DNS do nome amigavel AcompOPMS' | Out-Null
'OK AcompOPMS-DnsAlias'
