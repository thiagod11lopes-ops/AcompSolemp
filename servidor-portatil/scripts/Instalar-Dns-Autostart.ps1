# Registra DNS alias para subir no login (SYSTEM) e tenta liberar porta 53.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  throw 'Instalar-Dns-Autostart exige Administrador.'
}

# Firewall
netsh advfirewall firewall delete rule name="AcompOPMS DNS Alias 53" >$null 2>&1
netsh advfirewall firewall delete rule name="AcompOPMS Gateway 80" >$null 2>&1
netsh advfirewall firewall add rule name="AcompOPMS DNS Alias 53" dir=in action=allow protocol=UDP localport=53 | Out-Null
netsh advfirewall firewall add rule name="AcompOPMS Gateway 80" dir=in action=allow protocol=TCP localport=80 | Out-Null
netsh advfirewall firewall delete rule name="AcompOPMS App 5173" >$null 2>&1
netsh advfirewall firewall delete rule name="AcompOPMS Supabase 8000" >$null 2>&1
netsh advfirewall firewall add rule name="AcompOPMS App 5173" dir=in action=allow protocol=TCP localport=5173 | Out-Null
netsh advfirewall firewall add rule name="AcompOPMS Supabase 8000" dir=in action=allow protocol=TCP localport=8000 | Out-Null

# Sobe DNS agora
& "$PSScriptRoot\Dns-Alias-Servidor.ps1"

$ps1 = Join-Path $PSScriptRoot 'Dns-Alias-Servidor.ps1'
$arg = "-NoProfile -ExecutionPolicy Bypass -File `"$ps1`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn
try { $trigger.Delay = 'PT45S' } catch { }
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName 'AcompOPMS-DnsAlias' -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force `
  -Description 'DNS do nome amigavel AcompOPMS (porta 53)' | Out-Null

# Tenta apontar o DNS deste adaptador LAN para 127.0.0.1 (so este PC)
try {
  $ip = Get-PreferredLanIPv4
  $addr = Get-NetIPAddress -IPAddress $ip -ErrorAction SilentlyContinue
  if ($addr) {
    Set-DnsClientServerAddress -InterfaceIndex $addr.InterfaceIndex -ServerAddresses @('127.0.0.1','1.1.1.1') -ErrorAction SilentlyContinue
  }
} catch { }

Write-Host 'DNS alias instalado no inicio automatico (AcompOPMS-DnsAlias).'
