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
  $theme = Get-DashTheme

  $form = New-Object Windows.Forms.Form
  Set-DashForm $form 'Servidor OMPS' 580 560
  if ($script:IconPath -and (Test-Path $script:IconPath)) {
    try { $form.Icon = New-Object Drawing.Icon $script:IconPath } catch { }
  }

  $form.Controls.Add((New-DashKicker 'Servidor OMPS' 24 16))
  $form.Controls.Add((New-DashTitle 'Status da instalacao' 24 36))
  $form.Controls.Add((New-DashSub 'Verifique os programas. Com tudo OK, use Avancar para a contagem regressiva.' 24 72 530 36))

  $panel = New-DashPanel 20 118 540 250
  $form.Controls.Add($panel)

  function New-StatusRow([System.Windows.Forms.Control]$Parent, [int]$Y, [string]$Nome, [scriptblock]$OnInstall) {
    $l = New-DashLabel $Nome 16 $Y 210 24
    $Parent.Controls.Add($l)
    $s = New-DashLabel '—' 240 $Y 140 24
    $s.Font = Get-DashFont 9.5 ([Drawing.FontStyle]::Bold)
    $Parent.Controls.Add($s)
    $b = New-DashButton 'Instalar' 400 ($Y - 2) 120 28 'ghost'
    $b.Add_Click($OnInstall)
    $Parent.Controls.Add($b)
    return @{ Status = $s; Button = $b }
  }

  function Update-AvancarState {
    Set-PackConfigEnv
    $problems = Invoke-OmpsVerification
    $script:installAllOk = ($problems.Count -eq 0)
    if ($script:btnAvancar) {
      $script:btnAvancar.Enabled = $script:installAllOk
      if ($script:installAllOk) {
        Set-DashButtonStyle $script:btnAvancar 'primary'
        $script:hintAvancar.Text = 'Tudo OK — pode Avancar para a contagem regressiva.'
        $script:hintAvancar.ForeColor = $theme.Ok
      } else {
        Set-DashButtonStyle $script:btnAvancar 'ghost'
        $script:hintAvancar.Text = 'Corrija os itens em vermelho e clique em Verificar.'
        $script:hintAvancar.ForeColor = $theme.Muted
      }
    }
  }

  function Update-StatusLabels {
    $okColor = $theme.Ok
    $badColor = $theme.Danger

    $script:statusDocker.Text = if (Test-DockerApp) { 'Instalado' } else { 'Nao instalado' }
    $script:statusDocker.ForeColor = if (Test-DockerApp) { $okColor } else { $badColor }
    $script:btnDocker.Enabled = -not (Test-DockerApp)

    $script:statusNode.Text = if (Test-NodeApp) { 'Instalado' } else { 'Nao instalado' }
    $script:statusNode.ForeColor = if (Test-NodeApp) { $okColor } else { $badColor }
    $script:btnNode.Enabled = -not (Test-NodeApp)

    $script:statusVc.Text = if (Test-VcRedist) { 'Instalado' } else { 'Nao instalado' }
    $script:statusVc.ForeColor = if (Test-VcRedist) { $okColor } else { $badColor }
    $script:btnVc.Enabled = -not (Test-VcRedist)

    $script:statusWsl.Text = if (Test-Wsl) { 'Instalado' } else { 'Nao instalado' }
    $script:statusWsl.ForeColor = if (Test-Wsl) { $okColor } else { $badColor }
    $script:btnWsl.Enabled = -not (Test-Wsl)

    $okPastas = (Test-Path $script:AcompRoot) -and $script:SupabaseDocker -and (Test-Path $script:SupabaseDocker)
    $script:statusPastas.Text = if ($okPastas) { 'OK' } else { 'Faltando pastas' }
    $script:statusPastas.ForeColor = if ($okPastas) { $okColor } else { $badColor }

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
    Start-Process -FilePath $Path -Wait
    Update-StatusLabels
  }

  $rowDocker = New-StatusRow $panel 16 'Docker Desktop' { Start-InstallerLocal (Get-Installer 'Docker*Installer*.exe') 'Docker Desktop' }
  $rowNode = New-StatusRow $panel 52 'Node.js' { Start-InstallerLocal (Get-Installer 'node-*.msi') 'Node.js' }
  $rowVc = New-StatusRow $panel 88 'Visual C++ Redistributable' { Start-InstallerLocal (Get-Installer 'vc_redist*.exe') 'Visual C++' }
  $rowWsl = New-StatusRow $panel 124 'WSL' { Start-InstallerLocal (Get-Installer 'wsl_update*.msi') 'WSL' }

  $script:statusDocker = $rowDocker.Status; $script:btnDocker = $rowDocker.Button
  $script:statusNode = $rowNode.Status; $script:btnNode = $rowNode.Button
  $script:statusVc = $rowVc.Status; $script:btnVc = $rowVc.Button
  $script:statusWsl = $rowWsl.Status; $script:btnWsl = $rowWsl.Button

  $lp = New-DashLabel 'Pastas do sistema' 16 168 200 24
  $panel.Controls.Add($lp)
  $script:statusPastas = New-DashLabel '—' 240 168 280 24
  $script:statusPastas.Font = Get-DashFont 9.5 ([Drawing.FontStyle]::Bold)
  $panel.Controls.Add($script:statusPastas)

  $btnNpm = New-DashButton 'Instalar dependencias do frontend' 24 384 270 34 'ghost'
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
      Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm install && pause') -WorkingDirectory $fe -Wait
      Update-StatusLabels
    })
  $form.Controls.Add($btnNpm)

  $btnRefresh = New-DashButton 'Atualizar' 310 384 110 34 'ghost'
  $btnRefresh.Add_Click({ Update-StatusLabels })
  $form.Controls.Add($btnRefresh)

  $btnVerify = New-DashButton 'Verificar' 430 384 120 34 'ghost'
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
        'Verificacao OK. Clique em Avancar para a contagem regressiva.',
        'Servidor OMPS',
        [Windows.Forms.MessageBoxButtons]::OK,
        [Windows.Forms.MessageBoxIcon]::Information
      ) | Out-Null
      Update-AvancarState
    })
  $form.Controls.Add($btnVerify)

  $script:hintAvancar = New-DashMutedLabel 'Verifique a instalacao para liberar Avancar.' 24 430 340 40
  $form.Controls.Add($script:hintAvancar)

  $script:btnAvancar = New-DashButton 'Avancar' 300 468 140 40 'primary'
  $script:btnAvancar.Enabled = $false
  $script:btnAvancar.Add_Click({
      Update-StatusLabels
      Set-PackConfigEnv
      $problems = Invoke-OmpsVerification
      if ($problems.Count -gt 0) {
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
    })
  $form.Controls.Add($script:btnAvancar)

  $btnClose = New-DashButton 'Fechar' 450 468 100 40 'ghost'
  $btnClose.Add_Click({ $script:panelResult = 'Abort'; $form.Close() })
  $form.Controls.Add($btnClose)

  Update-StatusLabels
  [void]$form.ShowDialog()
  return $script:panelResult
}

# Dot-source: so define funcoes. -File: abre o painel (standalone ou -PreStart).
if ($MyInvocation.InvocationName -ne '.') {
  $null = Show-ServidorOmpsInstallPanel -PreStart:$PreStart
}
