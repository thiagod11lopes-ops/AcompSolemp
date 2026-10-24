# Abre o Dashboard do Servidor OMPS (HTTP local + pagina web).
# Uso: .\Abrir-Dashboard.ps1

param(
  [int]$Port = 9787,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"
. "$PSScriptRoot\Coletar-Metricas-Dashboard.ps1"
. "$PSScriptRoot\Gestor-Config.ps1"

$root = Get-ServidorRoot
$webRoot = Join-Path $root 'dashboard'
if (-not (Test-Path (Join-Path $webRoot 'index.html'))) {
  throw "Pasta dashboard nao encontrada: $webRoot"
}

$script:ServerActionStatePath = Join-Path $root 'state\server-action.json'
$script:ScriptsDir = $PSScriptRoot

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
  try {
    if (-not (Test-DockerRunning)) { return $false }
    $cfg = $null
    try { $cfg = Import-ServidorConfig } catch { }
    $appPort = if ($cfg -and $cfg.APP_PORT) { [string]$cfg.APP_PORT } else { '5173' }
    $urls = @(
      "http://127.0.0.1:${appPort}/",
      'http://127.0.0.1:8000/auth/v1/health'
    )
    foreach ($url in $urls) {
      try {
        $code = & curl.exe -sk -o NUL -w '%{http_code}' --max-time 2 $url 2>$null
        if ("$code" -match '^(200|301|302|304)$') { return $true }
      } catch { }
    }
    # Fallback: pelo menos um container acomp-* em execucao
    $names = @(docker ps --format '{{.Names}}' 2>$null)
    return (@($names | Where-Object { $_ -match '^acomp-|^supabase-' }).Count -gt 0)
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
    & `$target -Silent -SkipInstallPanel -SkipLauncherUi
    Save-State 'done' 'Servidor iniciado.' `$null
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
      `$cur.action = 'idle'
      `$cur.pid = `$null
      `$cur.updatedAt = (Get-Date).ToString('o')
      (`$cur | ConvertTo-Json -Compress) | Set-Content -LiteralPath `$statePath -Encoding UTF8
    }
  } catch { }
}
"@

  $tmp = Join-Path $env:TEMP ("acomp-omps-{0}-{1}.ps1" -f $Action, [guid]::NewGuid().ToString('N'))
  Set-Content -LiteralPath $tmp -Value $runner -Encoding UTF8
  $proc = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $tmp
  ) -WindowStyle Minimized -PassThru

  Set-ServerActionState $Action 'running' $label $proc.Id | Out-Null
  return (Get-ServerControlSnapshot)
}

# Encerra instancia anterior na mesma porta
try {
  $owners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pidOwn in @($owners)) {
    if ($pidOwn -and $pidOwn -ne $PID) {
      Stop-Process -Id $pidOwn -Force -ErrorAction SilentlyContinue
    }
  }
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
Write-Host 'Deixe esta janela aberta enquanto usa o Dashboard.'

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

function Send-Bytes([System.Net.HttpListenerResponse]$Res, [byte[]]$Bytes, [string]$ContentType, [int]$Status = 200) {
  $Res.StatusCode = $Status
  $Res.ContentType = $ContentType
  $Res.Headers['Cache-Control'] = 'no-store'
  $Res.ContentLength64 = $Bytes.Length
  $Res.OutputStream.Write($Bytes, 0, $Bytes.Length)
  $Res.OutputStream.Close()
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

$chrome = @(
  (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
  (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$url = "${prefix}"
if (-not $NoBrowser) {
  if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList @("--app=$url", '--new-window') | Out-Null
  } else {
    Start-Process $url | Out-Null
  }
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ($path -eq '/') { $path = '/index.html' }

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
}
