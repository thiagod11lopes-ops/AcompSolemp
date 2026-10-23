# Um clique: dialogos + Docker + Supabase + app + gateway :80 + Chrome no nome cadastrado.
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
$appPort = $cfg.APP_PORT

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

function Wait-AppReady([string]$Url) {
  Write-Log "==> Aguardando app em $Url ..."
  for ($i = 1; $i -le 40; $i++) {
    $code = curl.exe -s -o NUL -w '%{http_code}' --max-time 5 $Url
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

function Open-LoginInChrome([string]$Url) {
  Wait-AppReady $Url
  $chrome = Get-ChromePath
  if ($chrome) {
    Write-Log "==> Abrindo Chrome: $Url"
    Start-Process -FilePath $chrome -ArgumentList @($Url) | Out-Null
  } else {
    Write-Log "==> Chrome nao encontrado; abrindo navegador padrao: $Url"
    Start-Process $Url | Out-Null
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

  Write-Log '==> Aplicando IP/alias da rede...'
  & "$PSScriptRoot\Aplicar-Host.ps1"
  $cfg = Import-ServidorConfig
  $alias = Normalize-AliasInput ([string]$cfg.SERVER_ALIAS)
  $ip = [string]$cfg.SERVER_HOST
  # Clientes digitam EXATAMENTE o alias; o navegador usa porta 80 (gateway).
  $publicLogin = "http://${alias}/login"
  $localLogin = "http://127.0.0.1:${appPort}/login"

  Write-Log '==> Iniciando DNS do nome cadastrado...'
  try {
    & "$PSScriptRoot\Dns-Alias-Servidor.ps1"
  } catch {
    Write-Log "Aviso DNS: $($_.Exception.Message)"
    Write-Log 'Rode Liberar-Firewall.cmd (Admin) UMA VEZ neste PC servidor.'
  }

  Start-DockerDesktopIfNeeded

  Write-Log '==> Subindo Supabase + app...'
  & "$PSScriptRoot\Iniciar-Servidor.ps1"

  Write-Log '==> Subindo gateway porta 80...'
  try {
    & "$PSScriptRoot\Iniciar-Gateway.ps1"
  } catch {
    Write-Log "Aviso gateway: $($_.Exception.Message)"
  }

  if (-not $NoBrowser) {
    Open-LoginInChrome $publicLogin
  } else {
    Write-Log "==> Navegador nao aberto. Acesso: $alias"
  }

  Write-Log "Pronto. Digite nos outros PCs exatamente: $alias"
  try {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
      ("Servidor pronto.`n`n" +
       "Nos outros computadores, digite EXATAMENTE isto no navegador:`n`n" +
       "    $alias`n`n" +
       "(sem http:// e sem :5173)`n`n" +
       "Se for a primeira vez neste PC servidor, rode uma vez:`n" +
       "Liberar-Firewall.cmd (aceite Admin).`n" +
       "Isso prepara a rede; os usuarios finais nao configuram nada.`n`n" +
       "IP interno (reserva tecnica): $ip"),
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
