# Gera certificado TLS local (mkcert) para o alias/IP e instala a CA neste PC.
# Exporta cliente\AcompOPMS-rootCA.pem para os outros computadores.
# Uso: .\Preparar-Https.ps1

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$root = Get-ServidorRoot
$certsDir = Join-Path $root 'certs'
$toolsDir = Join-Path $root 'tools'
$clienteDir = Join-Path $root 'cliente'
New-Item -ItemType Directory -Force -Path $certsDir, $toolsDir, $clienteDir | Out-Null

$cfg = Import-ServidorConfig
$alias = Normalize-AliasInput ([string]$cfg.SERVER_ALIAS)
$ip = [string]$cfg.SERVER_HOST
if (-not $ip) { $ip = Get-PreferredLanIPv4 }
if (-not $ip) { $ip = '127.0.0.1' }

$certFile = Join-Path $certsDir 'gateway.crt'
$keyFile = Join-Path $certsDir 'gateway.key'
$namesFile = Join-Path $certsDir 'cert-names.txt'
# Nao incluir DNS "localhost" no SAN: no Windows, Schannel/Chrome podem
# validar o host via GetNameInfo (que prioriza localhost) e marcar
# https://<alias> como "Nao seguro" (RemoteCertificateNameMismatch).
# Acesso local continua coberto por IP 127.0.0.1 no certificado.
$wantedNames = @($alias, $ip, '127.0.0.1') | Select-Object -Unique
$wantedKey = ($wantedNames -join '|').ToLowerInvariant()

$needRegen = $true
if ((Test-Path $certFile) -and (Test-Path $keyFile) -and (Test-Path $namesFile)) {
  $prev = (Get-Content $namesFile -Raw -ErrorAction SilentlyContinue).Trim()
  if ($prev -eq $wantedKey) { $needRegen = $false }
}

function Get-MkcertExe {
  $local = Join-Path $toolsDir 'mkcert.exe'
  if (Test-Path $local) { return $local }

  $cmd = Get-Command mkcert -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }

  Write-Host '==> Baixando mkcert (ferramenta de certificado local)...'
  $url = 'https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe'
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $local -UseBasicParsing
  } catch {
    throw ("Nao foi possivel baixar mkcert. Baixe manualmente para:`n{0}`nURL: {1}`nErro: {2}" -f $local, $url, $_.Exception.Message)
  }
  if (-not (Test-Path $local)) { throw "mkcert.exe nao encontrado em $local" }
  return $local
}

$mkcert = Get-MkcertExe

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
  Write-Host '==> Instalando autoridade certificadora local neste PC (mkcert -install)...'
  try {
    & $mkcert -install 2>&1 | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) {
      Write-Host 'Aviso: mkcert -install retornou codigo diferente de zero.'
    }
  } catch {
    Write-Host "Aviso mkcert -install: $($_.Exception.Message)"
  }
} else {
  Write-Host 'Aviso: sem Admin - pulando mkcert -install (evita tela UAC).'
  Write-Host 'Neste PC servidor, rode Liberar-Firewall.cmd (Admin) uma vez para confiar na CA.'
}

if ($needRegen) {
  Write-Host ("==> Gerando certificado para: {0}" -f ($wantedNames -join ', '))
  Remove-Item $certFile, $keyFile -Force -ErrorAction SilentlyContinue
  & $mkcert -cert-file $certFile -key-file $keyFile @wantedNames
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $certFile) -or -not (Test-Path $keyFile)) {
    throw 'Falha ao gerar certificado TLS (mkcert).'
  }
  Set-Content -Path $namesFile -Value $wantedKey -Encoding ASCII
  Write-Host "Certificado: $certFile"
} else {
  Write-Host 'Certificado TLS ja esta atualizado para o alias/IP atuais.'
}

$caroot = (& $mkcert -CAROOT 2>$null | Out-String).Trim()
$rootCa = Join-Path $caroot 'rootCA.pem'
if (-not (Test-Path $rootCa)) {
  throw "rootCA.pem nao encontrado em $caroot. Rode Preparar-Https como Admin uma vez."
}

$exportCa = Join-Path $clienteDir 'AcompOPMS-rootCA.pem'
Copy-Item $rootCa $exportCa -Force
Write-Host "CA exportada para clientes: $exportCa"
Write-Host 'Nos outros PCs, rode UMA VEZ (Admin): Instalar-Certificado-Confianca.cmd'
Write-Host 'Pronto HTTPS.'
