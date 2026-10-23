# Cria compartilhamento \\ESTE-PC\AcompOPMS-Cliente com o script de hosts.
# Exige Admin.

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  $arg = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  Start-Process -FilePath 'powershell.exe' -ArgumentList $arg -Verb RunAs -Wait
  exit $LASTEXITCODE
}

$cfg = Import-ServidorConfig
$ip = Get-PreferredLanIPv4
if (-not $ip) { $ip = $cfg.SERVER_HOST }
$alias = [string]$cfg.SERVER_ALIAS
if (-not $alias) { $alias = 'sistema.acompomps.rede' }
$port = $cfg.APP_PORT
$hostName = $env:COMPUTERNAME

$cliente = Join-Path (Get-ServidorRoot) 'cliente'
New-Item -ItemType Directory -Force -Path $cliente | Out-Null

@(
  "ALIAS=$alias"
  "IP=$ip"
  "APP_PORT=$port"
) | Set-Content (Join-Path $cliente 'hosts-map.env') -Encoding ASCII

$readme = @"
ACESSO AO AcompOPMS NA REDE (HTTPS)
==================================

Nome cadastrado: $alias

1) Em CADA PC cliente, UMA VEZ (Admin):
   \\${ip}\AcompOPMS-Cliente\Instalar-Certificado-Confianca.cmd
   (gera o cadeado no Chrome; sem isso aparece aviso de certificado)

2) Se o nome nao abrir sozinho, tambem rode:
   \\${ip}\AcompOPMS-Cliente\Adicionar-Endereco-Hosts.cmd
   OU no roteador: DNS primario = $ip

3) Abra no navegador exatamente:
   $alias
   (HTTPS automatico)

Reserva por IP: https://${ip}
"@
Set-Content (Join-Path $cliente 'LEIA-ME-ACESSO.txt') -Value $readme -Encoding UTF8

$shareName = 'AcompOPMS-Cliente'
$existing = Get-SmbShare -Name $shareName -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.Path -ne $cliente) {
    Remove-SmbShare -Name $shareName -Force
    New-SmbShare -Name $shareName -Path $cliente -ReadAccess 'Everyone' -Description 'AcompOPMS cliente hosts' | Out-Null
  }
} else {
  New-SmbShare -Name $shareName -Path $cliente -ReadAccess 'Everyone' -Description 'AcompOPMS cliente hosts' | Out-Null
}

try {
  Grant-SmbShareAccess -Name $shareName -AccountName 'Everyone' -AccessRight Read -Force -ErrorAction SilentlyContinue | Out-Null
} catch { }

Write-Host "Compartilhamento OK:"
Write-Host "  \\$ip\$shareName\Instalar-Certificado-Confianca.cmd"
Write-Host "  \\$ip\$shareName\Adicionar-Endereco-Hosts.cmd"
Write-Host "  \\$hostName\$shareName\Instalar-Certificado-Confianca.cmd"
