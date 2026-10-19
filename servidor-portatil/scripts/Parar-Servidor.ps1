# Para frontend + Supabase.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$cfg = Import-ServidorConfig

Write-Host "==> Parando frontend..."
$pidFile = Join-Path (Get-ServidorRoot) 'logs\vite.pid'
if (Test-Path $pidFile) {
  $old = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($old) { Stop-Process -Id ([int]$old) -Force -ErrorAction SilentlyContinue }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

$compose = Join-Path (Get-ServidorRoot) 'docker-compose.frontend.yml'
if (Test-Path $compose) {
  try {
    Assert-DockerRunning
    $env:ACOMP_FRONTEND_DIR = $cfg.FRONTEND_DIR
    $env:ACOMP_APP_PORT = $cfg.APP_PORT
    docker compose -f $compose down 2>$null
  } catch { }
}

Write-Host "==> Parando Supabase..."
try {
  Assert-DockerRunning
  Push-Location $cfg.SUPABASE_DOCKER_DIR
  docker compose down
  Pop-Location
} catch {
  Write-Host "Aviso: $_"
}

Write-Host "Parado."
