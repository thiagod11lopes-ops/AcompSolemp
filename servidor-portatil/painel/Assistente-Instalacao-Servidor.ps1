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

function Invoke-StepServidor {
  $ps1 = Get-AbrirTudoPs1
  if (-not $ps1) {
    Set-StepUi 'servidor' 'error' 'Abrir-Tudo.ps1 nao encontrado'
    return $false
  }
  if (-not (Test-DockerApp)) {
    Set-StepUi 'servidor' 'error' 'Docker Desktop precisa estar em execucao (Ready)'
    return $false
  }
  Set-StepUi 'servidor' 'running' 'Subindo Docker/stack/gateway (Abrir-Tudo -Silent). Aguarde…'
  try {
    # -Silent / -SkipInstallPanel: evita painel duplicado (ja estamos no assistente)
    $arg = @(
      '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass',
      '-File', $ps1,
      '-Silent', '-SkipInstallPanel'
    )
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList $arg -Wait -PassThru -WindowStyle Minimized
    if ($null -ne $p.ExitCode -and $p.ExitCode -ne 0) {
      Set-StepUi 'servidor' 'error' ("Abrir-Tudo encerrou com codigo {0}" -f $p.ExitCode)
      return $false
    }
  } catch {
    Set-StepUi 'servidor' 'error' $_.Exception.Message
    return $false
  }
  Set-StepUi 'servidor' 'ok' 'Servidor iniciado'
  return $true
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
    'wsl' { return Invoke-StepInstaller -Id 'wsl' -Pattern 'wsl_update*.msi' -Nome 'WSL' -AlreadyOk { Test-Wsl } }
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
  $formW = 720
  $formH = 640

  $form = New-Object Windows.Forms.Form
  $form.Text = 'Instalacao do Servidor'
  $form.StartPosition = 'CenterScreen'
  $form.FormBorderStyle = 'FixedDialog'
  $form.MaximizeBox = $false
  $form.MinimizeBox = $true
  $form.ClientSize = New-Object Drawing.Size($formW, $formH)
  $form.Font = New-Object Drawing.Font('Segoe UI', 9.5)
  if ($script:IconPath -and (Test-Path -LiteralPath $script:IconPath)) {
    try { $form.Icon = New-Object Drawing.Icon $script:IconPath } catch { }
  }

  $header = New-Object Windows.Forms.Label
  $header.Text = 'Instalacao do Servidor'
  $header.Font = New-Object Drawing.Font('Segoe UI', 14, [Drawing.FontStyle]::Bold)
  $header.Location = New-Object Drawing.Point(20, 16)
  $header.Size = New-Object Drawing.Size(500, 28)
  $form.Controls.Add($header)

  $script:lblProgress = New-Object Windows.Forms.Label
  $script:lblProgress.Text = 'Etapa 0 / 10'
  $script:lblProgress.Location = New-Object Drawing.Point(520, 20)
  $script:lblProgress.Size = New-Object Drawing.Size(180, 24)
  $script:lblProgress.TextAlign = 'MiddleRight'
  $form.Controls.Add($script:lblProgress)

  $script:lblHint = New-Object Windows.Forms.Label
  $script:lblHint.Text = 'Fluxo unico: programas, endereco na rede, firewall/HTTPS, subir servidor e Dashboard.'
  $script:lblHint.Location = New-Object Drawing.Point(20, 48)
  $script:lblHint.Size = New-Object Drawing.Size(680, 36)
  $script:lblHint.ForeColor = [Drawing.Color]::FromArgb(90, 100, 95)
  $form.Controls.Add($script:lblHint)

  $list = New-Object Windows.Forms.ListView
  $list.View = 'Details'
  $list.FullRowSelect = $true
  $list.GridLines = $true
  $list.Location = New-Object Drawing.Point(20, 92)
  $list.Size = New-Object Drawing.Size(680, 320)
  $list.Columns.Add('Etapa', 70) | Out-Null
  $list.Columns.Add('Descricao', 280) | Out-Null
  $list.Columns.Add('Status', 90) | Out-Null
  $list.Columns.Add('Detalhe', 220) | Out-Null
  $form.Controls.Add($list)

  $i = 1
  foreach ($s in $script:WizardSteps) {
    $item = New-Object Windows.Forms.ListViewItem ("{0}/{1}" -f $i, $script:WizardSteps.Count)
    [void]$item.SubItems.Add($s.title)
    [void]$item.SubItems.Add('Pendente')
    [void]$item.SubItems.Add('')
    $item.Tag = $s.id
    [void]$list.Items.Add($item)
    $i++
  }

  $script:RefreshSteps = {
    $nOk = 0
    for ($idx = 0; $idx -lt $script:WizardSteps.Count; $idx++) {
      $id = $script:WizardSteps[$idx].id
      $st = $script:StepState[$id]
      $item = $list.Items[$idx]
      $label = switch ($st.status) {
        'pending' { 'Pendente' }
        'running' { 'Em andamento' }
        'ok' { 'OK'; $nOk++ }
        'skip' { 'Ja ok'; $nOk++ }
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
    $script:lblProgress.Text = ("Etapa {0} / {1}" -f ([Math]::Min($script:WizardIndex + 1, $script:WizardSteps.Count)), $script:WizardSteps.Count)
  }

  $aliasLbl = New-Object Windows.Forms.Label
  $aliasLbl.Text = 'Endereco na rede (sem http:// e sem porta):'
  $aliasLbl.Location = New-Object Drawing.Point(20, 424)
  $aliasLbl.Size = New-Object Drawing.Size(400, 20)
  $form.Controls.Add($aliasLbl)

  $script:txtAliasWizard = New-Object Windows.Forms.TextBox
  $script:txtAliasWizard.Text = $script:CurrentAlias
  $script:txtAliasWizard.Location = New-Object Drawing.Point(20, 448)
  $script:txtAliasWizard.Size = New-Object Drawing.Size(680, 28)
  $form.Controls.Add($script:txtAliasWizard)

  $script:lblStatus = New-Object Windows.Forms.Label
  $script:lblStatus.Text = 'Pronto para iniciar. Clique em Continuar.'
  $script:lblStatus.Location = New-Object Drawing.Point(20, 488)
  $script:lblStatus.Size = New-Object Drawing.Size(680, 40)
  $script:lblStatus.ForeColor = [Drawing.Color]::FromArgb(60, 70, 65)
  $form.Controls.Add($script:lblStatus)

  $btnStart = New-Object Windows.Forms.Button
  $btnStart.Text = 'Continuar'
  $btnStart.Location = New-Object Drawing.Point(400, 545)
  $btnStart.Size = New-Object Drawing.Size(140, 36)
  $form.Controls.Add($btnStart)

  $btnRetry = New-Object Windows.Forms.Button
  $btnRetry.Text = 'Tentar de novo'
  $btnRetry.Location = New-Object Drawing.Point(250, 545)
  $btnRetry.Size = New-Object Drawing.Size(140, 36)
  $btnRetry.Enabled = $false
  $form.Controls.Add($btnRetry)

  $btnClose = New-Object Windows.Forms.Button
  $btnClose.Text = 'Fechar'
  $btnClose.Location = New-Object Drawing.Point(550, 545)
  $btnClose.Size = New-Object Drawing.Size(150, 36)
  $btnClose.Add_Click({ $form.Close() })
  $form.Controls.Add($btnClose)

  function Update-Buttons([string]$Mode) {
    # Mode: idle | busy | error | done
    switch ($Mode) {
      'busy' {
        $btnStart.Enabled = $false
        $btnRetry.Enabled = $false
        $script:txtAliasWizard.Enabled = $false
      }
      'error' {
        $btnStart.Enabled = $false
        $btnRetry.Enabled = $true
        $script:txtAliasWizard.Enabled = ($script:WizardSteps[$script:WizardIndex].id -eq 'alias')
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
      }
    }
  }

  function Start-WizardFromCurrent {
    if ($script:WizardBusy) { return }
    $script:WizardBusy = $true
    Update-Buttons 'busy'
    try {
      while ($script:WizardIndex -lt $script:WizardSteps.Count) {
        $step = $script:WizardSteps[$script:WizardIndex]
        $script:lblStatus.Text = ("Executando {0}/{1}: {2}" -f ($script:WizardIndex + 1), $script:WizardSteps.Count, $step.title)
        & $script:RefreshSteps
        $ok = Invoke-WizardStep -Index $script:WizardIndex
        & $script:RefreshSteps
        if (-not $ok) {
          $script:lblStatus.Text = ("Erro na etapa {0}/{1}. Corrija e use Tentar de novo." -f ($script:WizardIndex + 1), $script:WizardSteps.Count)
          $script:lblStatus.ForeColor = [Drawing.Color]::DarkRed
          Update-Buttons 'error'
          return
        }
        $script:WizardIndex++
      }
      $script:lblStatus.Text = 'Fluxo concluido. Use https://' + (Get-OmpsServerAlias) + '/ nos PCs da rede (DNS seguro do Chrome desligado).'
      $script:lblStatus.ForeColor = [Drawing.Color]::DarkGreen
      Update-Buttons 'done'
    } finally {
      $script:WizardBusy = $false
    }
  }

  $btnStart.Add_Click({ Start-WizardFromCurrent })
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
