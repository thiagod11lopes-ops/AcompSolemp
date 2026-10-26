# API local sempre ligada com o servidor: export CSV (DadosOMPS).
# Uso: .\Local-Export-Api.ps1
# Porta: 9788 (apenas 127.0.0.1). Nginx/Vite fazem proxy same-origin.

param(
  [int]$Port = 9788
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$root = Get-ServidorRoot
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$pidFile = Join-Path $logDir 'local-export-api.pid'

if (Test-Path -LiteralPath $pidFile) {
  $old = Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($old) {
    $oldId = 0
    [void][int]::TryParse("$old", [ref]$oldId)
    if ($oldId -gt 8) {
      $proc = Get-Process -Id $oldId -ErrorAction SilentlyContinue
      if ($proc) {
        try { Stop-Process -Id $oldId -Force -ErrorAction SilentlyContinue } catch { }
        Start-Sleep -Milliseconds 400
      }
    }
  }
}
Set-Content -LiteralPath $pidFile -Value "$PID" -Encoding ASCII

$prefix = "http://127.0.0.1:$Port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  $msg = $_.Exception.Message
  throw "Nao foi possivel ouvir em $prefix - $msg"
}

function Set-CorsHeaders([System.Net.HttpListenerResponse]$Res) {
  $Res.Headers['Access-Control-Allow-Origin'] = '*'
  $Res.Headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  $Res.Headers['Access-Control-Allow-Headers'] = 'Content-Type'
}

function Send-Text([System.Net.HttpListenerResponse]$Res, [string]$Text, [string]$ContentType, [int]$Status = 200) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
  $Res.StatusCode = $Status
  $Res.ContentType = $ContentType
  $Res.Headers['Cache-Control'] = 'no-store'
  Set-CorsHeaders $Res
  $Res.ContentLength64 = $bytes.Length
  $Res.OutputStream.Write($bytes, 0, $bytes.Length)
  $Res.OutputStream.Close()
}

function Start-ExportDadosCsvJob {
  $scriptPath = Join-Path $PSScriptRoot 'Exportar-Dados-Csv.ps1'
  if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "Script nao encontrado: $scriptPath"
  }
  # Aguarda flush do app_state no Postgres antes de exportar.
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-Command', "Start-Sleep -Seconds 2; & '$scriptPath'"
  ) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden | Out-Null
  return @{
    ok      = $true
    started = $true
    message = 'Exportacao CSV iniciada.'
  }
}

Write-Host "Local Export API em $prefix"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ($path -eq '/') { $path = '/api/health' }

      if ($req.HttpMethod -eq 'OPTIONS') {
        Set-CorsHeaders $res
        $res.StatusCode = 204
        $res.ContentLength64 = 0
        $res.OutputStream.Close()
        continue
      }

      if ($path -eq '/api/health' -and $req.HttpMethod -eq 'GET') {
        Send-Text $res '{"ok":true,"service":"local-export"}' 'application/json; charset=utf-8'
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

      Send-Text $res 'Not found' 'text/plain; charset=utf-8' 404
    } catch {
      try { Send-Text $res $_.Exception.Message 'text/plain; charset=utf-8' 500 } catch { }
    }
  }
} finally {
  try { $listener.Stop() } catch { }
  try { $listener.Close() } catch { }
  try { Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue } catch { }
}
