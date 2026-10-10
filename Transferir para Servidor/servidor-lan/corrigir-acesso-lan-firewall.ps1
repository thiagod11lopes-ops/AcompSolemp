# Etapa 4B — Diagnóstico LAN + regra de entrada TCP 8080 (perfil Private)
# Executar como Administrador na raiz do repositório:
#   powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/corrigir-acesso-lan-firewall.ps1"
#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $LanDir "servidor.env"
$PidFile = Join-Path $LanDir "caddy.pid"
$Caddyfile = Join-Path $LanDir "Caddyfile.generated"
$RuleDisplayName = "AcompOPMS - LAN HTTP (TCP 8080)"
$HttpPort = 8080

function Get-ConfiguredHttpPort {
  if (-not (Test-Path $EnvFile)) { return 8080 }
  foreach ($line in Get-Content $EnvFile) {
    $t = $line.Trim()
    if ($t -match '^\s*ACOMOPMS_HTTP_PORT\s*=\s*(\d+)') { return [int]$Matches[1] }
  }
  return 8080
}

function Get-PreferredLanIPv4 {
  $skipName = '(?i)(vEthernet|WSL|VirtualBox|VMware|Hyper-V|Loopback|Teredo|isatap|Bluetooth)'
  $candidates = @()

  $profiles = @(Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object {
      $_.IPv4Connectivity -ne 'Disconnected'
    })

  foreach ($prof in $profiles) {
    $addrs = Get-NetIPAddress -InterfaceIndex $prof.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }
    foreach ($a in $addrs) {
      $ifAlias = (Get-NetAdapter -InterfaceIndex $prof.InterfaceIndex -ErrorAction SilentlyContinue).Name
      if ($ifAlias -match $skipName) { continue }
      $candidates += [pscustomobject]@{
        IP           = $a.IPAddress
        Profile      = $prof.NetworkCategory
        Interface    = $ifAlias
        InterfaceIdx = $prof.InterfaceIndex
      }
    }
  }

  if ($candidates.Count -eq 0) {
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
      ForEach-Object {
        $ifAlias = (Get-NetAdapter -InterfaceIndex $_.InterfaceIndex -ErrorAction SilentlyContinue).Name
        if ($ifAlias -notmatch $skipName) {
          $candidates += [pscustomobject]@{
            IP           = $_.IPAddress
            Profile      = 'Unknown'
            Interface    = $ifAlias
            InterfaceIdx = $_.InterfaceIndex
          }
        }
      }
  }

  $private = $candidates | Where-Object { $_.Profile -eq 'Private' } | Select-Object -First 1
  if ($private) { return $private }

  $lanLike = $candidates | Where-Object { $_.IP -match '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)' } | Select-Object -First 1
  if ($lanLike) { return $lanLike }

  return $candidates | Select-Object -First 1
}

function Test-HttpOk {
  param([string]$Url)
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 15 -MaximumRedirection 0
    return @{ Ok = ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400); StatusCode = $r.StatusCode; Error = $null }
  } catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    return @{ Ok = $false; StatusCode = $code; Error = $_.Exception.Message }
  }
}

$HttpPort = Get-ConfiguredHttpPort

Write-Host "`n=== Etapa 4B — Diagnóstico LAN (porta $HttpPort) ===" -ForegroundColor Cyan

$lan = Get-PreferredLanIPv4
if (-not $lan) {
  Write-Host "ERRO: Nenhum IPv4 LAN encontrado (Wi-Fi/Ethernet ativa)." -ForegroundColor Red
  exit 1
}
Write-Host "IPv4 LAN: $($lan.IP) (interface: $($lan.Interface), perfil: $($lan.Profile))"

$caddyProc = Get-Process -Name caddy -ErrorAction SilentlyContinue
if ($caddyProc) {
  Write-Host "Caddy: em execução (PID(s): $($caddyProc.Id -join ', '))"
} elseif (Test-Path $PidFile) {
  $pidFromFile = Get-Content $PidFile -ErrorAction SilentlyContinue
  $byFile = Get-Process -Id $pidFromFile -ErrorAction SilentlyContinue
  if ($byFile) {
    Write-Host "Caddy: em execução (PID $pidFromFile via caddy.pid)"
  } else {
    Write-Host "AVISO: caddy.pid existe mas processo não encontrado. Rode start-servidor-lan.ps1" -ForegroundColor Yellow
  }
} else {
  Write-Host "AVISO: Caddy não detectado. Rode start-servidor-lan.ps1 antes dos testes HTTP." -ForegroundColor Yellow
}

$listeners = @(Get-NetTCPConnection -LocalPort $HttpPort -State Listen -ErrorAction SilentlyContinue)
if ($listeners.Count -eq 0) {
  Write-Host "ERRO: Nada em LISTEN na porta $HttpPort." -ForegroundColor Red
  exit 1
}
$bindAddrs = ($listeners | Select-Object -ExpandProperty LocalAddress -Unique) -join ', '
Write-Host "Porta $HttpPort LISTENING em: $bindAddrs"

$bindsAll = $listeners | Where-Object { $_.LocalAddress -eq '0.0.0.0' -or $_.LocalAddress -eq '::' }
if ($bindsAll.Count -eq 0) {
  Write-Host "ERRO: Caddy/serviço não escuta em 0.0.0.0:$HttpPort (só em endereços específicos). Corrija o bind antes do firewall." -ForegroundColor Red
  exit 1
}

if (Test-Path $Caddyfile) {
  $hasBind = Select-String -Path $Caddyfile -Pattern 'bind\s+0\.0\.0\.0' -Quiet
  Write-Host "Caddyfile.generated bind 0.0.0.0: $(if ($hasBind) { 'sim' } else { 'NAO — regenere com generate-caddyfile.mjs' })"
}

Write-Host "`n=== Regra Windows Firewall (entrada TCP $HttpPort, perfil Private) ===" -ForegroundColor Cyan

$existing = Get-NetFirewallRule -DisplayName $RuleDisplayName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Regra já existe; atualizando perfil/porta se necessário..."
  Set-NetFirewallRule -DisplayName $RuleDisplayName -Enabled True -Direction Inbound -Action Allow -Profile Private
  Get-NetFirewallPortFilter -AssociatedNetFirewallRule $existing | ForEach-Object {
    if ($_.LocalPort -ne "$HttpPort") {
      Remove-NetFirewallRule -DisplayName $RuleDisplayName
      $existing = $null
    }
  }
}

if (-not $existing) {
  New-NetFirewallRule `
    -DisplayName $RuleDisplayName `
    -Description "AcompOPMS servidor LAN — HTTP via Caddy (Etapa 4B)" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $HttpPort `
    -Profile Private `
    -Enabled True | Out-Null
  Write-Host "Regra criada: $RuleDisplayName (TCP $HttpPort, perfil Private)"
} else {
  Write-Host "Regra mantida: $RuleDisplayName (TCP $HttpPort, perfil Private)"
}

$rule = Get-NetFirewallRule -DisplayName $RuleDisplayName
Write-Host "Perfil da regra: $($rule.Profile -join ', ')"

Write-Host "`n=== Testes HTTP ===" -ForegroundColor Cyan
$localhostUrl = "http://127.0.0.1:$HttpPort"
$lanUrl = "http://$($lan.IP):$HttpPort"

$tLocal = Test-HttpOk -Url $localhostUrl
$tLan = Test-HttpOk -Url $lanUrl

Write-Host "localhost ($localhostUrl): $(if ($tLocal.Ok) { 'OK' } else { 'FALHOU' }) $(if ($tLocal.StatusCode) { "HTTP $($tLocal.StatusCode)" }) $(if ($tLocal.Error) { $tLocal.Error })"
Write-Host "IP LAN ($lanUrl):     $(if ($tLan.Ok) { 'OK' } else { 'FALHOU' }) $(if ($tLan.StatusCode) { "HTTP $($tLan.StatusCode)" }) $(if ($tLan.Error) { $tLan.Error })"

Write-Host "`n=== Resumo ===" -ForegroundColor Cyan
Write-Host "IP LAN: $($lan.IP)"
Write-Host "URL no celular (mesma Wi-Fi): $lanUrl"
Write-Host "Regra firewall: $RuleDisplayName | Perfil: Private | TCP local $HttpPort"

if (-not $tLan.Ok) {
  Write-Host "`nSe localhost OK mas IP LAN falhar após a regra: verifique se a rede está como Perfil Private (Configurações > Rede)." -ForegroundColor Yellow
  Write-Host "Se o servidor OK mas o celular não acessar: próxima suspeita = isolamento de cliente/AP isolation no roteador Wi-Fi." -ForegroundColor Yellow
}

if (-not $tLocal.Ok) {
  exit 2
}
if (-not $tLan.Ok) {
  exit 3
}
Write-Host "`nEtapa 4B concluída com sucesso." -ForegroundColor Green
