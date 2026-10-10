# Etapa 2 — aplica Auth LAN e reinicia Supabase local.
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $LanDir '..\..')

if (-not (Test-Path (Join-Path $LanDir 'servidor.env'))) {
  Copy-Item (Join-Path $LanDir 'servidor.env.example') (Join-Path $LanDir 'servidor.env')
}

Write-Host '==> Configurar Auth (config.toml)' -ForegroundColor Cyan
node (Join-Path $LanDir 'configure-auth.mjs')

Write-Host '==> Reiniciar Supabase local' -ForegroundColor Cyan
Push-Location $Root
supabase stop
supabase start
Pop-Location

Write-Host 'OK. Refaca o build LAN se mudou IP/porta: build-producao-lan.ps1' -ForegroundColor Green
