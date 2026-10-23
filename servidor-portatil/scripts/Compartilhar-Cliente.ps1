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
ACESSO AO AcompOPMS NA REDE
===========================

Nome cadastrado no modal: $alias
Isso esta correto. Outros PCs NAO resolvem esse nome sozinhos.

USE AGORA (sem instalar nada):
  http://${ip}:${port}
  http://${hostName}:${port}

PARA O NOME AMIGAVEL (http://${alias}:${port}):
  1) Neste PC servidor, Liberar-Firewall.cmd (Admin) + DNS no roteador = $ip
  OU
  2) Em CADA PC cliente, rode UMA VEZ como Admin:
     \\${ip}\AcompOPMS-Cliente\Adicionar-Endereco-Hosts.cmd
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
Write-Host "  \\$ip\$shareName\Adicionar-Endereco-Hosts.cmd"
Write-Host "  \\$hostName\$shareName\Adicionar-Endereco-Hosts.cmd"
