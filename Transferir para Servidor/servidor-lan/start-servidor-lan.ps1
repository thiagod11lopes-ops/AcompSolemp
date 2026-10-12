# Inicia Caddy para servir frontend/dist na LAN (Windows). Supabase deve estar em execução.
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $LanDir '..\..')
$EnvFile = Join-Path $LanDir 'servidor.env'
$PidFile = Join-Path $LanDir 'caddy.pid'
$StdoutLog = Join-Path $LanDir 'caddy.stdout.log'
$StderrLog = Join-Path $LanDir 'caddy.stderr.log'

if (-not (Test-Path $EnvFile)) {
  Copy-Item (Join-Path $LanDir 'servidor.env.example') $EnvFile
}

if (-not (Test-Path (Join-Path $Root 'frontend\dist\index.html'))) {
  throw 'Rode build-producao-lan.ps1 antes.'
}

if (Test-Path $PidFile) {
  $existing = (Get-Content $PidFile -Raw).Trim()
  if ($existing -match '^\d+$') {
    $proc = Get-Process -Id ([int]$existing) -ErrorAction SilentlyContinue
    if ($proc) {
      Push-Location $LanDir
      node --input-type=module -e "import { loadServidorEnv } from './lib/load-servidor-env.mjs'; const c = loadServidorEnv(); console.log('[servidor-lan] Caddy ja em execucao. UI:', c.publicOrigin)"
      Pop-Location
      exit 0
    }
  }
}

function Invoke-SupabaseCli {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CliArgs)
  # O shim npm do Supabase encaminha avisos para stderr. No Windows PowerShell 5.1,
  # $ErrorActionPreference Stop transforma esse aviso em erro fatal mesmo com saida 0.
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $PSNativeCommandUseErrorActionPreference = $false
  try {
    & supabase @CliArgs *>&1 | Out-Null
    if ($null -eq $LASTEXITCODE) { throw 'supabase CLI nao retornou codigo de saida' }
    return [int]$LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
}

Push-Location $Root
try {
  $statusCode = Invoke-SupabaseCli status
  if ($statusCode -ne 0) {
    $startCode = Invoke-SupabaseCli start
    if ($startCode -ne 0) {
      throw "supabase start falhou (codigo $startCode)"
    }
  }
} finally {
  Pop-Location
}

node (Join-Path $LanDir 'generate-caddyfile.mjs')
node (Join-Path $LanDir 'gerar-server-connection.mjs')
$caddy = Get-Command caddy -ErrorAction SilentlyContinue
if (-not $caddy) { throw 'Instale Caddy e coloque caddy.exe no PATH.' }

$config = Join-Path $LanDir 'Caddyfile.generated'
# Windows PowerShell 5.1 junta -ArgumentList e divide de novo nos espacos.
# O caminho "Transferir para Servidor" precisa ir entre aspas numa unica string.
$caddyArguments = 'run --config "{0}" --adapter caddyfile' -f $config
$p = Start-Process -FilePath $caddy.Source -ArgumentList $caddyArguments -RedirectStandardOutput $StdoutLog -RedirectStandardError $StderrLog -NoNewWindow -PassThru
Start-Sleep -Seconds 2
$running = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if ($running) {
  try { $running.Refresh() } catch { }
}
$alive = $null -ne $running -and -not $running.HasExited
if (-not $alive) {
  $codeText = 'indisponivel'
  try {
    $p.Refresh()
    if ($p.HasExited) {
      [void]$p.WaitForExit(2000)
      if ($null -ne $p.ExitCode -and "$($p.ExitCode)".Length -gt 0) {
        $codeText = [string]$p.ExitCode
      }
    }
  } catch { }
  $stderrTail = ''
  $stdoutTail = ''
  if (Test-Path $StderrLog) {
    $stderrTail = ((Get-Content -Path $StderrLog -Tail 20 -ErrorAction SilentlyContinue) -join "`n")
  }
  if (Test-Path $StdoutLog) {
    $stdoutTail = ((Get-Content -Path $StdoutLog -Tail 20 -ErrorAction SilentlyContinue) -join "`n")
  }
  throw "Caddy encerrou (codigo $codeText). Veja $StderrLog e $StdoutLog`n$stderrTail`n$stdoutTail"
}

$httpPort = 8080
foreach ($line in (Get-Content -Path $EnvFile -ErrorAction SilentlyContinue)) {
  if ($line -match '^\s*ACOMOPMS_HTTP_PORT\s*=\s*(\d+)\s*$') {
    $httpPort = [int]$Matches[1]
  }
}
try {
  $response = Invoke-WebRequest -Uri "http://127.0.0.1:${httpPort}/" -UseBasicParsing -TimeoutSec 5
} catch {
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  throw "Caddy (PID $($p.Id)) nao respondeu em http://127.0.0.1:${httpPort}/. $($_.Exception.Message)"
}
if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 500) {
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  throw "Caddy (PID $($p.Id)) respondeu HTTP $($response.StatusCode) em http://127.0.0.1:${httpPort}/."
}
$p.Id | Set-Content -Path $PidFile -Encoding ascii

Push-Location $LanDir
node --input-type=module -e "import { loadServidorEnv } from './lib/load-servidor-env.mjs'; const c = loadServidorEnv(); console.log('[servidor-lan] UI LAN:', c.publicOrigin)"
if ($LASTEXITCODE -ne 0) { throw 'Falha ao ler a origem publica do servidor.env' }
Pop-Location
Write-Host "[servidor-lan] Caddy em execucao. PID $($p.Id)"
Write-Host "[servidor-lan] Log stdout: $StdoutLog"
Write-Host "[servidor-lan] Log stderr: $StderrLog"
