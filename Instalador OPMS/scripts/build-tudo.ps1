# Gera instaladores Windows (e Linux se estiver no WSL com wine opcional)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Out = Join-Path $Root "Para-distribuir"
$Payload = Join-Path $Root "instalador\resources\client-payload"

Write-Host "==> Cliente AcompOPMS (empacotar)"
Push-Location (Join-Path $Root "cliente")
if (-not (Test-Path node_modules)) { npm install }
npm run pack:win
Pop-Location

$WinUnpacked = Join-Path $Root "cliente\dist\win-unpacked"
if (-not (Test-Path $WinUnpacked)) { throw "cliente/dist/win-unpacked não encontrado" }

Write-Host "==> Copiar payload para instalador"
if (Test-Path $Payload) { Remove-Item $Payload -Recurse -Force }
New-Item -ItemType Directory -Path $Payload -Force | Out-Null
Copy-Item -Path (Join-Path $WinUnpacked "*") -Destination $Payload -Recurse

Write-Host "==> Instalador gráfico"
Push-Location (Join-Path $Root "instalador")
if (-not (Test-Path node_modules)) { npm install }
npm run dist:win
Pop-Location

New-Item -ItemType Directory -Path $Out -Force | Out-Null
Copy-Item -Path (Join-Path $Root "instalador\dist\*.exe") -Destination $Out -Force
Copy-Item -Path (Join-Path $Root "assets\*") -Destination $Out -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Pronto. Abra a pasta:" -ForegroundColor Green
Write-Host "  $Out"
Write-Host "Execute: Instalar-AcompOPMS-1.0.0-Windows.exe"
