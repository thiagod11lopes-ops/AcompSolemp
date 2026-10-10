# Etapa 1 — prepara servidor LAN (Windows): env, schema, build, Caddy.
# Auth LAN (configure-auth) fica na Etapa 2; rode configure-auth.mjs depois se login falhar.
# powershell -ExecutionPolicy Bypass -File "Transferir para Servidor/servidor-lan/preparar-servidor-lan.ps1"
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $LanDir '..\..')

Write-Host '==> Supabase local' -ForegroundColor Cyan
Push-Location $Root
supabase start
Pop-Location

Write-Host '==> Schema local (se ainda nao aplicado)' -ForegroundColor Cyan
$schemaScript = Join-Path $Root 'Transferir para Servidor/aplicar-schema-local.sh'
if (Test-Path $schemaScript) {
  bash $schemaScript
} else {
  Write-Host 'AVISO: aplicar-schema-local.sh nao encontrado.' -ForegroundColor Yellow
}

Write-Host '==> Build producao LAN' -ForegroundColor Cyan
& (Join-Path $LanDir 'build-producao-lan.ps1')

Write-Host '==> Iniciar Caddy' -ForegroundColor Cyan
& (Join-Path $LanDir 'start-servidor-lan.ps1')

Write-Host ''
Write-Host 'URL para outros PCs (mesma rede): veja linha UI LAN acima.' -ForegroundColor Green
Write-Host 'Teste: node "Transferir para Servidor/servidor-lan/teste-servidor-lan.mjs" (na raiz, com node_modules do frontend)' -ForegroundColor Green
Write-Host 'Firewall LAN (Admin): corrigir-acesso-lan-firewall.ps1' -ForegroundColor Green
