# Um clique: sobe Docker (se preciso), Supabase + app e abre o navegador.
# Chamado pelo atalho "Iniciar Servidor OMPS" e pelo inicio automatico do Windows.
#
# Uso:
#   .\Abrir-Tudo.ps1
#   .\Abrir-Tudo.ps1 -Silent -NoBrowser   # inicio automatico (sem janela interativa)

param(
  [switch]$Silent,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$cfg = Import-ServidorConfig
$hostName = $cfg.SERVER_HOST
$appPort = $cfg.APP_PORT
$appUrl = "http://${hostName}:${appPort}"

$logDir = Join-Path (Get-ServidorRoot) 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'iniciar-auto.log'

function Write-Log([string]$Message) {
  $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $logFile -Value $line -Encoding UTF8
  if (-not $Silent) { Write-Host $Message }
}

function Start-DockerDesktopIfNeeded {
  if (Test-DockerRunning) {
    Write-Log 'Docker ja esta pronto.'
    return
  }

  $candidates = @(
    (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Docker\Docker Desktop.exe')
  )
  $exe = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if (-not $exe) {
    throw 'Docker Desktop nao encontrado. Instale o Docker Desktop e tente de novo.'
  }

  Write-Log '==> Abrindo Docker Desktop...'
  Start-Process -FilePath $exe | Out-Null

  Write-Log '==> Aguardando Docker ficar pronto (ate ~5 min)...'
  $ok = $false
  for ($i = 1; $i -le 100; $i++) {
    if (Test-DockerRunning) { $ok = $true; break }
    if (-not $Silent) { Write-Host ("  ... {0}/100" -f $i) }
    Start-Sleep -Seconds 3
  }
  if (-not $ok) {
    throw 'Docker Desktop nao ficou pronto a tempo. Abra o Docker Desktop, espere o status Running e tente de novo.'
  }
  Write-Log 'Docker pronto.'
}

try {
  Write-Log '========================================'
  Write-Log '  AcompOPMS - Iniciar Servidor'
  Write-Log '========================================'

  Start-DockerDesktopIfNeeded

  Write-Log '==> Subindo Supabase + app...'
  # Nao confiar em $LASTEXITCODE: netsh/curl/docker podem deixar codigo residual.
  & "$PSScriptRoot\Iniciar-Servidor.ps1"

  if (-not $NoBrowser) {
    Write-Log "==> Abrindo navegador: $appUrl"
    Start-Process $appUrl | Out-Null
  } else {
    Write-Log "==> Navegador nao aberto (modo automatico). App: $appUrl"
  }

  Write-Log "Pronto. App na rede: $appUrl"
  if (-not $Silent) {
    Write-Host ''
    Write-Host 'Pode fechar esta janela.'
  }
  exit 0
} catch {
  $msg = $_.Exception.Message
  Write-Log "ERRO: $msg"
  if ($Silent) {
    try {
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.MessageBox]::Show(
        "Falha ao iniciar o servidor AcompOPMS:`n`n$msg`n`nDetalhes: $logFile",
        'AcompOPMS - Inicio automatico',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
      ) | Out-Null
    } catch { }
  } else {
    Write-Host ''
    Write-Host "ERRO: $msg" -ForegroundColor Red
    Write-Host ''
    Write-Host 'Pressione Enter para fechar...'
    [void][Console]::ReadLine()
  }
  exit 1
}
