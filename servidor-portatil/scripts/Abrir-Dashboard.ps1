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
