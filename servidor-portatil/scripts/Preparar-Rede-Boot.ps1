# Preparacao de rede no boot/login (idempotente, pensado para tarefa elevada/SYSTEM).
# Garante hosts, firewall, DNS alias e certificado HTTPS sem intervencao.
# Uso: .\Preparar-Rede-Boot.ps1
#      chamado pela tarefa AcompOPMS-PrepararRede

$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\_common.ps1"

$root = Get-ServidorRoot
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'preparar-rede-boot.log'

function Write-BootLog([string]$Message) {
  $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $log -Value $line -Encoding UTF8
  Write-Host $line
}

function Test-IsAdmin {
  try {
    return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
      IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch { return $false }
}

Write-BootLog '=== Preparar-Rede-Boot inicio ==='
Write-BootLog ("Admin={0} User={1}" -f (Test-IsAdmin), $env:USERNAME)

try {
  Write-BootLog 'Aplicar-Host...'
  & "$PSScriptRoot\Aplicar-Host.ps1"
} catch {
  Write-BootLog ("Aplicar-Host ERRO: {0}" -f $_.Exception.Message)
}

if (Test-IsAdmin) {
  try {
    Write-BootLog 'Firewall (53/80/443/5173/8000)...'
    netsh advfirewall firewall delete rule name="AcompOPMS DNS Alias 53" >$null 2>&1
    netsh advfirewall firewall delete rule name="AcompOPMS Gateway 80" >$null 2>&1
    netsh advfirewall firewall delete rule name="AcompOPMS Gateway 443" >$null 2>&1
    netsh advfirewall firewall delete rule name="AcompOPMS App 5173" >$null 2>&1
    netsh advfirewall firewall delete rule name="AcompOPMS Supabase 8000" >$null 2>&1
    netsh advfirewall firewall add rule name="AcompOPMS DNS Alias 53" dir=in action=allow protocol=UDP localport=53 | Out-Null
    netsh advfirewall firewall add rule name="AcompOPMS Gateway 80" dir=in action=allow protocol=TCP localport=80 | Out-Null
    netsh advfirewall firewall add rule name="AcompOPMS Gateway 443" dir=in action=allow protocol=TCP localport=443 | Out-Null
    netsh advfirewall firewall add rule name="AcompOPMS App 5173" dir=in action=allow protocol=TCP localport=5173 | Out-Null
    netsh advfirewall firewall add rule name="AcompOPMS Supabase 8000" dir=in action=allow protocol=TCP localport=8000 | Out-Null
  } catch {
    Write-BootLog ("Firewall ERRO: {0}" -f $_.Exception.Message)
  }

  try {
    Write-BootLog 'Preparar-Https...'
    & "$PSScriptRoot\Preparar-Https.ps1"
  } catch {
    Write-BootLog ("HTTPS ERRO: {0}" -f $_.Exception.Message)
  }

  try {
    $ip = Get-PreferredLanIPv4
    $addr = Get-NetIPAddress -IPAddress $ip -ErrorAction SilentlyContinue
    if ($addr) {
      Set-DnsClientServerAddress -InterfaceIndex $addr.InterfaceIndex -ServerAddresses @('127.0.0.1', '1.1.1.1') -ErrorAction SilentlyContinue
      Write-BootLog ("DNS do adaptador -> 127.0.0.1 (+1.1.1.1) ifIndex={0}" -f $addr.InterfaceIndex)
    }
  } catch {
    Write-BootLog ("DNS cliente ERRO: {0}" -f $_.Exception.Message)
  }
} else {
  Write-BootLog 'Sem Admin: pulando firewall/HTTPS/DNS do adaptador (use a tarefa elevada AcompOPMS-PrepararRede).'
}

try {
  Write-BootLog 'Dns-Alias-Servidor...'
  & "$PSScriptRoot\Dns-Alias-Servidor.ps1"
} catch {
  Write-BootLog ("DNS alias ERRO: {0}" -f $_.Exception.Message)
}

Write-BootLog '=== Preparar-Rede-Boot fim ==='
exit 0
