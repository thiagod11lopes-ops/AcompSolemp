# Um clique: sobe Docker (se preciso), Supabase + app e abre o navegador.
# Chamado pelo atalho "Iniciar Servidor OMPS".

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$cfg = Import-ServidorConfig
$hostName = $cfg.SERVER_HOST
$appPort = $cfg.APP_PORT
$appUrl = "http://${hostName}:${appPort}"

function Start-DockerDesktopIfNeeded {
  if (Test-DockerRunning) {
    Write-Host "Docker ja esta pronto."
    return
  }

  $candidates = @(
    (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Docker\Docker Desktop.exe')
  )
  $exe = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if (-not $exe) {
    throw "Docker Desktop nao encontrado. Instale o Docker Desktop e tente de novo."
  }

  Write-Host "==> Abrindo Docker Desktop..."
  Start-Process -FilePath $exe | Out-Null

  Write-Host "==> Aguardando Docker ficar pronto (ate ~3 min)..."
  $ok = $false
  for ($i = 1; $i -le 60; $i++) {
    if (Test-DockerRunning) { $ok = $true; break }
    Write-Host ("  ... {0}/60" -f $i)
    Start-Sleep -Seconds 3
  }
  if (-not $ok) {
    throw "Docker Desktop nao ficou pronto a tempo. Abra o Docker Desktop, espere o status Running e clique de novo no atalho."
  }
  Write-Host "Docker pronto."
}

try {
  Write-Host "========================================"
  Write-Host "  AcompOPMS - Iniciar Servidor"
  Write-Host "========================================"
  Write-Host ""

  Start-DockerDesktopIfNeeded

  Write-Host ""
  Write-Host "==> Subindo Supabase + app..."
  # Nao confiar em $LASTEXITCODE aqui: comandos internos (netsh/curl/docker)
  # podem deixar codigo residual mesmo com sucesso. Falhas reais sobem com throw.
  & "$PSScriptRoot\Iniciar-Servidor.ps1"

  Write-Host ""
  Write-Host "==> Abrindo navegador: $appUrl"
  Start-Process $appUrl | Out-Null

  Write-Host ""
  Write-Host "Pronto. Pode fechar esta janela."
  Write-Host "App na rede: $appUrl"
  exit 0
} catch {
  Write-Host ""
  Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ""
  Write-Host "Pressione Enter para fechar..."
  [void][Console]::ReadLine()
  exit 1
}
