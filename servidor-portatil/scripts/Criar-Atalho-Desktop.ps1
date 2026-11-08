# Cria atalho na Area de Trabalho (e opcionalmente na pasta do pacote).
# Uso:
#   .\Criar-Atalho-Desktop.ps1 -Name 'AcompOPMS' -TargetPath 'C:\...\Iniciar AcompOPMS.vbs'
#   .\Criar-Atalho-Desktop.ps1 -Name 'AcompOPMS' -TargetPath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -Arguments 'https://sistema.acompomps.rede/'

param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][string]$TargetPath,
  [string]$Arguments = '',
  [string]$WorkingDirectory = '',
  [string]$Description = '',
  [string]$IconPath = '',
  [switch]$AlsoInPackRoot
)

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$iconsDir = Join-Path $root 'icons'
$icoDefault = Join-Path $iconsDir 'opms.ico'

if (-not (Test-Path -LiteralPath $TargetPath)) {
  throw "Alvo do atalho nao encontrado: $TargetPath"
}

if (-not $WorkingDirectory) {
  if (Test-Path -LiteralPath $TargetPath -PathType Container) {
    $WorkingDirectory = $TargetPath
  } else {
    $WorkingDirectory = Split-Path -Parent $TargetPath
  }
}

if (-not $IconPath) {
  if (-not (Test-Path -LiteralPath $icoDefault)) {
    # Gera icone padrao se ainda nao existir
    $gen = Join-Path $PSScriptRoot 'Criar-Atalho-Iniciar.ps1'
    if (Test-Path -LiteralPath $gen) {
      try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $gen | Out-Null
      } catch { }
    }
  }
  if (Test-Path -LiteralPath $icoDefault) { $IconPath = $icoDefault }
}

function New-ShortcutFile([string]$LnkPath) {
  $wsh = New-Object -ComObject WScript.Shell
  $sc = $wsh.CreateShortcut($LnkPath)
  $sc.TargetPath = $TargetPath
  if ($Arguments) { $sc.Arguments = $Arguments }
  $sc.WorkingDirectory = $WorkingDirectory
  $sc.WindowStyle = 1
  if ($IconPath -and (Test-Path -LiteralPath $IconPath)) {
    $sc.IconLocation = "$IconPath,0"
  }
  if ($Description) { $sc.Description = $Description }
  $sc.Save()
  return $LnkPath
}

$desktop = [Environment]::GetFolderPath('Desktop')
$safeName = ($Name -replace '[\\/:*?"<>|]', ' ').Trim()
if (-not $safeName) { $safeName = 'AcompOPMS' }
$desktopLnk = Join-Path $desktop ("{0}.lnk" -f $safeName)
$created = @(New-ShortcutFile $desktopLnk)

if ($AlsoInPackRoot) {
  $packLnk = Join-Path $root ("{0}.lnk" -f $safeName)
  $created += New-ShortcutFile $packLnk
}

Write-Host 'Atalho(s) criado(s):'
foreach ($c in $created) { Write-Host ("  {0}" -f $c) }
$created
