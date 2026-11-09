# Instalacao direta do PC SISTEMA/cliente — sem hub Servidor/Cliente.
# Uso: .\Instalar-Pacote-Sistema.ps1
#      ..\Instalar Sistema.vbs (na pasta transferivel Sistema)

$ErrorActionPreference = 'Stop'

$assistente = Join-Path $PSScriptRoot 'Assistente-Instalacao-Cliente.ps1'
if (-not (Test-Path -LiteralPath $assistente)) {
  throw 'Assistente-Instalacao-Cliente.ps1 nao encontrado neste pacote.'
}

# Roda no mesmo processo (sem janela preta extra / sem voltar ao hub).
& $assistente -CreateDesktopShortcut
exit 0
