# Sobe Supabase (Docker) + frontend na rede.
# Uso: .\Iniciar-Servidor.ps1
#      .\Iniciar-Servidor.ps1 -Build   # gera dist e serve com nginx (modo producao)

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

Write-Host "==> Parando stacks antigos do Supabase CLI (se estiverem rodando)..."
$oldCli = docker ps --format "{{.Names}}" |
  Where-Object { $_ -match 'supabase_.*_(sm|workspace)$' -or $_ -like 'supabase_*_workspace' }
if ($oldCli) {
  $oldCli | ForEach-Object {
    Write-Host "  stop $_"
    docker stop $_ 2>$null | Out-Null
  }
} else {
  Write-Host "  nenhum stack antigo em execucao."
}

Write-Host "==> Subindo Supabase..."
Push-Location $dockerDir
try {
  $ok = $false
  for ($i = 1; $i -le 3; $i++) {
    Write-Host "  tentativa $i/3..."
    docker compose up -d
    if ($LASTEXITCODE -eq 0) { $ok = $true; break }
    Start-Sleep -Seconds 8
  }
  if (-not $ok) {
    # As vezes o compose marca falha no studio/envoy, mas a API ja responde.
    $anon = Get-AnonKeyFromSupabase $dockerDir
    $code = curl.exe -s -o NUL -w "%{http_code}" --max-time 12 `
      "http://127.0.0.1:$($cfg.SUPABASE_PORT)/auth/v1/health" -H "apikey: $anon"
    if ($code -ne '200') {
      throw "docker compose up falhou e Auth nao respondeu (HTTP $code). Abra o Docker Desktop e tente de novo."
    }
    Write-Host "Aviso: compose reportou erro, mas Auth esta OK - seguindo."
  }
} finally {
  Pop-Location
}

Write-Host "==> Aguardando Auth..."
$anon = Get-AnonKeyFromSupabase $dockerDir
$ready = $false
for ($i = 1; $i -le 20; $i++) {
  $code = curl.exe -s -o NUL -w "%{http_code}" --max-time 8 `
    "http://127.0.0.1:$($cfg.SUPABASE_PORT)/auth/v1/health" -H "apikey: $anon"
  if ($code -eq '200') { $ready = $true; break }
  Start-Sleep -Seconds 3
}
if (-not $ready) {
  Write-Host "Aviso: Auth ainda nao respondeu a tempo. O app pode falhar ate o Docker terminar de subir."
}

Write-Host "==> Garantindo schema planilhas_livres (IMH/Div. Material)..."
try {
  . "$PSScriptRoot\Gestor-Config.ps1"
  Ensure-PlanilhasLivresSchema
} catch {
  Write-Host ("Aviso: schema planilhas_livres nao aplicado: {0}" -f $_.Exception.Message)
}

# Firewall (melhor esforco; pode exigir admin)
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
  Write-Host "Aviso: nao foi possivel criar regra de firewall (rode PowerShell como Admin se o outro PC nao conectar)."
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

  # mata instancia anterior
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

Write-Host "==> Subindo API local de export CSV (9788)..."
try {
  $exportApi = Join-Path $PSScriptRoot 'Local-Export-Api.ps1'
  $exportLog = Join-Path (Get-ServidorRoot) 'logs\local-export-api.out.log'
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', $exportApi
  ) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden `
    -RedirectStandardOutput $exportLog -RedirectStandardError $exportLog | Out-Null
} catch {
  Write-Host "Aviso: API de export CSV nao iniciou — $($_.Exception.Message)"
}

Write-Host ""
Write-Host "Servidor pronto."
Write-Host "  Neste PC:     http://localhost:$($cfg.APP_PORT)"
Write-Host "  Na rede:      http://$($cfg.SERVER_HOST):$($cfg.APP_PORT)"
Write-Host "  Studio:       http://$($cfg.SERVER_HOST):$($cfg.SUPABASE_PORT)"
Write-Host "  Studio login: $($cfg.DASHBOARD_USER) / (senha em config.env)"
