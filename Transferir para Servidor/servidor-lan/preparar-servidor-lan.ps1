# Prepara servidor LAN (Windows): Supabase, schema, Auth LAN, build, Caddy.
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

Write-Host '==> Auth LAN (Etapa 2)' -ForegroundColor Cyan
& (Join-Path $LanDir 'aplicar-auth-lan.ps1')

Write-Host '==> Build producao LAN' -ForegroundColor Cyan
& (Join-Path $LanDir 'build-producao-lan.ps1')

Write-Host '==> Iniciar Caddy' -ForegroundColor Cyan
& (Join-Path $LanDir 'start-servidor-lan.ps1')

Write-Host ''
Write-Host 'URL login (mesma rede):' -ForegroundColor Green
Push-Location $LanDir
node --input-type=module -e "import { loadServidorEnv } from './lib/load-servidor-env.mjs'; const c = loadServidorEnv(); console.log(c.publicOrigin + '/login')"
Pop-Location
Write-Host 'Teste: node "Transferir para Servidor/servidor-lan/teste-servidor-lan.mjs"' -ForegroundColor Green
Write-Host 'Firewall LAN (Admin): corrigir-acesso-lan-firewall.ps1' -ForegroundColor Green
