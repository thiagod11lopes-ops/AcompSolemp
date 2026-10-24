# Repara hosts + DNS alias nesta maquina (exige Admin).
# Uso: Liberar-Firewall.cmd ja chama partes disso; ou:
#   powershell -ExecutionPolicy Bypass -File .\Reparar-Dns-Local.ps1

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host 'Reabrindo como Administrador...'
  $arg = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  Start-Process -FilePath 'powershell.exe' -ArgumentList $arg -Verb RunAs -Wait
  exit $LASTEXITCODE
}

& "$PSScriptRoot\Aplicar-Host.ps1"
& "$PSScriptRoot\Dns-Alias-Servidor.ps1"

$cfg = Import-ServidorConfig
$alias = [string]$cfg.SERVER_ALIAS
if (-not $alias) { $alias = 'sistema.acompomps.rede' }
$ip = Get-PreferredLanIPv4

Write-Host ''
Write-Host 'Teste local:'
try {
  $r = Resolve-DnsName -Name $alias -Type A -ErrorAction Stop | Select-Object -First 1
  Write-Host ("  Resolve-DnsName: {0} -> {1}" -f $alias, $r.IPAddress)
} catch {
  Write-Host ("  Resolve-DnsName falhou: {0}" -f $_.Exception.Message)
}

$code = curl.exe -s -o NUL -w '%{http_code}' --max-time 5 "http://${alias}:$($cfg.APP_PORT)/"
Write-Host ("  HTTP http://{0}:{1}/ -> {2}" -f $alias, $cfg.APP_PORT, $code)
Write-Host ''
Write-Host 'Se HTTP for 200 (ou 301/302), esta maquina esta OK para o nome amigavel.'
pause
