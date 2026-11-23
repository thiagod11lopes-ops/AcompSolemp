# Etapa 4 — executa teste-servidor-lan.mjs (depende de frontend/node_modules).
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $LanDir '..\..')

Push-Location (Join-Path $Root 'frontend')
if (-not (Test-Path 'node_modules')) {
  Write-Host 'Instalando dependencias do frontend (npm ci)...' -ForegroundColor Yellow
  npm ci
}
Pop-Location

node (Join-Path $LanDir 'lib/ensure-test-deps.mjs')
if ($LASTEXITCODE -ne 0) { throw 'ensure-test-deps falhou' }

node (Join-Path $LanDir 'teste-servidor-lan.mjs')
exit $LASTEXITCODE
