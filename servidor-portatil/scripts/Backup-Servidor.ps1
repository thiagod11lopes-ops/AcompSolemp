# Gera um pacote .zip para levar o servidor para outro PC.
# Inclui: dados do Postgres (volumes), .env do Supabase, config.env, server-config, schema.
# Uso: .\Backup-Servidor.ps1

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$cfg = Import-ServidorConfig
Assert-DockerRunning

$root = Get-ServidorRoot
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $root 'backups'
$work = Join-Path $backupRoot "_work-$stamp"
$zip = Join-Path $backupRoot "acomp-servidor-$stamp.zip"
New-Item -ItemType Directory -Force -Path $work, $backupRoot | Out-Null

Write-Host "==> Parando serviços (backup consistente)..."
& "$PSScriptRoot\Parar-Servidor.ps1"

$dockerDir = $cfg.SUPABASE_DOCKER_DIR
$dataSrc = Join-Path $dockerDir 'volumes\db\data'
if (-not (Test-Path $dataSrc)) {
  throw "Pasta de dados não encontrada: $dataSrc"
}

Write-Host "==> Copiando dados do banco (pode demorar)..."
$destData = Join-Path $work 'supabase-db-data'
New-Item -ItemType Directory -Force -Path $destData | Out-Null
robocopy $dataSrc $destData /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
# robocopy exit codes 0-7 are success-ish
if ($LASTEXITCODE -ge 8) { throw "robocopy falhou ($LASTEXITCODE)" }

Copy-Item (Join-Path $dockerDir '.env') (Join-Path $work 'supabase.env') -Force
Copy-Item (Join-Path $root 'config.env') (Join-Path $work 'config.env') -Force

$sc = Join-Path $cfg.FRONTEND_DIR 'public\server-config.js'
if (Test-Path $sc) { Copy-Item $sc (Join-Path $work 'server-config.js') -Force }

# manifesto
@"
AcompOPMS servidor backup
created=$stamp
server_host=$($cfg.SERVER_HOST)
supabase_docker_dir=$dockerDir
frontend_dir=$($cfg.FRONTEND_DIR)
"@ | Set-Content (Join-Path $work 'MANIFEST.txt') -Encoding UTF8

Write-Host "==> Compactando..."
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $work '*') -DestinationPath $zip -Force
Remove-Item $work -Recurse -Force

Write-Host ""
Write-Host "Backup pronto:"
Write-Host "  $zip"
Write-Host ""
Write-Host "Para voltar a subir neste PC: .\Iniciar-Servidor.ps1"
Write-Host "Para migrar: copie o zip + pastas do projeto (veja README.md)."
