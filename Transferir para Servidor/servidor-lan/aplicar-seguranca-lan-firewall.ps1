# Etapa 15 — bloqueia portas Supabase na rede local (perfil Private); mantém HTTP :8080 (Etapa 4B).
# Executar como Administrador na raiz do repositório:
#   powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/aplicar-seguranca-lan-firewall.ps1"
#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuleBlockName = 'AcompOPMS - Bloquear Supabase na LAN (TCP)'
$RuleHttpName = 'AcompOPMS - LAN HTTP (TCP 8080)'

function Get-InternalPortsFromRepo {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    throw 'Node.js não encontrado no PATH (necessário para ler portas do config.toml).'
  }
  Push-Location $LanDir
  try {
    $portsJson = & node --input-type=module -e "import('./lib/supabase-internal-ports.mjs').then(m=>console.log(JSON.stringify(m.getInternalSupabaseTcpPorts())))"
    return @($portsJson | ConvertFrom-Json)
  } finally {
    Pop-Location
  }
}

Write-Host "`n=== Etapa 15 — Firewall: bloquear Supabase na LAN ===" -ForegroundColor Cyan
Write-Host "Antes: confirme Etapa 4B (HTTP) com corrigir-acesso-lan-firewall.ps1 se ainda não rodou."

$ports = Get-InternalPortsFromRepo
$portList = ($ports | Sort-Object -Unique) -join ','
Write-Host "Portas a bloquear (entrada TCP, origem LocalSubnet, perfil Private): $portList"

$existing = Get-NetFirewallRule -DisplayName $RuleBlockName -ErrorAction SilentlyContinue
if ($existing) {
  Remove-NetFirewallRule -DisplayName $RuleBlockName
}

New-NetFirewallRule `
  -DisplayName $RuleBlockName `
  -Description 'AcompOPMS Etapa 15 — impede acesso LAN às portas Supabase/Postgres locais (loopback/Caddy permanecem).' `
  -Direction Inbound `
  -Action Block `
  -Protocol TCP `
  -LocalPort $portList `
  -RemoteAddress LocalSubnet `
  -Profile Private `
  -Enabled True | Out-Null

Write-Host "Regra criada: $RuleBlockName" -ForegroundColor Green
Write-Host "Mantenha também: $RuleHttpName (permitir TCP HTTP na rede Private)."
Write-Host "`nValide: node `"Transferir para Servidor/servidor-lan/verificar-seguranca-lan.mjs`""
