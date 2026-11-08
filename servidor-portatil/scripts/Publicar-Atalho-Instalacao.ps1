# Cria o icone AcompOPMS na Area de Trabalho (inicia o hub Servidor/Cliente)
# e o mesmo atalho dentro do pacote para ir em pen drive / outro PC.
# Uso:
#   .\Publicar-Atalho-Instalacao.ps1
#   ..\Instalar-Atalho-na-Area-de-Trabalho.cmd

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$hubVbs = Join-Path $root 'Iniciar AcompOPMS.vbs'
$desktopHelper = Join-Path $PSScriptRoot 'Criar-Atalho-Desktop.ps1'
$iconGen = Join-Path $PSScriptRoot 'Criar-Atalho-Iniciar.ps1'
$ico = Join-Path $root 'icons\opms.ico'

if (-not (Test-Path -LiteralPath $hubVbs)) {
  throw "Nao encontrei: $hubVbs"
}
if (-not (Test-Path -LiteralPath $desktopHelper)) {
  throw "Nao encontrei: $desktopHelper"
}

if (-not (Test-Path -LiteralPath $ico) -and (Test-Path -LiteralPath $iconGen)) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $iconGen | Out-Null
}

$desc = 'Instalar ou abrir o AcompOPMS (servidor ou cliente). Envie a pasta do pacote + rode Instalar-Atalho-na-Area-de-Trabalho.cmd no outro PC.'

# Area de Trabalho + copia na raiz do pacote
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $desktopHelper `
  -Name 'AcompOPMS' `
  -TargetPath $hubVbs `
  -WorkingDirectory $root `
  -Description $desc `
  -AlsoInPackRoot | Out-Null

# Garante AcompOPMS.lnk na pasta do pacote com icone (caminho absoluto neste PC;
# no outro PC, rode Instalar-Atalho-na-Area-de-Trabalho.cmd para recriar).
$packLnk = Join-Path $root 'AcompOPMS.lnk'
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($packLnk)
$sc.TargetPath = $hubVbs
$sc.WorkingDirectory = $root
$sc.WindowStyle = 1
$sc.Description = $desc
if (Test-Path -LiteralPath $ico) { $sc.IconLocation = "$ico,0" }
$sc.Save()

$desktop = [Environment]::GetFolderPath('Desktop')
$deskLnk = Join-Path $desktop 'AcompOPMS.lnk'
Write-Host ''
Write-Host 'Pronto.'
Write-Host '  Area de Trabalho:'
Write-Host ("    {0}" -f $deskLnk)
Write-Host '  Pacote:'
Write-Host ("    {0}" -f $packLnk)
Write-Host ''
Write-Host 'Para enviar a outro PC: copie a pasta servidor-portatil (ou o pacote completo).'
Write-Host 'La, rode Instalar-Atalho-na-Area-de-Trabalho.cmd ou Iniciar AcompOPMS.vbs.'
