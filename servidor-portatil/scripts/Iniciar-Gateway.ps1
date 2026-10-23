# Sobe nginx HTTPS :443 (+ redirect :80). Gera certificado se necessario.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

Assert-DockerRunning
$root = Get-ServidorRoot

Write-Host '==> Preparando certificado HTTPS...'
& "$PSScriptRoot\Preparar-Https.ps1"

$cert = Join-Path $root 'certs\gateway.crt'
$key = Join-Path $root 'certs\gateway.key'
if (-not (Test-Path $cert) -or -not (Test-Path $key)) {
  throw 'Certificado HTTPS ausente. Rode Preparar-Https.ps1 (preferencialmente como Admin).'
}

$compose = Join-Path $root 'docker-compose.gateway.yml'
Push-Location $root
try {
  docker compose -f $compose up -d
  if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao subir gateway (portas 80/443). Outro programa pode estar usando essas portas.'
  }
} finally {
  Pop-Location
}
Write-Host 'Gateway HTTPS :443 ativo (HTTP :80 redireciona).'
