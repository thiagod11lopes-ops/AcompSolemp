# Tema visual alinhado ao Dashboard AcompOPMS (WinForms).
# Dot-source: . "$PSScriptRoot\Ui-Theme-Dashboard.ps1"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Get-DashTheme {
  return [pscustomobject]@{
    Bg           = [System.Drawing.Color]::FromArgb(7, 17, 14)
    Panel        = [System.Drawing.Color]::FromArgb(16, 32, 26)
    Text         = [System.Drawing.Color]::FromArgb(232, 242, 236)
    Muted        = [System.Drawing.Color]::FromArgb(143, 168, 155)
    Accent       = [System.Drawing.Color]::FromArgb(85, 139, 113)
    AccentBright = [System.Drawing.Color]::FromArgb(122, 168, 146)
    AccentDeep   = [System.Drawing.Color]::FromArgb(63, 107, 86)
    Ok           = [System.Drawing.Color]::FromArgb(78, 207, 138)
    Danger       = [System.Drawing.Color]::FromArgb(224, 90, 74)
    Warn         = [System.Drawing.Color]::FromArgb(224, 168, 74)
    InputBg      = [System.Drawing.Color]::FromArgb(8, 14, 12)
    Border       = [System.Drawing.Color]::FromArgb(55, 80, 68)
  }
}

function Get-DashFont([float]$Size = 10, [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular) {
  foreach ($name in @('Outfit', 'Segoe UI', 'Arial')) {
    try {
      return New-Object System.Drawing.Font($name, $Size, $Style)
    } catch { }
  }
  return New-Object System.Drawing.Font('Segoe UI', $Size, $Style)
}

function Set-DashForm([System.Windows.Forms.Form]$Form, [string]$Title, [int]$Width = 560, [int]$Height = 520) {
  $t = Get-DashTheme
  $Form.Text = $Title
  $Form.StartPosition = 'CenterScreen'
  $Form.FormBorderStyle = 'FixedDialog'
  $Form.MaximizeBox = $false
  $Form.MinimizeBox = $false
  $Form.TopMost = $true
  $Form.ClientSize = New-Object System.Drawing.Size($Width, $Height)
  $Form.BackColor = $t.Bg
  $Form.ForeColor = $t.Text
  $Form.Font = Get-DashFont 10
  try { [System.Windows.Forms.Application]::EnableVisualStyles() } catch { }
}

function New-DashKicker([string]$Text, [int]$X, [int]$Y, [int]$W = 500) {
  $t = Get-DashTheme
  $l = New-Object System.Windows.Forms.Label
  $l.Location = New-Object System.Drawing.Point($X, $Y)
  $l.Size = New-Object System.Drawing.Size($W, 18)
  $l.Text = $Text.ToUpperInvariant()
  $l.ForeColor = $t.AccentBright
  $l.Font = Get-DashFont 7.5 ([System.Drawing.FontStyle]::Bold)
  return $l
}

function New-DashTitle([string]$Text, [int]$X, [int]$Y, [int]$W = 500) {
  $t = Get-DashTheme
  $l = New-Object System.Windows.Forms.Label
  $l.Location = New-Object System.Drawing.Point($X, $Y)
  $l.Size = New-Object System.Drawing.Size($W, 32)
  $l.Text = $Text
  $l.ForeColor = $t.Text
  $l.Font = Get-DashFont 16 ([System.Drawing.FontStyle]::Bold)
  return $l
}

function New-DashSub([string]$Text, [int]$X, [int]$Y, [int]$W = 500, [int]$H = 40) {
  $t = Get-DashTheme
  $l = New-Object System.Windows.Forms.Label
  $l.Location = New-Object System.Drawing.Point($X, $Y)
  $l.Size = New-Object System.Drawing.Size($W, $H)
  $l.Text = $Text
  $l.ForeColor = $t.Muted
  $l.Font = Get-DashFont 9
  return $l
}

function New-DashLabel([string]$Text, [int]$X, [int]$Y, [int]$W = 200, [int]$H = 24) {
  $t = Get-DashTheme
  $l = New-Object System.Windows.Forms.Label
  $l.Location = New-Object System.Drawing.Point($X, $Y)
  $l.Size = New-Object System.Drawing.Size($W, $H)
  $l.Text = $Text
  $l.ForeColor = $t.Text
  $l.Font = Get-DashFont 9.5
  return $l
}

function New-DashMutedLabel([string]$Text, [int]$X, [int]$Y, [int]$W = 480, [int]$H = 36) {
  $t = Get-DashTheme
  $l = New-Object System.Windows.Forms.Label
  $l.Location = New-Object System.Drawing.Point($X, $Y)
  $l.Size = New-Object System.Drawing.Size($W, $H)
  $l.Text = $Text
  $l.ForeColor = $t.Muted
  $l.Font = Get-DashFont 8.5
  return $l
}

function New-DashTextBox([string]$Text, [int]$X, [int]$Y, [int]$W = 470) {
  $t = Get-DashTheme
  $tb = New-Object System.Windows.Forms.TextBox
  $tb.Location = New-Object System.Drawing.Point($X, $Y)
  $tb.Size = New-Object System.Drawing.Size($W, 28)
  $tb.Text = $Text
  $tb.BackColor = $t.InputBg
  $tb.ForeColor = $t.Text
  $tb.BorderStyle = 'FixedSingle'
  $tb.Font = Get-DashFont 10
  return $tb
}

function Set-DashButtonStyle(
  [System.Windows.Forms.Button]$Button,
  [ValidateSet('primary', 'ghost', 'danger', 'warn')][string]$Kind = 'primary'
) {
  $t = Get-DashTheme
  $Button.FlatStyle = 'Flat'
  $Button.FlatAppearance.BorderSize = 1
  $Button.Cursor = [System.Windows.Forms.Cursors]::Hand
  $Button.Font = Get-DashFont 9.5 ([System.Drawing.FontStyle]::Bold)
  switch ($Kind) {
    'primary' {
      $Button.BackColor = $t.Accent
      $Button.ForeColor = [System.Drawing.Color]::FromArgb(7, 17, 14)
      $Button.FlatAppearance.BorderColor = $t.AccentBright
    }
    'ghost' {
      $Button.BackColor = $t.Panel
      $Button.ForeColor = $t.Text
      $Button.FlatAppearance.BorderColor = $t.Border
    }
    'danger' {
      $Button.BackColor = [System.Drawing.Color]::FromArgb(60, 28, 24)
      $Button.ForeColor = $t.Danger
      $Button.FlatAppearance.BorderColor = $t.Danger
    }
    'warn' {
      $Button.BackColor = [System.Drawing.Color]::FromArgb(48, 40, 20)
      $Button.ForeColor = $t.Warn
      $Button.FlatAppearance.BorderColor = $t.Warn
    }
  }
}

function New-DashButton(
  [string]$Text,
  [int]$X,
  [int]$Y,
  [int]$W = 120,
  [int]$H = 34,
  [ValidateSet('primary', 'ghost', 'danger', 'warn')][string]$Kind = 'primary'
) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $Text
  $b.Location = New-Object System.Drawing.Point($X, $Y)
  $b.Size = New-Object System.Drawing.Size($W, $H)
  Set-DashButtonStyle $b $Kind
  return $b
}

function New-DashPanel([int]$X, [int]$Y, [int]$W, [int]$H) {
  $t = Get-DashTheme
  $p = New-Object System.Windows.Forms.Panel
  $p.Location = New-Object System.Drawing.Point($X, $Y)
  $p.Size = New-Object System.Drawing.Size($W, $H)
  $p.BackColor = $t.Panel
  return $p
}
