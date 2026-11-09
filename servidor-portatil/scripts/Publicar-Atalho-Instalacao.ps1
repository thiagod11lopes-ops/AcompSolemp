# Publica atalhos padrao na Area de Trabalho:
#   AcompOPMS  -> instalador (Servidor/Cliente)
#   Servidor   -> Dashboard do servidor
# Uso:
#   .\Publicar-Atalho-Instalacao.ps1
#   ..\Instalar-Atalho-na-Area-de-Trabalho.cmd

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$desktopHelper = Join-Path $PSScriptRoot 'Criar-Atalho-Desktop.ps1'
$iconGen = Join-Path $PSScriptRoot 'Criar-Atalho-Iniciar.ps1'
$ico = Join-Path $root 'icons\opms.ico'

$hubVbs = @(
  (Join-Path $root 'AcompOPMS Instalar.vbs'),
  (Join-Path $root 'Iniciar AcompOPMS.vbs')
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

$dashVbs = Join-Path $root 'Dashboard.vbs'

if (-not $hubVbs) {
  throw "Nao encontrei AcompOPMS Instalar.vbs / Iniciar AcompOPMS.vbs em $root"
}
if (-not (Test-Path -LiteralPath $desktopHelper)) {
  throw "Nao encontrei: $desktopHelper"
}

if (-not (Test-Path -LiteralPath $ico) -and (Test-Path -LiteralPath $iconGen)) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $iconGen | Out-Null
}

$descInst = 'Instalador AcompOPMS (Servidor ou Cliente). Sempre abre o instalador.'
$descSrv = 'Dashboard do servidor AcompOPMS'

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $desktopHelper `
  -Name 'AcompOPMS' `
  -TargetPath $hubVbs `
  -WorkingDirectory $root `
  -Description $descInst `
  -AlsoInPackRoot | Out-Null

if (Test-Path -LiteralPath $dashVbs) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $desktopHelper `
    -Name 'Servidor' `
    -TargetPath $dashVbs `
    -WorkingDirectory $root `
    -Description $descSrv | Out-Null
}

$wsh = New-Object -ComObject WScript.Shell
$packLnk = Join-Path $root 'AcompOPMS.lnk'
$sc = $wsh.CreateShortcut($packLnk)
$sc.TargetPath = $hubVbs
$sc.WorkingDirectory = $root
$sc.WindowStyle = 1
$sc.Description = $descInst
if (Test-Path -LiteralPath $ico) { $sc.IconLocation = "$ico,0" }
$sc.Save()

$desktop = [Environment]::GetFolderPath('Desktop')
Write-Host ''
Write-Host 'Pronto.'
Write-Host ("  AcompOPMS (instalador): {0}" -f (Join-Path $desktop 'AcompOPMS.lnk'))
Write-Host ("  Servidor (Dashboard):   {0}" -f (Join-Path $desktop 'Servidor.lnk'))
Write-Host ("  Pacote:                 {0}" -f $packLnk)
Write-Host ''
Write-Host 'ClienteOMPS e criado ao instalar o sistema neste PC (fluxo Cliente).'
Write-Host 'Para outro PC: copie a pasta do pacote e rode Instalar-Atalho-na-Area-de-Trabalho.cmd.'
