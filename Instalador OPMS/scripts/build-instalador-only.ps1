# Gera só o instalador (pula cliente) se client-payload ja existir.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Payload = Join-Path $Root 'instalador\resources\client-payload'
$Out = Join-Path $Root 'Para-distribuir'

if (-not (Test-Path (Join-Path $Payload 'AcompOPMS.exe'))) {
  throw "Payload ausente. Rode build-tudo.ps1 uma vez ou copie win-unpacked do cliente para instalador\resources\client-payload"
}

Write-Host '==> Instalador (electron-builder portable — pode demorar 10-20 min sem novas linhas)' -ForegroundColor Yellow
Push-Location (Join-Path $Root 'instalador')
if (-not (Test-Path node_modules)) { npm install }
Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
npm run dist:win
if ($LASTEXITCODE -ne 0) { throw 'dist:win falhou' }
Pop-Location

New-Item -ItemType Directory -Path $Out -Force | Out-Null
Copy-Item (Join-Path $Root 'instalador\dist\*.exe') -Destination $Out -Force
Get-ChildItem $Out -Filter 'Instalar*.exe' | Format-Table Name, Length, LastWriteTime -AutoSize
