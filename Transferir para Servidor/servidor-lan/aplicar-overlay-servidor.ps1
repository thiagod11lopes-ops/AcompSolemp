# Etapa 5 — overlay + Auth + server-connection (Windows)
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $LanDir '..\..')

node (Join-Path $LanDir 'configurar-overlay-servidor.mjs')
& (Join-Path $LanDir 'aplicar-auth-lan.ps1')
node (Join-Path $LanDir 'gerar-server-connection.mjs')
Write-Host 'Opcional (Admin): corrigir-firewall-overlay.ps1 e start-overlay-servidor.ps1'
