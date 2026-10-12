# Etapa 15 - bloqueia portas Supabase na rede local (perfil Private); mantem HTTP :8080 (Etapa 4B).
# Executar como Administrador na raiz do repositorio:
#   powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/aplicar-seguranca-lan-firewall.ps1"

param(
  [switch]$PlanOnly,
  [string]$PlanPorts
)

$ErrorActionPreference = 'Stop'
$LanDir = $PSScriptRoot
if (-not $LanDir) { $LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
$LegacyRuleName = 'AcompOPMS - Bloquear Supabase na LAN (TCP)'
$RuleHttpName = 'AcompOPMS - LAN HTTP (TCP 8080)'

function Get-InternalPortsFromRepo {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    throw 'Node.js nao encontrado no PATH (necessario para ler portas do config.toml).'
  }
  $parsed = @()
  Push-Location $LanDir
  try {
    $portsJson = & node --input-type=module -e "import('./lib/supabase-internal-ports.mjs').then(m=>console.log(JSON.stringify(m.getInternalSupabaseTcpPorts())))"
    if ($LASTEXITCODE -ne 0) {
      throw "Falha ao ler portas internas do Supabase (node exit $LASTEXITCODE)."
    }
    # return dentro de try/finally no Windows PowerShell 5.1 devolve a array inteira
    # como um unico objeto. A lista e emitida depois do finally, um numero por item.
    $parsed = @($portsJson | ConvertFrom-Json)
  } finally {
    Pop-Location
  }
  foreach ($port in $parsed) {
    foreach ($item in @($port)) {
      Write-Output ([int]$item)
    }
  }
}

function Get-LanHttpPort {
  $port = 8080
  $envFile = Join-Path $LanDir 'servidor.env'
  if (Test-Path -LiteralPath $envFile) {
    foreach ($line in Get-Content -LiteralPath $envFile) {
      if ($line -match '^\s*ACOMOPMS_HTTP_PORT\s*=\s*(\d+)\s*$') {
        $port = [int]$Matches[1]
      }
    }
  }
  if ($port -lt 1 -or $port -gt 65535) {
    throw "ACOMOPMS_HTTP_PORT invalida: $port"
  }
  return $port
}

function Get-SupabaseLanBlockPlan {
  param(
    [Parameter(Mandatory = $true)]$Ports,
    [Parameter(Mandatory = $true)][int]$HttpPort
  )

  $seen = @{}
  $plan = @()
  $flat = @()
  foreach ($raw in @($Ports)) {
    foreach ($item in @($raw)) {
      $flat += $item
    }
  }
  foreach ($raw in $flat) {
    $text = "$raw".Trim()
    if ($text -notmatch '^\d+$') {
      throw "Porta invalida na lista de bloqueio: '$text'. Use um numero TCP, nao uma lista separada por virgula."
    }
    $port = [int]$text
    if ($port -lt 1 -or $port -gt 65535) {
      throw "Porta fora do intervalo TCP: $port"
    }
    if ($port -eq $HttpPort -or $port -eq 8080) {
      continue
    }
    if ($seen.ContainsKey($port)) { continue }
    $seen[$port] = $true
    $localPort = [string]$port
    if ($localPort -match ',') {
      throw "LocalPort agregado nao e aceito pelo Windows PowerShell 5.1: $localPort"
    }
    $plan += [pscustomobject]@{
      Port         = $port
      LocalPort    = $localPort
      DisplayName  = "AcompOPMS - Bloquear Supabase na LAN (TCP $port)"
      Command      = "New-NetFirewallRule -DisplayName 'AcompOPMS - Bloquear Supabase na LAN (TCP $port)' -Direction Inbound -Action Block -Protocol TCP -LocalPort $port -RemoteAddress LocalSubnet -Profile Private -Enabled True"
    }
  }
  return @($plan | Sort-Object Port)
}

function Get-ExactFirewallRule {
  param([Parameter(Mandatory = $true)][string]$DisplayName)
  return @(Get-NetFirewallRule -DisplayName $DisplayName -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -eq $DisplayName })
}

function Assert-SupabaseLanBlockRule {
  param([Parameter(Mandatory = $true)]$Item)

  $rules = @(Get-ExactFirewallRule -DisplayName $Item.DisplayName)
  if ($rules.Count -eq 0) {
    throw "Regra ausente apos a criacao: $($Item.DisplayName)"
  }
  foreach ($rule in $rules) {
    $action = "$($rule.Action)"
    $direction = "$($rule.Direction)"
    $enabled = "$($rule.Enabled)"
    if ($action -ne 'Block' -or $direction -ne 'Inbound' -or $enabled -ne 'True') {
      throw "Regra '$($Item.DisplayName)' ficou Action=$action Direction=$direction Enabled=$enabled."
    }
    $profiles = @("$($rule.Profile)" -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    $extra = @($profiles | Where-Object { $_ -ne 'Private' })
    if ($profiles -notcontains 'Private' -or $extra.Count -gt 0) {
      throw "Regra '$($Item.DisplayName)' precisa ficar somente no perfil Private. Perfis: $($profiles -join ', ')"
    }
    $ports = @(Get-NetFirewallPortFilter -AssociatedNetFirewallRule $rule -ErrorAction Stop |
      ForEach-Object { @($_.LocalPort) } |
      ForEach-Object { "$_" })
    if ($ports -contains '8080' -or $ports -contains "$($Item.HttpPort)") {
      throw "Regra '$($Item.DisplayName)' bloqueou a porta HTTP $($Item.HttpPort)."
    }
    if (@($ports | Where-Object { $_ -eq $Item.LocalPort }).Count -eq 0) {
      throw "Regra '$($Item.DisplayName)' nao ficou na porta $($Item.LocalPort). Portas: $($ports -join ', ')"
    }
    $remotes = @(Get-NetFirewallAddressFilter -AssociatedNetFirewallRule $rule -ErrorAction Stop |
      ForEach-Object { @($_.RemoteAddress) } |
      ForEach-Object { "$_" })
    if ($remotes -contains 'Any' -or $remotes -contains '*' -or $remotes -contains '0.0.0.0/0') {
      throw "Regra '$($Item.DisplayName)' nao pode usar remoto Any."
    }
    if ($remotes -notcontains 'LocalSubnet') {
      throw "Regra '$($Item.DisplayName)' nao ficou restrita a LocalSubnet. Remotos: $($remotes -join ', ')"
    }
  }
}

if ($PlanOnly) {
  $httpPort = Get-LanHttpPort
  if ($PSBoundParameters.ContainsKey('PlanPorts')) {
    $sourcePorts = @($PlanPorts -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  } else {
    $sourcePorts = @(Get-InternalPortsFromRepo)
  }
  $plan = @(Get-SupabaseLanBlockPlan -Ports $sourcePorts -HttpPort $httpPort)
  if ($plan.Count -eq 0) {
    throw 'Plano de bloqueio vazio.'
  }
  foreach ($item in $plan) {
    Write-Output ("PORT=" + $item.LocalPort + " NAME=" + $item.DisplayName)
  }
  exit 0
}

. (Join-Path $PSScriptRoot 'lib\enter-admin-windows.ps1')
Invoke-AcompSolempAdminRelaunch -ScriptPath $PSCommandPath

$httpPort = Get-LanHttpPort
$sourcePorts = @(Get-InternalPortsFromRepo)
$plan = @(Get-SupabaseLanBlockPlan -Ports $sourcePorts -HttpPort $httpPort)

Write-Host "`n=== Etapa 15 - Firewall: bloquear Supabase na LAN ===" -ForegroundColor Cyan
Write-Host "Antes: confirme Etapa 4B (HTTP) com corrigir-acesso-lan-firewall.ps1 se ainda nao rodou."
Write-Host ("Porta HTTP preservada (nao bloqueada): " + $httpPort)
Write-Host ("Portas a bloquear (uma regra por porta, entrada TCP, origem LocalSubnet, perfil Private): " + (($plan | ForEach-Object { $_.LocalPort }) -join ', '))

$failures = @()
foreach ($item in $plan) {
  $check = $item | Select-Object Port, LocalPort, DisplayName, Command
  $check | Add-Member -NotePropertyName HttpPort -NotePropertyValue $httpPort
  try {
    $existing = @(Get-ExactFirewallRule -DisplayName $item.DisplayName)
    if ($existing.Count -eq 0) {
      New-NetFirewallRule `
        -DisplayName $item.DisplayName `
        -Description 'AcompOPMS: bloqueia entrada TCP desta porta Supabase/Postgres vinda da LAN (LocalSubnet, perfil Private). Nao inclui a porta HTTP do Caddy.' `
        -Direction Inbound `
        -Action Block `
        -Protocol TCP `
        -LocalPort $item.LocalPort `
        -RemoteAddress LocalSubnet `
        -Profile Private `
        -Enabled True | Out-Null
      Write-Host ("Regra criada: " + $item.DisplayName)
    } else {
      $alreadyOk = $false
      try {
        Assert-SupabaseLanBlockRule -Item $check
        $alreadyOk = $true
      } catch {
        $alreadyOk = $false
      }
      if ($alreadyOk) {
        Write-Host ("Regra reutilizada: " + $item.DisplayName)
      } else {
        Set-NetFirewallRule `
          -DisplayName $item.DisplayName `
          -Enabled True `
          -Direction Inbound `
          -Action Block `
          -Profile Private `
          -Protocol TCP `
          -LocalPort $item.LocalPort `
          -RemoteAddress LocalSubnet `
          -ErrorAction Stop
        Write-Host ("Regra atualizada: " + $item.DisplayName)
      }
    }
    Assert-SupabaseLanBlockRule -Item $check
  } catch {
    $failures += ("Porta " + $item.Port + " falhou. Comando: " + $item.Command + " Erro: " + $_.Exception.Message)
  }
}

if ($failures.Count -gt 0) {
  Write-Host ("Falha em " + $failures.Count + " porta(s). Sucesso parcial nao e sucesso.") -ForegroundColor Red
  foreach ($failure in $failures) {
    Write-Host $failure -ForegroundColor Red
  }
  exit 1
}

$legacy = @(Get-ExactFirewallRule -DisplayName $LegacyRuleName)
if ($legacy.Count -gt 0) {
  foreach ($legacyRule in $legacy) {
    Remove-NetFirewallRule -Name $legacyRule.Name
  }
  $still = @(Get-ExactFirewallRule -DisplayName $LegacyRuleName)
  if ($still.Count -gt 0) {
    throw "A regra legada '$LegacyRuleName' continuou presente depois da substituicao."
  }
  Write-Host "Regra legada removida depois que as regras por porta foram conferidas: $LegacyRuleName"
}

Write-Host "Regras de bloqueio conferidas: $($plan.Count)" -ForegroundColor Green
$fwScope = 'local'
if (Test-Path (Join-Path $LanDir 'servidor.env')) {
  foreach ($line in Get-Content (Join-Path $LanDir 'servidor.env')) {
    if ($line -match '^\s*ACOMOPMS_FIREWALL_SCOPE\s*=\s*(\S+)') { $fwScope = $Matches[1].Trim().ToLower() }
  }
}
if ($fwScope -eq 'tailnet') {
  Write-Host 'HTTP tailnet: use corrigir-acesso-lan-firewall.ps1 (regra AcompOPMS - Tailnet HTTP, interface Tailscale).'
} else {
  Write-Host "Mantenha tambem: $RuleHttpName (permitir TCP HTTP na rede Private)."
}
Write-Host "`nValide: node `"Transferir para Servidor/servidor-lan/verificar-seguranca-lan.mjs`""
