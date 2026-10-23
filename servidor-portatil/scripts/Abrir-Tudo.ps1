# Um clique: dialogos (checklist/cronometro) + Docker + Supabase + app + Chrome /login.
# Chamado pelo atalho "Iniciar Servidor OMPS" e pelo inicio automatico do Windows.
#
# Uso:
#   .\Abrir-Tudo.ps1
#   .\Abrir-Tudo.ps1 -Silent
#   .\Abrir-Tudo.ps1 -SkipLauncherUi
#   .\Abrir-Tudo.ps1 -Silent -NoBrowser

param(
  [switch]$Silent,
  [switch]$NoBrowser,
  [switch]$SkipLauncherUi
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"
. "$PSScriptRoot\Launcher-UI.ps1"

$cfg = Import-ServidorConfig
$hostName = $cfg.SERVER_HOST
$appPort = $cfg.APP_PORT
$appUrl = "http://${hostName}:${appPort}"
$loginUrl = "http://127.0.0.1:${appPort}/login"

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

function Wait-AppReady {
  Write-Log "==> Aguardando app em http://127.0.0.1:${appPort} ..."
  for ($i = 1; $i -le 40; $i++) {
    $code = curl.exe -s -o NUL -w '%{http_code}' --max-time 5 "http://127.0.0.1:${appPort}/"
    if ($code -match '^(200|301|302|304)$') {
      Write-Log "App pronto (HTTP $code)."
      return
    }
    if (-not $Silent) { Write-Host ("  ... app {0}/40 (HTTP {1})" -f $i, $code) }
    Start-Sleep -Seconds 2
  }
  Write-Log 'Aviso: app ainda nao respondeu; abrindo Chrome mesmo assim.'
}

function Get-ChromePath {
  $candidates = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )
  return ($candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1)
}

function Open-LoginInChrome {
  Wait-AppReady
  $chrome = Get-ChromePath
  if ($chrome) {
    Write-Log "==> Abrindo Chrome: $loginUrl"
    Start-Process -FilePath $chrome -ArgumentList @($loginUrl) | Out-Null
  } else {
    Write-Log "==> Chrome nao encontrado; abrindo navegador padrao: $loginUrl"
    Start-Process $loginUrl | Out-Null
  }
}

try {
  Write-Log '========================================'
  Write-Log '  AcompOPMS - Iniciar Servidor'
  Write-Log '========================================'

  $gate = Invoke-LauncherGate -SkipUi:$SkipLauncherUi
  if ($gate -eq 'Abort') {
    Write-Log 'Inicio cancelado pelo usuario (checklist/cronometro).'
    exit 0
  }

  # Sincroniza IP da LAN + alias (URLs do app)
  Write-Log '==> Aplicando IP/alias da rede...'
  & "$PSScriptRoot\Aplicar-Host.ps1"
  $cfg = Import-ServidorConfig
  $hostName = $cfg.SERVER_HOST
  $appPort = $cfg.APP_PORT
  $alias = [string]$cfg.SERVER_ALIAS
  if (-not $alias) { $alias = 'sistema.acompomps.rede' }
  $appUrl = "http://${hostName}:${appPort}"
  $aliasUrl = "http://${alias}:${appPort}"
  $loginUrl = "http://127.0.0.1:${appPort}/login"

  Write-Log '==> Iniciando DNS do endereco amigavel...'
  try {
    & "$PSScriptRoot\Dns-Alias-Servidor.ps1"
  } catch {
    Write-Log "Aviso DNS: $($_.Exception.Message)"
    Write-Log 'Rode Liberar-Firewall.cmd (Admin) uma vez para o nome amigavel funcionar nos clientes.'
  }

  Start-DockerDesktopIfNeeded

  Write-Log '==> Subindo Supabase + app...'
  # Nao confiar em $LASTEXITCODE: netsh/curl/docker podem deixar codigo residual.
  & "$PSScriptRoot\Iniciar-Servidor.ps1"

  if (-not $NoBrowser) {
    Open-LoginInChrome
  } else {
    Write-Log "==> Navegador nao aberto (-NoBrowser). Login: $loginUrl"
  }

  $pcName = $env:COMPUTERNAME
  $pcUrl = "http://${pcName}:${appPort}"
  Write-Log "Pronto. Nome: $aliasUrl | IP: $appUrl | PC: $pcUrl | Local: $loginUrl"
  try {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
      ("Servidor pronto.`n`n" +
       "Neste PC:`n$loginUrl`n`n" +
       "Nos OUTROS PCs use agora (sem instalar nada):`n$appUrl`n$pcUrl`n`n" +
       "Nome amigavel ($aliasUrl):`n" +
       "so funciona depois de Liberar-Firewall + DNS no roteador,`n" +
       "OU rodando em cada cliente (1x Admin):`n" +
       "servidor-portatil\cliente\Adicionar-Endereco-Hosts.cmd"),
      'Iniciar Servidor OMPS',
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
  } catch { }
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
