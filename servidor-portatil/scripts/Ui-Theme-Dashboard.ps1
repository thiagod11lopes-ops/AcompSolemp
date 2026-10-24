# Tema visual alinhado ao Dashboard AcompOPMS (WinForms).
# Dot-source: . "$PSScriptRoot\Ui-Theme-Dashboard.ps1"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Get-DashTheme {
  return [pscustomobject]@{
    Bg           = [System.Drawing.Color]::FromArgb(7, 17, 14)
    Panel        = [System.Drawing.Color]::FromArgb(18, 36, 29)
    PanelAlt     = [System.Drawing.Color]::FromArgb(12, 26, 20)
    Text         = [System.Drawing.Color]::FromArgb(232, 242, 236)
    Muted        = [System.Drawing.Color]::FromArgb(160, 184, 172)
    Accent       = [System.Drawing.Color]::FromArgb(85, 139, 113)
    AccentBright = [System.Drawing.Color]::FromArgb(122, 168, 146)
    AccentDeep   = [System.Drawing.Color]::FromArgb(63, 107, 86)
    Ok           = [System.Drawing.Color]::FromArgb(78, 207, 138)
    Danger       = [System.Drawing.Color]::FromArgb(255, 140, 130)
    Warn         = [System.Drawing.Color]::FromArgb(240, 197, 106)
    InputBg      = [System.Drawing.Color]::FromArgb(5, 12, 9)
    Border       = [System.Drawing.Color]::FromArgb(70, 100, 85)
    Footer       = [System.Drawing.Color]::FromArgb(10, 22, 17)
  }
}

function Get-DashFont([float]$Size = 10, [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular) {
  foreach ($name in @('Segoe UI', 'Arial')) {
    try { return New-Object System.Drawing.Font($name, $Size, $Style) } catch { }
  }
  return New-Object System.Drawing.Font([System.Drawing.FontFamily]::GenericSansSerif, $Size, $Style)
}

function Set-DashControlColors(
  [System.Windows.Forms.Control]$Control,
  [System.Drawing.Color]$Back,
  [System.Drawing.Color]$Fore
) {
  $Control.BackColor = $Back
  $Control.ForeColor = $Fore
  if ($Control -is [System.Windows.Forms.Button]) {
    $Control.UseVisualStyleBackColor = $false
  }
  if ($Control -is [System.Windows.Forms.CheckBox]) {
    $Control.UseVisualStyleBackColor = $false
  }
}

function Set-DashForm([System.Windows.Forms.Form]$Form, [string]$Title, [int]$Width = 640, [int]$Height = 600) {
  $t = Get-DashTheme
  $Form.Text = $Title
  $Form.StartPosition = 'CenterScreen'
  $Form.FormBorderStyle = 'FixedSingle'
  $Form.MaximizeBox = $false
  $Form.MinimizeBox = $false
  $Form.TopMost = $true
  $Form.ShowInTaskbar = $true
  $Form.ClientSize = New-Object System.Drawing.Size($Width, $Height)
  $Form.BackColor = $t.Bg
  $Form.ForeColor = $t.Text
  $Form.Font = Get-DashFont 10
  $Form.Padding = New-Object System.Windows.Forms.Padding(0)
  try { [System.Windows.Forms.Application]::EnableVisualStyles() } catch { }
}

function New-DashLabel(
  [string]$Text,
  [int]$X,
  [int]$Y,
  [int]$W = 200,
  [int]$H = 24,
  [System.Drawing.Color]$Fore = [System.Drawing.Color]::Empty,
  [System.Drawing.Color]$Back = [System.Drawing.Color]::Empty,
  [float]$Size = 9.5,
  [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular,
  [System.Drawing.ContentAlignment]$Align = [System.Drawing.ContentAlignment]::MiddleLeft
) {
  $t = Get-DashTheme
  if ($Fore.IsEmpty) { $Fore = $t.Text }
  if ($Back.IsEmpty) { $Back = $t.Bg }
  $l = New-Object System.Windows.Forms.Label
  $l.Location = New-Object System.Drawing.Point($X, $Y)
  $l.Size = New-Object System.Drawing.Size($W, $H)
  $l.Text = $Text
  $l.TextAlign = $Align
  $l.Font = Get-DashFont $Size $Style
  $l.AutoSize = $false
  Set-DashControlColors $l $Back $Fore
  return $l
}

function New-DashKicker([string]$Text, [int]$X, [int]$Y, [int]$W = 560, [System.Drawing.Color]$Back = [System.Drawing.Color]::Empty) {
  $t = Get-DashTheme
  if ($Back.IsEmpty) { $Back = $t.Bg }
  return (New-DashLabel $Text.ToUpperInvariant() $X $Y $W 18 $t.AccentBright $Back 7.5 ([System.Drawing.FontStyle]::Bold))
}

function New-DashTitle([string]$Text, [int]$X, [int]$Y, [int]$W = 560, [System.Drawing.Color]$Back = [System.Drawing.Color]::Empty) {
  $t = Get-DashTheme
  if ($Back.IsEmpty) { $Back = $t.Bg }
  return (New-DashLabel $Text $X $Y $W 34 $t.Text $Back 18 ([System.Drawing.FontStyle]::Bold))
}

function New-DashSub([string]$Text, [int]$X, [int]$Y, [int]$W = 560, [int]$H = 36, [System.Drawing.Color]$Back = [System.Drawing.Color]::Empty) {
  $t = Get-DashTheme
  if ($Back.IsEmpty) { $Back = $t.Bg }
  $l = New-DashLabel $Text $X $Y $W $H $t.Muted $Back 9
  $l.TextAlign = 'TopLeft'
  return $l
}

function New-DashTextBox([string]$Text, [int]$X, [int]$Y, [int]$W = 470, [int]$H = 32) {
  $t = Get-DashTheme
  $tb = New-Object System.Windows.Forms.TextBox
  $tb.Location = New-Object System.Drawing.Point($X, $Y)
  $tb.Size = New-Object System.Drawing.Size($W, $H)
  $tb.Text = $Text
  $tb.BorderStyle = 'FixedSingle'
  $tb.Font = Get-DashFont 11
  $tb.BackColor = $t.InputBg
  $tb.ForeColor = $t.Text
  return $tb
}

function Set-DashButtonStyle(
  [System.Windows.Forms.Button]$Button,
  [ValidateSet('primary', 'ghost', 'danger', 'warn')][string]$Kind = 'primary'
) {
  $t = Get-DashTheme
  $Button.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $Button.FlatAppearance.BorderSize = 1
  $Button.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(40, 70, 55)
  $Button.FlatAppearance.MouseDownBackColor = [System.Drawing.Color]::FromArgb(30, 55, 42)
  $Button.UseVisualStyleBackColor = $false
  $Button.Cursor = [System.Windows.Forms.Cursors]::Hand
  $Button.Font = Get-DashFont 9.5 ([System.Drawing.FontStyle]::Bold)
  $Button.TextAlign = 'MiddleCenter'
  switch ($Kind) {
    'primary' {
      $Button.BackColor = $t.AccentBright
      $Button.ForeColor = [System.Drawing.Color]::FromArgb(7, 17, 14)
      $Button.FlatAppearance.BorderColor = $t.AccentBright
      $Button.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(150, 190, 168)
      $Button.FlatAppearance.MouseDownBackColor = $t.Accent
    }
    'ghost' {
      $Button.BackColor = $t.PanelAlt
      $Button.ForeColor = $t.Text
      $Button.FlatAppearance.BorderColor = $t.Border
    }
    'danger' {
      $Button.BackColor = [System.Drawing.Color]::FromArgb(55, 24, 22)
      $Button.ForeColor = $t.Danger
      $Button.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(160, 70, 60)
      $Button.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(75, 32, 28)
    }
    'warn' {
      $Button.BackColor = [System.Drawing.Color]::FromArgb(48, 40, 18)
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
  [int]$H = 38,
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
  $p.ForeColor = $t.Text
  return $p
}

function New-DashFooter([int]$Y, [int]$W, [int]$H = 72) {
  $t = Get-DashTheme
  $p = New-Object System.Windows.Forms.Panel
  $p.Location = New-Object System.Drawing.Point(0, $Y)
  $p.Size = New-Object System.Drawing.Size($W, $H)
  $p.BackColor = $t.Footer
  $p.ForeColor = $t.Text
  return $p
}

function New-DashStatusBadge([string]$Text, [bool]$Ok, [int]$X, [int]$Y, [int]$W = 130, [int]$H = 26) {
  $t = Get-DashTheme
  $fore = if ($Ok) { $t.Ok } else { $t.Danger }
  $back = if ($Ok) {
    [System.Drawing.Color]::FromArgb(18, 48, 34)
  } else {
    [System.Drawing.Color]::FromArgb(48, 22, 20)
  }
  $l = New-DashLabel $Text $X $Y $W $H $fore $back 8.5 ([System.Drawing.FontStyle]::Bold) 'MiddleCenter'
  return $l
}

function New-DashCheckBox([string]$Text, [int]$X, [int]$Y, [int]$W = 500, [int]$H = 28) {
  $t = Get-DashTheme
  $chk = New-Object System.Windows.Forms.CheckBox
  $chk.Location = New-Object System.Drawing.Point($X, $Y)
  $chk.Size = New-Object System.Drawing.Size($W, $H)
  $chk.Text = $Text
  $chk.Font = Get-DashFont 9.5
  $chk.FlatStyle = 'Flat'
  $chk.UseVisualStyleBackColor = $false
  $chk.BackColor = $t.Panel
  $chk.ForeColor = $t.Text
  return $chk
}
