# Dialogos do atalho Iniciar Servidor OMPS (checklist / cronometro 60s).
# Dot-source: . "$PSScriptRoot\Launcher-UI.ps1"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

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

  $form = New-Object System.Windows.Forms.Form
  $form.Text = 'Iniciar Servidor OMPS'
  $form.StartPosition = 'CenterScreen'
  $form.FormBorderStyle = 'FixedDialog'
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.TopMost = $true
  $form.ClientSize = New-Object System.Drawing.Size(520, 360)
  $form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

  $lbl = New-Object System.Windows.Forms.Label
  $lbl.Location = New-Object System.Drawing.Point(20, 14)
  $lbl.Size = New-Object System.Drawing.Size(480, 40)
  $lbl.Text = "Checklist de inicializacao`nMarque se a proxima vez deve subir sozinha."
  $form.Controls.Add($lbl)

  $chk = New-Object System.Windows.Forms.CheckBox
  $chk.Location = New-Object System.Drawing.Point(24, 60)
  $chk.Size = New-Object System.Drawing.Size(470, 28)
  $chk.Text = 'Na proxima inicializacao, abrir e rodar o Servidor OMPS automaticamente'
  $chk.Checked = $true
  $form.Controls.Add($chk)

  $lblIp = New-Object System.Windows.Forms.Label
  $lblIp.Location = New-Object System.Drawing.Point(20, 100)
  $lblIp.Size = New-Object System.Drawing.Size(480, 36)
  $lblIp.Text = "IP interno (so referencia): $($info.Ip)"
  $form.Controls.Add($lblIp)

  $lblAlias = New-Object System.Windows.Forms.Label
  $lblAlias.Location = New-Object System.Drawing.Point(20, 140)
  $lblAlias.Size = New-Object System.Drawing.Size(480, 40)
  $lblAlias.Text = "Endereco que os outros PCs devem digitar no navegador`n(exatamente este texto, sem http e sem porta):"
  $form.Controls.Add($lblAlias)

  $txtAlias = New-Object System.Windows.Forms.TextBox
  $txtAlias.Location = New-Object System.Drawing.Point(24, 185)
  $txtAlias.Size = New-Object System.Drawing.Size(470, 26)
  $txtAlias.Text = $info.Alias
  $form.Controls.Add($txtAlias)

  $lblHint = New-Object System.Windows.Forms.Label
  $lblHint.Location = New-Object System.Drawing.Point(20, 220)
  $lblHint.Size = New-Object System.Drawing.Size(480, 50)
  $lblHint.ForeColor = [System.Drawing.Color]::DimGray
  $lblHint.Text = "Exemplo valido: sistema.acompomps.rede`nNos outros PCs: digitar so isso na barra de endereco."
  $form.Controls.Add($lblHint)

  $btnOk = New-Object System.Windows.Forms.Button
  $btnOk.Text = 'Continuar'
  $btnOk.Location = New-Object System.Drawing.Point(290, 300)
  $btnOk.Size = New-Object System.Drawing.Size(100, 32)
  $btnOk.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Controls.Add($btnOk)
  $form.AcceptButton = $btnOk

  $btnCancel = New-Object System.Windows.Forms.Button
  $btnCancel.Text = 'Cancelar'
  $btnCancel.Location = New-Object System.Drawing.Point(400, 300)
  $btnCancel.Size = New-Object System.Drawing.Size(100, 32)
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
  $script:cdLeft = $Seconds
  $script:cdInterrupted = $false
  $script:cdPaused = $false
  $script:cdAliasText = $info.Alias

  $script:cdForm = New-Object System.Windows.Forms.Form
  $script:cdForm.Text = 'Iniciar Servidor OMPS'
  $script:cdForm.StartPosition = 'CenterScreen'
  $script:cdForm.FormBorderStyle = 'FixedDialog'
  $script:cdForm.MaximizeBox = $false
  $script:cdForm.MinimizeBox = $false
  $script:cdForm.TopMost = $true
  $script:cdForm.ClientSize = New-Object System.Drawing.Size(520, 390)
  $script:cdForm.Font = New-Object System.Drawing.Font('Segoe UI', 10)

  $lbl = New-Object System.Windows.Forms.Label
  $lbl.Location = New-Object System.Drawing.Point(20, 12)
  $lbl.Size = New-Object System.Drawing.Size(480, 36)
  $lbl.Text = 'O Servidor OMPS iniciara automaticamente se voce nao interromper.'
  $script:cdForm.Controls.Add($lbl)

  $script:cdNum = New-Object System.Windows.Forms.Label
  $script:cdNum.Location = New-Object System.Drawing.Point(20, 50)
  $script:cdNum.Size = New-Object System.Drawing.Size(480, 50)
  $script:cdNum.TextAlign = 'MiddleCenter'
  $script:cdNum.Font = New-Object System.Drawing.Font('Segoe UI', 28, [System.Drawing.FontStyle]::Bold)
  $script:cdNum.Text = "$Seconds"
  $script:cdForm.Controls.Add($script:cdNum)

  $script:cdBar = New-Object System.Windows.Forms.ProgressBar
  $script:cdBar.Location = New-Object System.Drawing.Point(24, 105)
  $script:cdBar.Size = New-Object System.Drawing.Size(472, 16)
  $script:cdBar.Minimum = 0
  $script:cdBar.Maximum = $Seconds
  $script:cdBar.Value = $Seconds
  $script:cdForm.Controls.Add($script:cdBar)

  $lblIp = New-Object System.Windows.Forms.Label
  $lblIp.Location = New-Object System.Drawing.Point(20, 130)
  $lblIp.Size = New-Object System.Drawing.Size(480, 28)
  $lblIp.Text = "IP interno (referencia): $($info.Ip)"
  $script:cdForm.Controls.Add($lblIp)

  $lblAlias = New-Object System.Windows.Forms.Label
  $lblAlias.Location = New-Object System.Drawing.Point(20, 165)
  $lblAlias.Size = New-Object System.Drawing.Size(480, 36)
  $lblAlias.Text = "Endereco exato para os outros PCs (sem http, sem porta):"
  $script:cdForm.Controls.Add($lblAlias)

  $script:cdTxtAlias = New-Object System.Windows.Forms.TextBox
  $script:cdTxtAlias.Location = New-Object System.Drawing.Point(24, 205)
  $script:cdTxtAlias.Size = New-Object System.Drawing.Size(472, 26)
  $script:cdTxtAlias.Text = $info.Alias
  $script:cdForm.Controls.Add($script:cdTxtAlias)

  $lblHint = New-Object System.Windows.Forms.Label
  $lblHint.Location = New-Object System.Drawing.Point(20, 240)
  $lblHint.Size = New-Object System.Drawing.Size(480, 36)
  $lblHint.ForeColor = [System.Drawing.Color]::DimGray
  $lblHint.Text = "Nos outros PCs digite exatamente o texto do campo acima."
  $script:cdForm.Controls.Add($lblHint)

  $btnPause = New-Object System.Windows.Forms.Button
  $btnPause.Text = 'Pausar'
  $btnPause.Location = New-Object System.Drawing.Point(70, 295)
  $btnPause.Size = New-Object System.Drawing.Size(110, 32)
  $script:cdForm.Controls.Add($btnPause)

  $btnInterrupt = New-Object System.Windows.Forms.Button
  $btnInterrupt.Text = 'Interromper'
  $btnInterrupt.Location = New-Object System.Drawing.Point(200, 295)
  $btnInterrupt.Size = New-Object System.Drawing.Size(120, 32)
  $script:cdForm.Controls.Add($btnInterrupt)

  $btnNow = New-Object System.Windows.Forms.Button
  $btnNow.Text = 'Iniciar agora'
  $btnNow.Location = New-Object System.Drawing.Point(340, 295)
  $btnNow.Size = New-Object System.Drawing.Size(120, 32)
  $script:cdForm.Controls.Add($btnNow)

  $script:cdStatus = New-Object System.Windows.Forms.Label
  $script:cdStatus.Location = New-Object System.Drawing.Point(20, 340)
  $script:cdStatus.Size = New-Object System.Drawing.Size(480, 24)
  $script:cdStatus.Text = ''
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
  param([switch]$SkipUi)

  if ($SkipUi) { return 'Continue' }

  $state = Get-LauncherState

  if ($state.mode -eq 'countdown') {
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
