# Build de produção para servidor LAN (Windows PowerShell)
$ErrorActionPreference = "Stop"
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $LanDir "..\..")
$EnvFile = Join-Path $LanDir "servidor.env"
if (-not (Test-Path $EnvFile)) {
  Copy-Item (Join-Path $LanDir "servidor.env.example") $EnvFile
}

$vars = @{}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $i = $_.IndexOf('=')
  $vars[$_.Substring(0, $i).Trim()] = $_.Substring($i + 1).Trim()
}
$hostLan = $vars['ACOMOPMS_LAN_HOST']
if (-not $hostLan -or $hostLan -eq 'auto') {
  $hostLan = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress
  if (-not $hostLan) { $hostLan = '127.0.0.1' }
}
$port = if ($vars['ACOMOPMS_HTTP_PORT']) { $vars['ACOMOPMS_HTTP_PORT'] } else { '8080' }
$publicOrigin = "http://${hostLan}:${port}"

Push-Location $Root
$status = supabase status -o env 2>$null
$anon = ($status | Where-Object { $_ -match '^ANON_KEY=' }) -replace '^ANON_KEY="?|"',''
if (-not $anon) { throw "Supabase local não está rodando. Execute: supabase start" }

Push-Location (Join-Path $Root "frontend")
$env:VITE_DATA_SOURCE = "supabase"
$env:VITE_SUPABASE_URL = $publicOrigin
$env:VITE_SUPABASE_ANON_KEY = $anon
npm run build
Pop-Location
Pop-Location
Write-Host "OK: build em frontend/dist — acesse $publicOrigin"
