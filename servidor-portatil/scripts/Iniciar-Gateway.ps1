# Sobe nginx na porta 80 (acesso so pelo nome, sem :5173).
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

Assert-DockerRunning
$root = Get-ServidorRoot
$compose = Join-Path $root 'docker-compose.gateway.yml'
Push-Location $root
try {
  docker compose -f $compose up -d
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao subir gateway (porta 80). Outro programa pode estar usando a porta 80.' }
} finally {
  Pop-Location
}
Write-Host 'Gateway HTTP :80 ativo.'
