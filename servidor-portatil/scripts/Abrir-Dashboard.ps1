# Abre o Dashboard do Servidor OMPS (HTTP local + pagina web).
# Uso: .\Abrir-Dashboard.ps1

param(
  [int]$Port = 9787,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"
. "$PSScriptRoot\Coletar-Metricas-Dashboard.ps1"
. "$PSScriptRoot\Resolver-Check-Dashboard.ps1"
. "$PSScriptRoot\Gestor-Config.ps1"

$root = Get-ServidorRoot
$webRoot = Join-Path $root 'dashboard'
if (-not (Test-Path (Join-Path $webRoot 'index.html'))) {
  throw "Pasta dashboard nao encontrada: $webRoot"
}

$script:ServerActionStatePath = Join-Path $root 'state\server-action.json'
$script:DashboardBrowserPidPath = Join-Path $root 'state\dashboard-browser.pid'
$script:DashboardChromeProfile = Join-Path $env:LOCALAPPDATA 'AcompOPMS\dashboard-chrome'
$script:ScriptsDir = $PSScriptRoot
$script:DashboardBrowserPid = $null
$script:BrowserWatchAfter = $null
$script:NoBrowser = [bool]$NoBrowser

function Get-ServerActionState {
  $fallback = [ordered]@{
    action    = 'idle'
    status    = 'idle'
    message   = ''
    updatedAt = (Get-Date).ToString('o')
    pid       = $null
  }
  if (-not (Test-Path -LiteralPath $script:ServerActionStatePath)) {
    return [pscustomobject]$fallback
  }
  try {
    $raw = Get-Content -LiteralPath $script:ServerActionStatePath -Raw -Encoding UTF8
    $obj = $raw | ConvertFrom-Json
    if (-not $obj) { return [pscustomobject]$fallback }
    $pidVal = $null
    try { $pidVal = [int]$obj.pid } catch { $pidVal = $null }
    if ($pidVal -and ($obj.status -eq 'running')) {
      $proc = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
      if (-not $proc) {
        $obj.status = 'idle'
        $obj.action = 'idle'
        if (-not $obj.message) { $obj.message = 'Processo finalizado.' }
        $obj.pid = $null
        $obj.updatedAt = (Get-Date).ToString('o')
        Set-ServerActionState $obj.action $obj.status $obj.message $null
      }
    }
    return $obj
  } catch {
    return [pscustomobject]$fallback
  }
}

function Set-ServerActionState(
  [string]$Action,
  [string]$Status,
  [string]$Message = '',
  $ProcessId = $null
) {
  $dir = Split-Path -Parent $script:ServerActionStatePath
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $payload = [ordered]@{
    action    = $Action
    status    = $Status
    message   = $Message
    updatedAt = (Get-Date).ToString('o')
    pid       = $ProcessId
  }
  ($payload | ConvertTo-Json -Compress) | Set-Content -LiteralPath $script:ServerActionStatePath -Encoding UTF8
  return [pscustomobject]$payload
}

function Test-OmpsStackRunning {
  # Stack "iniciado" = frontend + API auth respondendo (auth pode ser 401).
  try {
    $appCode = & curl.exe -sk -o NUL -w '%{http_code}' --max-time 1 'http://127.0.0.1:5173/login' 2>$null
    $authCode = & curl.exe -sk -o NUL -w '%{http_code}' --max-time 1 'http://127.0.0.1:8000/auth/v1/health' 2>$null
    $appOk = ("$appCode" -match '^(200|301|302|304)$')
    $authOk = ("$authCode" -match '^(200|301|302|304|401)$')
    return ($appOk -and $authOk)
  } catch {
    return $false
  }
}

function Get-ServerControlSnapshot {
  $state = Get-ServerActionState
  $running = Test-OmpsStackRunning
  return [ordered]@{
    running   = $running
    action    = [string]$state.action
    status    = [string]$state.status
    message   = [string]$state.message
    updatedAt = [string]$state.updatedAt
    busy      = ([string]$state.status -eq 'running')
    canStart  = (-not $running) -and ([string]$state.status -ne 'running')
    canStop   = $running -and ([string]$state.status -ne 'running')
  }
}

function Start-OmpsServerJob([ValidateSet('start', 'stop')][string]$Action) {
  $state = Get-ServerActionState
  if ([string]$state.status -eq 'running') {
    throw "Ja existe uma operacao em andamento ($($state.action))."
  }

  $target = if ($Action -eq 'start') {
    Join-Path $script:ScriptsDir 'Abrir-Tudo.ps1'
  } else {
    Join-Path $script:ScriptsDir 'Parar-Servidor.ps1'
  }
  if (-not (Test-Path -LiteralPath $target)) {
    throw "Script nao encontrado: $target"
  }

  $statePath = $script:ServerActionStatePath
  $label = if ($Action -eq 'start') { 'Iniciando Servidor OMPS…' } else { 'Parando Servidor OMPS…' }
  Set-ServerActionState $Action 'running' $label $null | Out-Null

  $runner = @"
`$ErrorActionPreference = 'Stop'
`$statePath = '$($statePath.Replace("'", "''"))'
`$action = '$Action'
`$target = '$($target.Replace("'", "''"))'
function Save-State([string]`$Status, [string]`$Message, `$PidValue = `$null) {
  `$dir = Split-Path -Parent `$statePath
  if (-not (Test-Path -LiteralPath `$dir)) { New-Item -ItemType Directory -Force -Path `$dir | Out-Null }
  `$payload = [ordered]@{
    action    = `$action
    status    = `$Status
    message   = `$Message
    updatedAt = (Get-Date).ToString('o')
    pid       = `$PidValue
  }
  (`$payload | ConvertTo-Json -Compress) | Set-Content -LiteralPath `$statePath -Encoding UTF8
}
try {
  if (`$action -eq 'start') {
    # Mesmo fluxo do icone Iniciar Servidor OMPS: painel unificado + sobe servicos.
    & `$target
    `$code = `$LASTEXITCODE
    if (`$null -ne `$code -and `$code -ne 0) {
      `$msg = if (`$code -eq 2) {
        'Inicio interrompido ou cancelado antes dos servicos subirem.'
      } else {
        ("Falha ao iniciar (codigo {0})." -f `$code)
      }
      Save-State 'error' `$msg `$null
      exit `$code
    }
    Save-State 'done' 'Fluxo de inicio concluido.' `$null
  } else {
    & `$target
    Save-State 'done' 'Servidor parado.' `$null
  }
} catch {
  Save-State 'error' `$_.Exception.Message `$null
  exit 1
} finally {
  Start-Sleep -Milliseconds 400
  try {
    `$cur = Get-Content -LiteralPath `$statePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (`$cur -and `$cur.status -ne 'running') {
      # Mantem action start/stop para o Dashboard saber qual operacao terminou.
      if (-not `$cur.action -or `$cur.action -eq 'idle') { `$cur.action = `$action }
      `$cur.pid = `$null
      `$cur.updatedAt = (Get-Date).ToString('o')
      (`$cur | ConvertTo-Json -Compress) | Set-Content -LiteralPath `$statePath -Encoding UTF8
    }
  } catch { }
}
"@

  $tmp = Join-Path $env:TEMP ("acomp-omps-{0}-{1}.ps1" -f $Action, [guid]::NewGuid().ToString('N'))
  Set-Content -LiteralPath $tmp -Value $runner -Encoding UTF8

  # Start precisa de janela STA/normal para WinForms (painel + countdown), como o atalho.
  $argList = if ($Action -eq 'start') {
    @('-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', $tmp)
  } else {
    @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $tmp)
  }
  $windowStyle = if ($Action -eq 'start') { 'Normal' } else { 'Minimized' }
  $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -WindowStyle $windowStyle -PassThru

  Set-ServerActionState $Action 'running' $label $proc.Id | Out-Null
  return (Get-ServerControlSnapshot)
}

# Encerra instancia anterior na mesma porta (nunca tenta matar PID de sistema)
try {
  $owners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pidOwn in @($owners)) {
    if ($pidOwn -and $pidOwn -ne $PID -and $pidOwn -gt 8) {
      $procName = $null
      try { $procName = (Get-Process -Id $pidOwn -ErrorAction SilentlyContinue).ProcessName } catch { }
      if ($procName -match '^(powershell|pwsh)$') {
        Stop-Process -Id $pidOwn -Force -ErrorAction SilentlyContinue
      }
    }
  }
  Start-Sleep -Milliseconds 400
} catch { }

$listener = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  throw "Nao foi possivel abrir a porta $Port. Feche outro Dashboard e tente de novo. $($_.Exception.Message)"
}

Write-Host "Dashboard AcompOPMS em $prefix"
Write-Host 'A janela do navegador e este PowerShell ficam vinculados: feche o Dashboard para encerrar os dois.'

function Get-ContentType([string]$Path) {
  switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { return 'text/html; charset=utf-8' }
    '.css'  { return 'text/css; charset=utf-8' }
    '.js'   { return 'application/javascript; charset=utf-8' }
    '.svg'  { return 'image/svg+xml' }
    '.png'  { return 'image/png' }
    '.ico'  { return 'image/x-icon' }
    '.json' { return 'application/json; charset=utf-8' }
    default { return 'application/octet-stream' }
  }
}

function Set-CorsHeaders([System.Net.HttpListenerResponse]$Res) {
  $Res.Headers['Access-Control-Allow-Origin'] = '*'
  $Res.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $Res.Headers['Access-Control-Allow-Headers'] = 'Content-Type'
}

function Send-Bytes([System.Net.HttpListenerResponse]$Res, [byte[]]$Bytes, [string]$ContentType, [int]$Status = 200) {
  $Res.StatusCode = $Status
  $Res.ContentType = $ContentType
  $Res.Headers['Cache-Control'] = 'no-store'
  Set-CorsHeaders $Res
  $Res.ContentLength64 = $Bytes.Length
  $Res.OutputStream.Write($Bytes, 0, $Bytes.Length)
  $Res.OutputStream.Close()
}

function Start-ExportDadosCsvJob {
  $scriptPath = Join-Path $script:ScriptsDir 'Exportar-Dados-Csv.ps1'
  if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "Script nao encontrado: $scriptPath"
  }
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-File', $scriptPath
  ) -WorkingDirectory $script:ScriptsDir -WindowStyle Hidden | Out-Null
  return @{
    ok      = $true
    started = $true
    message = 'Exportacao CSV iniciada.'
  }
}

function Send-Text([System.Net.HttpListenerResponse]$Res, [string]$Text, [string]$ContentType, [int]$Status = 200) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
  Send-Bytes $Res $bytes $ContentType $Status
}

function Read-RequestBody([System.Net.HttpListenerRequest]$Req) {
  if (-not $Req.HasEntityBody) { return '' }
  $reader = New-Object System.IO.StreamReader($Req.InputStream, $Req.ContentEncoding)
  try { return $reader.ReadToEnd() } finally { $reader.Close() }
}

function Get-DashboardBrowserProfilePids {
  $profile = [string]$script:DashboardChromeProfile
  if (-not $profile) { return @() }
  $ids = @()
  try {
    $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Name -match '^(chrome|msedge)\.exe$' -and
        $_.CommandLine -and
        $_.CommandLine.IndexOf($profile, [StringComparison]::OrdinalIgnoreCase) -ge 0
      }
    foreach ($p in @($procs)) {
      if ($p.ProcessId) { $ids += [int]$p.ProcessId }
    }
  } catch { }
  return $ids
}

function Stop-DashboardBrowserProcess {
  $pidVal = $script:DashboardBrowserPid
  if (-not $pidVal -and (Test-Path -LiteralPath $script:DashboardBrowserPidPath)) {
    try { $pidVal = [int](Get-Content -LiteralPath $script:DashboardBrowserPidPath -ErrorAction SilentlyContinue | Select-Object -First 1) } catch { }
  }
  $killIds = @()
  if ($pidVal -and $pidVal -gt 8) { $killIds += $pidVal }
  $killIds += @(Get-DashboardBrowserProfilePids)
  foreach ($id in ($killIds | Select-Object -Unique)) {
    try {
      & taskkill.exe /PID $id /T /F 1>$null 2>$null
    } catch {
      try { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } catch { }
    }
  }
  $script:DashboardBrowserPid = $null
  try { Remove-Item -LiteralPath $script:DashboardBrowserPidPath -Force -ErrorAction SilentlyContinue } catch { }
}

function Test-DashboardBrowserAlive {
  if ($script:NoBrowser) { return $true }
  $pidVal = $script:DashboardBrowserPid
  if ($pidVal -and (Get-Process -Id $pidVal -ErrorAction SilentlyContinue)) { return $true }
  $profilePids = @(Get-DashboardBrowserProfilePids)
  if ($profilePids.Count -gt 0) {
    if (-not $script:DashboardBrowserPid) { $script:DashboardBrowserPid = $profilePids[0] }
    return $true
  }
  return $false
}

function Save-DashboardBrowserPid([int]$ProcessId) {
  $script:DashboardBrowserPid = $ProcessId
  $dir = Split-Path -Parent $script:DashboardBrowserPidPath
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  Set-Content -LiteralPath $script:DashboardBrowserPidPath -Value "$ProcessId" -Encoding ASCII
}

function Find-DashboardBrowserExe {
  foreach ($c in @(
      (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
      (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
      (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
      (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
      (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
    )) {
    if ($c -and (Test-Path -LiteralPath $c)) { return $c }
  }
  return $null
}

function Start-DashboardBrowserLinked([string]$DashboardUrl) {
  # NAO esperar health aqui: o loop GetContext ainda nao esta rodando; waiting
  # em curl bloqueava e o navegador demorava/nao abria.
  $browser = Find-DashboardBrowserExe
  if (-not $browser) {
    Write-Host 'Chrome/Edge nao encontrado; abrindo URL no navegador padrao.'
    try {
      $p = Start-Process $DashboardUrl -PassThru
      if ($p) { Save-DashboardBrowserPid ([int]$p.Id) }
    } catch {
      Write-Host ("Falha ao abrir navegador: {0}" -f $_.Exception.Message)
    }
    $script:BrowserWatchAfter = (Get-Date).AddSeconds(8)
    return
  }

  if (-not (Test-Path -LiteralPath $script:DashboardChromeProfile)) {
    New-Item -ItemType Directory -Force -Path $script:DashboardChromeProfile | Out-Null
  }

  # Remove locks de sessao anterior do perfil isolado.
  foreach ($lockName in @('SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile')) {
    $lockPath = Join-Path $script:DashboardChromeProfile $lockName
    try { if (Test-Path -LiteralPath $lockPath) { Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue } } catch { }
  }

  $argList = @(
    "--user-data-dir=$($script:DashboardChromeProfile)",
    "--app=$DashboardUrl",
    '--new-window',
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized'
  )
  try {
    $p = Start-Process -FilePath $browser -ArgumentList $argList -PassThru
    if ($p) {
      Save-DashboardBrowserPid ([int]$p.Id)
      Write-Host ("Navegador do Dashboard (PID {0}). Feche a janela do Dashboard para encerrar este PowerShell." -f $p.Id)
    } else {
      Write-Host 'Start-Process nao retornou PID; tentando URL direta...'
      Start-Process $DashboardUrl | Out-Null
    }
  } catch {
    Write-Host ("Falha ao abrir Chrome/Edge em modo app: {0}" -f $_.Exception.Message)
    try { Start-Process $DashboardUrl | Out-Null } catch { }
  }
  # Maximiza o Dashboard e minimiza Docker/PowerShell auxiliares do boot.
  try {
    . "$PSScriptRoot\Minimizar-Janelas-Boot.ps1"
    for ($i = 1; $i -le 8; $i++) {
      Start-Sleep -Milliseconds 500
      [void](Invoke-MaximizeAcompOpmsDashboard)
      [void](Invoke-MinimizeAcompOpmsHelpers)
    }
  } catch { }
  # Margem para o Chrome spawnar processos filhos do perfil antes de vigiar o ciclo de vida.
  $script:BrowserWatchAfter = (Get-Date).AddSeconds(8)
}

# Encerra navegador orfao de sessao anterior (se houver), com pequena pausa p/ liberar perfil.
Stop-DashboardBrowserProcess
Start-Sleep -Milliseconds 600

$url = "${prefix}"
if (-not $NoBrowser) {
  Start-DashboardBrowserLinked $url
} else {
  Write-Host 'NoBrowser: servidor local ativo sem janela vinculada.'
}

try {
  while ($listener.IsListening) {
    $ar = $listener.BeginGetContext($null, $null)
    while (-not $ar.AsyncWaitHandle.WaitOne(500)) {
      if (-not $script:NoBrowser) {
        if ($script:BrowserWatchAfter -and (Get-Date) -lt $script:BrowserWatchAfter) { continue }
        if (-not (Test-DashboardBrowserAlive)) {
          Write-Host 'Janela do Dashboard fechada - encerrando servidor local...'
          try { $listener.Stop() } catch { }
          break
        }
      }
    }
    if (-not $listener.IsListening) { break }
    try {
      $ctx = $listener.EndGetContext($ar)
    } catch {
      break
    }
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ($path -eq '/') { $path = '/index.html' }

      if ($req.HttpMethod -eq 'OPTIONS') {
        Set-CorsHeaders $res
        $res.StatusCode = 204
        $res.ContentLength64 = 0
        $res.OutputStream.Close()
        continue
      }

      if ($path -eq '/api/export-dados' -and $req.HttpMethod -eq 'POST') {
        try {
          $result = Start-ExportDadosCsvJob
          Send-Text $res ($result | ConvertTo-Json -Compress) 'application/json; charset=utf-8'
        } catch {
          Send-Text $res (@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress) 'application/json; charset=utf-8' 500
        }
        continue
      }

      if ($path -eq '/api/metrics') {
        $metrics = Get-DashboardMetrics
        $json = $metrics | ConvertTo-Json -Depth 8 -Compress
        Send-Text $res $json 'application/json; charset=utf-8'
        continue
      }

      if ($path -eq '/api/health') {
        Send-Text $res '{"ok":true}' 'application/json; charset=utf-8'
        continue
      }

      if ($path -eq '/api/server') {
        if ($req.HttpMethod -eq 'GET') {
          Send-Text $res ((Get-ServerControlSnapshot) | ConvertTo-Json -Compress) 'application/json; charset=utf-8'
          continue
        }
        Send-Text $res '{"error":"Method not allowed"}' 'application/json; charset=utf-8' 405
        continue
      }

      if ($path -eq '/api/server/start' -and $req.HttpMethod -eq 'POST') {
        try {
          $snap = Start-OmpsServerJob -Action start
          Send-Text $res ($snap | ConvertTo-Json -Compress) 'application/json; charset=utf-8'
        } catch {
          Send-Text $res (@{ error = $_.Exception.Message } | ConvertTo-Json -Compress) 'application/json; charset=utf-8' 409
        }
        continue
      }

      if ($path -eq '/api/server/stop' -and $req.HttpMethod -eq 'POST') {
        try {
          $snap = Start-OmpsServerJob -Action stop
          Send-Text $res ($snap | ConvertTo-Json -Compress) 'application/json; charset=utf-8'
        } catch {
          Send-Text $res (@{ error = $_.Exception.Message } | ConvertTo-Json -Compress) 'application/json; charset=utf-8' 409
        }
        continue
      }

      if ($path -eq '/api/fix-check' -and $req.HttpMethod -eq 'POST') {
        try {
          $body = Read-RequestBody $req | ConvertFrom-Json
          $checkId = [string]$body.id
          $result = Invoke-DashboardFixCheck -Id $checkId
          Send-Text $res ($result | ConvertTo-Json -Depth 4 -Compress) 'application/json; charset=utf-8'
        } catch {
          Send-Text $res (@{
              id       = ''
              started  = $false
              message  = 'Falha ao tentar solucionar.'
              guidance = $_.Exception.Message
              error    = $_.Exception.Message
            } | ConvertTo-Json -Compress) 'application/json; charset=utf-8' 500
        }
        continue
      }

      if ($path -eq '/api/gestor-config') {
        if ($req.HttpMethod -eq 'GET') {
          $cfg = Get-GestorConfig
          Send-Text $res ($cfg | ConvertTo-Json -Compress) 'application/json; charset=utf-8'
          continue
        }
        if ($req.HttpMethod -eq 'POST') {
          try {
            $body = Read-RequestBody $req | ConvertFrom-Json
            $email = [string]$body.gestorEmail
            $saved = Set-GestorConfig $email
            Send-Text $res ($saved | ConvertTo-Json -Compress) 'application/json; charset=utf-8'
          } catch {
            Send-Text $res (@{ error = $_.Exception.Message } | ConvertTo-Json -Compress) 'application/json; charset=utf-8' 400
          }
          continue
        }
        Send-Text $res '{"error":"Method not allowed"}' 'application/json; charset=utf-8' 405
        continue
      }

      if ($path -eq '/api/gestor-emails' -and $req.HttpMethod -eq 'GET') {
        try {
          $lists = Get-GestorTeamEmailLists
          Send-Text $res ($lists | ConvertTo-Json -Depth 6 -Compress) 'application/json; charset=utf-8'
        } catch {
          Send-Text $res (@{
              gestorEmail = (Get-GestorConfig).gestorEmail
              loggedIn    = @()
              pending     = @()
              error       = $_.Exception.Message
            } | ConvertTo-Json -Depth 4 -Compress) 'application/json; charset=utf-8' 200
        }
        continue
      }

      if ($path -eq '/api/gestor-usage' -and $req.HttpMethod -eq 'GET') {
        try {
          $usage = Get-GestorUsageByUser
          Send-Text $res ($usage | ConvertTo-Json -Depth 6 -Compress) 'application/json; charset=utf-8'
        } catch {
          Send-Text $res (@{
              gestorEmail = (Get-GestorConfig).gestorEmail
              users       = @()
              error       = $_.Exception.Message
            } | ConvertTo-Json -Depth 4 -Compress) 'application/json; charset=utf-8' 200
        }
        continue
      }

      $safe = $path.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
      if ($safe.Contains('..')) {
        Send-Text $res 'Forbidden' 'text/plain; charset=utf-8' 403
        continue
      }
      $file = Join-Path $webRoot $safe
      if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        Send-Text $res 'Not found' 'text/plain; charset=utf-8' 404
        continue
      }
      $bytes = [IO.File]::ReadAllBytes($file)
      Send-Bytes $res $bytes (Get-ContentType $file)
    } catch {
      try { Send-Text $res $_.Exception.Message 'text/plain; charset=utf-8' 500 } catch { }
    }
  }
} finally {
  try { $listener.Stop() } catch { }
  try { $listener.Close() } catch { }
  try { Stop-DashboardBrowserProcess } catch { }
  Write-Host 'Dashboard encerrado.'
}
