# DNS local: resolve SERVER_ALIAS -> IP atual da LAN (porta 53, exige Admin).
# Uso: .\Dns-Alias-Servidor.ps1
#      .\Dns-Alias-Servidor.ps1 -Stop

param(
  [switch]$Stop
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$root = Get-ServidorRoot
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$pidFile = Join-Path $logDir 'dns-alias.pid'
$stateFile = Join-Path $logDir 'dns-alias.state.json'
$workerPath = Join-Path $PSScriptRoot 'Dns-Alias-Worker.ps1'

function Stop-DnsAlias {
  if (Test-Path $pidFile) {
    $old = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($old) { Stop-Process -Id ([int]$old) -Force -ErrorAction SilentlyContinue }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -like '*Dns-Alias-Worker.ps1*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

if ($Stop) {
  Stop-DnsAlias
  Write-Host 'DNS alias parado.'
  exit 0
}

$cfg = Import-ServidorConfig
$alias = [string]$cfg.SERVER_ALIAS
if (-not $alias) { $alias = 'sistema.acompomps.rede' }
$alias = $alias.Trim().ToLowerInvariant().TrimEnd('.')

$ip = Get-PreferredLanIPv4
if (-not $ip) { throw 'Nao foi possivel detectar IP da LAN.' }

# hosts local (este PC)
$hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
try {
  $marker = '# acompopms-alias'
  $lines = @()
  if (Test-Path $hostsPath) {
    $lines = @(Get-Content $hostsPath -ErrorAction SilentlyContinue | Where-Object { $_ -notmatch [regex]::Escape($marker) })
  }
  $lines += "$ip`t$alias`t$marker"
  Set-Content -Path $hostsPath -Value $lines -Encoding ASCII
} catch {
  Write-Host "Aviso: nao foi possivel atualizar hosts local: $($_.Exception.Message)"
}

Stop-DnsAlias

@{
  alias = $alias
  ip    = $ip
  port  = 53
} | ConvertTo-Json | Set-Content -Path $stateFile -Encoding UTF8

$p = Start-Process -FilePath 'powershell.exe' `
  -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $workerPath) `
  -WindowStyle Hidden -PassThru

Start-Sleep -Seconds 1
if ($p.HasExited) {
  throw "Worker DNS encerrou cedo (codigo $($p.ExitCode)). Rode Liberar-Firewall.cmd como Admin (porta 53)."
}
Set-Content -Path $pidFile -Value $p.Id -Encoding ASCII

Write-Host "DNS alias ativo: $alias -> $ip"
Write-Host "  App: http://${alias}:$($cfg.APP_PORT)"
Write-Host "  No roteador, DNS primario = $ip (uma vez) para todos os clientes resolverem o nome."
