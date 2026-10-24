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
}

function Get-Udp53Owner {
  try {
    $ep = Get-NetUDPEndpoint -LocalPort 53 -ErrorAction SilentlyContinue |
      Where-Object { $_.LocalAddress -eq '0.0.0.0' -or $_.LocalAddress -eq '::' -or $_.LocalAddress -like '192.168.*' } |
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

function Disable-IcsSharingCom {
  # Desliga "Permitir que outros usuarios da rede se conectem" em todos os adaptadores.
  try {
    $netShare = New-Object -ComObject HNetCfg.HNetShare
    foreach ($conn in @($netShare.EnumEveryConnection)) {
      try {
        $config = $netShare.INetSharingConfigurationForConnection.Invoke($conn)
        if ($config -and $config.SharingEnabled) {
          $props = $netShare.NetConnectionProps.Invoke($conn)
          Write-Host ("  Desativando compartilhamento em: {0}" -f $props.Name)
          $config.DisableSharing()
        }
      } catch { }
    }
    return $true
  } catch {
    Write-Host ("  Aviso COM ICS: {0}" -f $_.Exception.Message)
    return $false
  }
}

function Unlock-Port53 {
  $owner = Get-Udp53Owner
  if (-not $owner) { return $true }

  Write-Host ("Porta 53 em uso por PID {0} ({1} / {2})" -f $owner.Pid, $owner.ProcessName, $(if ($owner.ServiceName) { $owner.ServiceName } else { '-' }))

  Write-Host 'Tentando liberar a porta 53 (ICS / SharedAccess)...'
  Disable-IcsSharingCom | Out-Null

  # Desabilita e para o servico (nao mata svchost)
  try { Set-Service -Name 'SharedAccess' -StartupType Disabled -ErrorAction SilentlyContinue } catch { }
  & sc.exe config SharedAccess start= disabled | Out-Null
  & sc.exe stop SharedAccess | Out-Null
  try { Stop-Service -Name 'SharedAccess' -Force -ErrorAction SilentlyContinue } catch { }

  Set-Content -Path $icsFlag -Value (Get-Date -Format 'o') -Encoding ASCII
  Start-Sleep -Seconds 3

  $owner2 = Get-Udp53Owner
  if (-not $owner2) {
    Write-Host 'Porta 53 liberada.'
    return $true
  }

  # Segunda tentativa: so COM + espera
  Write-Host 'Ainda ocupada; nova tentativa...'
  Disable-IcsSharingCom | Out-Null
  & sc.exe stop SharedAccess | Out-Null
  Start-Sleep -Seconds 4

  $owner3 = Get-Udp53Owner
  if (-not $owner3) {
    Write-Host 'Porta 53 liberada.'
    return $true
  }

  $msg = @"
Nao foi possivel liberar a porta 53 automaticamente.

Faca manualmente (1 minuto):
1. Pressione Win+R, digite: ncpa.cpl  e Enter
2. Clique com o botao direito no Wi-Fi ou Ethernet -> Propriedades
3. Aba 'Compartilhamento'
4. DESMARQUE 'Permitir que outros usuarios da rede se conectem...'
5. OK e rode Liberar-Firewall.cmd de novo

Enquanto isso, use o IP: http://$($(Get-PreferredLanIPv4)):5173
"@
  throw $msg.Trim()
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

# Confirma resolucao local
try {
  $lookup = Resolve-DnsName -Name $alias -Server 127.0.0.1 -Type A -DnsOnly -ErrorAction Stop
  Write-Host ("Teste local OK: {0} -> {1}" -f $alias, ($lookup | Select-Object -First 1 -ExpandProperty IPAddress))
} catch {
  Write-Host "Aviso: teste Resolve-DnsName local falhou (pode ser cache). DNS worker esta rodando."
}

Write-Host "DNS alias ativo: $alias -> $ip"
Write-Host "  App: http://${alias}:$($cfg.APP_PORT)"
Write-Host "  No roteador, DNS primario = $ip (uma vez) para todos os clientes resolverem o nome."
