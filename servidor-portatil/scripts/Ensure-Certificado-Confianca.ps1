# Garante a CA AcompOPMS no armazenamento Raiz confiavel deste PC.
# Uso:
#   .\Ensure-Certificado-Confianca.ps1
#   .\Ensure-Certificado-Confianca.ps1 -ServerHost 10.6.167.66 -OpenBrowser
#   .\Ensure-Certificado-Confianca.ps1 -CaPath C:\...\AcompOPMS-rootCA.pem
# Se faltar Admin, reacende com UAC e conclui sozinho.

param(
  [string]$ServerHost = '',
  [string]$CaPath = '',
  [switch]$OpenBrowser,
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

function Write-Info([string]$Message) {
  if (-not $Quiet) { Write-Host $Message }
}

function Test-IsAdmin {
  return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
    IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-PemSha1([string]$Path) {
  $dump = & certutil.exe -dump $Path 2>&1 | Out-String
  if ($dump -match 'Cert Hash\(sha1\):\s*([a-fA-F0-9 ]+)') {
    return (($Matches[1] -replace '\s', '').ToUpperInvariant())
  }
  return $null
}

function Test-CaTrusted([string]$Path) {
  $hash = Get-PemSha1 $Path
  if (-not $hash) { return $false }
  $store = & certutil.exe -store Root 2>&1 | Out-String
  return $store.ToUpperInvariant().Contains($hash)
}

function Resolve-CaPath {
  if ($CaPath -and (Test-Path -LiteralPath $CaPath)) { return (Resolve-Path -LiteralPath $CaPath).Path }

  $root = Split-Path $PSScriptRoot -Parent
  $candidates = @(
    (Join-Path $root 'cliente\AcompOPMS-rootCA.pem'),
    (Join-Path $root 'cliente\www-ca\AcompOPMS-rootCA.pem'),
    (Join-Path $PSScriptRoot '..\cliente\AcompOPMS-rootCA.pem')
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) { return (Resolve-Path -LiteralPath $c).Path }
  }

  $hostName = $ServerHost.Trim()
  if (-not $hostName) {
    try {
      . "$PSScriptRoot\_common.ps1"
      $cfg = Import-ServidorConfig
      $hostName = [string]$cfg.SERVER_HOST
      if (-not $hostName) { $hostName = Get-PreferredLanIPv4 }
    } catch { }
  }
  if (-not $hostName) {
    throw 'CA nao encontrada e ServerHost nao informado para baixar.'
  }

  $url = "http://{0}/acomp-ca/AcompOPMS-rootCA.pem" -f $hostName.TrimEnd('/')
  $dest = Join-Path $env:TEMP 'AcompOPMS-rootCA.pem'
  Write-Info ("Baixando CA: {0}" -f $url)
  & curl.exe -fsSL --connect-timeout 5 --max-time 20 $url -o $dest
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $dest)) {
    throw "Falha ao baixar a CA em $url"
  }
  return $dest
}

$ca = Resolve-CaPath
Write-Info ("CA: {0}" -f $ca)

if (Test-CaTrusted $ca) {
  Write-Info 'Certificado ja confiado neste PC.'
} else {
  if (-not (Test-IsAdmin)) {
    Write-Info 'Solicitando Administrador para instalar o certificado...'
    $argList = @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', $PSCommandPath,
      '-CaPath', $ca
    )
    if ($ServerHost) { $argList += @('-ServerHost', $ServerHost) }
    if ($OpenBrowser) { $argList += '-OpenBrowser' }
    if ($Quiet) { $argList += '-Quiet' }
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Verb RunAs -Wait -PassThru
    if ($p.ExitCode -ne 0) {
      throw "Instalacao do certificado cancelada ou falhou (codigo $($p.ExitCode))."
    }
  } else {
    Write-Info 'Instalando CA na loja Raiz (ROOT)...'
    & certutil.exe -addstore -f 'Root' $ca | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'certutil falhou ao instalar a CA.' }
    Write-Info 'CA instalada com sucesso.'
  }
}

if ($OpenBrowser) {
  $hostName = $ServerHost.Trim()
  if (-not $hostName) {
    try {
      . "$PSScriptRoot\_common.ps1"
      $cfg = Import-ServidorConfig
      $hostName = [string]$cfg.SERVER_HOST
      if (-not $hostName) { $hostName = Get-PreferredLanIPv4 }
    } catch { }
  }
  if ($hostName) {
    $url = "https://{0}/" -f $hostName.TrimEnd('/')
    Write-Info ("Abrindo {0}" -f $url)
    Start-Process $url | Out-Null
  }
}

exit 0
