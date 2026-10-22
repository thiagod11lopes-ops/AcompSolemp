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
    return [pscustomobject]@{
      mode      = 'ask'
      autoPrefer = $false
      runCount  = 0
    }
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
    return [pscustomobject]@{
      mode       = 'ask'
      autoPrefer = $false
      runCount   = 0
    }
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
  } catch {
    # Melhor esforco: o estado do dialogo ja foi salvo mesmo se a tarefa falhar.
  }
}

function Show-ChecklistDialog {
  $form = New-Object System.Windows.Forms.Form
  $form.Text = 'Iniciar Servidor OMPS'
  $form.StartPosition = 'CenterScreen'
  $form.FormBorderStyle = 'FixedDialog'
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.TopMost = $true
  $form.ClientSize = New-Object System.Drawing.Size(460, 240)
  $form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

  $lbl = New-Object System.Windows.Forms.Label
  $lbl.Location = New-Object System.Drawing.Point(20, 18)
  $lbl.Size = New-Object System.Drawing.Size(420, 60)
  $lbl.Text = "Checklist de inicializacao`n`nMarque se deseja que o Servidor OMPS abra e rode sozinho na proxima vez."
  $form.Controls.Add($lbl)

  $chk = New-Object System.Windows.Forms.CheckBox
  $chk.Location = New-Object System.Drawing.Point(24, 95)
  $chk.Size = New-Object System.Drawing.Size(410, 40)
  $chk.Text = 'Na proxima inicializacao, abrir e rodar o Servidor OMPS automaticamente'
  $chk.Checked = $true
  $form.Controls.Add($chk)

  $btnOk = New-Object System.Windows.Forms.Button
  $btnOk.Text = 'Continuar'
  $btnOk.Location = New-Object System.Drawing.Point(230, 175)
  $btnOk.Size = New-Object System.Drawing.Size(100, 32)
  $btnOk.DialogResult = [System.Windows.Forms.DialogResult]::OK
  $form.Controls.Add($btnOk)
  $form.AcceptButton = $btnOk

  $btnCancel = New-Object System.Windows.Forms.Button
  $btnCancel.Text = 'Cancelar'
  $btnCancel.Location = New-Object System.Drawing.Point(340, 175)
  $btnCancel.Size = New-Object System.Drawing.Size(100, 32)
  $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
  $form.Controls.Add($btnCancel)
  $form.CancelButton = $btnCancel

  $result = $form.ShowDialog()
  $auto = [bool]$chk.Checked
  $form.Dispose()

  return [pscustomobject]@{
    Confirmed = ($result -eq [System.Windows.Forms.DialogResult]::OK)
    AutoNext  = $auto
  }
}

function Show-CountdownDialog([int]$Seconds = 60) {
  $script:cdLeft = $Seconds
  $script:cdInterrupted = $false
  $script:cdForm = $null
  $script:cdNum = $null
  $script:cdBar = $null
  $script:cdTimer = $null

  $script:cdForm = New-Object System.Windows.Forms.Form
  $script:cdForm.Text = 'Iniciar Servidor OMPS'
  $script:cdForm.StartPosition = 'CenterScreen'
  $script:cdForm.FormBorderStyle = 'FixedDialog'
  $script:cdForm.MaximizeBox = $false
  $script:cdForm.MinimizeBox = $false
  $script:cdForm.TopMost = $true
  $script:cdForm.ClientSize = New-Object System.Drawing.Size(420, 220)
  $script:cdForm.Font = New-Object System.Drawing.Font('Segoe UI', 10)

  $lbl = New-Object System.Windows.Forms.Label
  $lbl.Location = New-Object System.Drawing.Point(20, 18)
  $lbl.Size = New-Object System.Drawing.Size(380, 40)
  $lbl.Text = 'O Servidor OMPS iniciara automaticamente se voce nao interromper.'
  $script:cdForm.Controls.Add($lbl)

  $script:cdNum = New-Object System.Windows.Forms.Label
  $script:cdNum.Location = New-Object System.Drawing.Point(20, 70)
  $script:cdNum.Size = New-Object System.Drawing.Size(380, 60)
  $script:cdNum.TextAlign = 'MiddleCenter'
  $script:cdNum.Font = New-Object System.Drawing.Font('Segoe UI', 28, [System.Drawing.FontStyle]::Bold)
  $script:cdNum.Text = "$Seconds"
  $script:cdForm.Controls.Add($script:cdNum)

  $script:cdBar = New-Object System.Windows.Forms.ProgressBar
  $script:cdBar.Location = New-Object System.Drawing.Point(24, 140)
  $script:cdBar.Size = New-Object System.Drawing.Size(372, 18)
  $script:cdBar.Minimum = 0
  $script:cdBar.Maximum = $Seconds
  $script:cdBar.Value = $Seconds
  $script:cdForm.Controls.Add($script:cdBar)

  $btn = New-Object System.Windows.Forms.Button
  $btn.Text = 'Interromper'
  $btn.Location = New-Object System.Drawing.Point(145, 170)
  $btn.Size = New-Object System.Drawing.Size(130, 32)
  $script:cdForm.Controls.Add($btn)

  $script:cdTimer = New-Object System.Windows.Forms.Timer
  $script:cdTimer.Interval = 1000
  $script:cdTimer.Add_Tick({
      $script:cdLeft = $script:cdLeft - 1
      if ($script:cdLeft -lt 0) { $script:cdLeft = 0 }
      $script:cdNum.Text = "$($script:cdLeft)"
      $script:cdBar.Value = $script:cdLeft
      if ($script:cdLeft -le 0) {
        $script:cdTimer.Stop()
        $script:cdForm.DialogResult = [System.Windows.Forms.DialogResult]::OK
        $script:cdForm.Close()
      }
    })

  $btn.Add_Click({
      $script:cdInterrupted = $true
      $script:cdTimer.Stop()
      $script:cdForm.DialogResult = [System.Windows.Forms.DialogResult]::Abort
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
  }
}

# Retorna 'Continue' ou 'Abort'
function Invoke-LauncherGate {
  param(
    [switch]$SkipUi
  )

  if ($SkipUi) { return 'Continue' }

  $state = Get-LauncherState

  if ($state.mode -eq 'countdown') {
    $cd = Show-CountdownDialog -Seconds 60
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

  # mode ask (primeira vez ou apos interrupcao)
  $dlg = Show-ChecklistDialog
  if (-not $dlg.Confirmed) {
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
