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

function Start-DashboardBrowserAsync([string]$DashboardUrl) {
  # Abre o Chrome em processo separado DEPOIS do /api/health responder,
  # sem bloquear o loop HttpListener (evita "nao foi possivel acessar este site").
  $chromeCandidates = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )
  $chromePath = $chromeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  $chromeLit = if ($chromePath) { $chromePath.Replace("'", "''") } else { '' }
  $urlLit = $DashboardUrl.Replace("'", "''")

  $opener = @"
`$ErrorActionPreference = 'Continue'
`$url = '$urlLit'
`$chrome = '$chromeLit'
`$ready = `$false
for (`$i = 0; `$i -lt 50; `$i++) {
  try {
    `$code = & curl.exe -s -o NUL -w '%{http_code}' --max-time 1 `$url 2>`$null
    if ("`$code" -match '^(200|301|302|304)$') { `$ready = `$true; break }
  } catch { }
  Start-Sleep -Milliseconds 200
}
if (-not `$ready) { exit 1 }
`$screenW = 1920; `$screenH = 1080; `$screenX = 0; `$screenY = 0
try {
  Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
  `$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  `$screenW = [Math]::Max(800, `$b.Width)
  `$screenH = [Math]::Max(600, `$b.Height)
  `$screenX = `$b.X
  `$screenY = `$b.Y
} catch { }
if (`$chrome) {
  `$p = Start-Process -FilePath `$chrome -ArgumentList @(
    "--app=`$url",
    '--new-window',
    '--start-maximized',
    "--window-position=`$screenX,`$screenY",
    "--window-size=`$screenW,`$screenH"
  ) -PassThru
} else {
  `$p = Start-Process `$url -PassThru
}
try {
  Add-Type -ErrorAction SilentlyContinue -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class DashboardWinOpen {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@
} catch { }
`$deadline = (Get-Date).AddSeconds(6)
do {
  try { if (`$p) { `$p.Refresh() } } catch { }
  `$hwnd = [IntPtr]::Zero
  try { if (`$p) { `$hwnd = `$p.MainWindowHandle } } catch { }
  if (`$hwnd -ne [IntPtr]::Zero) {
    try {
      [void][DashboardWinOpen]::ShowWindowAsync(`$hwnd, 3)
      [void][DashboardWinOpen]::SetForegroundWindow(`$hwnd)
    } catch { }
    break
  }
  Start-Sleep -Milliseconds 200
} while ((Get-Date) -lt `$deadline)
"@

  $tmpOpen = Join-Path $env:TEMP ("acomp-dash-open-{0}.ps1" -f [guid]::NewGuid().ToString('N'))
  Set-Content -LiteralPath $tmpOpen -Value $opener -Encoding UTF8
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $tmpOpen
  ) -WindowStyle Hidden | Out-Null
}

$url = "${prefix}"
if (-not $NoBrowser) {
  Start-DashboardBrowserAsync $url
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
}
