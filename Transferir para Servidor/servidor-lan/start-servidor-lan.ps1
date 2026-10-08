# Inicia Caddy para servir frontend/dist na LAN (Windows). Supabase deve estar em execução.
$ErrorActionPreference = "Stop"
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $LanDir "..\..")
$EnvFile = Join-Path $LanDir "servidor.env"
$PidFile = Join-Path $LanDir "caddy.pid"
$LogFile = Join-Path $LanDir "caddy.log"

if (-not (Test-Path (Join-Path $Root "frontend\dist\index.html"))) {
  throw "Rode build-producao-lan.ps1 antes."
}

Push-Location $Root
supabase status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { supabase start }
Pop-Location

node (Join-Path $LanDir "generate-caddyfile.mjs")
$caddy = Get-Command caddy -ErrorAction SilentlyContinue
if (-not $caddy) { throw "Instale Caddy e coloque caddy.exe no PATH." }

$config = Join-Path $LanDir "Caddyfile.generated"
Start-Process -FilePath "caddy" -ArgumentList "run","--config",$config,"--adapter","caddyfile" -RedirectStandardOutput $LogFile -RedirectStandardError $LogFile -NoNewWindow -PassThru | ForEach-Object { $_.Id | Set-Content $PidFile }
Start-Sleep -Seconds 2
node -e "import('./lib/load-servidor-env.mjs').then(m=>{const c=m.loadServidorEnv(process.argv[1]); console.log('UI LAN:', c.publicOrigin)})" $EnvFile
