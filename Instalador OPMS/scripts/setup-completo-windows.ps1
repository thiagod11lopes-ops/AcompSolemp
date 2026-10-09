# Executa TUDO no Windows: pasta Projetos, clone AcompSolemp, branch do instalador, build e pasta Instalador OPMS.
# powershell -ExecutionPolicy Bypass -File setup-completo-windows.ps1
$ErrorActionPreference = 'Stop'

$Projetos = 'C:\Users\User\Desktop\Thiago\Projetos'
$RepoDir  = Join-Path $Projetos 'AcompSolemp'
$InstaladorDesktop = Join-Path $Projetos 'Instalador OPMS'
$RepoUrl  = 'https://github.com/thiagod11lopes-ops/AcompSolemp.git'
$Branch   = 'cursor/desktop-url-shell-bcc8'

Write-Host '=== AcompSolemp - setup completo ===' -ForegroundColor Cyan

if (-not (Test-Path $Projetos)) {
  New-Item -ItemType Directory -Path $Projetos -Force | Out-Null
  Write-Host "Criada: $Projetos"
}

if (-not (Test-Path (Join-Path $RepoDir '.git'))) {
  if (Test-Path $RepoDir) {
    throw "Existe $RepoDir mas nao e um repositorio Git. Remova ou renomeie a pasta."
  }
  Write-Host "Clonando $RepoUrl ..."
  git clone $RepoUrl $RepoDir
} else {
  Write-Host "Repositorio ja existe: $RepoDir"
  Push-Location $RepoDir
  git fetch origin
  Pop-Location
}

Push-Location $RepoDir
git checkout $Branch 2>$null
if ($LASTEXITCODE -ne 0) {
  git fetch origin $Branch
  git checkout $Branch
}
Write-Host "Branch: $(git branch --show-current)"
Pop-Location

$InstaladorRoot = Join-Path $RepoDir 'Instalador OPMS'
if (-not (Test-Path $InstaladorRoot)) {
  throw "Pasta Instalador OPMS nao encontrada. Confira a branch $Branch"
}

Write-Host '=== Gerando instalador (Node/npm necessarios) ===' -ForegroundColor Cyan
Push-Location $InstaladorRoot
& (Join-Path $InstaladorRoot 'scripts\build-tudo.ps1')
& (Join-Path $InstaladorRoot 'scripts\preparar-pasta-windows.ps1')
Pop-Location

Write-Host ''
Write-Host 'Concluido.' -ForegroundColor Green
Write-Host "Repositorio: $RepoDir"
Write-Host "Instalador:  $InstaladorDesktop"
Write-Host "Cursor: Abrir Pasta -> $RepoDir"
