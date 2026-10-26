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

function Get-OmpsServerAlias {
  $alias = 'sistema.acompomps.rede'
  try {
    if ($script:ConfigEnv -and (Test-Path -LiteralPath $script:ConfigEnv)) {
      $line = Get-Content -LiteralPath $script:ConfigEnv -Encoding UTF8 |
        Where-Object { $_ -match '^\s*SERVER_ALIAS=' } |
        Select-Object -First 1
      if ($line) {
        $a = ($line -replace '^\s*SERVER_ALIAS=', '').Trim()
        if ($a) { $alias = $a }
      }
    }
  } catch { }
  return $alias
}

function Test-FirewallRulesReady {
  try {
    $out = & netsh advfirewall firewall show rule name='AcompOPMS Gateway 443' 2>$null | Out-String
    if ($out -match 'AcompOPMS Gateway 443') { return $true }
    $out2 = & netsh advfirewall firewall show rule name='AcompOPMS DNS Alias 53' 2>$null | Out-String
    return ($out2 -match 'AcompOPMS DNS Alias 53')
  } catch { return $false }
}

function Test-HostsAliasReady {
  try {
    $alias = Get-OmpsServerAlias
    $hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
    if (-not (Test-Path -LiteralPath $hostsPath)) { return $false }
    $lines = @(Get-Content -LiteralPath $hostsPath -ErrorAction SilentlyContinue)
    return [bool]($lines | Where-Object {
        $_ -and ($_ -match 'acompopms-alias' -or $_ -match [regex]::Escape($alias))
      })
  } catch { return $false }
}

function Test-HttpsAliasReady {
  try {
    $alias = Get-OmpsServerAlias
    $code = & curl.exe -sk -o NUL -w '%{http_code}' --max-time 3 "https://${alias}/login" 2>$null
    return ("$code" -match '^(200|301|302|304|401|403)$')
  } catch { return $false }
}

# Ok = preparado para o endereco HTTPS; Label = texto do badge.
function Get-FirewallRedeState {
  $https = Test-HttpsAliasReady
  $rules = Test-FirewallRulesReady
  $hostsOk = Test-HostsAliasReady
  if ($https) {
    return [pscustomobject]@{ Ok = $true; Label = 'Pronto HTTPS' }
  }
  if ($rules -and $hostsOk) {
    return [pscustomobject]@{ Ok = $true; Label = 'Firewall OK' }
  }
  if ($rules -or $hostsOk) {
    return [pscustomobject]@{ Ok = $false; Label = 'Incompleto' }
  }
  return [pscustomobject]@{ Ok = $false; Label = 'Pendente' }
}

function Test-FirewallRedeReady {
  return [bool]((Get-FirewallRedeState).Ok)
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
  if (-not (Test-FirewallRedeReady)) {
    $alias = Get-OmpsServerAlias
    $problems.Add("Firewall/rede pendente para https://${alias}/. Use Liberar Firewall (Admin).")
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
# Unifica status de instalacao + endereco de rede + contagem 30s (antes eram 2 janelas).
function Show-ServidorOmpsInstallPanel {
  param([switch]$PreStart)

  Initialize-OmpsPanelPaths
  $null = Import-DashThemeForPanel

  $commonPs1 = Join-Path $script:ScriptsDir '_common.ps1'
  if ((Test-Path -LiteralPath $commonPs1) -and -not (Get-Command Get-ServidorRoot -ErrorAction SilentlyContinue)) {
    . $commonPs1
  }
  $launcherPs1 = Join-Path $script:ScriptsDir 'Launcher-UI.ps1'
  if ((Test-Path -LiteralPath $launcherPs1) -and -not (Get-Command Get-AccessInfo -ErrorAction SilentlyContinue)) {
    . $launcherPs1
  }

  $script:panelResult = 'Abort'
  $script:ompsPreStart = [bool]$PreStart
  $script:installAllOk = $false
  $script:statusLeft = 30
  $script:statusPaused = $false
  $script:statusAdvancing = $false
  $theme = Get-DashTheme

  $accessIp = ''
  $accessAlias = Get-OmpsServerAlias
  try {
    if (Get-Command Get-AccessInfo -ErrorAction SilentlyContinue) {
      $info = Get-AccessInfo
      $accessIp = [string]$info.Ip
      $accessAlias = [string]$info.Alias
    }
  } catch { }
  if (-not $accessIp) {
    try { $accessIp = Get-PreferredLanIPv4 } catch { }
  }
  if (-not $accessIp) { $accessIp = '-' }

  $formW = 720
  $formH = 900
  $form = New-Object Windows.Forms.Form
  Set-DashForm $form 'Servidor OMPS' $formW $formH
  if ($script:IconPath -and (Test-Path $script:IconPath)) {
    try { $form.Icon = New-Object Drawing.Icon $script:IconPath } catch { }
  }

  # Header
  $form.Controls.Add((New-DashKicker 'Servidor OMPS' 28 18 ($formW - 56)))
  $form.Controls.Add((New-DashTitle 'Inicializacao do servidor' 28 40 ($formW - 56)))
  $form.Controls.Add((New-DashSub 'Status, rede e contagem em um so lugar. Inicia em 30s ou em Iniciar agora.' 28 78 ($formW - 56) 28))

  # Card de status (pre-requisitos)
  $panel = New-DashPanel 24 112 ($formW - 48) 292
  $form.Controls.Add($panel)
  $panel.Controls.Add((New-DashLabel 'PRE-REQUISITOS' 20 8 280 18 $theme.Muted $theme.Panel 8 ([Drawing.FontStyle]::Bold)))

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
    $s = New-DashStatusBadge '-' $false 290 $Y 150 32
    $Parent.Controls.Add($s)
    $b = New-DashButton 'Instalar' 460 ($Y + 1) 120 30 'ghost'
    $b.Add_Click($OnInstall)
    $Parent.Controls.Add($b)
    return @{ Status = $s; Button = $b }
  }

  function Update-StatusCountdownUi {
    if ($script:lblStatusCountdown) {
      $script:lblStatusCountdown.Text = "{0}" -f $script:statusLeft
    }
    if ($script:barStatusCountdown) {
      $v = [Math]::Max(0, [Math]::Min(30, $script:statusLeft))
      $script:barStatusCountdown.Value = $v
    }
    if ($script:hintAvancar -and -not $script:statusAdvancing) {
      if ($script:statusPaused) {
        $script:hintAvancar.Text = 'Contagem pausada. Retome ou clique em Iniciar agora.'
        $script:hintAvancar.ForeColor = $theme.Warn
      } elseif ($script:installAllOk) {
        $script:hintAvancar.Text = ("Pronto - Iniciar agora ou em {0}s." -f $script:statusLeft)
        $script:hintAvancar.ForeColor = $theme.Ok
      } else {
        $script:hintAvancar.Text = ("Inicia em {0}s. Corrija itens em vermelho se puder." -f $script:statusLeft)
        $script:hintAvancar.ForeColor = $theme.Muted
      }
      $script:hintAvancar.BackColor = $theme.Footer
    }
  }

  function Save-PanelAliasOrWarn([bool]$Force) {
    if (-not $script:txtAlias) { return $true }
    $raw = [string]$script:txtAlias.Text
    try {
      if (Get-Command Save-ServerAlias -ErrorAction SilentlyContinue) {
        $saved = Save-ServerAlias $raw
        $script:txtAlias.Text = $saved
        return $true
      }
      # Fallback sem Launcher-UI: grava SERVER_ALIAS no config.env
      $alias = if (Get-Command Normalize-AliasInput -ErrorAction SilentlyContinue) {
        Normalize-AliasInput $raw
      } else {
        $raw.Trim().ToLowerInvariant()
      }
      if ($script:ConfigEnv -and (Test-Path -LiteralPath $script:ConfigEnv)) {
        if (Get-Command Set-EnvKey -ErrorAction SilentlyContinue) {
          Set-EnvKey $script:ConfigEnv 'SERVER_ALIAS' $alias
        }
      }
      return $true
    } catch {
      if ($Force) { return $true }
      [Windows.Forms.MessageBox]::Show(
        $_.Exception.Message,
        'Endereco invalido',
        [Windows.Forms.MessageBoxButtons]::OK,
        [Windows.Forms.MessageBoxIcon]::Warning
      ) | Out-Null
      return $false
    }
  }

  function Complete-InstallPanelAdvance([bool]$Force = $false) {
    if ($script:statusAdvancing) { return }
    $script:statusAdvancing = $true
    if ($script:statusTimer) { try { $script:statusTimer.Stop() } catch { } }

    Update-StatusLabels
    if (-not (Save-PanelAliasOrWarn -Force:$Force)) {
      $script:statusAdvancing = $false
      if ($script:statusTimer -and -not $script:statusPaused) {
        try { $script:statusTimer.Start() } catch { }
      }
      return
    }
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
      # Sempre permite Iniciar agora; o timer tambem avanca ao fim dos 30s.
      $script:btnAvancar.Enabled = -not $script:statusAdvancing
      Set-DashButtonStyle $script:btnAvancar 'primary'
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

    $fw = Get-FirewallRedeState
    Set-StatusBadge $script:statusFirewall ([bool]$fw.Ok) ([string]$fw.Label) ([string]$fw.Label)
    if ($script:btnFirewall) {
      $script:btnFirewall.Visible = -not [bool]$fw.Ok
      $script:btnFirewall.Enabled = -not [bool]$fw.Ok
    }
    if ($script:lblFirewallHint) {
      $alias = Get-OmpsServerAlias
      if ([bool]$fw.Ok -and $fw.Label -match 'HTTPS') {
        $script:lblFirewallHint.Text = "https://${alias}/ ativo e pronto para usar"
        $script:lblFirewallHint.ForeColor = $theme.Ok
      } elseif ([bool]$fw.Ok) {
        $script:lblFirewallHint.Text = "Firewall OK - suba o servidor para ativar https://${alias}/"
        $script:lblFirewallHint.ForeColor = $theme.AccentBright
      } else {
        $script:lblFirewallHint.Text = "Pendente: Liberar Firewall (Admin) para https://${alias}/"
        $script:lblFirewallHint.ForeColor = $theme.Muted
      }
    }

    Update-AvancarState
  }

  function Start-LiberarFirewall {
    $cmd = $null
    foreach ($c in @(
        (Join-Path $script:PackRoot 'Liberar-Firewall.cmd'),
        (Join-Path $script:ScriptsDir '..\Liberar-Firewall.cmd'),
        (Join-Path (Split-Path $script:ScriptsDir -Parent) 'Liberar-Firewall.cmd')
      )) {
      try {
        if ($c -and (Test-Path -LiteralPath $c)) { $cmd = (Resolve-Path -LiteralPath $c).Path; break }
      } catch { }
    }
    if (-not $cmd) {
      [Windows.Forms.MessageBox]::Show(
        'Nao achei Liberar-Firewall.cmd. Rode-o manualmente na pasta servidor-portatil (Admin).',
        'Servidor OMPS'
      ) | Out-Null
      return
    }
    $script:statusPaused = $true
    try {
      Start-Process -FilePath $cmd -Verb RunAs -Wait
    } catch {
      [Windows.Forms.MessageBox]::Show(
        ("Falha ao abrir Liberar Firewall:`n{0}" -f $_.Exception.Message),
        'Servidor OMPS'
      ) | Out-Null
    } finally {
      $script:statusPaused = $false
    }
    Update-StatusLabels
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

  $y = 32
  $gap = 38
  $rowDocker = New-StatusRow $panel $y 'Docker Desktop' { Start-InstallerLocal (Get-Installer 'Docker*Installer*.exe') 'Docker Desktop' }; $y += $gap
  $rowNode = New-StatusRow $panel $y 'Node.js' { Start-InstallerLocal (Get-Installer 'node-*.msi') 'Node.js' }; $y += $gap
  $rowVc = New-StatusRow $panel $y 'Visual C++ Redistributable' { Start-InstallerLocal (Get-Installer 'vc_redist*.exe') 'Visual C++' }; $y += $gap
  $rowWsl = New-StatusRow $panel $y 'WSL' { Start-InstallerLocal (Get-Installer 'wsl_update*.msi') 'WSL' }; $y += $gap

  $script:statusDocker = $rowDocker.Status; $script:btnDocker = $rowDocker.Button
  $script:statusNode = $rowNode.Status; $script:btnNode = $rowNode.Button
  $script:statusVc = $rowVc.Status; $script:btnVc = $rowVc.Button
  $script:statusWsl = $rowWsl.Status; $script:btnWsl = $rowWsl.Button

  $panel.Controls.Add((New-DashLabel 'Pastas do sistema' 20 $y 250 30 $theme.Text $theme.Panel 10))
  $script:statusPastas = New-DashStatusBadge '-' $false 290 $y 150 30
  $panel.Controls.Add($script:statusPastas)
  $y += $gap

  $panel.Controls.Add((New-DashLabel 'Firewall / HTTPS' 20 $y 250 30 $theme.Text $theme.Panel 10))
  $script:statusFirewall = New-DashStatusBadge 'Pendente' $false 290 $y 150 30
  $panel.Controls.Add($script:statusFirewall)
  $script:btnFirewall = New-DashButton 'Liberar' 500 ($y + 1) 120 28 'ghost'
  $script:btnFirewall.Add_Click({ Start-LiberarFirewall })
  $panel.Controls.Add($script:btnFirewall)
  $script:lblFirewallHint = New-DashLabel '' 20 ($y + 28) 620 20 $theme.Muted $theme.Panel 8
  $panel.Controls.Add($script:lblFirewallHint)

  # Ajuste posicao dos botoes Instalar (form mais largo)
  foreach ($b in @($script:btnDocker, $script:btnNode, $script:btnVc, $script:btnWsl)) {
    if ($b) { $b.Location = New-Object Drawing.Point(500, $b.Location.Y) }
  }

  # Card de rede (ex-cronometro 60s)
  $netCard = New-DashPanel 24 416 ($formW - 48) 148
  $form.Controls.Add($netCard)
  $netCard.Controls.Add((New-DashLabel 'ACESSO NA REDE' 20 10 280 18 $theme.Muted $theme.Panel 8 ([Drawing.FontStyle]::Bold)))
  $netCard.Controls.Add((New-DashLabel ("IP interno: $accessIp") 20 34 640 22 $theme.Muted $theme.Panel 9))
  $netCard.Controls.Add((New-DashLabel 'Endereco para os outros PCs (sem http e sem porta)' 20 58 640 22 $theme.Text $theme.Panel 9.5 ([Drawing.FontStyle]::Bold)))
  $script:txtAlias = New-DashTextBox $accessAlias 20 84 640 34
  $netCard.Controls.Add($script:txtAlias)
  $netCard.Controls.Add((New-DashLabel 'Digite exatamente este texto na barra de endereco dos outros PCs.' 20 122 640 20 $theme.Muted $theme.Panel 8.5))

  # Contagem 30s
  $countCard = New-DashPanel 24 576 ($formW - 48) 100
  $form.Controls.Add($countCard)
  $countCard.Controls.Add((New-DashLabel 'CONTAGEM' 20 10 160 18 $theme.Muted $theme.Panel 8 ([Drawing.FontStyle]::Bold)))
  $countCard.Controls.Add((New-DashLabel 'O servidor inicia automaticamente se voce nao interromper.' 180 10 460 18 $theme.Muted $theme.Panel 8.5))
  $script:lblStatusCountdown = New-DashLabel '30' 20 34 90 48 $theme.AccentBright $theme.Panel 28 ([Drawing.FontStyle]::Bold) 'MiddleLeft'
  $countCard.Controls.Add($script:lblStatusCountdown)
  $countCard.Controls.Add((New-DashLabel 'segundos' 110 48 100 24 $theme.Muted $theme.Panel 9))
  $script:barStatusCountdown = New-Object Windows.Forms.ProgressBar
  $script:barStatusCountdown.Location = New-Object Drawing.Point(220, 52)
  $script:barStatusCountdown.Size = New-Object Drawing.Size(($formW - 48 - 252), 18)
  $script:barStatusCountdown.Minimum = 0
  $script:barStatusCountdown.Maximum = 30
  $script:barStatusCountdown.Value = 30
  $script:barStatusCountdown.Style = 'Continuous'
  $countCard.Controls.Add($script:barStatusCountdown)

  # Acoes secundarias
  $actions = New-DashPanel 24 688 ($formW - 48) 52
  $form.Controls.Add($actions)
  $btnNpm = New-DashButton 'Dependencias frontend' 12 8 200 34 'ghost'
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
        Update-StatusCountdownUi
      }
      Update-StatusLabels
    })
  $actions.Controls.Add($btnNpm)

  $btnRefresh = New-DashButton 'Atualizar' 224 8 120 34 'ghost'
  $btnRefresh.Add_Click({ Update-StatusLabels })
  $actions.Controls.Add($btnRefresh)

  $btnVerify = New-DashButton 'Verificar' 356 8 120 34 'ghost'
  $btnVerify.Add_Click({
      Update-StatusLabels
      Set-PackConfigEnv
      $problems = Invoke-OmpsVerification
      if ($problems.Count -gt 0) {
        [Windows.Forms.MessageBox]::Show(
          ("Problemas encontrados:`n`n- " + ($problems -join "`n- ")),
          'Servidor OMPS - verificacao',
          [Windows.Forms.MessageBoxButtons]::OK,
          [Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
        return
      }
      [Windows.Forms.MessageBox]::Show(
        'Verificacao OK. Voce ja pode Iniciar agora ou aguardar a contagem.',
        'Servidor OMPS',
        [Windows.Forms.MessageBoxButtons]::OK,
        [Windows.Forms.MessageBoxIcon]::Information
      ) | Out-Null
      Update-AvancarState
    })
  $actions.Controls.Add($btnVerify)

  # Footer: Pausar | Interromper | Iniciar agora
  $footer = New-DashFooter 756 $formW 112
  $form.Controls.Add($footer)

  $script:hintAvancar = New-DashLabel 'Inicia automaticamente em 30s.' 28 10 ($formW - 56) 22 $theme.Muted $theme.Footer 9
  $footer.Controls.Add($script:hintAvancar)

  $btnPause = New-DashButton 'Pausar' 28 42 110 40 'ghost'
  $btnPause.Add_Click({
      $script:statusPaused = -not $script:statusPaused
      if ($script:statusPaused) {
        $btnPause.Text = 'Retomar'
      } else {
        $btnPause.Text = 'Pausar'
      }
      Update-StatusCountdownUi
    })
  $footer.Controls.Add($btnPause)

  $btnInterrupt = New-DashButton 'Interromper' 150 42 140 40 'danger'
  $btnInterrupt.Add_Click({
      $script:panelResult = 'Abort'
      $script:statusAdvancing = $true
      if ($script:statusTimer) { try { $script:statusTimer.Stop() } catch { } }
      $form.Close()
    })
  $footer.Controls.Add($btnInterrupt)

  $script:btnAvancar = New-DashButton 'Iniciar agora' ($formW - 200) 42 172 40 'primary'
  $script:btnAvancar.Add_Click({ Complete-InstallPanelAdvance -Force:$true })
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
