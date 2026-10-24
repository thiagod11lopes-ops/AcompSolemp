# Dialogos do atalho Iniciar Servidor OMPS (checklist / cronometro 60s).
# Dot-source: . "$PSScriptRoot\Launcher-UI.ps1"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
. "$PSScriptRoot\Ui-Theme-Dashboard.ps1"

function Get-LauncherStatePath {
  $dir = Join-Path (Get-ServidorRoot) 'state'
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  return (Join-Path $dir 'launcher.json')
}

function Get-LauncherState {
  $path = Get-LauncherStatePath
  if (-not (Test-Path $path)) {
    return [pscustomobject]@{ mode = 'ask'; autoPrefer = $false; runCount = 0 }
  }
  try {
    $raw = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
    $mode = [string]$raw.mode
    if ($mode -notin @('ask', 'countdown')) { $mode = 'ask' }
    return [pscustomobject]@{
      mode       = $mode
      autoPrefer = [bool]$raw.autoPrefer
      runCount   = [int]$raw.runCount
    }
  } catch {
    return [pscustomobject]@{ mode = 'ask'; autoPrefer = $false; runCount = 0 }
  }
}

function Save-LauncherState($State) {
  $path = Get-LauncherStatePath
  $obj = [ordered]@{
    mode       = [string]$State.mode
    autoPrefer = [bool]$State.autoPrefer
    runCount   = [int]$State.runCount
    updatedAt  = (Get-Date -Format 'o')
  }
  ($obj | ConvertTo-Json) | Set-Content -Path $path -Encoding UTF8
}

function Set-WindowsAutostart([bool]$Enabled) {
  try {
    $install = Join-Path $PSScriptRoot 'Instalar-Inicio-Automatico.ps1'
    $remove = Join-Path $PSScriptRoot 'Remover-Inicio-Automatico.ps1'
    if ($Enabled) {
      if (Test-Path $install) { & $install | Out-Null }
    } else {
      if (Test-Path $remove) { & $remove | Out-Null }
    }
  } catch { }
}

function Normalize-AliasInput([string]$Raw) {
  $a = [string]$Raw
  $a = $a.Trim()
  $a = $a -replace '^\s*https?://', ''
  $a = $a.Split('/')[0]
  $a = $a.Split(':')[0]
  $a = $a.Trim().ToLowerInvariant().TrimEnd('.')
  if (-not $a) { $a = 'sistema.acompomps.rede' }
  return $a
}

function Get-AccessInfo {
  $cfg = Import-ServidorConfig
  $ip = Get-PreferredLanIPv4
  if (-not $ip) { $ip = [string]$cfg.SERVER_HOST }
  $alias = Normalize-AliasInput ([string]$cfg.SERVER_ALIAS)
  return [pscustomobject]@{
    Ip    = $ip
    Alias = $alias
  }
}

function Save-ServerAlias([string]$Alias) {
  $alias = Normalize-AliasInput $Alias
  if ($alias -notmatch '^[a-z0-9]([a-z0-9\-]*\.)+[a-z0-9\-]+$') {
    throw "Endereco invalido. Digite so o nome, ex.: sistema.acompomps.rede (sem http e sem porta)."
  }
  $cfgPath = Join-Path (Get-ServidorRoot) 'config.env'
  Set-EnvKey $cfgPath 'SERVER_ALIAS' $alias
  return $alias
}

function Show-ChecklistDialog {
  $info = Get-AccessInfo
  $theme = Get-DashTheme

  $form = New-Object System.Windows.Forms.Form
  Set-DashForm $form 'Iniciar Servidor OMPS' 540 400
  $form.Controls.Add((New-DashKicker 'Servidor OMPS' 24 16))
  $form.Controls.Add((New-DashTitle 'Checklist de inicializacao' 24 36))
  $form.Controls.Add((New-DashSub 'Marque se a proxima vez deve subir sozinha.' 24 72 490 28))

  $chk = New-Object System.Windows.Forms.CheckBox
  $chk.Location = New-Object System.Drawing.Point(28, 110)
  $chk.Size = New-Object System.Drawing.Size(480, 28)
  $chk.Text = 'Na proxima inicializacao, abrir e rodar automaticamente'
  $chk.Checked = $true
  $chk.ForeColor = $theme.Text
  $chk.BackColor = $theme.Bg
  $chk.Font = Get-DashFont 9.5
  $form.Controls.Add($chk)

  $form.Controls.Add((New-DashLabel ("IP interno (referencia): $($info.Ip)") 24 150 490 24))
  $form.Controls.Add((New-DashSub 'Endereco que os outros PCs devem digitar (sem http e sem porta):' 24 180 490 32))

  $txtAlias = New-DashTextBox $info.Alias 28 218 480
  $form.Controls.Add($txtAlias)
  $form.Controls.Add((New-DashMutedLabel 'Exemplo: sistema.acompomps.rede' 24 256 480 28))

  $btnOk = New-DashButton 'Continuar' 280 330 110 36 'primary'
  $btnOk.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Controls.Add($btnOk)
  $form.AcceptButton = $btnOk

  $btnCancel = New-DashButton 'Cancelar' 400 330 110 36 'ghost'
  $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $form.Controls.Add($btnCancel)
  $form.CancelButton = $btnCancel

  $result = $form.ShowDialog()
  $auto = [bool]$chk.Checked
  $aliasText = [string]$txtAlias.Text
  $form.Dispose()

  return [pscustomobject]@{
    Confirmed = ($result -eq [System.Windows.Forms.DialogResult]::OK)
    AutoNext  = $auto
    Alias     = $aliasText
  }
}

function Show-CountdownDialog([int]$Seconds = 60) {
  $info = Get-AccessInfo
  $theme = Get-DashTheme
  $script:cdLeft = $Seconds
  $script:cdInterrupted = $false
  $script:cdPaused = $false
  $script:cdAliasText = $info.Alias

  $script:cdForm = New-Object System.Windows.Forms.Form
  Set-DashForm $script:cdForm 'Iniciar Servidor OMPS' 540 460
  $script:cdForm.Controls.Add((New-DashKicker 'Servidor OMPS' 24 16))
  $script:cdForm.Controls.Add((New-DashTitle 'Contagem regressiva' 24 36))
  $script:cdForm.Controls.Add((New-DashSub 'O servidor inicia automaticamente se voce nao interromper.' 24 72 490 28))

  $numPanel = New-DashPanel 24 110 490 100
  $script:cdForm.Controls.Add($numPanel)

  $script:cdNum = New-Object System.Windows.Forms.Label
  $script:cdNum.Location = New-Object System.Drawing.Point(0, 8)
  $script:cdNum.Size = New-Object System.Drawing.Size(490, 56)
  $script:cdNum.TextAlign = 'MiddleCenter'
  $script:cdNum.Font = Get-DashFont 32 ([System.Drawing.FontStyle]::Bold)
  $script:cdNum.ForeColor = $theme.AccentBright
  $script:cdNum.BackColor = $theme.Panel
  $script:cdNum.Text = "$Seconds"
  $numPanel.Controls.Add($script:cdNum)

  $script:cdBar = New-Object System.Windows.Forms.ProgressBar
  $script:cdBar.Location = New-Object System.Drawing.Point(24, 72)
  $script:cdBar.Size = New-Object System.Drawing.Size(442, 14)
  $script:cdBar.Minimum = 0
  $script:cdBar.Maximum = $Seconds
  $script:cdBar.Value = $Seconds
  $script:cdBar.Style = 'Continuous'
  $numPanel.Controls.Add($script:cdBar)

  $script:cdForm.Controls.Add((New-DashLabel ("IP interno: $($info.Ip)") 24 226 490 22))
  $script:cdForm.Controls.Add((New-DashSub 'Endereco exato para os outros PCs (sem http, sem porta):' 24 252 490 28))

  $script:cdTxtAlias = New-DashTextBox $info.Alias 28 286 482
  $script:cdForm.Controls.Add($script:cdTxtAlias)
  $script:cdForm.Controls.Add((New-DashMutedLabel 'Nos outros PCs digite exatamente o texto do campo acima.' 24 322 490 28))

  $btnPause = New-DashButton 'Pausar' 24 370 120 36 'ghost'
  $script:cdForm.Controls.Add($btnPause)

  $btnInterrupt = New-DashButton 'Interromper' 156 370 140 36 'danger'
  $script:cdForm.Controls.Add($btnInterrupt)

  $btnNow = New-DashButton 'Iniciar agora' 310 370 200 36 'primary'
  $script:cdForm.Controls.Add($btnNow)

  $script:cdStatus = New-DashMutedLabel '' 24 416 490 24
  $script:cdForm.Controls.Add($script:cdStatus)

  $script:cdTimer = New-Object System.Windows.Forms.Timer
  $script:cdTimer.Interval = 1000
  $script:cdTimer.Add_Tick({
      if ($script:cdPaused) { return }
      $script:cdLeft = $script:cdLeft - 1
      if ($script:cdLeft -lt 0) { $script:cdLeft = 0 }
      $script:cdNum.Text = "$($script:cdLeft)"
      $script:cdBar.Value = $script:cdLeft
      if ($script:cdLeft -le 0) {
        $script:cdTimer.Stop()
        $script:cdAliasText = [string]$script:cdTxtAlias.Text
        $script:cdForm.DialogResult = [System.Windows.Forms.DialogResult]::OK
        $script:cdForm.Close()
      }
    })

  $btnPause.Add_Click({
      $script:cdPaused = -not $script:cdPaused
      if ($script:cdPaused) {
        $btnPause.Text = 'Retomar'
        $script:cdStatus.Text = 'Contagem pausada.'
        $script:cdStatus.ForeColor = (Get-DashTheme).Warn
      } else {
        $btnPause.Text = 'Pausar'
        $script:cdStatus.Text = ''
      }
    })

  $btnInterrupt.Add_Click({
      $script:cdInterrupted = $true
      $script:cdAliasText = [string]$script:cdTxtAlias.Text
      $script:cdTimer.Stop()
      $script:cdForm.DialogResult = [System.Windows.Forms.DialogResult]::Abort
      $script:cdForm.Close()
    })

  $btnNow.Add_Click({
      $script:cdAliasText = [string]$script:cdTxtAlias.Text
      $script:cdTimer.Stop()
      $script:cdForm.DialogResult = [System.Windows.Forms.DialogResult]::OK
      $script:cdForm.Close()
    })

  $script:cdForm.Add_Shown({ $script:cdTimer.Start() })
  $result = $script:cdForm.ShowDialog()
  $script:cdTimer.Stop()
  $script:cdTimer.Dispose()
  $script:cdForm.Dispose()

  $interrupted = $script:cdInterrupted -or ($result -eq [System.Windows.Forms.DialogResult]::Abort)
  return [pscustomobject]@{
    Interrupted = [bool]$interrupted
    Alias       = [string]$script:cdAliasText
  }
}

function Invoke-LauncherGate {
  param(
    [switch]$SkipUi,
    [switch]$CountdownOnly
  )

  if ($SkipUi) { return 'Continue' }

  $state = Get-LauncherState

  if ($CountdownOnly -or $state.mode -eq 'countdown') {
    $cd = Show-CountdownDialog -Seconds 60
    try { Save-ServerAlias $cd.Alias | Out-Null } catch {
      [System.Windows.Forms.MessageBox]::Show(
        $_.Exception.Message, 'Endereco invalido',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning
      ) | Out-Null
      return 'Abort'
    }
    if ($cd.Interrupted) {
      $state.mode = 'ask'
      $state.autoPrefer = $false
      Save-LauncherState $state
      Set-WindowsAutostart $false
      return 'Abort'
    }
    $state.runCount = [int]$state.runCount + 1
    Save-LauncherState $state
    return 'Continue'
  }

  $dlg = Show-ChecklistDialog
  if (-not $dlg.Confirmed) { return 'Abort' }

  try { Save-ServerAlias $dlg.Alias | Out-Null } catch {
    [System.Windows.Forms.MessageBox]::Show(
      $_.Exception.Message, 'Endereco invalido',
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Warning
    ) | Out-Null
    return 'Abort'
  }

  $state.runCount = [int]$state.runCount + 1
  $state.autoPrefer = [bool]$dlg.AutoNext
  if ($dlg.AutoNext) {
    $state.mode = 'countdown'
    Save-LauncherState $state
    Set-WindowsAutostart $true
  } else {
    $state.mode = 'ask'
    Save-LauncherState $state
    Set-WindowsAutostart $false
  }

  return 'Continue'
}
