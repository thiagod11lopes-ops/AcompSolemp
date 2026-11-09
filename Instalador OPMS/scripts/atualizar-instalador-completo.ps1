# Pull, remove instalacao parcial, gera Instalar-AcompOPMS-*.exe e abre o instalador.
# powershell -ExecutionPolicy Bypass -File ".\scripts\atualizar-instalador-completo.ps1"
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$RepoDir = Split-Path -Parent $Root
$Branch = 'cursor/desktop-url-shell-bcc8'
$AcompLocal = Join-Path $env:LOCALAPPDATA 'AcompOPMS'
$Out = Join-Path $Root 'Para-distribuir'
$PayloadExe = Join-Path $Root 'instalador\resources\client-payload\AcompOPMS.exe'

Write-Host '=== 1/4 Atualizar repositorio ===' -ForegroundColor Cyan
Push-Location $RepoDir
git fetch origin $Branch 2>&1 | Out-Null
$prevEa = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
git checkout $Branch 2>&1 | Out-Null
$ErrorActionPreference = $prevEa
git pull origin $Branch
Write-Host "Branch: $(git branch --show-current)"
Pop-Location

Write-Host '=== 2/4 Remover instalacao parcial (evita ENOTDIR) ===' -ForegroundColor Cyan
if (Test-Path $AcompLocal) {
  Remove-Item $AcompLocal -Recurse -Force
  Write-Host "Removido: $AcompLocal"
} else {
  Write-Host "Nada em: $AcompLocal"
}

Write-Host '=== 3/4 Build instalador (10-20 min no portable e normal) ===' -ForegroundColor Cyan
Push-Location $Root
if (Test-Path $PayloadExe) {
  & (Join-Path $Root 'scripts\build-instalador-only.ps1')
} else {
  & (Join-Path $Root 'scripts\build-tudo.ps1')
}
& (Join-Path $Root 'scripts\preparar-pasta-windows.ps1')
Pop-Location

Write-Host '=== 4/4 Abrir instalador ===' -ForegroundColor Cyan
$exes = Get-ChildItem $Out -Filter 'Instalar-AcompOPMS-*-Windows.exe' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending
if (-not $exes) {
  throw "Nenhum Instalar-AcompOPMS-*-Windows.exe em $Out"
}
$exe = $exes[0].FullName
Write-Host "Executando: $($exes[0].Name)" -ForegroundColor Green
Write-Host 'No wizard: URL ja vem preenchida; clique Continuar ate Instalar.'
Start-Process -FilePath $exe
