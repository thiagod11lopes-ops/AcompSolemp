# Gera na pasta Desktop\Arquivos:
#   Arquivos\Servidor\                    — instalacao completa do PC servidor
#   Arquivos\Instalar-ClienteOMPS-Portatil.zip — instalador portatil do PC cliente
# E no Desktop:
#   Instalar ClienteOMPS.lnk              — icone unico para instalar o sistema
# Uso: .\Preparar-Pacotes-Transferencia.ps1

$ErrorActionPreference = 'Stop'

$desk = [Environment]::GetFolderPath('Desktop')
$packRoot = Join-Path $desk 'Arquivos'
New-Item -ItemType Directory -Force -Path $packRoot | Out-Null
$proj = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$sp = Join-Path $proj 'servidor-portatil'
$sbDockerSrc = Join-Path (Split-Path $proj -Parent) 'supabase-master\docker'
$instSrc = Join-Path $desk 'Iniciar Servidor\Gereal\instaladores'
if (-not (Test-Path -LiteralPath $instSrc)) {
  $instSrc = Join-Path $desk 'Iniciar Servidor\instaladores'
}
if (-not (Test-Path -LiteralPath $instSrc)) {
  $instSrc = Join-Path $sp 'instaladores'
}

$dstServidor = Join-Path $packRoot 'Servidor'

function Write-Step([string]$Message) {
  Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message)
}

function Invoke-Rcopy([string]$From, [string]$To, [string[]]$ExcludeDirs = @(), [string[]]$ExcludeFiles = @()) {
  if (-not (Test-Path -LiteralPath $From)) {
    Write-Host ("  AVISO: origem ausente: {0}" -f $From)
    return 8
  }
  New-Item -ItemType Directory -Force -Path $To | Out-Null
  $args = @($From, $To, '/E', '/XO', '/NFL', '/NDL', '/NJH', '/NJS', '/R:1', '/W:1')
  foreach ($d in $ExcludeDirs) { $args += '/XD'; $args += $d }
  foreach ($f in $ExcludeFiles) { $args += '/XF'; $args += $f }
  & robocopy @args | Out-Null
  return $LASTEXITCODE
}

function Write-RootVbs([string]$Path, [string]$Title, [string[]]$RelPs1) {
  $lines = @(
    "' $Title"
    'Option Explicit'
    'Dim sh, fso, root, ps1, i, candidates'
    'Set sh = CreateObject("WScript.Shell")'
    'Set fso = CreateObject("Scripting.FileSystemObject")'
    'root = fso.GetParentFolderName(WScript.ScriptFullName)'
    'ps1 = ""'
    'candidates = Array( _'
  )
  for ($i = 0; $i -lt $RelPs1.Count; $i++) {
    $comma = if ($i -lt $RelPs1.Count - 1) { ', _' } else { ' _' }
    $lines += ('  root & "\{0}"{1}' -f $RelPs1[$i], $comma)
  }
  $lines += @(
    ')'
    'For i = 0 To UBound(candidates)'
    '  If fso.FileExists(candidates(i)) Then ps1 = fso.GetAbsolutePathName(candidates(i)) : Exit For'
    'Next'
    'If ps1 = "" Then'
    ('  MsgBox "Nao achei o instalador.`n`nCopie a pasta INTEIRA." & vbCrLf & root, vbCritical, "{0}"' -f $Title)
    '  WScript.Quit 1'
    'End If'
    'sh.CurrentDirectory = fso.GetParentFolderName(ps1)'
    ' # 0 = oculto (sem janela preta); o WinForms do assistente aparece normalmente'
    'sh.Run "powershell.exe -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File " & Chr(34) & ps1 & Chr(34), 0, True'
  )
  Set-Content -LiteralPath $Path -Value ($lines -join "`r`n") -Encoding ASCII
}

function New-PackShortcut([string]$LnkPath, [string]$Target, [string]$WorkDir, [string]$Desc, [string]$Ico) {
  $wsh = New-Object -ComObject WScript.Shell
  $sc = $wsh.CreateShortcut($LnkPath)
  $sc.TargetPath = $Target
  $sc.Arguments = ''
  $sc.WorkingDirectory = $WorkDir
  $sc.WindowStyle = 1
  $sc.Description = $Desc
  if ($Ico -and (Test-Path -LiteralPath $Ico)) { $sc.IconLocation = "$Ico,0" }
  $sc.Save()
}

Write-Host '========================================'
Write-Host '  Preparar pacotes Servidor + ClienteOMPS'
Write-Host '========================================'
Write-Host ("Projeto  : {0}" -f $proj)
Write-Host ("Arquivos : {0}" -f $packRoot)
Write-Host ("Servidor : {0}" -f $dstServidor)
Write-Host ("Cliente  : Instalar ClienteOMPS.lnk (icone unico no Desktop)")
Write-Host ''

if (-not (Test-Path -LiteralPath (Join-Path $proj 'servidor-portatil'))) {
  throw "Projeto invalido: $proj"
}
if (-not (Test-Path -LiteralPath $sbDockerSrc)) {
  throw "supabase-master\docker nao encontrado: $sbDockerSrc"
}
if (-not (Test-Path -LiteralPath $instSrc)) {
  throw "Pasta instaladores nao encontrada. Restaure Iniciar Servidor\Gereal\instaladores."
}

# ---------------------------------------------------------------------------
# SERVIDOR
# ---------------------------------------------------------------------------
Write-Step 'Limpando pasta Servidor...'
if (Test-Path -LiteralPath $dstServidor) {
  Remove-Item -LiteralPath $dstServidor -Recurse -Force -ErrorAction SilentlyContinue
}
$geral = Join-Path $dstServidor 'Gereal'
New-Item -ItemType Directory -Force -Path $geral | Out-Null

Write-Step 'Copiando AcompSolemp (codigo)...'
$acompDst = Join-Path $geral 'AcompSolemp'
[void](Invoke-Rcopy $proj $acompDst `
  @('.git', 'logs', 'state', 'dist', '.vite', 'coverage', 'agent-transcripts', '.cursor', 'Instalador OPMS', 'backups', 'Transferir para Servidor') `
  @('*.pid', '*.log', 'gateway.crt', 'gateway.key', 'cert-names.txt', 'Cursor*.exe'))

Write-Step 'Copiando supabase-master\docker...'
$sbDst = Join-Path $geral 'supabase-master\docker'
[void](Invoke-Rcopy $sbDockerSrc $sbDst @() @('*.pid'))

Write-Step 'Copiando instaladores (Docker/Node/VC/WSL)...'
$instDst = Join-Path $geral 'instaladores'
[void](Invoke-Rcopy $instSrc $instDst @() @('Cursor*.exe'))
# Tambem dentro de servidor-portatil (Initialize-OmpsPanelPaths procura aqui)
$instDst2 = Join-Path $acompDst 'servidor-portatil\instaladores'
[void](Invoke-Rcopy $instSrc $instDst2 @() @('Cursor*.exe'))

Write-Step 'Copiando icons...'
$iconsSrc = Join-Path $sp 'icons'
$iconsDst = Join-Path $geral 'icons'
if (Test-Path -LiteralPath $iconsSrc) {
  [void](Invoke-Rcopy $iconsSrc $iconsDst)
  [void](Invoke-Rcopy $iconsSrc (Join-Path $acompDst 'servidor-portatil\icons'))
}

# config.env do pacote apontando para caminhos locais do pack
Write-Step 'Ajustando config.env do pacote Servidor...'
$cfgDst = Join-Path $acompDst 'servidor-portatil\config.env'
$cfgEx = Join-Path $acompDst 'servidor-portatil\config.env.example'
if (-not (Test-Path -LiteralPath $cfgDst) -and (Test-Path -LiteralPath $cfgEx)) {
  Copy-Item -Force $cfgEx $cfgDst
}
$feDir = Join-Path $acompDst 'frontend'
$sbDir = $sbDst
$cfgLines = @(
  '############'
  '# AcompOPMS — pacote transferivel Servidor'
  '############'
  ''
  'SERVER_HOST=127.0.0.1'
  'SERVER_ALIAS=127.0.0.1'
  'SUPABASE_PORT=8000'
  'APP_PORT=5173'
  ''
  ("SUPABASE_DOCKER_DIR={0}" -f $sbDir)
  ("FRONTEND_DIR={0}" -f $feDir)
  ''
  'DASHBOARD_USER=supabase'
  'DASHBOARD_PASSWORD=this_password_is_insecure_and_should_be_updated'
  'IP_MODE=network'
  'IP_PERSIST=0'
)
Set-Content -LiteralPath $cfgDst -Value ($cfgLines -join "`r`n") -Encoding UTF8

# Atalho instaladores tambem na raiz Gereal (painel procura varios caminhos)
$instLink = Join-Path $dstServidor 'instaladores'
if (-not (Test-Path -LiteralPath $instLink)) {
  cmd /c "mklink /J `"$instLink`" `"$instDst`"" | Out-Null
}

Write-Step 'Criando Instalar Servidor.vbs...'
$vbsSrv = Join-Path $dstServidor 'Instalar Servidor.vbs'
Write-RootVbs -Path $vbsSrv -Title 'Instalar Servidor' -RelPs1 @(
  'Gereal\AcompSolemp\servidor-portatil\scripts\Instalar-Pacote-Servidor.ps1',
  'Gereal\AcompSolemp\servidor-portatil\scripts\Hub-Instalacao-AcompOPMS.ps1'
)

$ico = Join-Path $iconsDst 'opms.ico'
if (-not (Test-Path -LiteralPath $ico)) { $ico = Join-Path $sp 'icons\opms.ico' }
New-PackShortcut -LnkPath (Join-Path $dstServidor 'Instalar Servidor.lnk') -Target $vbsSrv -WorkDir $dstServidor `
  -Desc 'Instala o PC servidor AcompOPMS (Docker, Node, HTTPS, Dashboard)' -Ico $ico

@(
  'PACOTE SERVIDOR — AcompOPMS'
  '==========================='
  'Copie esta pasta INTEIRA para o PC que sera o servidor.'
  ''
  '1) Duplo clique em "Instalar Servidor"'
  '2) Senha: Marinha'
  '3) Siga o assistente (Docker, Node, rede, HTTPS, Dashboard)'
  '4) Ao final, use o atalho Desktop "Servidor" (Dashboard)'
  ''
  'Clientes da rede: use o icone Desktop "Instalar ClienteOMPS"'
  'ou o ZIP Instalar-ClienteOMPS-Portatil.zip (pasta Arquivos / nesta pasta).'
  ''
  ('Gerado em: {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm'))
) | Set-Content -LiteralPath (Join-Path $dstServidor 'LEIA-ME.txt') -Encoding UTF8

# ---------------------------------------------------------------------------
# SISTEMA (cliente) — icone unico no Desktop + ZIP em Arquivos
# ---------------------------------------------------------------------------
Write-Step 'Gerando icone unico Instalar ClienteOMPS...'
$montar = Join-Path $PSScriptRoot 'Montar-Instalador-Sistema-Unico.ps1'
if (-not (Test-Path -LiteralPath $montar)) {
  throw "Montar-Instalador-Sistema-Unico.ps1 nao encontrado: $montar"
}
& $montar -PackRoot $packRoot

Write-Host ''
Write-Host 'Pronto.'
Write-Host ("  {0}" -f $dstServidor)
Write-Host ("  {0}" -f (Join-Path $desk 'Instalar ClienteOMPS.lnk'))
Write-Host ("  {0}" -f (Join-Path $packRoot 'Instalar-ClienteOMPS-Portatil.zip'))
Write-Host ''
Write-Host 'Pacotes ficam em Desktop\Arquivos. Cliente: icone unico no Desktop (ou ZIP portatil).'
