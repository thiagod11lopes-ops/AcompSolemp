# Restaura um backup gerado por Backup-Servidor.ps1
# Uso: .\Restaurar-Servidor.ps1 -Zip ".\backups\acomp-servidor-YYYYMMDD-HHMMSS.zip"
#      .\Restaurar-Servidor.ps1 -Zip "...\arquivo.zip" -HostAddress 192.168.0.50

param(
  [Parameter(Mandatory = $true)]
  [string]$Zip,
  [string]$HostAddress = ''
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$cfg = Import-ServidorConfig
Assert-DockerRunning

if (-not (Test-Path $Zip)) { throw "Zip não encontrado: $Zip" }

Write-Host "==> Parando serviços..."
& "$PSScriptRoot\Parar-Servidor.ps1"

$root = Get-ServidorRoot
$work = Join-Path $root ("backups\_restore-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $work | Out-Null
Expand-Archive -Path $Zip -DestinationPath $work -Force

$dataSrc = Join-Path $work 'supabase-db-data'
if (-not (Test-Path $dataSrc)) { throw "Backup inválido: falta supabase-db-data" }

$dockerDir = $cfg.SUPABASE_DOCKER_DIR
$dataDst = Join-Path $dockerDir 'volumes\db\data'

Write-Host "==> Restaurando dados do Postgres em $dataDst ..."
if (Test-Path $dataDst) {
  $bak = "$dataDst.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Rename-Item $dataDst $bak
  Write-Host "Pasta antiga renomeada para: $bak"
}
New-Item -ItemType Directory -Force -Path $dataDst | Out-Null
robocopy $dataSrc $dataDst /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy falhou ($LASTEXITCODE)" }

$supEnv = Join-Path $work 'supabase.env'
if (Test-Path $supEnv) {
  Copy-Item $supEnv (Join-Path $dockerDir '.env') -Force
  Write-Host "Restaurado supabase .env"
}

$cfgBak = Join-Path $work 'config.env'
if (Test-Path $cfgBak) {
  # mantém caminhos locais atuais; só traz host se não for passado
  $oldHost = (Get-Content $cfgBak | Where-Object { $_ -match '^\s*SERVER_HOST=' }) -replace '^\s*SERVER_HOST=', ''
  if (-not $HostAddress -and $oldHost) { $HostAddress = $oldHost.Trim() }
}

Remove-Item $work -Recurse -Force

if ($HostAddress) {
  Write-Host "==> Ajustando host para $HostAddress ..."
  & "$PSScriptRoot\Aplicar-Host.ps1" -HostAddress $HostAddress
} else {
  & "$PSScriptRoot\Aplicar-Host.ps1"
}

Write-Host "==> Subindo..."
& "$PSScriptRoot\Iniciar-Servidor.ps1"

Write-Host "Restauração concluída."
