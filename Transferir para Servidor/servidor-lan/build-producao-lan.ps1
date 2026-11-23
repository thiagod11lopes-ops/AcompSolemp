# Etapa 3 — Build frontend/dist com VITE_* apontando para a origem LAN (Caddy).
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $LanDir '..\..')
$EnvFile = Join-Path $LanDir 'servidor.env'

if (-not (Test-Path $EnvFile)) {
  Copy-Item (Join-Path $LanDir 'servidor.env.example') $EnvFile
}

Push-Location $Root
node (Join-Path $LanDir 'lib/write-frontend-env-lan.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar .env.production.local' }

Push-Location (Join-Path $Root 'frontend')
$bin = Join-Path (Get-Location) 'node_modules\.bin'
if (-not (Test-Path (Join-Path $bin 'tsc.cmd')) -or -not (Test-Path (Join-Path $bin 'vite.cmd'))) {
  # typescript e vite sao devDependencies; NODE_ENV=production omitiria os dois.
  Write-Host 'Instalando dependencias do frontend (npm ci --include=dev)...'
  npm ci --include=dev
  if ($LASTEXITCODE -ne 0) { throw 'npm ci do frontend falhou' }
}
npm run build
if ($LASTEXITCODE -ne 0) { throw 'npm run build falhou' }
Pop-Location

node (Join-Path $LanDir 'lib/record-lan-build.mjs')
node (Join-Path $LanDir 'gerar-server-connection.mjs')
node (Join-Path $LanDir 'verificar-build-lan.mjs')
if ($LASTEXITCODE -ne 0) { throw 'verificar-build-lan falhou' }

Push-Location $LanDir
$origin = node --input-type=module -e "import { loadServidorEnv } from './lib/load-servidor-env.mjs'; console.log(loadServidorEnv().publicOrigin)"
Pop-Location
Pop-Location
Write-Host "OK: frontend/dist — acesse ${origin}/login"
