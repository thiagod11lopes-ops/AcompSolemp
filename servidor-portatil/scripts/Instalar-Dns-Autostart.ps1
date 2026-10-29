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
netsh advfirewall firewall delete rule name="AcompOPMS Gateway 443" >$null 2>&1
netsh advfirewall firewall add rule name="AcompOPMS DNS Alias 53" dir=in action=allow protocol=UDP localport=53 | Out-Null
netsh advfirewall firewall add rule name="AcompOPMS Gateway 80" dir=in action=allow protocol=TCP localport=80 | Out-Null
netsh advfirewall firewall add rule name="AcompOPMS Gateway 443" dir=in action=allow protocol=TCP localport=443 | Out-Null
netsh advfirewall firewall delete rule name="AcompOPMS App 5173" >$null 2>&1
netsh advfirewall firewall delete rule name="AcompOPMS Supabase 8000" >$null 2>&1
netsh advfirewall firewall add rule name="AcompOPMS App 5173" dir=in action=allow protocol=TCP localport=5173 | Out-Null
netsh advfirewall firewall add rule name="AcompOPMS Supabase 8000" dir=in action=allow protocol=TCP localport=8000 | Out-Null

$cfg = Import-ServidorConfig
$publicIp = Get-ConfiguredPublicIp $cfg
if (-not $publicIp) { $publicIp = Get-PreferredLanIPv4 }

# Firewall 80/443/5173/8000 ja foi instalado acima — isso basta no modo IP.
if (Test-ServerUsesIpOnly $cfg) {
  Write-Host "Modo IP: pulando DNS alias (porta 53)."
  Write-Host "Regras de firewall OK. Clientes: https://${publicIp}/"
  # Remove tarefa DNS antiga se existir (nao precisa no modo IP)
  try { Unregister-ScheduledTask -TaskName 'AcompOPMS-DnsAlias' -Confirm:$false -ErrorAction SilentlyContinue } catch { }
  try { & "$PSScriptRoot\Dns-Alias-Servidor.ps1" -Stop } catch { }
  Write-Host 'Preparacao de rede concluida (sem DNS :53).'
  exit 0
}

# Nome amigavel: sobe DNS agora (falha de porta 53 nao bloqueia mais o Liberar-Firewall)
try {
  & "$PSScriptRoot\Dns-Alias-Servidor.ps1"
} catch {
  Write-Host ("Aviso: DNS alias nao subiu: {0}" -f $_.Exception.Message)
  Write-Host ("Pode continuar pelo IP: https://{0}/" -f $publicIp)
}

$ps1 = Join-Path $PSScriptRoot 'Dns-Alias-Servidor.ps1'
$arg = "-NoProfile -ExecutionPolicy Bypass -File `"$ps1`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn
try { $trigger.Delay = 'PT45S' } catch { }
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

try {
  Register-ScheduledTask -TaskName 'AcompOPMS-DnsAlias' -Action $action -Trigger $trigger `
    -Settings $settings -Principal $principal -Force `
    -Description 'DNS do nome amigavel AcompOPMS (porta 53)' | Out-Null
  Write-Host 'DNS alias instalado no inicio automatico (AcompOPMS-DnsAlias).'
} catch {
  Write-Host ("Aviso: nao registrou tarefa DNS: {0}" -f $_.Exception.Message)
}

# Tenta apontar o DNS deste adaptador LAN para 127.0.0.1 (so este PC)
try {
  $ip = if ($publicIp) { $publicIp } else { Get-PreferredLanIPv4 }
  $addr = Get-NetIPAddress -IPAddress $ip -ErrorAction SilentlyContinue
  if ($addr) {
    Set-DnsClientServerAddress -InterfaceIndex $addr.InterfaceIndex -ServerAddresses @('127.0.0.1','1.1.1.1') -ErrorAction SilentlyContinue
  }
} catch { }

Write-Host 'Firewall + tentativa de DNS concluidos.'
