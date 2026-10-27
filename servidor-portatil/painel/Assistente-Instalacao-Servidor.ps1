# Assistente unico: instalacao + endereco + rede + subir servidor + Dashboard.
# Etapas 1/N com status e erro por passo. Reutiliza funcoes do Painel-Servidor-OMPS.ps1
# e scripts reais (Aplicar-Host, Liberar-Firewall, Abrir-Tudo, Abrir-Dashboard).
# Uso: .\Assistente-Instalacao-Servidor.ps1
#      Instalacao-do-Servidor.vbs

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$painelHost = Join-Path $PSScriptRoot 'Painel-Servidor-OMPS.ps1'
if (-not (Test-Path -LiteralPath $painelHost)) {
  throw "Painel-Servidor-OMPS.ps1 nao encontrado em $PSScriptRoot"
}
# Dot-source: carrega Initialize-OmpsPanelPaths, Test-*, Get-Installer, Set-PackConfigEnv, etc.
# (o painel so abre sozinho quando executado com -File, nao via dot-source)
. $painelHost

Initialize-OmpsPanelPaths
$null = Import-DashThemeForPanel

$commonPs1 = Join-Path $script:ScriptsDir '_common.ps1'
if ((Test-Path -LiteralPath $commonPs1) -and -not (Get-Command Normalize-AliasInput -ErrorAction SilentlyContinue)) {
  . $commonPs1
}

# --- Definicao das etapas (somente acoes reais do pacote) ---
$script:WizardSteps = @(
  @{ id = 'pastas'; title = 'Verificar pastas do pacote' },
  @{ id = 'vcredist'; title = 'Visual C++ Redistributable' },
  @{ id = 'wsl'; title = 'WSL' },
  @{ id = 'docker'; title = 'Docker Desktop' },
  @{ id = 'node'; title = 'Node.js' },
  @{ id = 'npm'; title = 'Dependencias do frontend (npm)' },
  @{ id = 'alias'; title = 'Definir endereco na rede' },
  @{ id = 'rede'; title = 'Firewall, hosts e HTTPS (Admin)' },
  @{ id = 'servidor'; title = 'Iniciar Servidor OMPS' },
  @{ id = 'dashboard'; title = 'Abrir Dashboard' }
)

$script:StepState = @{}
foreach ($s in $script:WizardSteps) {
  $script:StepState[$s.id] = [ordered]@{
    status = 'pending'  # pending|running|ok|skip|error
    detail = ''
  }
}
$script:WizardBusy = $false
$script:WizardIndex = 0
$script:CurrentAlias = Get-OmpsServerAlias

function Set-StepUi([string]$Id, [string]$Status, [string]$Detail = '') {
  if ($script:StepState.ContainsKey($Id)) {
    $script:StepState[$Id].status = $Status
    $script:StepState[$Id].detail = $Detail
  }
  if ($script:RefreshSteps) { & $script:RefreshSteps }
  [Windows.Forms.Application]::DoEvents()
}

function Get-LiberarFirewallCmd {
  foreach ($c in @(
      (Join-Path $script:PackRoot 'Liberar-Firewall.cmd'),
      (Join-Path $script:PackRoot 'AcompSolemp\servidor-portatil\Liberar-Firewall.cmd'),
      (Join-Path $script:ScriptsDir '..\Liberar-Firewall.cmd')
    )) {
    try {
      if (Test-Path -LiteralPath $c) { return (Resolve-Path -LiteralPath $c).Path }
    } catch { }
  }
  return $null
}

function Get-AbrirDashboardPs1 {
  $p = Join-Path $script:ScriptsDir 'Abrir-Dashboard.ps1'
  if (Test-Path -LiteralPath $p) { return $p }
  return $null
}

function Get-AbrirTudoPs1 {
  $p = Join-Path $script:ScriptsDir 'Abrir-Tudo.ps1'
  if (Test-Path -LiteralPath $p) { return $p }
  return $null
}

function Get-AplicarHostPs1 {
  $p = Join-Path $script:ScriptsDir 'Aplicar-Host.ps1'
  if (Test-Path -LiteralPath $p) { return $p }
  return $null
}

function Invoke-StepPastas {
  Set-StepUi 'pastas' 'running' 'Checando AcompSolemp, frontend e Supabase…'
  Set-PackConfigEnv
  $problems = @()
  if (-not (Test-Path -LiteralPath $script:AcompRoot)) { $problems += 'AcompSolemp nao encontrado' }
  if (-not (Test-Path -LiteralPath (Join-Path $script:AcompRoot 'frontend'))) { $problems += 'frontend nao encontrado' }
  if (-not $script:SupabaseDocker -or -not (Test-Path -LiteralPath $script:SupabaseDocker)) {
    $problems += 'supabase-master\docker nao encontrado'
  }
  if (-not $script:Instaladores -or -not (Test-Path -LiteralPath $script:Instaladores)) {
    $problems += 'pasta instaladores nao encontrada'
  }
  if ($problems.Count -gt 0) {
    Set-StepUi 'pastas' 'error' ($problems -join '; ')
    return $false
  }
  Set-StepUi 'pastas' 'ok' 'Pacote localizado'
  return $true
}

function Test-DockerDesktopInstalled {
  foreach ($c in @(
      (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
      (Join-Path ${env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe'),
      (Join-Path $env:LOCALAPPDATA 'Docker\Docker Desktop.exe')
    )) {
    if ($c -and (Test-Path -LiteralPath $c)) { return $true }
  }
  return $false
}

function Invoke-StepInstaller {
  param(
    [string]$Id,
    [string]$Pattern,
    [string]$Nome,
    [scriptblock]$AlreadyOk
  )
  if (& $AlreadyOk) {
    Set-StepUi $Id 'skip' 'Ja instalado / detectado'
    return $true
  }
  # Docker: instalado mas parado — nao reabre o setup; tenta iniciar o app.
  if ($Id -eq 'docker' -and (Test-DockerDesktopInstalled)) {
    Set-StepUi $Id 'running' 'Docker instalado. Abrindo Docker Desktop…'
    foreach ($c in @(
        (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path $env:LOCALAPPDATA 'Docker\Docker Desktop.exe')
      )) {
      if ($c -and (Test-Path -LiteralPath $c)) {
        try { Start-Process -FilePath $c | Out-Null } catch { }
        break
      }
    }
    for ($i = 0; $i -lt 36; $i++) {
      Start-Sleep -Seconds 5
      [Windows.Forms.Application]::DoEvents()
      if (Test-DockerApp) {
        Set-StepUi $Id 'ok' 'Docker Desktop pronto'
        return $true
      }
      Set-StepUi $Id 'running' ("Aguardando Docker ficar Ready… ({0}/36)" -f ($i + 1))
    }
    Set-StepUi $Id 'error' 'Docker instalado, mas nao ficou Ready a tempo. Abra o Docker e use Tentar de novo.'
    return $false
  }
  $setup = Get-Installer $Pattern
  if (-not $setup) {
    Set-StepUi $Id 'error' ("Instalador nao encontrado em:`n{0}" -f $script:Instaladores)
    return $false
  }
  Set-StepUi $Id 'running' ("Abrindo instalador: {0}`nConclua a janela e aguarde…" -f (Split-Path $setup -Leaf))
  try {
    Start-Process -FilePath $setup -Wait
  } catch {
    Set-StepUi $Id 'error' $_.Exception.Message
    return $false
  }
  if (& $AlreadyOk) {
    Set-StepUi $Id 'ok' 'Instalado'
    return $true
  }
  if ($Id -eq 'docker' -and (Test-DockerDesktopInstalled)) {
    Set-StepUi $Id 'ok' 'Instalador concluido (inicie o Docker se ainda nao estiver Ready)'
    return $true
  }
  Set-StepUi $Id 'error' ("Ainda nao detectado apos o instalador. Reinicie o PC se o {0} pediu, depois use Tentar de novo." -f $Nome)
  return $false
}

function Test-WslFeatureEnabled {
  try {
    $f = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -ErrorAction SilentlyContinue
    if ($f -and $f.State -eq 'Enabled') { return $true }
  } catch { }
  try {
    $out = & dism.exe /online /Get-FeatureInfo /FeatureName:Microsoft-Windows-Subsystem-Linux 2>$null | Out-String
    if ($out -match 'State\s*:\s*Enabled') { return $true }
  } catch { }
  return $false
}

function Invoke-StepWsl {
  if (Test-Wsl) {
    Set-StepUi 'wsl' 'skip' 'WSL ja detectado'
    return $true
  }

  Set-StepUi 'wsl' 'running' 'Ativando Windows Subsystem for Linux (Admin)…'
  # wsl_update_x64.msi SO funciona se o recurso WSL ja existir.
  # Por isso ativamos o recurso primeiro (nao abrir o MSI cedo demais).
  $enableScript = @'
$ErrorActionPreference = "Stop"
try {
  Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart -ErrorAction Stop | Out-Null
} catch {
  & dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) { throw "Falha ao ativar WSL (dism $LASTEXITCODE)" }
}
try {
  Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart -ErrorAction SilentlyContinue | Out-Null
} catch {
  & dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null
}
exit 0
'@
  $tmp = Join-Path $env:TEMP ("acomp-enable-wsl-{0}.ps1" -f [guid]::NewGuid().ToString('N'))
  Set-Content -LiteralPath $tmp -Value $enableScript -Encoding UTF8
  try {
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $tmp
    ) -Verb RunAs -Wait -PassThru
    if ($null -ne $p.ExitCode -and $p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
      Set-StepUi 'wsl' 'error' 'Nao foi possivel ativar o WSL. Aceite o UAC e use Windows Home/Pro com virtualizacao.'
      return $false
    }
  } catch {
    Set-StepUi 'wsl' 'error' ("Ativacao WSL: {0}" -f $_.Exception.Message)
    return $false
  } finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }

  # Agora sim o update do kernel (se o MSI existir)
  $setup = Get-Installer 'wsl_update*.msi'
  if ($setup -and (Test-WslFeatureEnabled -or (Test-Path 'C:\Windows\System32\wsl.exe'))) {
    Set-StepUi 'wsl' 'running' 'Aplicando atualizacao do kernel WSL…'
    try {
      Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', "`"$setup`"", '/passive', '/norestart') -Wait
    } catch {
      # Nao e fatal se o update recusar; o recurso ja pode estar ok apos reboot
      Set-StepUi 'wsl' 'running' ("Aviso update kernel: {0}" -f $_.Exception.Message)
    }
  }

  if (Test-Wsl) {
    Set-StepUi 'wsl' 'ok' 'WSL pronto'
    return $true
  }

  Set-StepUi 'wsl' 'error' 'WSL foi ativado, mas precisa REINICIAR o PC. Depois abra o assistente e use Tentar de novo nesta etapa.'
  return $false
}

function Invoke-StepNpm {
  $fe = Join-Path $script:AcompRoot 'frontend'
  $nm = Join-Path $fe 'node_modules'
  if (Test-Path -LiteralPath $nm) {
    Set-StepUi 'npm' 'skip' 'node_modules ja existe'
    return $true
  }
  if (-not (Test-NodeApp)) {
    Set-StepUi 'npm' 'error' 'Node.js necessario antes do npm install'
    return $false
  }
  if (-not (Test-Path -LiteralPath $fe)) {
    Set-StepUi 'npm' 'error' "Frontend nao encontrado: $fe"
    return $false
  }
  Set-StepUi 'npm' 'running' 'Executando npm install (pode demorar)…'
  try {
    $p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm install') -WorkingDirectory $fe -Wait -PassThru -WindowStyle Minimized
    if ($p.ExitCode -ne 0 -and -not (Test-Path -LiteralPath $nm)) {
      Set-StepUi 'npm' 'error' ("npm install falhou (codigo {0})" -f $p.ExitCode)
      return $false
    }
  } catch {
    Set-StepUi 'npm' 'error' $_.Exception.Message
    return $false
  }
  if (Test-Path -LiteralPath $nm) {
    Set-StepUi 'npm' 'ok' 'Dependencias instaladas'
    return $true
  }
  Set-StepUi 'npm' 'error' 'node_modules ainda ausente apos npm install'
  return $false
}

function Invoke-StepAlias {
  $raw = ''
  if ($script:txtAliasWizard) { $raw = [string]$script:txtAliasWizard.Text }
  $raw = $raw.Trim()
  if (-not $raw -or $raw.Length -lt 3) {
    Set-StepUi 'alias' 'error' 'Informe um endereco valido (ex.: sistema.acompomps.rede)'
    return $false
  }
  if (Get-Command Normalize-AliasInput -ErrorAction SilentlyContinue) {
    $alias = Normalize-AliasInput $raw
  } else {
    $alias = $raw.ToLowerInvariant().Trim().TrimEnd('.')
    $alias = $alias -replace '^\s*https?://', ''
    $alias = $alias.Split('/')[0].Split(':')[0]
  }
  if ($alias -notmatch '^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$') {
    Set-StepUi 'alias' 'error' 'Use apenas letras, numeros, ponto e hifen (sem http://)'
    return $false
  }
  Set-StepUi 'alias' 'running' "Aplicando alias $alias (config + hosts)…"
  Set-PackConfigEnv
  # Grava SERVER_ALIAS no config.env
  if (Get-Command Set-EnvKey -ErrorAction SilentlyContinue) {
    Set-EnvKey $script:ConfigEnv 'SERVER_ALIAS' $alias
  } else {
    $lines = @(Get-Content $script:ConfigEnv -Encoding UTF8)
    $found = $false
    $out = foreach ($line in $lines) {
      if ($line -match '^\s*SERVER_ALIAS=') { $found = $true; "SERVER_ALIAS=$alias" } else { $line }
    }
    if (-not $found) { $out += "SERVER_ALIAS=$alias" }
    Set-Content -Path $script:ConfigEnv -Value $out -Encoding UTF8
  }
  $aplicar = Get-AplicarHostPs1
  if (-not $aplicar) {
    Set-StepUi 'alias' 'error' 'Aplicar-Host.ps1 nao encontrado'
    return $false
  }
  try {
    & $aplicar -Alias $alias
  } catch {
    Set-StepUi 'alias' 'error' $_.Exception.Message
    return $false
  }
  # hosts pode exigir Admin — tenta elevacao se funcao existir
  if (Get-Command Set-AcompOmpsHostsAlias -ErrorAction SilentlyContinue) {
    $cfg = $null
    try { $cfg = Import-ServidorConfig } catch { }
    $ip = if ($cfg) { [string]$cfg.SERVER_HOST } else { '' }
    if ($ip -and -not (Test-AcompOmpsHostsAlias -Alias $alias -Ip $ip)) {
      Set-StepUi 'alias' 'running' 'hosts exige Admin — confirme o UAC…'
      $fix = Set-AcompOmpsHostsAlias -Ip $ip -Alias $alias -AllowElevate
      if (-not $fix.ok) {
        Set-StepUi 'alias' 'error' ("Alias gravado, mas hosts falhou: {0}" -f $fix.error)
        return $false
      }
    }
  }
  $script:CurrentAlias = $alias
  if ($script:txtAliasWizard) { $script:txtAliasWizard.Text = $alias }
  Set-StepUi 'alias' 'ok' "Endereco: $alias"
  return $true
}

function Invoke-StepRede {
  $cmd = Get-LiberarFirewallCmd
  if (-not $cmd) {
    Set-StepUi 'rede' 'error' 'Liberar-Firewall.cmd nao encontrado no pacote'
    return $false
  }
  if (Test-FirewallRedeReady) {
    Set-StepUi 'rede' 'skip' 'Firewall/HTTPS ja ok'
    return $true
  }
  Set-StepUi 'rede' 'running' 'Abrindo Liberar-Firewall (Admin). Conclua a janela…'
  try {
    Start-Process -FilePath $cmd -Verb RunAs -Wait
  } catch {
    Set-StepUi 'rede' 'error' $_.Exception.Message
    return $false
  }
  if (Test-FirewallRedeReady -or (Test-HostsAliasReady)) {
    Set-StepUi 'rede' 'ok' 'Rede preparada'
    return $true
  }
  Set-StepUi 'rede' 'error' 'Ainda incompleto apos Liberar-Firewall. Rode de novo ou verifique Admin.'
  return $false
}

function Test-LocalAppReady {
  try {
    $code = & curl.exe -sk -o NUL -w '%{http_code}' --max-time 3 'http://127.0.0.1:5173/login' 2>$null
    return ("$code" -match '^(200|301|302|304)$')
  } catch { return $false }
}

function Get-LastLogSnippet([string]$Path, [int]$Lines = 8) {
  try {
    if (-not (Test-Path -LiteralPath $Path)) { return '' }
    $tail = Get-Content -LiteralPath $Path -Tail $Lines -ErrorAction SilentlyContinue
    if (-not $tail) { return '' }
    $txt = ($tail -join ' | ') -replace '\s+', ' '
    if ($txt.Length -gt 280) { $txt = $txt.Substring($txt.Length - 280) }
    return $txt
  } catch { return '' }
}

function Invoke-StepServidor {
  if (-not (Test-DockerApp)) {
    Set-StepUi 'servidor' 'error' 'Docker Desktop precisa estar em execucao (Ready)'
    return $false
  }

  # Se o app local ja responde, nao precisa subir de novo.
  if (Test-LocalAppReady) {
    Set-StepUi 'servidor' 'skip' 'Servidor ja responde em http://127.0.0.1:5173'
    return $true
  }

  $iniciar = Join-Path $script:ScriptsDir 'Iniciar-Servidor.ps1'
  $gateway = Join-Path $script:ScriptsDir 'Iniciar-Gateway.ps1'
  if (-not (Test-Path -LiteralPath $iniciar)) {
    Set-StepUi 'servidor' 'error' "Iniciar-Servidor.ps1 nao encontrado: $iniciar"
    return $false
  }

  $logDir = Join-Path (Split-Path $script:ScriptsDir -Parent) 'logs'
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $stepLog = Join-Path $logDir 'assistente-passo-servidor.log'
  Set-Content -LiteralPath $stepLog -Value ("[{0}] inicio" -f (Get-Date -Format 'o')) -Encoding UTF8

  Set-StepUi 'servidor' 'running' 'Subindo Supabase + app (Iniciar-Servidor.ps1)…'
  try {
    $p1 = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', $iniciar
    ) -Wait -PassThru -WindowStyle Minimized -RedirectStandardOutput $stepLog -RedirectStandardError (Join-Path $logDir 'assistente-passo-servidor.err.log')
    if ($null -ne $p1.ExitCode -and $p1.ExitCode -ne 0 -and -not (Test-LocalAppReady)) {
      $snip = Get-LastLogSnippet $stepLog
      if (-not $snip) { $snip = Get-LastLogSnippet (Join-Path $logDir 'assistente-passo-servidor.err.log') }
      Set-StepUi 'servidor' 'error' ("Iniciar-Servidor codigo {0}. {1}" -f $p1.ExitCode, $snip)
      return $false
    }
  } catch {
    Set-StepUi 'servidor' 'error' $_.Exception.Message
    return $false
  }

  if (Test-Path -LiteralPath $gateway) {
    Set-StepUi 'servidor' 'running' 'Subindo gateway HTTPS…'
    try {
      $gwOut = Join-Path $logDir 'assistente-passo-gateway.log'
      $p2 = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass',
        '-File', $gateway
      ) -Wait -PassThru -WindowStyle Minimized -RedirectStandardOutput $gwOut -RedirectStandardError (Join-Path $logDir 'assistente-passo-gateway.err.log')
      if ($null -ne $p2.ExitCode -and $p2.ExitCode -ne 0) {
        # Gateway pode falhar se ja estiver no ar; so falha se o app local tambem nao subiu.
        if (-not (Test-LocalAppReady)) {
          Set-StepUi 'servidor' 'error' ("Gateway codigo {0}. {1}" -f $p2.ExitCode, (Get-LastLogSnippet $gwOut))
          return $false
        }
      }
    } catch {
      if (-not (Test-LocalAppReady)) {
        Set-StepUi 'servidor' 'error' $_.Exception.Message
        return $false
      }
    }
  }

  if (Test-LocalAppReady) {
    Set-StepUi 'servidor' 'ok' 'Servidor no ar (Vite/app local OK)'
    return $true
  }
  Set-StepUi 'servidor' 'error' ('App local nao respondeu em :5173. Veja logs em {0}' -f $logDir)
  return $false
}

function Invoke-StepDashboard {
  $ps1 = Get-AbrirDashboardPs1
  if (-not $ps1) {
    Set-StepUi 'dashboard' 'error' 'Abrir-Dashboard.ps1 nao encontrado'
    return $false
  }
  Set-StepUi 'dashboard' 'running' 'Abrindo Dashboard…'
  try {
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $ps1
    ) -WindowStyle Minimized
  } catch {
    Set-StepUi 'dashboard' 'error' $_.Exception.Message
    return $false
  }
  $alias = Get-OmpsServerAlias
  Set-StepUi 'dashboard' 'ok' ("Dashboard aberto. Acesso: https://{0}/" -f $alias)
  return $true
}

function Invoke-WizardStep([int]$Index) {
  $step = $script:WizardSteps[$Index]
  switch ($step.id) {
    'pastas' { return Invoke-StepPastas }
    'vcredist' { return Invoke-StepInstaller -Id 'vcredist' -Pattern 'vc_redist*.exe' -Nome 'Visual C++' -AlreadyOk { Test-VcRedist } }
    'wsl' { return Invoke-StepWsl }
    'docker' { return Invoke-StepInstaller -Id 'docker' -Pattern 'Docker*Installer*.exe' -Nome 'Docker Desktop' -AlreadyOk { Test-DockerApp } }
    'node' { return Invoke-StepInstaller -Id 'node' -Pattern 'node-*.msi' -Nome 'Node.js' -AlreadyOk { Test-NodeApp } }
    'npm' { return Invoke-StepNpm }
    'alias' { return Invoke-StepAlias }
    'rede' { return Invoke-StepRede }
    'servidor' { return Invoke-StepServidor }
    'dashboard' { return Invoke-StepDashboard }
    default {
      Set-StepUi $step.id 'error' 'Etapa desconhecida'
      return $false
    }
  }
}

function Show-AssistenteInstalacaoServidor {
  $themeLoaded = Get-Command New-DashPanel -ErrorAction SilentlyContinue
  $formW = 860
  $formH = 720
  $totalSteps = $script:WizardSteps.Count

  $form = New-Object Windows.Forms.Form
  $form.Text = 'Instalacao do Servidor'
  $form.StartPosition = 'CenterScreen'
  $form.FormBorderStyle = 'Sizable'
  $form.MaximizeBox = $true
  $form.MinimizeBox = $true
  $form.MinimumSize = New-Object Drawing.Size(760, 620)
  $form.ClientSize = New-Object Drawing.Size($formW, $formH)
  $form.Font = New-Object Drawing.Font('Segoe UI', 9.5)
  if ($script:IconPath -and (Test-Path -LiteralPath $script:IconPath)) {
    try { $form.Icon = New-Object Drawing.Icon $script:IconPath } catch { }
  }

  # --- Topo ---
  $top = New-Object Windows.Forms.Panel
  $top.Dock = 'Top'
  $top.Height = 88
  $form.Controls.Add($top)

  $header = New-Object Windows.Forms.Label
  $header.Text = 'Instalacao do Servidor'
  $header.Font = New-Object Drawing.Font('Segoe UI', 14, [Drawing.FontStyle]::Bold)
  $header.Location = New-Object Drawing.Point(16, 12)
  $header.Size = New-Object Drawing.Size(520, 28)
  $header.Anchor = 'Top,Left,Right'
  $top.Controls.Add($header)

  $script:lblProgress = New-Object Windows.Forms.Label
  $script:lblProgress.Text = ("Etapa 0 / {0}" -f $totalSteps)
  $script:lblProgress.Location = New-Object Drawing.Point(540, 14)
  $script:lblProgress.Size = New-Object Drawing.Size(300, 24)
  $script:lblProgress.TextAlign = 'MiddleRight'
  $script:lblProgress.Anchor = 'Top,Right'
  $top.Controls.Add($script:lblProgress)

  $script:lblHint = New-Object Windows.Forms.Label
  $script:lblHint.Text = 'Maximize a janela para ler a coluna Detalhe. Clique numa linha para ver o texto completo abaixo. Fluxo: programas, rede, firewall/HTTPS, servidor e Dashboard.'
  $script:lblHint.Location = New-Object Drawing.Point(16, 44)
  $script:lblHint.Size = New-Object Drawing.Size(820, 36)
  $script:lblHint.Anchor = 'Top,Left,Right'
  $script:lblHint.ForeColor = [Drawing.Color]::FromArgb(90, 100, 95)
  $top.Controls.Add($script:lblHint)

  # --- Rodape (detalhe completo + alias + status + % + botoes) ---
  $bottom = New-Object Windows.Forms.Panel
  $bottom.Dock = 'Bottom'
  $bottom.Height = 268
  $form.Controls.Add($bottom)

  $detailCaption = New-Object Windows.Forms.Label
  $detailCaption.Text = 'Detalhe completo (selecione a linha na tabela):'
  $detailCaption.Location = New-Object Drawing.Point(16, 8)
  $detailCaption.Size = New-Object Drawing.Size(500, 18)
  $bottom.Controls.Add($detailCaption)

  $script:txtDetailFull = New-Object Windows.Forms.TextBox
  $script:txtDetailFull.Multiline = $true
  $script:txtDetailFull.ReadOnly = $true
  $script:txtDetailFull.ScrollBars = 'Vertical'
  $script:txtDetailFull.WordWrap = $true
  $script:txtDetailFull.Location = New-Object Drawing.Point(16, 28)
  $script:txtDetailFull.Size = New-Object Drawing.Size(820, 64)
  $script:txtDetailFull.Anchor = 'Top,Left,Right'
  $script:txtDetailFull.BackColor = [Drawing.Color]::FromArgb(250, 250, 248)
  $bottom.Controls.Add($script:txtDetailFull)

  $aliasLbl = New-Object Windows.Forms.Label
  $aliasLbl.Text = 'Endereco na rede (sem http:// e sem porta):'
  $aliasLbl.Location = New-Object Drawing.Point(16, 98)
  $aliasLbl.Size = New-Object Drawing.Size(400, 18)
  $bottom.Controls.Add($aliasLbl)

  $script:txtAliasWizard = New-Object Windows.Forms.TextBox
  $script:txtAliasWizard.Text = $script:CurrentAlias
  $script:txtAliasWizard.Location = New-Object Drawing.Point(16, 118)
  $script:txtAliasWizard.Size = New-Object Drawing.Size(820, 26)
  $script:txtAliasWizard.Anchor = 'Top,Left,Right'
  $bottom.Controls.Add($script:txtAliasWizard)

  $script:lblStatus = New-Object Windows.Forms.Label
  $script:lblStatus.Text = 'Pronto para iniciar. Clique em Continuar.'
  $script:lblStatus.Location = New-Object Drawing.Point(16, 150)
  $script:lblStatus.Size = New-Object Drawing.Size(820, 36)
  $script:lblStatus.Anchor = 'Top,Left,Right'
  $script:lblStatus.ForeColor = [Drawing.Color]::FromArgb(60, 70, 65)
  $bottom.Controls.Add($script:lblStatus)

  $script:lblPct = New-Object Windows.Forms.Label
  $script:lblPct.Text = '0%'
  $script:lblPct.Location = New-Object Drawing.Point(16, 190)
  $script:lblPct.Size = New-Object Drawing.Size(72, 22)
  $script:lblPct.TextAlign = 'MiddleLeft'
  $script:lblPct.Font = New-Object Drawing.Font('Segoe UI', 10, [Drawing.FontStyle]::Bold)
  $bottom.Controls.Add($script:lblPct)

  $script:barProgress = New-Object Windows.Forms.ProgressBar
  $script:barProgress.Location = New-Object Drawing.Point(92, 190)
  $script:barProgress.Size = New-Object Drawing.Size(744, 22)
  $script:barProgress.Anchor = 'Top,Left,Right'
  $script:barProgress.Minimum = 0
  $script:barProgress.Maximum = 100
  $script:barProgress.Value = 0
  $script:barProgress.Style = 'Continuous'
  $bottom.Controls.Add($script:barProgress)

  $btnRetry = New-Object Windows.Forms.Button
  $btnRetry.Text = 'Tentar de novo'
  $btnRetry.Location = New-Object Drawing.Point(360, 224)
  $btnRetry.Size = New-Object Drawing.Size(140, 36)
  $btnRetry.Anchor = 'Top,Right'
  $btnRetry.Enabled = $false
  $bottom.Controls.Add($btnRetry)

  $btnStart = New-Object Windows.Forms.Button
  $btnStart.Text = 'Continuar'
  $btnStart.Location = New-Object Drawing.Point(510, 224)
  $btnStart.Size = New-Object Drawing.Size(160, 36)
  $btnStart.Anchor = 'Top,Right'
  $bottom.Controls.Add($btnStart)

  $btnClose = New-Object Windows.Forms.Button
  $btnClose.Text = 'Fechar'
  $btnClose.Location = New-Object Drawing.Point(680, 224)
  $btnClose.Size = New-Object Drawing.Size(156, 36)
  $btnClose.Anchor = 'Top,Right'
  $btnClose.Add_Click({ $form.Close() })
  $bottom.Controls.Add($btnClose)

  # --- Tabela (preenche o restante; maximizar amplia Detalhe) ---
  $list = New-Object Windows.Forms.ListView
  $list.View = 'Details'
  $list.FullRowSelect = $true
  $list.GridLines = $true
  $list.HideSelection = $false
  $list.Dock = 'Fill'
  $list.Columns.Add('Etapa', 70) | Out-Null
  $list.Columns.Add('Descricao', 260) | Out-Null
  $list.Columns.Add('Status', 100) | Out-Null
  $list.Columns.Add('Detalhe', 400) | Out-Null
  # Ordem de Dock: Fill primeiro; Top/Bottom ja adicionados ficam nas bordas
  $form.Controls.Add($list)
  $form.Controls.SetChildIndex($list, 0)

  $tip = New-Object Windows.Forms.ToolTip
  $tip.AutoPopDelay = 20000
  $tip.InitialDelay = 400
  $tip.ReshowDelay = 200
  $tip.ShowAlways = $true

  $i = 1
  foreach ($s in $script:WizardSteps) {
    $item = New-Object Windows.Forms.ListViewItem ("{0}/{1}" -f $i, $totalSteps)
    [void]$item.SubItems.Add($s.title)
    [void]$item.SubItems.Add('Pendente')
    [void]$item.SubItems.Add('')
    $item.Tag = $s.id
    [void]$list.Items.Add($item)
    $i++
  }

  function Update-DetailPane {
    $idx = -1
    if ($list.SelectedIndices.Count -gt 0) {
      $idx = [int]$list.SelectedIndices[0]
    } elseif ($script:WizardIndex -ge 0 -and $script:WizardIndex -lt $script:WizardSteps.Count) {
      $idx = $script:WizardIndex
    }
    if ($idx -lt 0) {
      $script:txtDetailFull.Text = ''
      return
    }
    $id = $script:WizardSteps[$idx].id
    $st = $script:StepState[$id]
    $title = $script:WizardSteps[$idx].title
    $detail = [string]$st.detail
    if ([string]::IsNullOrWhiteSpace($detail)) {
      $script:txtDetailFull.Text = ("{0}`r`n(sem detalhe)" -f $title)
    } else {
      $script:txtDetailFull.Text = ("{0}`r`n{1}" -f $title, $detail)
    }
  }

  function Update-PercentBar {
    $done = 0
    $running = $false
    foreach ($s in $script:WizardSteps) {
      $st = $script:StepState[$s.id].status
      if ($st -eq 'ok' -or $st -eq 'skip' -or $st -eq 'error') { $done++ }
      elseif ($st -eq 'running') { $running = $true }
    }
    $frac = [double]$done
    if ($running) { $frac += 0.5 }
    if ($done -ge $totalSteps) { $frac = [double]$totalSteps }
    $pct = [int][Math]::Round(100.0 * $frac / [Math]::Max(1, $totalSteps))
    if ($pct -lt 0) { $pct = 0 }
    if ($pct -gt 100) { $pct = 100 }
    $script:barProgress.Value = $pct
    $cur = [Math]::Min($script:WizardIndex + 1, $totalSteps)
    if ($done -ge $totalSteps) {
      $script:lblPct.Text = '100%'
      $script:lblProgress.Text = ("Concluido {0}/{1}" -f $totalSteps, $totalSteps)
    } else {
      $script:lblPct.Text = ("{0}%" -f $pct)
      $script:lblProgress.Text = ("Etapa {0}/{1}  ·  {2}%" -f $cur, $totalSteps, $pct)
    }
  }

  function Fit-DetailColumn {
    $fixed = 70 + 260 + 100 + 40
    $w = $list.ClientSize.Width - $fixed
    if ($w -lt 180) { $w = 180 }
    $list.Columns[3].Width = $w
  }

  $script:RefreshSteps = {
    for ($idx = 0; $idx -lt $script:WizardSteps.Count; $idx++) {
      $id = $script:WizardSteps[$idx].id
      $st = $script:StepState[$id]
      $item = $list.Items[$idx]
      $label = switch ($st.status) {
        'pending' { 'Pendente' }
        'running' { 'Em andamento' }
        'ok' { 'OK' }
        'skip' { 'Ja ok' }
        'error' { 'Erro' }
        default { $st.status }
      }
      $item.SubItems[2].Text = $label
      $item.SubItems[3].Text = [string]$st.detail
      if ($st.status -eq 'error') {
        $item.BackColor = [Drawing.Color]::FromArgb(255, 235, 235)
      } elseif ($st.status -eq 'running') {
        $item.BackColor = [Drawing.Color]::FromArgb(235, 245, 255)
      } elseif ($st.status -eq 'ok' -or $st.status -eq 'skip') {
        $item.BackColor = [Drawing.Color]::FromArgb(235, 250, 240)
      } else {
        $item.BackColor = [Drawing.Color]::White
      }
    }
    Update-PercentBar
    # Destaca a etapa atual e atualiza o painel de detalhe
    if ($script:WizardIndex -ge 0 -and $script:WizardIndex -lt $list.Items.Count) {
      if ($list.SelectedIndices.Count -eq 0 -or $list.SelectedIndices[0] -ne $script:WizardIndex) {
        $list.Items[$script:WizardIndex].Selected = $true
        $list.EnsureVisible($script:WizardIndex)
      }
    }
    Update-DetailPane
    [Windows.Forms.Application]::DoEvents()
  }

  $list.Add_SelectedIndexChanged({ Update-DetailPane })
  $list.Add_DoubleClick({
      if ($list.SelectedIndices.Count -lt 1) { return }
      $idx = [int]$list.SelectedIndices[0]
      $id = $script:WizardSteps[$idx].id
      $detail = [string]$script:StepState[$id].detail
      if ([string]::IsNullOrWhiteSpace($detail)) { $detail = '(sem detalhe)' }
      [Windows.Forms.MessageBox]::Show(
        $detail,
        ("Detalhe — {0}" -f $script:WizardSteps[$idx].title),
        [Windows.Forms.MessageBoxButtons]::OK,
        [Windows.Forms.MessageBoxIcon]::Information
      ) | Out-Null
    })
  $form.Add_Resize({ Fit-DetailColumn })
  $form.Add_Shown({ Fit-DetailColumn; Update-PercentBar })

  function Update-Buttons([string]$Mode) {
    # Mode: idle | busy | error | done
    switch ($Mode) {
      'busy' {
        $btnStart.Enabled = $false
        $btnRetry.Enabled = $false
        $script:txtAliasWizard.Enabled = $false
        $btnStart.Text = 'Continuar'
      }
      'error' {
        # Continuar fica ativo para pular a etapa com erro e seguir o maximo possivel
        $btnStart.Enabled = $true
        $btnRetry.Enabled = $true
        $script:txtAliasWizard.Enabled = ($script:WizardSteps[$script:WizardIndex].id -eq 'alias')
        if ($script:WizardIndex -lt ($script:WizardSteps.Count - 1)) {
          $btnStart.Text = 'Continuar mesmo assim'
        } else {
          $btnStart.Text = 'Finalizar mesmo assim'
        }
      }
      'done' {
        $btnStart.Enabled = $false
        $btnRetry.Enabled = $false
        $script:txtAliasWizard.Enabled = $false
        $btnStart.Text = 'Concluido'
      }
      default {
        $btnStart.Enabled = $true
        $btnRetry.Enabled = $false
        $script:txtAliasWizard.Enabled = $true
        $btnStart.Text = 'Continuar'
      }
    }
  }

  function Complete-WizardUi {
    $nErr = @($script:WizardSteps | Where-Object { $script:StepState[$_.id].status -eq 'error' }).Count
    if ($nErr -gt 0) {
      $script:lblStatus.Text = ("Fluxo encerrado com {0} etapa(s) com erro. O restante foi aplicado. Alias: https://{1}/" -f $nErr, (Get-OmpsServerAlias))
      $script:lblStatus.ForeColor = [Drawing.Color]::DarkOrange
    } else {
      $script:lblStatus.Text = 'Fluxo concluido. Use https://' + (Get-OmpsServerAlias) + '/ nos PCs da rede (DNS seguro do Chrome desligado).'
      $script:lblStatus.ForeColor = [Drawing.Color]::DarkGreen
    }
    & $script:RefreshSteps
    Update-PercentBar
    Update-Buttons 'done'
  }

  function Start-WizardFromCurrent {
    if ($script:WizardBusy) { return }
    $script:WizardBusy = $true
    Update-Buttons 'busy'
    try {
      while ($script:WizardIndex -lt $script:WizardSteps.Count) {
        $step = $script:WizardSteps[$script:WizardIndex]
        $script:lblStatus.Text = ("Executando {0}/{1}: {2}" -f ($script:WizardIndex + 1), $script:WizardSteps.Count, $step.title)
        $script:lblStatus.ForeColor = [Drawing.Color]::FromArgb(60, 70, 65)
        & $script:RefreshSteps
        $ok = Invoke-WizardStep -Index $script:WizardIndex
        & $script:RefreshSteps
        if (-not $ok) {
          $script:lblStatus.Text = ("Erro na etapa {0}/{1}. Use Tentar de novo ou Continuar mesmo assim para pular e seguir." -f ($script:WizardIndex + 1), $script:WizardSteps.Count)
          $script:lblStatus.ForeColor = [Drawing.Color]::DarkRed
          Update-Buttons 'error'
          return
        }
        $script:WizardIndex++
      }
      Complete-WizardUi
    } finally {
      $script:WizardBusy = $false
    }
  }

  $btnStart.Add_Click({
      if ($script:WizardBusy) { return }
      # Apos erro: Continuar avanca sem reexecutar a etapa falha
      if ($script:WizardIndex -lt $script:WizardSteps.Count) {
        $curId = $script:WizardSteps[$script:WizardIndex].id
        if ($script:StepState[$curId].status -eq 'error') {
          $detail = [string]$script:StepState[$curId].detail
          if ($detail -and $detail -notmatch '(?i)pulad') {
            Set-StepUi $curId 'error' ("(pulada) {0}" -f $detail)
          }
          $script:WizardIndex++
          & $script:RefreshSteps
          if ($script:WizardIndex -ge $script:WizardSteps.Count) {
            Complete-WizardUi
            return
          }
        }
      }
      Start-WizardFromCurrent
    })
  $btnRetry.Add_Click({
      if ($script:WizardBusy) { return }
      $id = $script:WizardSteps[$script:WizardIndex].id
      Set-StepUi $id 'pending' ''
      Start-WizardFromCurrent
    })

  & $script:RefreshSteps
  [void]$form.ShowDialog()
}

Show-AssistenteInstalacaoServidor
