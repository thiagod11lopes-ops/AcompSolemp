# Executa TUDO no Windows (PowerShell): pasta Projetos, clone AcompSolemp, branch do instalador, build e pasta "Instalador OPMS" no Desktop.
# Clique direito > Executar com PowerShell  OU:  powershell -ExecutionPolicy Bypass -File setup-completo-windows.ps1
$ErrorActionPreference = "Stop"

$Projetos = "C:\Users\User\Desktop\Thiago\Projetos"
$RepoDir  = Join-Path $Projetos "AcompSolemp"
$RepoUrl  = "https://github.com/thiagod11lopes-ops/AcompSolemp.git"
$Branch   = "cursor/desktop-url-shell-bcc8"

Write-Host "=== AcompSolemp — setup completo ===" -ForegroundColor Cyan

if (-not (Test-Path $Projetos)) {
  New-Item -ItemType Directory -Path $Projetos -Force | Out-Null
  Write-Host "Criada: $Projetos"
}

if (-not (Test-Path (Join-Path $RepoDir ".git"))) {
  if (Test-Path $RepoDir) {
    throw "Existe $RepoDir mas não é um repositório Git. Remova ou renomeie a pasta e rode de novo."
  }
  Write-Host "Clonando $RepoUrl ..."
  git clone $RepoUrl $RepoDir
} else {
  Write-Host "Repositório já existe: $RepoDir"
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

$InstaladorRoot = Join-Path $RepoDir "Instalador OPMS"
if (-not (Test-Path $InstaladorRoot)) {
  throw "Pasta 'Instalador OPMS' não encontrada. Confira se a branch $Branch está atualizada."
}

Write-Host "=== Gerando instalador (Node/npm necessários) ===" -ForegroundColor Cyan
Push-Location $InstaladorRoot
& (Join-Path $InstaladorRoot "scripts\build-tudo.ps1")
& (Join-Path $InstaladorRoot "scripts\preparar-pasta-windows.ps1")
Pop-Location

Write-Host ""
Write-Host "Concluído." -ForegroundColor Green
Write-Host "Repositório: $RepoDir"
Write-Host "Instalador:  C:\Users\User\Desktop\Thiago\Projetos\Instalador OPMS"
Write-Host "Abra no Cursor: File > Open Folder > $RepoDir"
