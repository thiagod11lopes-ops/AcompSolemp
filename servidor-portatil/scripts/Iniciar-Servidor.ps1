# Sobe Supabase (Docker) + frontend na rede.
# Uso: .\Iniciar-Servidor.ps1
#      .\Iniciar-Servidor.ps1 -Build   # gera dist e serve com nginx (mais “produção”)

param(
  [switch]$Build
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$cfg = Import-ServidorConfig
Assert-DockerRunning

Write-Host "==> Aplicando host $($cfg.SERVER_HOST)..."
& "$PSScriptRoot\Aplicar-Host.ps1"

$dockerDir = $cfg.SUPABASE_DOCKER_DIR
$frontendDir = $cfg.FRONTEND_DIR

Write-Host "==> Subindo Supabase..."
Push-Location $dockerDir
try {
  docker compose up -d
  if ($LASTEXITCODE -ne 0) { throw "docker compose up falhou" }
} finally {
  Pop-Location
}

# Firewall (melhor esforço; pode exigir admin)
try {
  $rules = @(
    @{ Name = "AcompOPMS App $($cfg.APP_PORT)"; Port = $cfg.APP_PORT },
    @{ Name = "AcompOPMS Supabase $($cfg.SUPABASE_PORT)"; Port = $cfg.SUPABASE_PORT }
  )
  foreach ($r in $rules) {
    $exists = netsh advfirewall firewall show rule name="$($r.Name)" 2>$null
    if (-not ($exists -match $r.Name)) {
      netsh advfirewall firewall add rule name="$($r.Name)" dir=in action=allow protocol=TCP localport=$($r.Port) | Out-Null
    }
  }
} catch {
  Write-Host "Aviso: não foi possível criar regra de firewall (rode PowerShell como Admin se o outro PC não conectar)."
}

if ($Build) {
  Write-Host "==> Build do frontend..."
  Push-Location $frontendDir
  try {
    if (-not (Test-Path 'node_modules')) { npm install }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build falhou" }
  } finally {
    Pop-Location
  }

  # reaplicar server-config no dist
  & "$PSScriptRoot\Aplicar-Host.ps1"

  Write-Host "==> Subindo nginx (porta $($cfg.APP_PORT))..."
  $compose = Join-Path (Get-ServidorRoot) 'docker-compose.frontend.yml'
  $env:ACOMP_FRONTEND_DIR = $frontendDir
  $env:ACOMP_APP_PORT = $cfg.APP_PORT
  docker compose -f $compose up -d
  if ($LASTEXITCODE -ne 0) { throw "frontend compose falhou" }
} else {
  Write-Host "==> Subindo Vite (dev) na porta $($cfg.APP_PORT)..."
  $logDir = Join-Path (Get-ServidorRoot) 'logs'
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $outLog = Join-Path $logDir 'vite.out.log'
  $errLog = Join-Path $logDir 'vite.err.log'
  $pidFile = Join-Path $logDir 'vite.pid'

  # mata instância anterior
  if (Test-Path $pidFile) {
    $old = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($old) { Stop-Process -Id ([int]$old) -Force -ErrorAction SilentlyContinue }
  }

  $arg = "npm run dev -- --host 0.0.0.0 --port $($cfg.APP_PORT)"
  $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $arg) `
    -WorkingDirectory $frontendDir -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog
  Set-Content $pidFile $p.Id
}

Write-Host ""
Write-Host "Servidor pronto."
Write-Host "  Neste PC:     http://localhost:$($cfg.APP_PORT)"
Write-Host "  Na rede:      http://$($cfg.SERVER_HOST):$($cfg.APP_PORT)"
Write-Host "  Studio:       http://$($cfg.SERVER_HOST):$($cfg.SUPABASE_PORT)"
Write-Host "  Studio login: $($cfg.DASHBOARD_USER) / (senha em config.env)"
