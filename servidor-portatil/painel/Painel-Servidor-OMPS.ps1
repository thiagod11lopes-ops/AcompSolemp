# Painel de instalacao e configuracao - Servidor OMPS
# Uso standalone: Servidor OMPS.vbs
# Uso embutido:   . .\Painel-Servidor-OMPS.ps1; Show-ServidorOmpsInstallPanel -PreStart

param(
  [switch]$PreStart
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Import-DashThemeForPanel {
  $candidates = @(
    (Join-Path $PSScriptRoot '..\scripts\Ui-Theme-Dashboard.ps1'),
    (Join-Path $PSScriptRoot '..\AcompSolemp\servidor-portatil\scripts\Ui-Theme-Dashboard.ps1')
  )
  # Pack: painel pode estar em Iniciar Servidor\painel ou em servidor-portatil\painel
  if ($script:ScriptsDir) {
    $candidates = @((Join-Path $script:ScriptsDir 'Ui-Theme-Dashboard.ps1')) + $candidates
  }
  foreach ($p in $candidates) {
    $full = $p
    try { if (Test-Path $p) { $full = (Resolve-Path -LiteralPath $p).Path } } catch { }
    if ($full -and (Test-Path -LiteralPath $full)) {
      . $full
      return $true
    }
  }
  return $false
}

function Initialize-OmpsPanelPaths {
  $here = $PSScriptRoot
  $parent = Split-Path $here -Parent

  if (Test-Path (Join-Path $parent 'AcompSolemp\servidor-portatil')) {
    # Pacote "Iniciar Servidor" na Area de Trabalho
    $script:PackRoot = $parent
    $script:AcompRoot = Join-Path $parent 'AcompSolemp'
    $script:ScriptsDir = Join-Path $script:AcompRoot 'servidor-portatil\scripts'
    $script:SupabaseDocker = Join-Path $parent 'supabase-master\docker'
    $script:Instaladores = Join-Path $parent 'instaladores'
    $script:ConfigEnv = Join-Path $script:AcompRoot 'servidor-portatil\config.env'
    $script:IconPath = Join-Path $parent 'icons\opms.ico'
    $script:StartVbs = Join-Path $parent 'Iniciar-Servidor-OMPS.vbs'
    return
  }

  if (Test-Path (Join-Path $parent 'scripts\Abrir-Tudo.ps1')) {
    # servidor-portatil\painel (projeto normal)
    $script:PackRoot = $parent
    $script:AcompRoot = Split-Path $parent -Parent
    $script:ScriptsDir = Join-Path $parent 'scripts'
    $script:ConfigEnv = Join-Path $parent 'config.env'
    $script:IconPath = Join-Path $parent 'icons\opms.ico'
    $script:StartVbs = Join-Path $parent 'Iniciar Servidor OMPS.vbs'
    $script:Instaladores = $null
    foreach ($c in @(
        (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Iniciar Servidor\instaladores'),
        (Join-Path $parent 'instaladores')
      )) {
      if (Test-Path $c) { $script:Instaladores = $c; break }
    }
    if (-not $script:Instaladores) {
      $script:Instaladores = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Iniciar Servidor\instaladores'
    }
    $script:SupabaseDocker = $null
    if (Test-Path $script:ConfigEnv) {
      $line = Get-Content $script:ConfigEnv -Encoding UTF8 | Where-Object { $_ -match '^\s*SUPABASE_DOCKER_DIR=' } | Select-Object -First 1
      if ($line) { $script:SupabaseDocker = ($line -replace '^\s*SUPABASE_DOCKER_DIR=', '').Trim() }
    }
    if (-not $script:SupabaseDocker) {
      $guess = Join-Path (Split-Path $script:AcompRoot -Parent) 'supabase-master\docker'
      if (Test-Path $guess) { $script:SupabaseDocker = $guess }
    }
    return
  }

  throw "Nao foi possivel localizar o pacote Servidor OMPS a partir de $here"
}

function Test-VcRedist {
  foreach ($k in @(
      'HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64',
      'HKLM:\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64'
    )) {
    if (Test-Path $k) {
      try {
        if ((Get-ItemProperty $k -ErrorAction Stop).Installed -eq 1) { return $true }
      } catch { }
    }
  }
  return $false
}

function Test-Wsl {
  try {
    & wsl.exe --status 1>$null 2>$null
    if ($LASTEXITCODE -eq 0) { return $true }
    $o = & wsl.exe -l -v 2>&1 | Out-String
    if ($o -match 'Ubuntu|docker-desktop|Windows Subsystem') { return $true }
  } catch { }
  return $false
}

function Test-DockerApp {
  try {
    docker info 1>$null 2>$null
    return ($LASTEXITCODE -eq 0)
  } catch { return $false }
}

function Test-NodeApp {
  try {
    $v = & node -v 2>$null
    return ($LASTEXITCODE -eq 0 -and "$v" -match '^v\d+')
  } catch { return $false }
}

function Get-Installer([string]$Pattern) {
  if (-not $script:Instaladores -or -not (Test-Path $script:Instaladores)) { return $null }
  return Get-ChildItem $script:Instaladores -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like $Pattern } |
    Select-Object -First 1 -ExpandProperty FullName
}

function Set-PackConfigEnv {
  if (-not (Test-Path $script:ConfigEnv)) {
    $example = Join-Path $script:AcompRoot 'servidor-portatil\config.env.example'
    if (Test-Path $example) { Copy-Item $example $script:ConfigEnv -Force }
  }
  if (-not (Test-Path $script:ConfigEnv)) { return }

  $ip = $null
  try {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object {
        ($_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*') -and
        $_.InterfaceAlias -notlike '*Docker*' -and
        $_.InterfaceAlias -notlike 'vEthernet*' -and
        $_.InterfaceAlias -notlike '*WSL*'
      } |
      Select-Object -First 1 -ExpandProperty IPAddress
  } catch { }
  if (-not $ip) { $ip = '192.168.0.17' }

  $lines = @(Get-Content $script:ConfigEnv -Encoding UTF8)
  $map = @{
    SERVER_HOST         = $ip
    FRONTEND_DIR        = (Join-Path $script:AcompRoot 'frontend')
  }
  if ($script:SupabaseDocker) { $map['SUPABASE_DOCKER_DIR'] = $script:SupabaseDocker }
  if (-not ($lines | Where-Object { $_ -match '^\s*SERVER_ALIAS=' })) {
    $map['SERVER_ALIAS'] = 'sistema.acompomps.rede'
  }

  $out = foreach ($line in $lines) {
    $hit = $false
    foreach ($k in @($map.Keys)) {
      if ($line -match ("^\s*{0}=" -f [regex]::Escape($k))) {
        '{0}={1}' -f $k, $map[$k]
        $hit = $true
        break
      }
    }
    if (-not $hit) { $line }
  }
  foreach ($k in @($map.Keys)) {
    if (-not ($out | Where-Object { $_ -match ("^\s*{0}=" -f [regex]::Escape($k)) })) {
      $out += ('{0}={1}' -f $k, $map[$k])
    }
  }
  Set-Content -Path $script:ConfigEnv -Value $out -Encoding UTF8
}

function Invoke-OmpsVerification {
  $problems = New-Object System.Collections.Generic.List[string]
  if (-not (Test-Path $script:AcompRoot)) { $problems.Add('Pasta do sistema (AcompSolemp) nao encontrada.') }
  if (-not $script:SupabaseDocker -or -not (Test-Path $script:SupabaseDocker)) {
    $problems.Add('Pasta supabase-master\docker nao encontrada.')
  }
  if (-not (Test-Path (Join-Path $script:AcompRoot 'frontend'))) { $problems.Add('Pasta frontend nao encontrada.') }
  if (-not (Test-VcRedist)) { $problems.Add('Visual C++ Redistributable nao instalado.') }
  if (-not (Test-Wsl)) { $problems.Add('WSL nao detectado (necessario para Docker Desktop).') }
  if (-not (Test-NodeApp)) { $problems.Add('Node.js nao instalado ou fora do PATH.') }
  if (-not (Test-DockerApp)) {
    $problems.Add('Docker Desktop nao instalado ou nao esta em execucao (abra o Docker e espere Ready).')
  }
  $fe = Join-Path $script:AcompRoot 'frontend'
  if ((Test-Path $fe) -and -not (Test-Path (Join-Path $fe 'node_modules'))) {
    $problems.Add('frontend\node_modules ausente. Use "Instalar dependencias do frontend".')
  }
  return $problems
}

function Show-ShortcutChecklist {
  $form2 = New-Object Windows.Forms.Form
  $form2.Text = 'Servidor OMPS'
  $form2.StartPosition = 'CenterScreen'
  $form2.FormBorderStyle = 'FixedDialog'
  $form2.MaximizeBox = $false
  $form2.MinimizeBox = $false
  $form2.TopMost = $true
  $form2.ClientSize = New-Object Drawing.Size(480, 220)
  $form2.Font = New-Object Drawing.Font('Segoe UI', 10)

  $lbl = New-Object Windows.Forms.Label
  $lbl.Location = New-Object Drawing.Point(20, 20)
  $lbl.Size = New-Object Drawing.Size(440, 60)
  $lbl.Text = "Checklist`n`nMarque se deseja criar o atalho na Area de Trabalho para iniciar o servidor."
  $form2.Controls.Add($lbl)

  $chk = New-Object Windows.Forms.CheckBox
  $chk.Location = New-Object Drawing.Point(24, 90)
  $chk.Size = New-Object Drawing.Size(430, 30)
  $chk.Text = 'Criar atalho "Iniciar Servidor OMPS" na Area de Trabalho'
  $chk.Checked = $true
  $form2.Controls.Add($chk)

  $btnOk = New-Object Windows.Forms.Button
  $btnOk.Text = 'Continuar'
  $btnOk.Location = New-Object Drawing.Point(250, 150)
  $btnOk.Size = New-Object Drawing.Size(100, 32)
  $btnOk.DialogResult = [Windows.Forms.DialogResult]::OK
  $form2.Controls.Add($btnOk)
  $form2.AcceptButton = $btnOk

  $btnCancel = New-Object Windows.Forms.Button
  $btnCancel.Text = 'Cancelar'
  $btnCancel.Location = New-Object Drawing.Point(360, 150)
  $btnCancel.Size = New-Object Drawing.Size(100, 32)
  $btnCancel.DialogResult = [Windows.Forms.DialogResult]::Cancel
  $form2.Controls.Add($btnCancel)

  $r = $form2.ShowDialog()
  $want = [bool]$chk.Checked
  $form2.Dispose()
  if ($r -ne [Windows.Forms.DialogResult]::OK) { return $false }

  Set-PackConfigEnv
  if ($want -and $script:StartVbs -and (Test-Path $script:StartVbs)) {
    $desk = [Environment]::GetFolderPath('Desktop')
    $lnkPath = Join-Path $desk 'Iniciar Servidor OMPS.lnk'
    $wsh = New-Object -ComObject WScript.Shell
    $sc = $wsh.CreateShortcut($lnkPath)
    $sc.TargetPath = $script:StartVbs
    $sc.WorkingDirectory = (Split-Path $script:StartVbs)
    $sc.WindowStyle = 1
    if ($script:IconPath -and (Test-Path $script:IconPath)) { $sc.IconLocation = "$($script:IconPath),0" }
    $sc.Description = 'Inicia o Servidor OMPS'
    $sc.Save()
  }
  return $true
}

# Retorna 'Continue' ou 'Abort'
function Show-ServidorOmpsInstallPanel {
  param([switch]$PreStart)

  Initialize-OmpsPanelPaths
  $null = Import-DashThemeForPanel
  $script:panelResult = 'Abort'
  $script:ompsPreStart = [bool]$PreStart
  $script:installAllOk = $false
  $script:statusLeft = 30
  $script:statusPaused = $false
  $script:statusAdvancing = $false
  $theme = Get-DashTheme

  $formW = 680
  $formH = 700
  $form = New-Object Windows.Forms.Form
  Set-DashForm $form 'Servidor OMPS' $formW $formH
  if ($script:IconPath -and (Test-Path $script:IconPath)) {
    try { $form.Icon = New-Object Drawing.Icon $script:IconPath } catch { }
  }

  # Header
  $form.Controls.Add((New-DashKicker 'Servidor OMPS' 28 20 ($formW - 56)))
  $form.Controls.Add((New-DashTitle 'Status da instalacao' 28 42 ($formW - 56)))
  $form.Controls.Add((New-DashSub 'Confira cada item. Avanca automaticamente em 30s (ou clique em Avancar).' 28 82 ($formW - 56) 28))

  # Card de status
  $panel = New-DashPanel 24 120 ($formW - 48) 320
  $form.Controls.Add($panel)

  function Set-StatusBadge([System.Windows.Forms.Label]$Badge, [bool]$Ok, [string]$OkText, [string]$BadText) {
    $t = Get-DashTheme
    $Badge.Text = if ($Ok) { $OkText } else { $BadText }
    $Badge.ForeColor = if ($Ok) { $t.Ok } else { $t.Danger }
    $Badge.BackColor = if ($Ok) {
      [Drawing.Color]::FromArgb(18, 48, 34)
    } else {
      [Drawing.Color]::FromArgb(48, 22, 20)
    }
  }

  function New-StatusRow([System.Windows.Forms.Control]$Parent, [int]$Y, [string]$Nome, [scriptblock]$OnInstall) {
    $rowBg = $theme.Panel
    $l = New-DashLabel $Nome 20 $Y 250 32 $theme.Text $rowBg 10
    $Parent.Controls.Add($l)
    $s = New-DashStatusBadge '—' $false 290 $Y 150 32
    $Parent.Controls.Add($s)
    $b = New-DashButton 'Instalar' 460 ($Y + 1) 120 30 'ghost'
    $b.Add_Click($OnInstall)
    $Parent.Controls.Add($b)
    return @{ Status = $s; Button = $b }
  }

  function Update-StatusCountdownUi {
    if ($script:lblStatusCountdown) {
      $script:lblStatusCountdown.Text = "{0}s" -f $script:statusLeft
    }
    if ($script:barStatusCountdown) {
      $v = [Math]::Max(0, [Math]::Min(30, $script:statusLeft))
      $script:barStatusCountdown.Value = $v
    }
    if ($script:hintAvancar -and -not $script:statusAdvancing) {
      if ($script:installAllOk) {
        $script:hintAvancar.Text = ("Pronto — Avancar agora ou em {0}s." -f $script:statusLeft)
        $script:hintAvancar.ForeColor = $theme.Ok
      } else {
        $script:hintAvancar.Text = ("Avanco automatico em {0}s. Corrija os itens em vermelho se puder." -f $script:statusLeft)
        $script:hintAvancar.ForeColor = $theme.Muted
      }
      $script:hintAvancar.BackColor = $theme.Footer
    }
  }

  function Complete-InstallPanelAdvance([bool]$Force = $false) {
    if ($script:statusAdvancing) { return }
    $script:statusAdvancing = $true
    if ($script:statusTimer) { try { $script:statusTimer.Stop() } catch { } }

    Update-StatusLabels
    Set-PackConfigEnv
    $problems = Invoke-OmpsVerification
    if (-not $Force -and $problems.Count -gt 0) {
      $script:statusAdvancing = $false
      if ($script:statusTimer -and -not $script:statusPaused) {
        try { $script:statusTimer.Start() } catch { }
      }
      [Windows.Forms.MessageBox]::Show(
        ("Ainda ha pendencias:`n`n- " + ($problems -join "`n- ")),
        'Servidor OMPS',
        [Windows.Forms.MessageBoxButtons]::OK,
        [Windows.Forms.MessageBoxIcon]::Warning
      ) | Out-Null
      Update-AvancarState
      return
    }

    if ($script:ompsPreStart) {
      $script:panelResult = 'Continue'
      $form.Close()
      return
    }

    $form.Hide()
    $ok = Show-ShortcutChecklist
    if ($ok) {
      $abrir = Join-Path $script:ScriptsDir 'Abrir-Tudo.ps1'
      if (Test-Path $abrir) {
        Start-Process -FilePath 'powershell.exe' -ArgumentList @(
          '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', $abrir, '-SkipInstallPanel'
        )
      }
    }
    $form.Close()
  }

  function Update-AvancarState {
    Set-PackConfigEnv
    $problems = Invoke-OmpsVerification
    $script:installAllOk = ($problems.Count -eq 0)
    if ($script:btnAvancar) {
      # Manual: libera cedo se OK; o timer avanca ao fim dos 30s mesmo assim.
      $script:btnAvancar.Enabled = $script:installAllOk -and -not $script:statusAdvancing
      if ($script:installAllOk) {
        Set-DashButtonStyle $script:btnAvancar 'primary'
      } else {
        Set-DashButtonStyle $script:btnAvancar 'ghost'
      }
    }
    Update-StatusCountdownUi
  }

  function Update-StatusLabels {
    $dOk = Test-DockerApp
    Set-StatusBadge $script:statusDocker $dOk 'Instalado' 'Nao instalado'
    $script:btnDocker.Enabled = -not $dOk
    $script:btnDocker.Visible = -not $dOk

    $nOk = Test-NodeApp
    Set-StatusBadge $script:statusNode $nOk 'Instalado' 'Nao instalado'
    $script:btnNode.Enabled = -not $nOk
    $script:btnNode.Visible = -not $nOk

    $vOk = Test-VcRedist
    Set-StatusBadge $script:statusVc $vOk 'Instalado' 'Nao instalado'
    $script:btnVc.Enabled = -not $vOk
    $script:btnVc.Visible = -not $vOk

    $wOk = Test-Wsl
    Set-StatusBadge $script:statusWsl $wOk 'Instalado' 'Nao instalado'
    $script:btnWsl.Enabled = -not $wOk
    $script:btnWsl.Visible = -not $wOk

    $okPastas = (Test-Path $script:AcompRoot) -and $script:SupabaseDocker -and (Test-Path $script:SupabaseDocker)
    Set-StatusBadge $script:statusPastas $okPastas 'OK' 'Faltando'

    Update-AvancarState
  }

  function Start-InstallerLocal([string]$Path, [string]$Nome) {
    if (-not $Path -or -not (Test-Path $Path)) {
      [Windows.Forms.MessageBox]::Show(
        ("Instalador de {0} nao encontrado.`nColoque em:`n{1}" -f $Nome, $script:Instaladores),
        'Servidor OMPS', [Windows.Forms.MessageBoxButtons]::OK, [Windows.Forms.MessageBoxIcon]::Warning
      ) | Out-Null
      return
    }
    $script:statusPaused = $true
    try {
      Start-Process -FilePath $Path -Wait
    } finally {
      $script:statusPaused = $false
    }
    Update-StatusLabels
  }

  $y = 18
  $gap = 48
  $rowDocker = New-StatusRow $panel $y 'Docker Desktop' { Start-InstallerLocal (Get-Installer 'Docker*Installer*.exe') 'Docker Desktop' }; $y += $gap
  $rowNode = New-StatusRow $panel $y 'Node.js' { Start-InstallerLocal (Get-Installer 'node-*.msi') 'Node.js' }; $y += $gap
  $rowVc = New-StatusRow $panel $y 'Visual C++ Redistributable' { Start-InstallerLocal (Get-Installer 'vc_redist*.exe') 'Visual C++' }; $y += $gap
  $rowWsl = New-StatusRow $panel $y 'WSL' { Start-InstallerLocal (Get-Installer 'wsl_update*.msi') 'WSL' }; $y += $gap

  $script:statusDocker = $rowDocker.Status; $script:btnDocker = $rowDocker.Button
  $script:statusNode = $rowNode.Status; $script:btnNode = $rowNode.Button
  $script:statusVc = $rowVc.Status; $script:btnVc = $rowVc.Button
  $script:statusWsl = $rowWsl.Status; $script:btnWsl = $rowWsl.Button

  $panel.Controls.Add((New-DashLabel 'Pastas do sistema' 20 $y 250 32 $theme.Text $theme.Panel 10))
  $script:statusPastas = New-DashStatusBadge '—' $false 290 $y 150 32
  $panel.Controls.Add($script:statusPastas)

  # Contagem regressiva de 30s no proprio painel de status
  $countCard = New-DashPanel 24 452 ($formW - 48) 72
  $form.Controls.Add($countCard)
  $countCard.Controls.Add((New-DashLabel 'Avanco automatico' 20 10 220 22 $theme.Muted $theme.Panel 8.5 ([Drawing.FontStyle]::Bold)))
  $script:lblStatusCountdown = New-DashLabel '30s' ($formW - 48 - 100) 6 80 28 $theme.AccentBright $theme.Panel 16 ([Drawing.FontStyle]::Bold) 'MiddleRight'
  $countCard.Controls.Add($script:lblStatusCountdown)
  $script:barStatusCountdown = New-Object Windows.Forms.ProgressBar
  $script:barStatusCountdown.Location = New-Object Drawing.Point(20, 40)
  $script:barStatusCountdown.Size = New-Object Drawing.Size(($formW - 88), 16)
  $script:barStatusCountdown.Minimum = 0
  $script:barStatusCountdown.Maximum = 30
  $script:barStatusCountdown.Value = 30
  $script:barStatusCountdown.Style = 'Continuous'
  $countCard.Controls.Add($script:barStatusCountdown)

  # Acoes secundarias
  $actions = New-DashPanel 24 536 ($formW - 48) 56
  $form.Controls.Add($actions)
  $btnNpm = New-DashButton 'Dependencias do frontend' 12 10 230 36 'ghost'
  $btnNpm.Add_Click({
      if (-not (Test-NodeApp)) {
        [Windows.Forms.MessageBox]::Show('Instale o Node.js primeiro.', 'Servidor OMPS') | Out-Null
        return
      }
      $fe = Join-Path $script:AcompRoot 'frontend'
      if (-not (Test-Path $fe)) {
        [Windows.Forms.MessageBox]::Show("Pasta frontend nao encontrada:`n$fe", 'Servidor OMPS') | Out-Null
        return
      }
      $script:statusPaused = $true
      try {
        Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm install && pause') -WorkingDirectory $fe -Wait
      } finally {
        $script:statusPaused = $false
      }
      Update-StatusLabels
    })
  $actions.Controls.Add($btnNpm)

  $btnRefresh = New-DashButton 'Atualizar' 254 10 130 36 'ghost'
  $btnRefresh.Add_Click({ Update-StatusLabels })
  $actions.Controls.Add($btnRefresh)

  $btnVerify = New-DashButton 'Verificar' 396 10 140 36 'ghost'
  $btnVerify.Add_Click({
      Update-StatusLabels
      Set-PackConfigEnv
      $problems = Invoke-OmpsVerification
      if ($problems.Count -gt 0) {
        [Windows.Forms.MessageBox]::Show(
          ("Problemas encontrados:`n`n- " + ($problems -join "`n- ")),
          'Servidor OMPS — verificacao',
          [Windows.Forms.MessageBoxButtons]::OK,
          [Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
        return
      }
      [Windows.Forms.MessageBox]::Show(
        'Verificacao OK. Voce ja pode Avancar ou aguardar a contagem.',
        'Servidor OMPS',
        [Windows.Forms.MessageBoxButtons]::OK,
        [Windows.Forms.MessageBoxIcon]::Information
      ) | Out-Null
      Update-AvancarState
    })
  $actions.Controls.Add($btnVerify)

  # Footer
  $footer = New-DashFooter 608 $formW 92
  $form.Controls.Add($footer)

  $script:hintAvancar = New-DashLabel 'Avanco automatico em 30s.' 28 12 ($formW - 56) 22 $theme.Muted $theme.Footer 9
  $footer.Controls.Add($script:hintAvancar)

  $btnClose = New-DashButton 'Fechar' ($formW - 280) 40 110 40 'ghost'
  $btnClose.Add_Click({
      $script:panelResult = 'Abort'
      if ($script:statusTimer) { try { $script:statusTimer.Stop() } catch { } }
      $form.Close()
    })
  $footer.Controls.Add($btnClose)

  $script:btnAvancar = New-DashButton 'Avancar' ($formW - 156) 40 128 40 'primary'
  $script:btnAvancar.Enabled = $false
  $script:btnAvancar.Add_Click({ Complete-InstallPanelAdvance -Force:$false })
  $footer.Controls.Add($script:btnAvancar)

  $script:statusTimer = New-Object Windows.Forms.Timer
  $script:statusTimer.Interval = 1000
  $script:statusTimer.Add_Tick({
      if ($script:statusPaused -or $script:statusAdvancing) { return }
      $script:statusLeft = $script:statusLeft - 1
      if ($script:statusLeft -lt 0) { $script:statusLeft = 0 }
      Update-StatusCountdownUi
      if ($script:statusLeft -le 0) {
        $script:statusTimer.Stop()
        # Ao fim dos 30s avanca mesmo com pendencias (PreStart segue o fluxo).
        Complete-InstallPanelAdvance -Force:$true
      }
    })

  Update-StatusLabels
  Update-StatusCountdownUi
  $form.Add_Shown({ $script:statusTimer.Start() })
  $form.Add_FormClosed({
      if ($script:statusTimer) {
        try { $script:statusTimer.Stop() } catch { }
        try { $script:statusTimer.Dispose() } catch { }
      }
    })
  [void]$form.ShowDialog()
  return $script:panelResult
}

# Dot-source: so define funcoes. -File: abre o painel (standalone ou -PreStart).
if ($MyInvocation.InvocationName -ne '.') {
  $null = Show-ServidorOmpsInstallPanel -PreStart:$PreStart
}
