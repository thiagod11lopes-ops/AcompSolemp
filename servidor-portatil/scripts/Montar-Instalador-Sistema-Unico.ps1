# Gera um unico icone no Desktop para instalar o PC Sistema/cliente.
# - Remove a pasta Desktop\Sistema (se existir)
# - Copia o payload para %LOCALAPPDATA%\AcompOPMS\setup-sistema\
# - Cria o atalho "Instalar ClienteOMPS.lnk" (icone OPMS)
# - Gera tambem um .vbs autocontido (oculto) + ZIP portatil para pendrive
#
# Uso: .\Montar-Instalador-Sistema-Unico.ps1
#      chamado por Preparar-Pacotes-Transferencia.ps1

$ErrorActionPreference = 'Stop'

$sp = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$desk = [Environment]::GetFolderPath('Desktop')
$appData = Join-Path $env:LOCALAPPDATA 'AcompOPMS\setup-sistema'
$icoSrc = Join-Path $sp 'icons\opms.ico'
$dstSistemaOld = Join-Path $desk 'Sistema'

function Write-Step([string]$Message) {
  Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message)
}

function Invoke-Rcopy([string]$From, [string]$To) {
  if (-not (Test-Path -LiteralPath $From)) { return }
  New-Item -ItemType Directory -Force -Path $To | Out-Null
  & robocopy $From $To /E /XO /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
}

Write-Host '========================================'
Write-Host '  Instalador unico — ClienteOMPS'
Write-Host '========================================'

# ---------------------------------------------------------------------------
# Payload em LocalAppData (estavel, caminhos absolutos no atalho local)
# ---------------------------------------------------------------------------
Write-Step 'Preparando payload em LocalAppData...'
if (Test-Path -LiteralPath $appData) {
  Remove-Item -LiteralPath $appData -Recurse -Force -ErrorAction SilentlyContinue
}
$scriptsDir = Join-Path $appData 'scripts'
$clienteDir = Join-Path $appData 'cliente'
$iconsDir = Join-Path $appData 'icons'
New-Item -ItemType Directory -Force -Path $scriptsDir, $clienteDir, $iconsDir | Out-Null

foreach ($name in @(
    'Assistente-Instalacao-Cliente.ps1',
    'Instalar-Pacote-Sistema.ps1',
    'Ensure-Certificado-Confianca.ps1',
    'Ui-Theme-Dashboard.ps1',
    'Criar-Atalho-Desktop.ps1',
    '_common.ps1'
  )) {
  $from = Join-Path $sp ("scripts\{0}" -f $name)
  if (Test-Path -LiteralPath $from) {
    Copy-Item -Force $from (Join-Path $scriptsDir $name)
  }
}

$cliSrc = Join-Path $sp 'cliente'
if (Test-Path -LiteralPath $cliSrc) { Invoke-Rcopy $cliSrc $clienteDir }
$iconsSrc = Join-Path $sp 'icons'
if (Test-Path -LiteralPath $iconsSrc) { Invoke-Rcopy $iconsSrc $iconsDir }

$launcherPs1 = Join-Path $scriptsDir 'Instalar-Pacote-Sistema.ps1'
if (-not (Test-Path -LiteralPath $launcherPs1)) {
  throw 'Instalar-Pacote-Sistema.ps1 ausente no payload.'
}

$launcherVbs = Join-Path $appData 'Instalar.vbs'
@(
  "' AcompOPMS — launcher Instalador ClienteOMPS"
  'Option Explicit'
  'Dim sh, fso, root, ps1'
  'Set sh = CreateObject("WScript.Shell")'
  'Set fso = CreateObject("Scripting.FileSystemObject")'
  'root = fso.GetParentFolderName(WScript.ScriptFullName)'
  'ps1 = root & "\scripts\Instalar-Pacote-Sistema.ps1"'
  'If Not fso.FileExists(ps1) Then'
  '  MsgBox "Instalador incompleto.`n`nRegenere com Preparar-Pacotes-Transferencia.", vbCritical, "Instalar ClienteOMPS"'
  '  WScript.Quit 1'
  'End If'
  'sh.CurrentDirectory = fso.GetParentFolderName(ps1)'
  'sh.Run "powershell.exe -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Chr(34) & ps1 & Chr(34), 0, True'
) | Set-Content -LiteralPath $launcherVbs -Encoding ASCII

$ico = Join-Path $iconsDir 'opms.ico'
if (-not (Test-Path -LiteralPath $ico) -and (Test-Path -LiteralPath $icoSrc)) {
  Copy-Item -Force $icoSrc $ico
}

# ---------------------------------------------------------------------------
# Atalho unico no Desktop
# ---------------------------------------------------------------------------
Write-Step 'Criando atalho unico no Desktop...'
$lnkPath = Join-Path $desk 'Instalar ClienteOMPS.lnk'
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($lnkPath)
$sc.TargetPath = $launcherVbs
$sc.Arguments = ''
$sc.WorkingDirectory = $appData
$sc.WindowStyle = 1
$sc.Description = 'Instala o sistema neste PC (certificado + atalho ClienteOMPS)'
if (Test-Path -LiteralPath $ico) { $sc.IconLocation = "$ico,0" }
$sc.Save()

# ---------------------------------------------------------------------------
# VBS autocontido (portatil) + ZIP para pendrive — um unico arquivo transferivel
# ---------------------------------------------------------------------------
Write-Step 'Gerando instalador portatil autocontido...'
$stage = Join-Path $env:TEMP ("acompomps-sistema-stage-{0}" -f [guid]::NewGuid().ToString('N'))
$stagePayload = Join-Path $stage 'payload'
New-Item -ItemType Directory -Force -Path $stagePayload | Out-Null
Invoke-Rcopy $scriptsDir (Join-Path $stagePayload 'scripts')
Invoke-Rcopy $clienteDir (Join-Path $stagePayload 'cliente')
Invoke-Rcopy $iconsDir (Join-Path $stagePayload 'icons')

$zipPath = Join-Path $stage 'payload.zip'
if (Test-Path -LiteralPath $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $stagePayload '*') -DestinationPath $zipPath -Force
$zipBytes = [System.IO.File]::ReadAllBytes($zipPath)
$b64 = [Convert]::ToBase64String($zipBytes)

# Quebra em linhas para o VBS (limite pratico de literais)
$chunkSize = 120
$b64Lines = for ($i = 0; $i -lt $b64.Length; $i += $chunkSize) {
  $len = [Math]::Min($chunkSize, $b64.Length - $i)
  $b64.Substring($i, $len)
}

# Gera o VBS autocontido (unico arquivo transferivel por pendrive)
$portVbsName = 'Instalar ClienteOMPS.vbs'
$portVbsApp = Join-Path $appData $portVbsName
$vbs = New-Object System.Collections.Generic.List[string]
[void]$vbs.Add("' AcompOPMS — instalador portatil autocontido (PC Sistema/cliente)")
[void]$vbs.Add('Option Explicit')
[void]$vbs.Add('Dim sh, fso, appRoot, td, zipPath, ps1, b64, stream, decoder, bytes, desk, ico, lnk, sc, ts, launcher')
[void]$vbs.Add('Set sh = CreateObject("WScript.Shell")')
[void]$vbs.Add('Set fso = CreateObject("Scripting.FileSystemObject")')
[void]$vbs.Add('appRoot = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\AcompOPMS"')
[void]$vbs.Add('If Not fso.FolderExists(appRoot) Then fso.CreateFolder appRoot')
[void]$vbs.Add('td = appRoot & "\setup-sistema"')
[void]$vbs.Add('If fso.FolderExists(td) Then fso.DeleteFolder td, True')
[void]$vbs.Add('fso.CreateFolder td')
[void]$vbs.Add('zipPath = td & "\payload.zip"')
[void]$vbs.Add('b64 = ""')
foreach ($line in $b64Lines) {
  [void]$vbs.Add(('b64 = b64 & "{0}"' -f $line))
}
[void]$vbs.Add('Set decoder = CreateObject("MSXML2.DOMDocument.6.0").createElement("b64")')
[void]$vbs.Add('decoder.dataType = "bin.base64"')
[void]$vbs.Add('decoder.text = b64')
[void]$vbs.Add('bytes = decoder.nodeTypedValue')
[void]$vbs.Add('Set stream = CreateObject("ADODB.Stream")')
[void]$vbs.Add('stream.Type = 1')
[void]$vbs.Add('stream.Open')
[void]$vbs.Add('stream.Write bytes')
[void]$vbs.Add('stream.SaveToFile zipPath, 2')
[void]$vbs.Add('stream.Close')
[void]$vbs.Add('sh.Run "powershell.exe -NoProfile -WindowStyle Hidden -Command ""Expand-Archive -LiteralPath ''" & zipPath & "'' -DestinationPath ''" & td & "'' -Force""", 0, True')
[void]$vbs.Add('ps1 = td & "\scripts\Instalar-Pacote-Sistema.ps1"')
[void]$vbs.Add('If Not fso.FileExists(ps1) Then')
[void]$vbs.Add('  MsgBox "Falha ao extrair o instalador.", vbCritical, "Instalar ClienteOMPS"')
[void]$vbs.Add('  WScript.Quit 1')
[void]$vbs.Add('End If')
# Launcher estavel em LocalAppData + atalho profissional no Desktop
[void]$vbs.Add('launcher = td & "\Instalar.vbs"')
[void]$vbs.Add('Set ts = fso.CreateTextFile(launcher, True)')
[void]$vbs.Add('ts.WriteLine "Set sh=CreateObject(""WScript.Shell"")"')
[void]$vbs.Add('ts.WriteLine "Set fso=CreateObject(""Scripting.FileSystemObject"")"')
[void]$vbs.Add('ts.WriteLine "ps1=fso.GetParentFolderName(WScript.ScriptFullName) & ""\scripts\Instalar-Pacote-Sistema.ps1"""')
[void]$vbs.Add('ts.WriteLine "sh.CurrentDirectory=fso.GetParentFolderName(ps1)"')
[void]$vbs.Add('ts.WriteLine "sh.Run ""powershell.exe -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "" & Chr(34) & ps1 & Chr(34), 0, True"')
[void]$vbs.Add('ts.Close')
[void]$vbs.Add('desk = sh.SpecialFolders("Desktop")')
[void]$vbs.Add('ico = td & "\icons\opms.ico"')
[void]$vbs.Add('lnk = desk & "\Instalar ClienteOMPS.lnk"')
[void]$vbs.Add('Set sc = sh.CreateShortcut(lnk)')
[void]$vbs.Add('sc.TargetPath = launcher')
[void]$vbs.Add('sc.WorkingDirectory = td')
[void]$vbs.Add('sc.WindowStyle = 1')
[void]$vbs.Add('sc.Description = "Instala o sistema neste PC (certificado + atalho ClienteOMPS)"')
[void]$vbs.Add('If fso.FileExists(ico) Then sc.IconLocation = ico & ",0"')
[void]$vbs.Add('sc.Save')
[void]$vbs.Add('sh.CurrentDirectory = fso.GetParentFolderName(ps1)')
[void]$vbs.Add('sh.Run "powershell.exe -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Chr(34) & ps1 & Chr(34), 0, True')
$vbs | Set-Content -LiteralPath $portVbsApp -Encoding ASCII

# ZIP portatil: um unico .vbs para copiar no pendrive (sem pasta Sistema)
$zipOut = Join-Path $appData 'Instalar-ClienteOMPS-Portatil.zip'
$portableDir = Join-Path $stage 'portable'
New-Item -ItemType Directory -Force -Path $portableDir | Out-Null
Copy-Item -Force $portVbsApp (Join-Path $portableDir $portVbsName)
if (Test-Path -LiteralPath $zipOut) { Remove-Item -Force $zipOut }
Compress-Archive -Path (Join-Path $portableDir $portVbsName) -DestinationPath $zipOut -Force

# Copia o ZIP para a pasta Servidor (se existir), para ir junto no pendrive do servidor
$srvZip = Join-Path $desk 'Servidor\Instalar-ClienteOMPS-Portatil.zip'
if (Test-Path -LiteralPath (Join-Path $desk 'Servidor')) {
  Copy-Item -Force $zipOut $srvZip
}

# ---------------------------------------------------------------------------
# Remove pasta Sistema antiga
# ---------------------------------------------------------------------------
Write-Step 'Removendo pasta Sistema (substituida pelo icone unico)...'
if (Test-Path -LiteralPath $dstSistemaOld) {
  Remove-Item -LiteralPath $dstSistemaOld -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove restos de instalador antigo no Desktop
foreach ($extra in @(
    (Join-Path $desk 'Instalar Sistema.lnk'),
    (Join-Path $desk 'Instalar Sistema.vbs'),
    (Join-Path $desk 'Instalar ClienteOMPS.vbs'),
    (Join-Path $desk 'Instalar ClienteOMPS.zip')
  )) {
  if (Test-Path -LiteralPath $extra) {
    Remove-Item -LiteralPath $extra -Force -ErrorAction SilentlyContinue
  }
}

Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host 'Pronto.'
Write-Host ("  Icone Desktop : {0}" -f $lnkPath)
Write-Host ("  Payload       : {0}" -f $appData)
Write-Host ("  Pendrive ZIP  : {0}" -f $zipOut)
if (Test-Path -LiteralPath $srvZip) {
  Write-Host ("  ZIP no Servidor: {0}" -f $srvZip)
}
Write-Host ''
Write-Host 'No Desktop aparece so "Instalar ClienteOMPS". Ao concluir, use o atalho ClienteOMPS.'
