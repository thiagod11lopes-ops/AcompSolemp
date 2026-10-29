# Instala a CA do Servidor OMPS neste PC (remove o aviso "Nao seguro" no Chrome/Edge).
# Execute como Administrador, UMA VEZ por computador cliente.
# Uso: .\Instalar-Certificado-Confianca.ps1

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
  IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  throw 'Execute como Administrador (botao direito -> Executar como administrador).'
}

$here = $PSScriptRoot
$candidates = @(
  (Join-Path $here 'AcompOPMS-rootCA.pem'),
  (Join-Path (Split-Path $here -Parent) 'certs\AcompOPMS-rootCA.pem')
)
$ca = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $ca) {
  throw @"
Arquivo AcompOPMS-rootCA.pem nao encontrado.

No PC SERVIDOR, inicie o servidor uma vez (gera o certificado) e copie:
  servidor-portatil\cliente\AcompOPMS-rootCA.pem
para esta pasta, depois rode este script de novo.
"@
}

Write-Host "Instalando CA: $ca"
certutil.exe -addstore -f "ROOT" $ca
if ($LASTEXITCODE -ne 0) { throw 'certutil falhou ao instalar a CA.' }

Write-Host ''
Write-Host 'OK. Feche e abra o Chrome/Edge, depois acesse o nome do sistema (https).'
Write-Host 'O aviso "Nao seguro" deve sumir e aparecer o cadeado.'
