# Para frontend + Supabase.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$cfg = Import-ServidorConfig

Write-Host '==> Parando DNS alias...'
try { & "$PSScriptRoot\Dns-Alias-Servidor.ps1" -Stop } catch { }

Write-Host '==> Parando frontend...'
$pidFile = Join-Path (Get-ServidorRoot) 'logs\vite.pid'
if (Test-Path $pidFile) {
  $old = Get-Content $pidFile -ErrorAction SilentlyContinue
  if ($old) { Stop-Process -Id ([int]$old) -Force -ErrorAction SilentlyContinue }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

if (-not (Test-DockerRunning)) {
  Write-Host 'Docker ja esta desligado - nada a parar nos containers.'
  Write-Host 'Parado.'
  return
}

$compose = Join-Path (Get-ServidorRoot) 'docker-compose.frontend.yml'
if (Test-Path $compose) {
  try {
    $env:ACOMP_FRONTEND_DIR = $cfg.FRONTEND_DIR
    $env:ACOMP_APP_PORT = $cfg.APP_PORT
    docker compose -f $compose down 2>$null
  } catch { }
}

Write-Host '==> Parando Supabase...'
try {
  Push-Location $cfg.SUPABASE_DOCKER_DIR
  docker compose down
  Pop-Location
} catch {
  Write-Host "Aviso: $_"
}

Write-Host 'Parado.'
