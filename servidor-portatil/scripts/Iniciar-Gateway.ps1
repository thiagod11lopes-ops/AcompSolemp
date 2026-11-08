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

Write-Host '==> Publicando instalador automatico da CA (HTTP /acomp-ca/)...'
& "$PSScriptRoot\Publicar-CaHttp.ps1"

Write-Host '==> Garantindo certificado confiado neste PC...'
try {
  & "$PSScriptRoot\Ensure-Certificado-Confianca.ps1" -Quiet
} catch {
  Write-Host ("Aviso CA local: {0}" -f $_.Exception.Message)
}

$compose = Join-Path $root 'docker-compose.gateway.yml'
Push-Location $root
try {
  docker compose -f $compose up -d --force-recreate
  if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao subir gateway (portas 80/443). Outro programa pode estar usando essas portas.'
  }
} finally {
  Pop-Location
}

$cfg = Import-ServidorConfig
$ip = [string]$cfg.SERVER_HOST
if (-not $ip) { $ip = Get-PreferredLanIPv4 }
Write-Host 'Gateway HTTPS :443 ativo.'
if ($ip) {
  Write-Host ("Clientes com aviso de certificado: abra http://{0}/  (instala CA e abre o sistema)." -f $ip)
}
