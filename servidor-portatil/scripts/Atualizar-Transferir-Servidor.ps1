# Sincroniza a pasta Desktop\Transferir Servidor a partir do projeto atual (copia REAL).
# Uso: .\Atualizar-Transferir-Servidor.ps1
#      atalho "Atualizar Transferir Servidor"

$ErrorActionPreference = 'Stop'

$desk = [Environment]::GetFolderPath('Desktop')
$dstRoot = Join-Path $desk 'Transferir Servidor'
$geral = Join-Path $dstRoot 'Gereal'

# Este script vive em ...\AcompSolemp\servidor-portatil\scripts
$proj = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$sbDockerSrc = Join-Path (Split-Path $proj -Parent) 'supabase-master\docker'
$packGereal = Join-Path $desk 'Iniciar Servidor\Gereal'

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

Write-Host '========================================'
Write-Host '  Atualizar Transferir Servidor'
Write-Host '========================================'
Write-Host ("Projeto : {0}" -f $proj)
Write-Host ("Destino : {0}" -f $dstRoot)
Write-Host ''

if (-not (Test-Path -LiteralPath (Join-Path $proj 'servidor-portatil'))) {
  throw "Projeto invalido (sem servidor-portatil): $proj"
}

New-Item -ItemType Directory -Force -Path $geral | Out-Null

# instaladores / icons / painel: preferir pack local; fallback projeto
$instSrc = Join-Path $packGereal 'instaladores'
if (-not (Test-Path -LiteralPath $instSrc)) { $instSrc = Join-Path $proj 'servidor-portatil\instaladores' }
$iconsSrc = Join-Path $packGereal 'icons'
if (-not (Test-Path -LiteralPath $iconsSrc)) { $iconsSrc = Join-Path $proj 'servidor-portatil\icons' }

Write-Step 'instaladores...'
[void](Invoke-Rcopy $instSrc (Join-Path $geral 'instaladores'))

Write-Step 'icons...'
[void](Invoke-Rcopy $iconsSrc (Join-Path $geral 'icons'))

Write-Step 'painel (assistente)...'
$painelDst = Join-Path $geral 'painel'
New-Item -ItemType Directory -Force -Path $painelDst | Out-Null
if (Test-Path -LiteralPath (Join-Path $packGereal 'painel')) {
  [void](Invoke-Rcopy (Join-Path $packGereal 'painel') $painelDst)
}
# Sempre sobrescreve com a versao do projeto (fonte da verdade do Cursor)
Copy-Item -Force (Join-Path $proj 'servidor-portatil\painel\Assistente-Instalacao-Servidor.ps1') $painelDst
Copy-Item -Force (Join-Path $proj 'servidor-portatil\painel\Painel-Servidor-OMPS.ps1') $painelDst -ErrorAction SilentlyContinue

Write-Step 'VBS / CMD...'
$vbsNames = @(
  'Dashboard.vbs',
  'Iniciar-Servidor-OMPS.vbs',
  'Instalacao-do-Servidor.vbs',
  'Servidor OMPS.vbs'
)
foreach ($name in $vbsNames) {
  # Projeto Cursor e a fonte da verdade (pack antigo pode ter VBS desatualizado)
  $fromProj = Join-Path $proj ("servidor-portatil\" + $name)
  $fromPack = Join-Path $packGereal $name
  if (Test-Path -LiteralPath $fromProj) {
    Copy-Item -Force $fromProj $geral
  } elseif (Test-Path -LiteralPath $fromPack) {
    Copy-Item -Force $fromPack $geral
  }
}

# Lancadores PORTATEIS na raiz (so .cmd — sem .lnk duplicados; aspas para pastas com espaco)
Write-Step 'CMD portateis na raiz Transferir Servidor...'
# Remove atalhos .lnk antigos (causam icones duplicados e quebram em outro PC)
Get-ChildItem -LiteralPath $dstRoot -Filter '*.lnk' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

# Instalacao: PowerShell com aspas + start /wait (janela nao some sem mensagem)
@(
  '@echo off'
  'title Instalacao do Servidor'
  'cd /d "%~dp0"'
  'set "PS1=%~dp0Gereal\painel\Assistente-Instalacao-Servidor.ps1"'
  'if not exist "%PS1%" set "PS1=%~dp0Geral\painel\Assistente-Instalacao-Servidor.ps1"'
  'if not exist "%PS1%" set "PS1=%~dp0Gereal\AcompSolemp\servidor-portatil\painel\Assistente-Instalacao-Servidor.ps1"'
  'if not exist "%PS1%" ('
  '  echo Nao achei Assistente-Instalacao-Servidor.ps1'
  '  echo Copie a pasta INTEIRA Transferir Servidor (com a subpasta Gereal).'
  '  pause'
  '  exit /b 1'
  ')'
  'echo Abrindo assistente...'
  'echo %PS1%'
  'echo.'
  'start "Assistente OMPS" /wait powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%PS1%"'
  'set ERR=%ERRORLEVEL%'
  'if not "%ERR%"=="0" ('
  '  echo.'
  '  echo ERRO ao abrir o assistente (codigo %ERR%).'
  '  echo Se a janela fechou sozinha, rode de novo e leia a mensagem.'
  '  pause'
  '  exit /b %ERR%'
  ')'
) | Set-Content -LiteralPath (Join-Path $dstRoot '1-Instalacao-do-Servidor.cmd') -Encoding ASCII

function Write-PortableCmdViaVbs([string]$FileName, [string]$RelVbs, [string]$Title) {
  $cmdPath = Join-Path $dstRoot $FileName
  @(
    '@echo off'
    "title $Title"
    'cd /d "%~dp0"'
    "set `"VBS=%~dp0Gereal\$RelVbs`""
    "if not exist `"%VBS%`" set `"VBS=%~dp0Geral\$RelVbs`""
    'if not exist "%VBS%" ('
    "  echo Nao achei Gereal\$RelVbs"
    '  echo Copie a pasta INTEIRA Transferir Servidor (com a subpasta Gereal).'
    '  pause'
    '  exit /b 1'
    ')'
    'wscript.exe //nologo "%VBS%"'
    'if errorlevel 1 pause'
  ) | Set-Content -LiteralPath $cmdPath -Encoding ASCII
}
Write-PortableCmdViaVbs '2-Iniciar-Servidor-OMPS.cmd' 'Iniciar-Servidor-OMPS.vbs' 'Iniciar Servidor OMPS'
Write-PortableCmdViaVbs '3-Dashboard-Servidor.cmd' 'Dashboard.vbs' 'Dashboard Servidor'

# Remove nomes antigos duplicados
foreach ($old in @(
    'Instalacao-do-Servidor.cmd', 'Iniciar-Servidor-OMPS.cmd', 'Dashboard-Servidor.cmd',
    'Instalação do Servidor.lnk', 'Iniciar Servidor OMPS.lnk', 'Dashboard Servidor.lnk'
  )) {
  $p = Join-Path $dstRoot $old
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue }
}

# Certificado CMD apontando para cliente do pacote
@(
  '@echo off'
  'net session >nul 2>&1'
  'if errorlevel 1 ('
  '  powershell -NoProfile -Command "Start-Process -FilePath ''%~f0'' -Verb RunAs"'
  '  exit /b'
  ')'
  'cd /d "%~dp0"'
  'set "PS1=%~dp0AcompSolemp\servidor-portatil\cliente\Instalar-Certificado-Confianca.ps1"'
  'if not exist "%PS1%" ('
  '  echo Nao achei Instalar-Certificado-Confianca.ps1'
  '  pause'
  '  exit /b 1'
  ')'
  'powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"'
  'echo.'
  'pause'
) | Set-Content -LiteralPath (Join-Path $geral 'Instalar-Certificado-Confianca.cmd') -Encoding ASCII

Write-Step 'AcompSolemp (codigo do Cursor)...'
$acompDst = Join-Path $geral 'AcompSolemp'
# Remove junction antiga se existir (pacote portatil precisa ser copia real)
if (Test-Path -LiteralPath $acompDst) {
  $item = Get-Item -LiteralPath $acompDst -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    Write-Step 'Removendo junction antiga de AcompSolemp...'
    cmd /c "rmdir `"$acompDst`""
  }
}
[void](Invoke-Rcopy $proj $acompDst `
    @('.git', 'logs', 'state', 'node_modules', 'dist', '.vite', 'coverage', 'agent-transcripts', '.cursor') `
    @('*.pid', '*.log', 'gateway.crt', 'gateway.key', 'cert-names.txt'))

# Inclui frontend\node_modules para o PC destino pular (ou acelerar) o npm install
Write-Step 'frontend\node_modules (para o outro PC nao baixar de novo)...'
$nmSrc = Join-Path $proj 'frontend\node_modules'
if (-not (Test-Path -LiteralPath $nmSrc)) {
  $altNm = Join-Path $packGereal 'AcompSolemp\frontend\node_modules'
  if (Test-Path -LiteralPath $altNm) { $nmSrc = $altNm }
}
$nmDst = Join-Path $acompDst 'frontend\node_modules'
if (Test-Path -LiteralPath $nmSrc) {
  [void](Invoke-Rcopy $nmSrc $nmDst)
} else {
  Write-Host '  AVISO: node_modules ausente neste PC. No destino a etapa npm install vai baixar tudo (pode demorar).'
}

Write-Step 'supabase-master\docker...'
if (-not (Test-Path -LiteralPath (Join-Path $sbDockerSrc 'docker-compose.yml'))) {
  $alt = Join-Path $packGereal 'supabase-master\docker'
  if (Test-Path -LiteralPath (Join-Path $alt 'docker-compose.yml')) { $sbDockerSrc = $alt }
}
$sbDst = Join-Path $geral 'supabase-master\docker'
$sbParent = Join-Path $geral 'supabase-master'
if (Test-Path -LiteralPath $sbParent) {
  $sbItem = Get-Item -LiteralPath $sbParent -Force
  if ($sbItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    Write-Step 'Removendo junction antiga de supabase-master...'
    cmd /c "rmdir `"$sbParent`""
  }
}
[void](Invoke-Rcopy $sbDockerSrc $sbDst @('volumes', '.temp', 'node_modules', '.git') @('*.log'))

Write-Step 'config.env portatil...'
$cfg = Join-Path $acompDst 'servidor-portatil\config.env'
$ex = Join-Path $acompDst 'servidor-portatil\config.env.example'
if (-not (Test-Path -LiteralPath $cfg) -and (Test-Path -LiteralPath $ex)) { Copy-Item $ex $cfg }
if (Test-Path -LiteralPath $cfg) {
  $c = Get-Content -LiteralPath $cfg -Raw -Encoding UTF8
  if ($c -notmatch '(?m)^SERVER_HOST=') { $c += "`r`nSERVER_HOST=10.6.167.66`r`n" }
  if ($c -notmatch '(?m)^SERVER_ALIAS=') { $c += "`r`nSERVER_ALIAS=10.6.167.66`r`n" }
  $c = $c -replace '(?m)^SERVER_HOST=.*', 'SERVER_HOST=10.6.167.66'
  $c = $c -replace '(?m)^SERVER_ALIAS=.*', 'SERVER_ALIAS=10.6.167.66'
  $c = $c -replace '(?m)^FRONTEND_DIR=.*', 'FRONTEND_DIR=PLACEHOLDER'
  $c = $c -replace '(?m)^SUPABASE_DOCKER_DIR=.*', 'SUPABASE_DOCKER_DIR=PLACEHOLDER'
  if ($c -notmatch '(?m)^FRONTEND_DIR=') { $c += "`r`nFRONTEND_DIR=PLACEHOLDER`r`n" }
  if ($c -notmatch '(?m)^SUPABASE_DOCKER_DIR=') { $c += "`r`nSUPABASE_DOCKER_DIR=PLACEHOLDER`r`n" }
  Set-Content -LiteralPath $cfg -Value $c.TrimEnd() -Encoding UTF8
}

$nmOk = Test-Path -LiteralPath (Join-Path $acompDst 'frontend\node_modules')
@(
  'TRANSFERIR PARA OUTRO PC'
  '========================'
  '1) Rode neste PC: "Atualizar Transferir Servidor" (antes de copiar).'
  '2) Copie a pasta INTEIRA "Transferir Servidor" (com a subpasta Gereal).'
  '3) No PC destino use APENAS estes arquivos na raiz (sem .lnk):'
  '   - 1-Instalacao-do-Servidor.cmd'
  '   - 2-Iniciar-Servidor-OMPS.cmd'
  '   - 3-Dashboard-Servidor.cmd'
  '4) 1a vez: internet + Admin; clientes: certificado + DNS seguro off.'
  ''
  ('frontend\node_modules no pacote: {0}' -f ($(if ($nmOk) { 'SIM (npm install deve pular)' } else { 'NAO (destino fara npm install)' })))
  ('Atualizado em: {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm'))
) | Set-Content -LiteralPath (Join-Path $geral 'LEIA-ME.txt') -Encoding UTF8
Copy-Item -Force (Join-Path $geral 'LEIA-ME.txt') (Join-Path $dstRoot 'LEIA-ME.txt') -ErrorAction SilentlyContinue

# Remove Reparar-Atalhos antigo (nao usamos mais .lnk no pacote)
Remove-Item -LiteralPath (Join-Path $dstRoot 'Reparar-Atalhos.cmd') -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $dstRoot 'Reparar-Atalhos.ps1') -Force -ErrorAction SilentlyContinue

# Recria atalho na Area de Trabalho deste PC (fonte do Cursor)
Write-Step 'atalho Desktop Atualizar Transferir Servidor...'
$wsh = New-Object -ComObject WScript.Shell
$ico = Join-Path $geral 'icons\opms.ico'
$updateCmd = Join-Path $proj 'servidor-portatil\Atualizar-Transferir-Servidor.cmd'
$deskLnk = Join-Path $desk 'Atualizar Transferir Servidor.lnk'
if (Test-Path -LiteralPath $updateCmd) {
  $scUp = $wsh.CreateShortcut($deskLnk)
  $scUp.TargetPath = $updateCmd
  $scUp.WorkingDirectory = Split-Path $updateCmd
  $scUp.WindowStyle = 1
  $scUp.Description = 'Sincroniza Transferir Servidor a partir do projeto Cursor'
  $icoSrc = Join-Path $proj 'servidor-portatil\icons\opms.ico'
  if (-not (Test-Path -LiteralPath $icoSrc)) { $icoSrc = $ico }
  if (Test-Path -LiteralPath $icoSrc) { $scUp.IconLocation = "$icoSrc,0" }
  $scUp.Save()
}

# Checklist
$checks = @(
  (Join-Path $geral 'instaladores\Docker Desktop Installer.exe'),
  (Join-Path $geral 'painel\Assistente-Instalacao-Servidor.ps1'),
  (Join-Path $geral 'AcompSolemp\servidor-portatil\scripts\Abrir-Tudo.ps1'),
  (Join-Path $geral 'AcompSolemp\frontend\package.json'),
  (Join-Path $geral 'supabase-master\docker\docker-compose.yml')
)
$bad = @($checks | Where-Object { -not (Test-Path -LiteralPath $_) })
$acompItem = Get-Item -LiteralPath $acompDst -Force
if ($acompItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
  $bad += 'AcompSolemp ainda e junction (deveria ser copia real)'
}
if (-not (Test-Path -LiteralPath (Join-Path $acompDst 'frontend\node_modules'))) {
  $bad += 'frontend\node_modules ausente (PC destino tera de rodar npm install)'
}

Write-Host ''
if ($bad.Count -gt 0) {
  Write-Host 'CONCLUIDO COM AVISOS:' -ForegroundColor Yellow
  $bad | ForEach-Object { Write-Host ("  - {0}" -f $_) }
} else {
  Write-Host 'CONCLUIDO: Transferir Servidor atualizado (copia real).' -ForegroundColor Green
}
Write-Host 'Pode copiar a pasta Transferir Servidor para o outro computador.'
Write-Host ''
if ([Environment]::UserInteractive -and -not $env:ACOMP_NO_PAUSE) {
  Write-Host 'Pressione Enter para fechar...'
  try { [void][Console]::ReadLine() } catch { Start-Sleep -Seconds 2 }
}
