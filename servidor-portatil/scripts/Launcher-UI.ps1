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
  $formW = 640
  $formH = 480

  $form = New-Object System.Windows.Forms.Form
  Set-DashForm $form 'Iniciar Servidor OMPS' $formW $formH
  $form.Controls.Add((New-DashKicker 'Servidor OMPS' 28 20))
  $form.Controls.Add((New-DashTitle 'Checklist de inicializacao' 28 42))
  $form.Controls.Add((New-DashSub 'Defina o endereco da rede e se a proxima vez sobe sozinha.' 28 82 580 28))

  $card = New-DashPanel 24 120 ($formW - 48) 230
  $form.Controls.Add($card)

  $chk = New-DashCheckBox 'Na proxima inicializacao, abrir e rodar automaticamente' 20 18 560 28
  $chk.Checked = $true
  $card.Controls.Add($chk)

  $card.Controls.Add((New-DashLabel ("IP interno: $($info.Ip)") 20 60 560 24 $theme.Muted $theme.Panel 9))
  $card.Controls.Add((New-DashLabel 'Endereco para os outros PCs (sem http e sem porta)' 20 96 560 22 $theme.Text $theme.Panel 9.5 ([System.Drawing.FontStyle]::Bold)))

  $txtAlias = New-DashTextBox $info.Alias 20 128 560 34
  $card.Controls.Add($txtAlias)
  $card.Controls.Add((New-DashLabel 'Exemplo: sistema.acompomps.rede' 20 172 560 24 $theme.Muted $theme.Panel 8.5))

  $footer = New-DashFooter 400 $formW 80
  $form.Controls.Add($footer)

  $btnCancel = New-DashButton 'Cancelar' ($formW - 280) 20 110 40 'ghost'
  $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $footer.Controls.Add($btnCancel)
  $form.CancelButton = $btnCancel

  $btnOk = New-DashButton 'Continuar' ($formW - 156) 20 128 40 'primary'
  $btnOk.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $footer.Controls.Add($btnOk)
  $form.AcceptButton = $btnOk

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
  $formW = 640
  $formH = 560

  $script:cdForm = New-Object System.Windows.Forms.Form
  Set-DashForm $script:cdForm 'Iniciar Servidor OMPS' $formW $formH
  $script:cdForm.Controls.Add((New-DashKicker 'Servidor OMPS' 28 20))
  $script:cdForm.Controls.Add((New-DashTitle 'Contagem regressiva' 28 42))
  $script:cdForm.Controls.Add((New-DashSub 'O servidor inicia automaticamente se voce nao interromper.' 28 82 580 28))

  $numPanel = New-DashPanel 24 118 ($formW - 48) 130
  $script:cdForm.Controls.Add($numPanel)

  $script:cdNum = New-DashLabel "$Seconds" 0 10 ($formW - 48) 70 $theme.AccentBright $theme.Panel 36 ([System.Drawing.FontStyle]::Bold) 'MiddleCenter'
  $numPanel.Controls.Add($script:cdNum)

  $script:cdBar = New-Object System.Windows.Forms.ProgressBar
  $script:cdBar.Location = New-Object System.Drawing.Point(28, 90)
  $script:cdBar.Size = New-Object System.Drawing.Size(($formW - 104), 18)
  $script:cdBar.Minimum = 0
  $script:cdBar.Maximum = $Seconds
  $script:cdBar.Value = $Seconds
  $script:cdBar.Style = 'Continuous'
  $numPanel.Controls.Add($script:cdBar)

  $infoCard = New-DashPanel 24 266 ($formW - 48) 150
  $script:cdForm.Controls.Add($infoCard)
  $infoCard.Controls.Add((New-DashLabel ("IP interno: $($info.Ip)") 20 16 560 22 $theme.Muted $theme.Panel 9))
  $infoCard.Controls.Add((New-DashLabel 'Endereco exato para os outros PCs' 20 48 560 22 $theme.Text $theme.Panel 9.5 ([System.Drawing.FontStyle]::Bold)))
  $script:cdTxtAlias = New-DashTextBox $info.Alias 20 78 560 34
  $infoCard.Controls.Add($script:cdTxtAlias)
  $infoCard.Controls.Add((New-DashLabel 'Digite exatamente este texto na barra de endereco dos outros PCs.' 20 118 560 22 $theme.Muted $theme.Panel 8.5))

  $footer = New-DashFooter 440 $formW 120
  $script:cdForm.Controls.Add($footer)

  $script:cdStatus = New-DashLabel '' 28 12 ($formW - 56) 22 $theme.Muted $theme.Footer 9
  $footer.Controls.Add($script:cdStatus)

  $btnPause = New-DashButton 'Pausar' 28 48 120 40 'ghost'
  $footer.Controls.Add($btnPause)

  $btnInterrupt = New-DashButton 'Interromper' 160 48 140 40 'danger'
  $footer.Controls.Add($btnInterrupt)

  $btnNow = New-DashButton 'Iniciar agora' ($formW - 220) 48 192 40 'primary'
  $footer.Controls.Add($btnNow)

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
      $t = Get-DashTheme
      if ($script:cdPaused) {
        $btnPause.Text = 'Retomar'
        $script:cdStatus.Text = 'Contagem pausada.'
        $script:cdStatus.ForeColor = $t.Warn
      } else {
        $btnPause.Text = 'Pausar'
        $script:cdStatus.Text = ''
        $script:cdStatus.ForeColor = $t.Muted
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
