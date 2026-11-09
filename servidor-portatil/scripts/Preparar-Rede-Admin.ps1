# Preparacao elevada (sem pause). Chamado com -Verb RunAs.
$ErrorActionPreference = 'Continue'
$log = Join-Path (Split-Path $PSScriptRoot) 'logs\preparar-rede.log'
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
function L($m) {
  $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m
  Add-Content $log $line -Encoding UTF8
  Write-Host $line
}

L '=== Preparar-Rede-Admin inicio ==='
. "$PSScriptRoot\_common.ps1"

try {
  L 'Aplicar-Host...'
  & "$PSScriptRoot\Aplicar-Host.ps1"
} catch { L "Aplicar-Host ERRO: $($_.Exception.Message)" }

try {
  L 'Preparar-Https (CA + certificado)...'
  & "$PSScriptRoot\Preparar-Https.ps1"
} catch { L "HTTPS ERRO: $($_.Exception.Message)" }

try {
  L 'Instalar-Dns-Autostart...'
  & "$PSScriptRoot\Instalar-Dns-Autostart.ps1"
} catch { L "DNS ERRO: $($_.Exception.Message)" }

try {
  if (Test-DockerRunning) {
    L 'Iniciar-Gateway...'
    & "$PSScriptRoot\Iniciar-Gateway.ps1"
  } else {
    L 'Docker offline - gateway depois do Iniciar Servidor.'
  }
} catch { L "Gateway ERRO: $($_.Exception.Message)" }

L '=== Preparar-Rede-Admin fim ==='
