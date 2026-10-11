# Etapa 4B — Diagnóstico LAN + regra de entrada TCP 8080 (perfil Private)
# Executar como Administrador na raiz do repositório:
#   powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/corrigir-acesso-lan-firewall.ps1"
#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $LanDir "servidor.env"
$PidFile = Join-Path $LanDir "caddy.pid"
$Caddyfile = Join-Path $LanDir "Caddyfile.generated"
$RuleDisplayNameLan = "AcompOPMS - LAN HTTP (TCP 8080)"
$RuleDisplayNameTailnet = "AcompOPMS - Tailnet HTTP (TCP 8080)"
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

function Get-HttpFirewallPlanFromEnv {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    throw 'Node.js não encontrado no PATH (necessário para ler ACOMOPMS_FIREWALL_SCOPE).'
  }
  Push-Location $LanDir
  try {
    $json = & node "./lib/print-http-firewall-plan.mjs"
    return $json | ConvertFrom-Json
  } finally {
    Pop-Location
  }
}

function Test-IsTailscaleCgcatIPv4 {
  param([string]$Address)
  if ([string]::IsNullOrWhiteSpace($Address)) { return $false }
  if ($Address -notmatch '^100\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$') { return $false }
  $second = [int]$Matches[1]
  $third = [int]$Matches[2]
  $fourth = [int]$Matches[3]
  if ($second -lt 64 -or $second -gt 127) { return $false }
  foreach ($octet in @($second, $third, $fourth)) {
    if ($octet -lt 0 -or $octet -gt 255) { return $false }
  }
  return $true
}

function Test-IsTailscaleNetAdapterCandidate {
  param([Parameter(Mandatory = $true)]$Adapter)
  if ($Adapter.Status -ne 'Up') { return $false }
  $name = [string]$Adapter.Name
  $desc = [string]$Adapter.InterfaceDescription
  if ($name -like '*Tailscale*') { return $true }
  if ($desc -match '(?i)Tailscale') { return $true }
  return $false
}

# Adaptador Up com IPv4 na faixa tailnet (100.64.0.0/10); aceita nome real (ex.: Tailscale Tunnel).
function Get-TailscaleAdapterContext {
  $matches = @()
  foreach ($adapter in @(Get-NetAdapter -ErrorAction SilentlyContinue)) {
    if (-not (Test-IsTailscaleNetAdapterCandidate -Adapter $adapter)) { continue }
    $tailnetIp = $null
    foreach ($addr in @(Get-NetIPAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue)) {
      if (Test-IsTailscaleCgcatIPv4 -Address $addr.IPAddress) {
        $tailnetIp = $addr.IPAddress
        break
      }
    }
    if ($tailnetIp) {
      $matches += [pscustomobject]@{
        Adapter         = $adapter
        InterfaceAlias  = [string]$adapter.Name
        TailscaleIPv4   = $tailnetIp
      }
    }
  }
  if ($matches.Count -eq 0) { return $null }
  return $matches | Select-Object -First 1
}

function Get-TailscaleAdapter {
  $ctx = Get-TailscaleAdapterContext
  if (-not $ctx) { return $null }
  return $ctx.Adapter
}

function Get-TailscaleIPv4 {
  $ctx = Get-TailscaleAdapterContext
  if (-not $ctx) { return $null }
  return $ctx.TailscaleIPv4
}

function Assert-TailnetFirewallInterfaceFilter {
  param(
    [Parameter(Mandatory = $true)][string]$DisplayName,
    [Parameter(Mandatory = $true)][string]$ExpectedInterfaceAlias
  )
  $ruleRef = Get-NetFirewallRule -DisplayName $DisplayName -ErrorAction Stop
  $ifFilters = @(Get-NetFirewallInterfaceFilter -AssociatedNetFirewallRule $ruleRef -ErrorAction SilentlyContinue)
  if ($ifFilters.Count -eq 0) {
    throw "Regra '$DisplayName' criada, mas NetFirewallInterfaceFilter ausente — regra tailnet invalida."
  }
  $aliases = @(
    $ifFilters |
      ForEach-Object { $_.InterfaceAlias } |
      Where-Object { $_ -and [string]$_ -ne 'Any' }
  )
  if ($aliases.Count -eq 0) {
    throw "Regra '$DisplayName' sem InterfaceAlias restrito (Any) — regra tailnet nao vinculada ao adaptador '$ExpectedInterfaceAlias'."
  }
  $ok = $false
  foreach ($alias in $aliases) {
    if ([string]$alias -eq $ExpectedInterfaceAlias) {
      $ok = $true
      break
    }
  }
  if (-not $ok) {
    throw "InterfaceAlias da regra '$DisplayName' ('$($aliases -join ', ')') nao corresponde ao adaptador selecionado '$ExpectedInterfaceAlias'."
  }
}

function Remove-FirewallRuleIfExists {
  param([string]$DisplayName)
  $existing = Get-NetFirewallRule -DisplayName $DisplayName -ErrorAction SilentlyContinue
  if ($existing) {
    Remove-NetFirewallRule -DisplayName $DisplayName
    Write-Host "Regra removida (politica atual): $DisplayName"
  }
}

function New-TailnetHttpFirewallRule {
  param(
    [Parameter(Mandatory = $true)]$Plan,
    [Parameter(Mandatory = $true)][string]$InterfaceAlias
  )
  Remove-FirewallRuleIfExists -DisplayName $Plan.legacyLanHttpRuleName
  Remove-FirewallRuleIfExists -DisplayName $Plan.displayName

  # InterfaceAlias via Set-NetFirewallInterfaceFilter (compatível Windows 10/11; evita -InterfaceAlias em New-NetFirewallRule).
  $rule = New-NetFirewallRule `
    -DisplayName $Plan.displayName `
    -Description $Plan.description `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $Plan.localPort `
    -Profile Private `
    -RemoteAddress $Plan.remoteAddress `
    -Enabled True

  Set-NetFirewallInterfaceFilter -AssociatedNetFirewallRule $rule -InterfaceAlias $InterfaceAlias
  Assert-TailnetFirewallInterfaceFilter -DisplayName $Plan.displayName -ExpectedInterfaceAlias $InterfaceAlias

  Write-Host "Regra criada: $($Plan.displayName) (TCP $($Plan.localPort), interface $InterfaceAlias, remoto $($Plan.remoteAddress), perfil Private)"
}

function New-LanPrivateHttpFirewallRule {
  param([Parameter(Mandatory = $true)]$Plan)
  Remove-FirewallRuleIfExists -DisplayName $Plan.tailnetHttpRuleName

  $existing = Get-NetFirewallRule -DisplayName $Plan.displayName -ErrorAction SilentlyContinue
  if ($existing) {
    Set-NetFirewallRule -DisplayName $Plan.displayName -Enabled True -Direction Inbound -Action Allow -Profile Private
    Get-NetFirewallPortFilter -AssociatedNetFirewallRule $existing | ForEach-Object {
      if ($_.LocalPort -ne "$($Plan.localPort)") {
        Remove-NetFirewallRule -DisplayName $Plan.displayName
        $existing = $null
      }
    }
  }

  if (-not $existing) {
    New-NetFirewallRule `
      -DisplayName $Plan.displayName `
      -Description $Plan.description `
      -Direction Inbound `
      -Action Allow `
      -Protocol TCP `
      -LocalPort $Plan.localPort `
      -Profile Private `
      -Enabled True | Out-Null
    Write-Host "Regra criada: $($Plan.displayName) (TCP $($Plan.localPort), perfil Private)"
  } else {
    Write-Host "Regra mantida: $($Plan.displayName) (TCP $($Plan.localPort), perfil Private)"
  }
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
$fwPlan = Get-HttpFirewallPlanFromEnv
$HttpPort = [int]$fwPlan.localPort

Write-Host "`n=== Etapa 4B — Diagnóstico HTTP (porta $HttpPort, escopo $($fwPlan.mode)) ===" -ForegroundColor Cyan

$lan = $null
if ($fwPlan.mode -eq 'tailnet') {
  $tsCtxDiag = Get-TailscaleAdapterContext
  if ($tsCtxDiag) {
    Write-Host "Adaptador Tailscale: $($tsCtxDiag.InterfaceAlias) | IPv4 tailnet: $($tsCtxDiag.TailscaleIPv4)"
  } else {
    Write-Host "ERRO: Nenhum adaptador Tailscale ativo com IPv4 na faixa 100.64.0.0/10 (conecte o cliente Tailscale)." -ForegroundColor Red
    exit 4
  }
} else {
  $lan = Get-PreferredLanIPv4
  if (-not $lan) {
    Write-Host "ERRO: Nenhum IPv4 LAN encontrado (Wi-Fi/Ethernet ativa)." -ForegroundColor Red
    exit 1
  }
  Write-Host "IPv4 LAN: $($lan.IP) (interface: $($lan.Interface), perfil: $($lan.Profile))"
}

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

Write-Host "`n=== Regra Windows Firewall (TCP $HttpPort, escopo: $($fwPlan.mode)) ===" -ForegroundColor Cyan

if ($fwPlan.mode -eq 'tailnet') {
  $tsCtx = Get-TailscaleAdapterContext
  if (-not $tsCtx) {
    Write-Host "ERRO: Nenhum adaptador Tailscale ativo com IPv4 tailnet (100.64.0.0/10). Conecte o Tailscale antes de aplicar a regra." -ForegroundColor Red
    exit 4
  }
  $alias = $tsCtx.InterfaceAlias
  if ($alias -ne $fwPlan.interfaceAlias) {
    Write-Host "Nota: interface detectada '$alias' (plano documental: $($fwPlan.interfaceAlias))." -ForegroundColor DarkYellow
  }
  New-TailnetHttpFirewallRule -Plan $fwPlan -InterfaceAlias $alias
  $rule = Get-NetFirewallRule -DisplayName $fwPlan.displayName
} else {
  New-LanPrivateHttpFirewallRule -Plan $fwPlan
  $rule = Get-NetFirewallRule -DisplayName $fwPlan.displayName
}

Write-Host "Perfil da regra: $($rule.Profile -join ', ')"
if ($fwPlan.mode -eq 'tailnet') {
  Write-Host "Interface: $($rule | Get-NetFirewallInterfaceFilter | Select-Object -ExpandProperty InterfaceAlias -ErrorAction SilentlyContinue)"
  Write-Host "Remoto: $($rule | Get-NetFirewallAddressFilter | Select-Object -ExpandProperty RemoteAddress -ErrorAction SilentlyContinue)"
}

Write-Host "`n=== Testes HTTP ===" -ForegroundColor Cyan
$localhostUrl = "http://127.0.0.1:$HttpPort"
$tLocal = Test-HttpOk -Url $localhostUrl
Write-Host "localhost ($localhostUrl): $(if ($tLocal.Ok) { 'OK' } else { 'FALHOU' }) $(if ($tLocal.StatusCode) { "HTTP $($tLocal.StatusCode)" }) $(if ($tLocal.Error) { $tLocal.Error })"

$remoteOk = $true
if ($fwPlan.mode -eq 'tailnet') {
  $tsIp = Get-TailscaleIPv4
  if (-not $tsIp) {
    Write-Host "AVISO: IPv4 Tailscale nao detectado; teste HTTP tailnet omitido." -ForegroundColor Yellow
    $remoteOk = $false
  } else {
    $tsUrl = "http://${tsIp}:$HttpPort"
    $tTs = Test-HttpOk -Url $tsUrl
    Write-Host "Tailscale ($tsUrl): $(if ($tTs.Ok) { 'OK' } else { 'FALHOU' }) $(if ($tTs.StatusCode) { "HTTP $($tTs.StatusCode)" }) $(if ($tTs.Error) { $tTs.Error })"
    $remoteOk = $tTs.Ok
  }
} else {
  $lanUrl = "http://$($lan.IP):$HttpPort"
  $tLan = Test-HttpOk -Url $lanUrl
  Write-Host "IP LAN ($lanUrl):     $(if ($tLan.Ok) { 'OK' } else { 'FALHOU' }) $(if ($tLan.StatusCode) { "HTTP $($tLan.StatusCode)" }) $(if ($tLan.Error) { $tLan.Error })"
  $remoteOk = $tLan.Ok
}

Write-Host "`n=== Resumo ===" -ForegroundColor Cyan
if ($fwPlan.mode -eq 'tailnet') {
  Write-Host "Escopo: tailnet (8080 so interface Tailscale + remoto 100.64.0.0/10; perfil Public nao incluido)"
  Write-Host "Regra: $($fwPlan.displayName)"
} else {
  Write-Host "IP LAN: $($lan.IP)"
  Write-Host "URL no celular (mesma Wi-Fi): http://$($lan.IP):$HttpPort"
  Write-Host "Regra firewall: $($fwPlan.displayName) | Perfil: Private | TCP local $HttpPort"
}

if ($fwPlan.mode -ne 'tailnet' -and -not $remoteOk) {
  Write-Host "`nSe localhost OK mas IP LAN falhar após a regra: verifique se a rede está como Perfil Private (Configurações > Rede)." -ForegroundColor Yellow
  Write-Host "Se o servidor OK mas o celular não acessar: próxima suspeita = isolamento de cliente/AP isolation no roteador Wi-Fi." -ForegroundColor Yellow
}

if (-not $tLocal.Ok) {
  exit 2
}
if (-not $remoteOk -and $fwPlan.mode -ne 'tailnet') {
  exit 3
}
Write-Host "`nEtapa 4B concluída com sucesso." -ForegroundColor Green
