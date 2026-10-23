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
$errLog = Join-Path $logDir 'dns-alias.err.log'
$workerPath = Join-Path $PSScriptRoot 'Dns-Alias-Worker.ps1'
$icsFlag = Join-Path $logDir 'dns-alias-stopped-ics.flag'

function Stop-DnsAlias {
  if (Test-Path $pidFile) {
    $old = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($old) { Stop-Process -Id ([int]$old) -Force -ErrorAction SilentlyContinue }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -like '*Dns-Alias-Worker.ps1*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

  # Se paramos o ICS para liberar a porta 53, tenta religar ao parar o DNS
  if (Test-Path $icsFlag) {
    try {
      Start-Service -Name 'SharedAccess' -ErrorAction SilentlyContinue
    } catch { }
    Remove-Item $icsFlag -Force -ErrorAction SilentlyContinue
  }
}

function Get-Udp53Owner {
  try {
    $ep = Get-NetUDPEndpoint -LocalPort 53 -ErrorAction SilentlyContinue |
      Where-Object { $_.LocalAddress -eq '0.0.0.0' -or $_.LocalAddress -eq '::' } |
      Select-Object -First 1
    if (-not $ep) { return $null }
    $proc = Get-Process -Id $ep.OwningProcess -ErrorAction SilentlyContinue
    $svc = Get-CimInstance Win32_Service -ErrorAction SilentlyContinue |
      Where-Object { $_.ProcessId -eq $ep.OwningProcess } |
      Select-Object -First 1
    return [pscustomobject]@{
      Pid         = $ep.OwningProcess
      ProcessName = if ($proc) { $proc.ProcessName } else { '?' }
      ServiceName = if ($svc) { $svc.Name } else { $null }
      DisplayName = if ($svc) { $svc.DisplayName } else { $null }
    }
  } catch { return $null }
}

function Unlock-Port53 {
  $owner = Get-Udp53Owner
  if (-not $owner) { return $true }

  Write-Host ("Porta 53 em uso por PID {0} ({1})" -f $owner.Pid, $owner.ProcessName)
  if ($owner.ServiceName -eq 'SharedAccess' -or $owner.DisplayName -like '*Compartilhamento*') {
    Write-Host 'Parando ICS (Compartilhamento de Conexao com a Internet) para liberar a porta 53...'
    try {
      Stop-Service -Name 'SharedAccess' -Force -ErrorAction Stop
      Set-Content -Path $icsFlag -Value '1' -Encoding ASCII
      Start-Sleep -Seconds 2
    } catch {
      throw "Nao foi possivel parar o ICS: $($_.Exception.Message). Desative o Compartilhamento de Internet manualmente e tente de novo."
    }
    $owner2 = Get-Udp53Owner
    if ($owner2) {
      throw "Porta 53 ainda ocupada apos parar ICS (PID $($owner2.Pid))."
    }
    return $true
  }

  throw ("Porta 53 ocupada por '{0}' (PID {1}). Feche esse servico ou desative o DNS/ICS que esta usando a porta." -f $(if ($owner.DisplayName) { $owner.DisplayName } else { $owner.ProcessName }), $owner.Pid)
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
Unlock-Port53 | Out-Null

@{
  alias = $alias
  ip    = $ip
  port  = 53
} | ConvertTo-Json | Set-Content -Path $stateFile -Encoding UTF8

Remove-Item $errLog -Force -ErrorAction SilentlyContinue

$p = Start-Process -FilePath 'powershell.exe' `
  -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $workerPath) `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardError $errLog

Start-Sleep -Seconds 2
if ($p.HasExited) {
  $detail = ''
  if (Test-Path $errLog) { $detail = (Get-Content $errLog -Raw -ErrorAction SilentlyContinue) }
  throw ("Worker DNS encerrou cedo (codigo {0}). {1}" -f $p.ExitCode, $detail)
}
Set-Content -Path $pidFile -Value $p.Id -Encoding ASCII

Write-Host "DNS alias ativo: $alias -> $ip"
Write-Host "  App: http://${alias}:$($cfg.APP_PORT)"
Write-Host "  No roteador, DNS primario = $ip (uma vez) para todos os clientes resolverem o nome."
