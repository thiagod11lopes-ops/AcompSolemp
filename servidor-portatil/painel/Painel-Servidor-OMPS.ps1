# Painel de instalacao e configuracao - Servidor OMPS
# Uso: Servidor OMPS.vbs / .lnk

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$PackRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Instaladores = Join-Path $PackRoot 'instaladores'
$AcompRoot = Join-Path $PackRoot 'AcompSolemp'
$ScriptsDir = Join-Path $AcompRoot 'servidor-portatil\scripts'
$SupabaseDocker = Join-Path $PackRoot 'supabase-master\docker'
$ConfigEnv = Join-Path $AcompRoot 'servidor-portatil\config.env'
$IconPath = Join-Path $PackRoot 'icons\opms.ico'

function Test-VcRedist {
  $keys = @(
    'HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64'
  )
  foreach ($k in $keys) {
    if (Test-Path $k) {
      try {
        $i = Get-ItemProperty $k -ErrorAction Stop
        if ($i.Installed -eq 1) { return $true }
      } catch { }
    }
  }
  return $false
}

function Test-Wsl {
  try {
    $o = & wsl.exe --status 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) { return $true }
    $o2 = & wsl.exe -l -v 2>&1 | Out-String
    if ($o2 -match 'Ubuntu|docker-desktop|Windows Subsystem') { return $true }
  } catch { }
  return $false
}

function Test-Docker {
  try {
    docker info 1>$null 2>$null
    return ($LASTEXITCODE -eq 0)
  } catch { return $false }
}

function Test-Node {
  try {
    $v = & node -v 2>$null
    return ($LASTEXITCODE -eq 0 -and $v -match '^v\d+')
  } catch { return $false }
}

function Get-Installer([string]$Pattern) {
  if (-not (Test-Path $Instaladores)) { return $null }
  return Get-ChildItem $Instaladores -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like $Pattern } |
    Select-Object -First 1 -ExpandProperty FullName
}

function Update-StatusLabels {
  $script:statusDocker.Text = if (Test-Docker) { 'Instalado' } else { 'Nao instalado' }
  $script:statusDocker.ForeColor = if (Test-Docker) { [Drawing.Color]::DarkGreen } else { [Drawing.Color]::DarkRed }
  $script:btnDocker.Enabled = -not (Test-Docker)

  $script:statusNode.Text = if (Test-Node) { 'Instalado' } else { 'Nao instalado' }
  $script:statusNode.ForeColor = if (Test-Node) { [Drawing.Color]::DarkGreen } else { [Drawing.Color]::DarkRed }
  $script:btnNode.Enabled = -not (Test-Node)

  $script:statusVc.Text = if (Test-VcRedist) { 'Instalado' } else { 'Nao instalado' }
  $script:statusVc.ForeColor = if (Test-VcRedist) { [Drawing.Color]::DarkGreen } else { [Drawing.Color]::DarkRed }
  $script:btnVc.Enabled = -not (Test-VcRedist)

  $script:statusWsl.Text = if (Test-Wsl) { 'Instalado' } else { 'Nao instalado' }
  $script:statusWsl.ForeColor = if (Test-Wsl) { [Drawing.Color]::DarkGreen } else { [Drawing.Color]::DarkRed }
  $script:btnWsl.Enabled = -not (Test-Wsl)

  $script:statusPastas.Text = if ((Test-Path $AcompRoot) -and (Test-Path $SupabaseDocker)) { 'OK' } else { 'Faltando pastas' }
  $script:statusPastas.ForeColor = if ((Test-Path $AcompRoot) -and (Test-Path $SupabaseDocker)) { [Drawing.Color]::DarkGreen } else { [Drawing.Color]::DarkRed }
}

function Start-Installer([string]$Path, [string]$Nome) {
  if (-not $Path -or -not (Test-Path $Path)) {
    [Windows.Forms.MessageBox]::Show(
      ("Instalador de {0} nao encontrado.`nColoque o arquivo em:`n{1}" -f $Nome, $Instaladores),
      'Servidor OMPS',
      [Windows.Forms.MessageBoxButtons]::OK,
      [Windows.Forms.MessageBoxIcon]::Warning
    ) | Out-Null
    return
  }
  Start-Process -FilePath $Path -Wait
  Update-StatusLabels
}

function Set-PackConfigEnv {
  if (-not (Test-Path $ConfigEnv)) {
    $example = Join-Path $AcompRoot 'servidor-portatil\config.env.example'
    if (Test-Path $example) { Copy-Item $example $ConfigEnv -Force }
  }
  if (-not (Test-Path $ConfigEnv)) { return }

  $ip = $null
  try {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object {
        $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*'
      } |
      Where-Object {
        $_.InterfaceAlias -notlike '*Docker*' -and $_.InterfaceAlias -notlike 'vEthernet*' -and $_.InterfaceAlias -notlike '*WSL*'
      } |
      Select-Object -First 1 -ExpandProperty IPAddress
  } catch { }
  if (-not $ip) { $ip = '192.168.0.17' }

  $lines = Get-Content $ConfigEnv -Encoding UTF8
  $map = @{
    'SERVER_HOST'         = $ip
    'SUPABASE_DOCKER_DIR' = $SupabaseDocker
    'FRONTEND_DIR'        = (Join-Path $AcompRoot 'frontend')
  }
  if (-not ($lines -match '^\s*SERVER_ALIAS=')) {
    $map['SERVER_ALIAS'] = 'sistema.acompomps.rede'
  }
  $out = foreach ($line in $lines) {
    $done = $false
    foreach ($k in $map.Keys) {
      if ($line -match ("^\s*{0}=" -f [regex]::Escape($k))) {
        "{0}={1}" -f $k, $map[$k]
        $done = $true
        break
      }
    }
    if (-not $done) { $line }
  }
  foreach ($k in $map.Keys) {
    if (-not ($out -match ("^\s*{0}=" -f [regex]::Escape($k)))) {
      $out += "{0}={1}" -f $k, $map[$k]
    }
  }
  Set-Content -Path $ConfigEnv -Value $out -Encoding UTF8
}

function Invoke-Verification {
  $problems = New-Object System.Collections.Generic.List[string]

  if (-not (Test-Path $AcompRoot)) { $problems.Add('Pasta AcompSolemp nao encontrada no pacote.') }
  if (-not (Test-Path $SupabaseDocker)) { $problems.Add('Pasta supabase-master\docker nao encontrada no pacote.') }
  if (-not (Test-Path (Join-Path $AcompRoot 'frontend'))) { $problems.Add('Pasta frontend nao encontrada.') }
  if (-not (Test-VcRedist)) { $problems.Add('Visual C++ Redistributable nao instalado.') }
  if (-not (Test-Wsl)) { $problems.Add('WSL nao detectado (necessario para Docker Desktop).') }
  if (-not (Test-Node)) { $problems.Add('Node.js nao instalado ou nao esta no PATH.') }
  if (-not (Test-Docker)) { $problems.Add('Docker Desktop nao esta instalado ou nao esta em execucao.') }
  else {
    try {
      docker info 1>$null 2>$null
      if ($LASTEXITCODE -ne 0) { $problems.Add('Docker instalado, mas o mecanismo nao responde. Abra o Docker Desktop e espere ficar Ready.') }
    } catch {
      $problems.Add('Falha ao consultar o Docker.')
    }
  }

  $fe = Join-Path $AcompRoot 'frontend'
  if ((Test-Path $fe) -and -not (Test-Path (Join-Path $fe 'node_modules'))) {
    $problems.Add('frontend\node_modules ausente. Clique em Instalar dependencias do frontend.')
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
  $form2.CancelButton = $btnCancel

  $r = $form2.ShowDialog()
  $want = $chk.Checked
  $form2.Dispose()
  if ($r -ne [Windows.Forms.DialogResult]::OK) { return }

  Set-PackConfigEnv

  if ($want) {
    $desk = [Environment]::GetFolderPath('Desktop')
    $lnkPath = Join-Path $desk 'Iniciar Servidor OMPS.lnk'
    $vbs = Join-Path $PackRoot 'Iniciar-Servidor-OMPS.vbs'
    if (-not (Test-Path $vbs)) {
      $vbs = Join-Path $AcompRoot 'servidor-portatil\Iniciar Servidor OMPS.vbs'
    }
    $wsh = New-Object -ComObject WScript.Shell
    $sc = $wsh.CreateShortcut($lnkPath)
    $sc.TargetPath = $vbs
    $sc.WorkingDirectory = (Split-Path $vbs)
    $sc.WindowStyle = 1
    if (Test-Path $IconPath) { $sc.IconLocation = "$IconPath,0" }
    $sc.Description = 'Inicia o Servidor OMPS'
    $sc.Save()
  }

  # Abre o fluxo normal do servidor (Abrir-Tudo)
  $abrir = Join-Path $ScriptsDir 'Abrir-Tudo.ps1'
  if (Test-Path $abrir) {
    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
      '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', $abrir
    )
  } else {
    [Windows.Forms.MessageBox]::Show(
      "Pacote incompleto: nao achei Abrir-Tudo.ps1.`n$abrir",
      'Servidor OMPS',
      [Windows.Forms.MessageBoxButtons]::OK,
      [Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
  }
}

# ---- UI principal ----
$form = New-Object Windows.Forms.Form
$form.Text = 'Servidor OMPS'
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.ClientSize = New-Object Drawing.Size(560, 460)
$form.Font = New-Object Drawing.Font('Segoe UI', 10)
if (Test-Path $IconPath) {
  try { $form.Icon = New-Object Drawing.Icon $IconPath } catch { }
}

$title = New-Object Windows.Forms.Label
$title.Location = New-Object Drawing.Point(20, 14)
$title.Size = New-Object Drawing.Size(520, 28)
$title.Font = New-Object Drawing.Font('Segoe UI', 14, [Drawing.FontStyle]::Bold)
$title.Text = 'Servidor OMPS — instalacao e configuracao'
$form.Controls.Add($title)

$sub = New-Object Windows.Forms.Label
$sub.Location = New-Object Drawing.Point(20, 48)
$sub.Size = New-Object Drawing.Size(520, 36)
$sub.Text = "Verifique os programas abaixo. Instale os que faltam (um a um) e depois clique em Verificar."
$form.Controls.Add($sub)

function New-StatusRow([int]$Y, [string]$Nome, [scriptblock]$OnInstall) {
  $l = New-Object Windows.Forms.Label
  $l.Location = New-Object Drawing.Point(24, $Y)
  $l.Size = New-Object Drawing.Size(200, 24)
  $l.Text = $Nome
  $form.Controls.Add($l)

  $s = New-Object Windows.Forms.Label
  $s.Location = New-Object Drawing.Point(240, $Y)
  $s.Size = New-Object Drawing.Size(140, 24)
  $s.Text = '...'
  $form.Controls.Add($s)

  $b = New-Object Windows.Forms.Button
  $b.Text = 'Instalar'
  $b.Location = New-Object Drawing.Point(400, ($Y - 2))
  $b.Size = New-Object Drawing.Size(120, 28)
  $b.Add_Click($OnInstall)
  $form.Controls.Add($b)

  return @{ Status = $s; Button = $b }
}

$rowDocker = New-StatusRow 100 'Docker Desktop' { Start-Installer (Get-Installer 'Docker*Installer*.exe') 'Docker Desktop' }
$rowNode   = New-StatusRow 140 'Node.js' { Start-Installer (Get-Installer 'node-*.msi') 'Node.js' }
$rowVc     = New-StatusRow 180 'Visual C++ Redistributable' { Start-Installer (Get-Installer 'vc_redist*.exe') 'Visual C++' }
$rowWsl    = New-StatusRow 220 'WSL' { Start-Installer (Get-Installer 'wsl_update*.msi') 'WSL' }

$script:statusDocker = $rowDocker.Status; $script:btnDocker = $rowDocker.Button
$script:statusNode = $rowNode.Status; $script:btnNode = $rowNode.Button
$script:statusVc = $rowVc.Status; $script:btnVc = $rowVc.Button
$script:statusWsl = $rowWsl.Status; $script:btnWsl = $rowWsl.Button
$script:statusPastas = $null
$lp = New-Object Windows.Forms.Label
$lp.Location = New-Object Drawing.Point(24, 260)
$lp.Size = New-Object Drawing.Size(200, 24)
$lp.Text = 'Pastas do sistema'
$form.Controls.Add($lp)
$script:statusPastas = New-Object Windows.Forms.Label
$script:statusPastas.Location = New-Object Drawing.Point(240, 260)
$script:statusPastas.Size = New-Object Drawing.Size(280, 24)
$form.Controls.Add($script:statusPastas)

$btnNpm = New-Object Windows.Forms.Button
$btnNpm.Text = 'Instalar dependencias do frontend'
$btnNpm.Location = New-Object Drawing.Point(24, 300)
$btnNpm.Size = New-Object Drawing.Size(260, 32)
$btnNpm.Add_Click({
  if (-not (Test-Node)) {
    [Windows.Forms.MessageBox]::Show('Instale o Node.js primeiro.', 'Servidor OMPS') | Out-Null
    return
  }
  $fe = Join-Path $AcompRoot 'frontend'
  if (-not (Test-Path $fe)) {
    [Windows.Forms.MessageBox]::Show("Pasta frontend nao encontrada:`n$fe", 'Servidor OMPS') | Out-Null
    return
  }
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'npm install && pause') -WorkingDirectory $fe -Wait
})
$form.Controls.Add($btnNpm)

$btnRefresh = New-Object Windows.Forms.Button
$btnRefresh.Text = 'Atualizar status'
$btnRefresh.Location = New-Object Drawing.Point(300, 300)
$btnRefresh.Size = New-Object Drawing.Size(140, 32)
$btnRefresh.Add_Click({ Update-StatusLabels })
$form.Controls.Add($btnRefresh)

$btnVerify = New-Object Windows.Forms.Button
$btnVerify.Text = 'Verificar instalacao'
$btnVerify.Location = New-Object Drawing.Point(24, 360)
$btnVerify.Size = New-Object Drawing.Size(200, 40)
$btnVerify.Font = New-Object Drawing.Font('Segoe UI', 10, [Drawing.FontStyle]::Bold)
$btnVerify.Add_Click({
  Update-StatusLabels
  Set-PackConfigEnv
  $problems = Invoke-Verification
  if ($problems.Count -gt 0) {
    [Windows.Forms.MessageBox]::Show(
      ("Problemas encontrados:`n`n- " + ($problems -join "`n- ")),
      'Servidor OMPS — verificacao',
      [Windows.Forms.MessageBoxButtons]::OK,
      [Windows.Forms.MessageBoxIcon]::Warning
    ) | Out-Null
  } else {
    [Windows.Forms.MessageBox]::Show(
      'Verificacao OK. Nenhum problema encontrado.',
      'Servidor OMPS',
      [Windows.Forms.MessageBoxButtons]::OK,
      [Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
    $form.Hide()
    Show-ShortcutChecklist
    $form.Close()
  }
})
$form.Controls.Add($btnVerify)

$btnClose = New-Object Windows.Forms.Button
$btnClose.Text = 'Fechar'
$btnClose.Location = New-Object Drawing.Point(420, 366)
$btnClose.Size = New-Object Drawing.Size(100, 32)
$btnClose.Add_Click({ $form.Close() })
$form.Controls.Add($btnClose)

Update-StatusLabels
[Windows.Forms.Application]::EnableVisualStyles()
[void]$form.ShowDialog()
