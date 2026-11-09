# Assistente de instalacao no PC cliente: endereco, CA (UAC), hosts, atalho, abrir HTTPS.
# Uso: .\Assistente-Instalacao-Cliente.ps1
#      .\Assistente-Instalacao-Cliente.ps1 -CreateDesktopShortcut
#      via Hub-Instalacao-AcompOPMS.ps1

param(
  [switch]$CreateDesktopShortcut
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$themePs1 = Join-Path $PSScriptRoot 'Ui-Theme-Dashboard.ps1'
if (-not (Test-Path -LiteralPath $themePs1)) {
  throw "Ui-Theme-Dashboard.ps1 nao encontrado: $themePs1"
}
. $themePs1

$script:PackRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$script:ClienteDir = Join-Path $script:PackRoot 'cliente'
$script:EnsureCa = Join-Path $PSScriptRoot 'Ensure-Certificado-Confianca.ps1'
$script:DesktopHelper = Join-Path $PSScriptRoot 'Criar-Atalho-Desktop.ps1'
$script:WantDesktop = [bool]$CreateDesktopShortcut

$script:WizardSteps = @(
  @{ id = 'endereco'; title = 'Informar IP do servidor'; hint = 'Digite so o numero do IP (ex.: 192.168.0.17).' },
  @{ id = 'conectividade'; title = 'Testar conectividade HTTPS / CA'; hint = 'Automatico: tenta https://IP/ e a pagina da CA.' },
  @{ id = 'ca'; title = 'Instalar confianca do certificado (UAC)'; hint = 'Pode pedir Administrador. Aceite o UAC para remover o aviso no Chrome/Edge.' },
  @{ id = 'hosts'; title = 'Hosts (desnecessario com IP)'; hint = 'Com IP puro, esta etapa e pulada.' },
  @{ id = 'atalho'; title = 'Atalho ClienteOMPS'; hint = 'Cria atalho Desktop ClienteOMPS apontando para https://IP/.' },
  @{ id = 'abrir'; title = 'Abrir sistema no navegador'; hint = 'Abre o Chrome/Edge em HTTPS e valida a pagina de login.' }
)

$script:StepState = @{}
foreach ($s in $script:WizardSteps) {
  $script:StepState[$s.id] = [ordered]@{ status = 'pending'; detail = '' }
}
$script:WizardBusy = $false
$script:WizardIndex = 0
$script:ServerHost = ''
$script:ServerUrl = ''
$script:HealthOk = $false

function Set-StepUi([string]$Id, [string]$Status, [string]$Detail = '') {
  if ($script:StepState.ContainsKey($Id)) {
    $script:StepState[$Id].status = $Status
    $script:StepState[$Id].detail = $Detail
  }
  if ($script:RefreshSteps) { & $script:RefreshSteps }
  [Windows.Forms.Application]::DoEvents()
}

function Normalize-ServerHostInput([string]$Raw) {
  $h = ([string]$Raw).Trim()
  if (-not $h) { return '' }
  $h = $h -replace '^\s*https?://', ''
  $h = $h.Split('/')[0].Trim()
  $h = $h -replace ':\d+$', ''
  return $h.Trim()
}

function Test-HttpCode([string]$Url, [int]$TimeoutSec = 5) {
  try {
    $code = & curl.exe -sk -o NUL -w '%{http_code}' --connect-timeout $TimeoutSec --max-time ($TimeoutSec + 2) $Url 2>$null
    return "$code"
  } catch { return '000' }
}

function Find-ChromeOrEdge {
  foreach ($c in @(
      (Join-Path ${env:ProgramFiles} 'Google\Chrome\Application\chrome.exe'),
      (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
      (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
      (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
      (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
    )) {
    if ($c -and (Test-Path -LiteralPath $c)) { return $c }
  }
  return $null
}

function Resolve-LocalCaPath {
  foreach ($c in @(
      (Join-Path $script:ClienteDir 'AcompOPMS-rootCA.pem'),
      (Join-Path $script:ClienteDir 'www-ca\AcompOPMS-rootCA.pem')
    )) {
    if (Test-Path -LiteralPath $c) { return (Resolve-Path -LiteralPath $c).Path }
  }
  return $null
}

function Invoke-StepEndereco {
  $h = Normalize-ServerHostInput $script:ServerHost
  if (-not $h) {
    Set-StepUi 'endereco' 'error' 'Informe o IP do servidor acima e clique Continuar.'
    return $false
  }
  if ($h -notmatch '^\d{1,3}(\.\d{1,3}){3}$') {
    Set-StepUi 'endereco' 'error' 'Use apenas o numero do IP (ex.: 192.168.0.17), sem nome amigavel.'
    return $false
  }
  $script:ServerHost = $h
  $script:ServerUrl = "https://{0}/" -f $h
  Set-StepUi 'endereco' 'ok' ("Servidor: {0}" -f $h)
  return $true
}

function Invoke-StepConectividade {
  $h = $script:ServerHost
  Set-StepUi 'conectividade' 'running' 'Testando HTTPS e pagina da CA…'
  $httpsCode = Test-HttpCode ("https://{0}/" -f $h) 6
  $caUrls = @(
    ("http://{0}/acomp-ca/AcompOPMS-rootCA.pem" -f $h),
    ("https://{0}/acomp-ca/AcompOPMS-rootCA.pem" -f $h),
    ("http://{0}/" -f $h)
  )
  $caOk = $false
  $caHit = ''
  foreach ($u in $caUrls) {
    $c = Test-HttpCode $u 5
    if ("$c" -match '^(200|301|302)$') {
      $caOk = $true
      $caHit = $u
      break
    }
  }
  $localCa = Resolve-LocalCaPath
  if ("$httpsCode" -match '^(200|301|302|304)$') {
    $detail = ("HTTPS OK ({0})" -f $httpsCode)
    if ($caOk) { $detail += ("; CA em {0}" -f $caHit) }
    elseif ($localCa) { $detail += '; CA local disponivel na pasta cliente' }
    Set-StepUi 'conectividade' 'ok' $detail
    return $true
  }
  if ($localCa -or $caOk) {
    Set-StepUi 'conectividade' 'ok' ("HTTPS ainda nao respondeu ({0}), mas a CA esta acessivel. Continuando." -f $httpsCode)
    return $true
  }
  Set-StepUi 'conectividade' 'error' ("Sem resposta HTTPS ({0}) e sem CA. Confirme o endereco e se o servidor esta no ar." -f $httpsCode)
  return $false
}

function Invoke-StepCa {
  if (-not (Test-Path -LiteralPath $script:EnsureCa)) {
    Set-StepUi 'ca' 'error' "Ensure-Certificado-Confianca.ps1 nao encontrado: $($script:EnsureCa)"
    return $false
  }
  Set-StepUi 'ca' 'running' 'Instalando CA no armazenamento Raiz (pode pedir UAC)…'
  $args = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $script:EnsureCa, '-ServerHost', $script:ServerHost)
  $localCa = Resolve-LocalCaPath
  if ($localCa) { $args += @('-CaPath', $localCa) }
  try {
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList $args -Wait -PassThru -WindowStyle Normal
    if ($null -ne $p.ExitCode -and $p.ExitCode -ne 0) {
      Set-StepUi 'ca' 'error' ("Falha ao instalar CA (codigo {0}). Aceite o UAC e tente de novo." -f $p.ExitCode)
      return $false
    }
  } catch {
    Set-StepUi 'ca' 'error' $_.Exception.Message
    return $false
  }
  Set-StepUi 'ca' 'ok' 'CA confiavel instalada neste PC'
  return $true
}

function Invoke-StepHosts {
  $h = $script:ServerHost
  # IP puro: hosts nao e necessario
  if ($h -match '^\d{1,3}(\.\d{1,3}){3}$') {
    Set-StepUi 'hosts' 'skip' 'Endereco e IP — hosts desnecessario'
    return $true
  }

  $mapFile = Join-Path $script:ClienteDir 'hosts-map.env'
  $ip = ''
  if (Test-Path -LiteralPath $mapFile) {
    Get-Content -LiteralPath $mapFile -ErrorAction SilentlyContinue | ForEach-Object {
      if ($_ -match '^\s*IP\s*=\s*(.+)$') { $ip = $Matches[1].Trim() }
    }
  }
  if (-not $ip) {
    # Tenta resolver o nome; se ja resolve, ok
    try {
      $resolved = [System.Net.Dns]::GetHostAddresses($h) | Select-Object -First 1
      if ($resolved) {
        Set-StepUi 'hosts' 'skip' ("Nome ja resolve para {0}" -f $resolved.IPAddressToString)
        return $true
      }
    } catch { }
    Set-StepUi 'hosts' 'error' 'Nome nao resolve e hosts-map.env sem IP. Informe o IP do servidor no arquivo cliente\hosts-map.env (IP=...) ou use o IP direto.'
    return $false
  }

  Set-StepUi 'hosts' 'running' ("Mapeando {0} -> {1} (Admin)…" -f $h, $ip)
  $hostsPath = Join-Path $env:SystemRoot 'System32\drivers\etc\hosts'
  $mark = '# acompopms-alias'
  $ps = @"
`$ErrorActionPreference = 'Stop'
`$hostsPath = '$hostsPath'
`$mark = '$mark'
`$alias = '$h'
`$ip = '$ip'
`$lines = Get-Content -LiteralPath `$hostsPath -ErrorAction Stop | Where-Object { `$_ -notmatch [regex]::Escape(`$mark) }
`$lines += ("{0}`t{1}`t{2}" -f `$ip, `$alias, `$mark)
Set-Content -LiteralPath `$hostsPath -Value `$lines -Encoding ASCII
"@
  $tmp = Join-Path $env:TEMP 'acomp-hosts-cliente.ps1'
  Set-Content -LiteralPath $tmp -Value $ps -Encoding UTF8
  try {
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $tmp
    ) -Verb RunAs -Wait -PassThru
    if ($null -ne $p.ExitCode -and $p.ExitCode -ne 0) {
      Set-StepUi 'hosts' 'error' 'Falha ao gravar hosts. Aceite o UAC e tente de novo.'
      return $false
    }
  } catch {
    Set-StepUi 'hosts' 'error' $_.Exception.Message
    return $false
  }
  Set-StepUi 'hosts' 'ok' ("hosts: {0} -> {1}" -f $h, $ip)
  return $true
}

function Invoke-StepAtalho {
  # Sempre cria ClienteOMPS (abre o sistema HTTPS). AcompOPMS continua sendo o instalador.
  if (-not (Test-Path -LiteralPath $script:DesktopHelper)) {
    Set-StepUi 'atalho' 'error' 'Criar-Atalho-Desktop.ps1 nao encontrado'
    return $false
  }
  Set-StepUi 'atalho' 'running' 'Criando atalho ClienteOMPS na Area de Trabalho…'
  $browser = Find-ChromeOrEdge
  $url = $script:ServerUrl
  try {
    if ($browser) {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script:DesktopHelper `
        -Name 'ClienteOMPS' `
        -TargetPath $browser `
        -Arguments $url `
        -WorkingDirectory (Split-Path $browser -Parent) `
        -Description ("Abrir sistema AcompOPMS ({0})" -f $url) | Out-Null
    } else {
      $cmdPath = Join-Path $script:ClienteDir 'Abrir-ClienteOMPS.cmd'
      $cmdBody = "@echo off`r`nstart `"`" `"$url`"`r`n"
      Set-Content -LiteralPath $cmdPath -Value $cmdBody -Encoding ASCII
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script:DesktopHelper `
        -Name 'ClienteOMPS' `
        -TargetPath $cmdPath `
        -WorkingDirectory $script:ClienteDir `
        -Description ("Abrir sistema AcompOPMS ({0})" -f $url) | Out-Null
    }
  } catch {
    Set-StepUi 'atalho' 'error' $_.Exception.Message
    return $false
  }
  Set-StepUi 'atalho' 'ok' ("Atalho ClienteOMPS criado -> {0}" -f $url)
  return $true
}

function Invoke-StepAbrir {
  $url = $script:ServerUrl
  Set-StepUi 'abrir' 'running' ("Abrindo {0}…" -f $url)
  $browser = Find-ChromeOrEdge
  try {
    if ($browser) {
      Start-Process -FilePath $browser -ArgumentList $url | Out-Null
    } else {
      Start-Process $url | Out-Null
    }
  } catch {
    Set-StepUi 'abrir' 'error' $_.Exception.Message
    return $false
  }

  Start-Sleep -Seconds 2
  $code = Test-HttpCode ("https://{0}/login" -f $script:ServerHost) 8
  if ("$code" -notmatch '^(200|301|302|304)$') {
    $code = Test-HttpCode $url 8
  }
  if ("$code" -match '^(200|301|302|304)$') {
    $script:HealthOk = $true
    Set-StepUi 'abrir' 'ok' ("HTTPS respondeu ({0}). Se o Chrome ainda mostrar aviso, feche e abra o navegador." -f $code)
    return $true
  }
  $script:HealthOk = $false
  Set-StepUi 'abrir' 'error' ("Navegador aberto, mas health HTTPS falhou ({0}). Confira rede/firewall/CA." -f $code)
  return $false
}

function Invoke-WizardStep([int]$Index) {
  $step = $script:WizardSteps[$Index]
  switch ($step.id) {
    'endereco' { return Invoke-StepEndereco }
    'conectividade' { return Invoke-StepConectividade }
    'ca' { return Invoke-StepCa }
    'hosts' { return Invoke-StepHosts }
    'atalho' { return Invoke-StepAtalho }
    'abrir' { return Invoke-StepAbrir }
    default {
      Set-StepUi $step.id 'error' 'Etapa desconhecida'
      return $false
    }
  }
}

function Show-AssistenteCliente {
  $t = Get-DashTheme
  $formW = 780
  $formH = 640
  $total = $script:WizardSteps.Count

  $form = New-Object System.Windows.Forms.Form
  Set-DashForm $form 'AcompOPMS — Instalar neste PC (cliente)' $formW $formH
  $form.FormBorderStyle = 'Sizable'
  $form.MaximizeBox = $true
  $form.MinimizeBox = $true
  $form.MinimumSize = New-Object System.Drawing.Size(700, 560)
  $form.TopMost = $false

  $top = New-DashPanel 0 0 $formW 100
  $top.Dock = 'Top'
  $top.Height = 100
  $form.Controls.Add($top)
  $top.Controls.Add((New-DashKicker 'PC cliente' 20 12 700 $t.Panel))
  $top.Controls.Add((New-DashTitle 'Instalar o sistema neste PC' 20 32 700 $t.Panel))
  $top.Controls.Add((New-DashSub 'Passo a passo ate abrir o HTTPS sem aviso de certificado. Informe o IP do servidor e clique Continuar.' 20 68 730 28 $t.Panel))

  $bottom = New-Object System.Windows.Forms.Panel
  $bottom.Dock = 'Bottom'
  $bottom.Height = 200
  $bottom.BackColor = $t.Footer
  $form.Controls.Add($bottom)

  $lblAddr = New-DashLabel 'IP do servidor:' 16 12 420 20 $t.Muted $t.Footer 9
  $bottom.Controls.Add($lblAddr)

  $script:txtHost = New-DashTextBox '192.168.0.17' 16 36 480 30
  $bottom.Controls.Add($script:txtHost)

  $script:chkDesktop = New-DashCheckBox 'Criar atalho ClienteOMPS (sempre recomendado)' 510 38 250 28
  $script:chkDesktop.Checked = $true
  $script:chkDesktop.Enabled = $false
  $script:chkDesktop.BackColor = $t.Footer
  $bottom.Controls.Add($script:chkDesktop)

  $script:lblStatus = New-DashLabel 'Pronto. Digite o IP do servidor e clique Continuar.' 16 78 740 36 $t.Muted $t.Footer 9
  $script:lblStatus.TextAlign = 'TopLeft'
  $bottom.Controls.Add($script:lblStatus)

  $script:barProgress = New-Object System.Windows.Forms.ProgressBar
  $script:barProgress.Location = New-Object System.Drawing.Point(16, 120)
  $script:barProgress.Size = New-Object System.Drawing.Size(500, 18)
  $script:barProgress.Anchor = 'Top,Left,Right'
  $script:barProgress.Minimum = 0
  $script:barProgress.Maximum = 100
  $bottom.Controls.Add($script:barProgress)

  $btnRetry = New-DashButton 'Tentar de novo' 360 150 130 34 'ghost'
  $btnRetry.Enabled = $false
  $btnRetry.Anchor = 'Top,Right'
  $bottom.Controls.Add($btnRetry)

  $btnStart = New-DashButton 'Continuar' 500 150 140 34 'primary'
  $btnStart.Anchor = 'Top,Right'
  $bottom.Controls.Add($btnStart)

  $btnClose = New-DashButton 'Fechar' 650 150 110 34 'ghost'
  $btnClose.Anchor = 'Top,Right'
  $btnClose.Add_Click({ $form.Close() })
  $bottom.Controls.Add($btnClose)

  $list = New-Object System.Windows.Forms.ListView
  $list.View = 'Details'
  $list.FullRowSelect = $true
  $list.GridLines = $true
  $list.HideSelection = $false
  $list.Dock = 'Fill'
  $list.BackColor = $t.PanelAlt
  $list.ForeColor = $t.Text
  $list.Columns.Add('Etapa', 70) | Out-Null
  $list.Columns.Add('Descricao', 280) | Out-Null
  $list.Columns.Add('Status', 90) | Out-Null
  $list.Columns.Add('Detalhe', 300) | Out-Null
  $form.Controls.Add($list)
  $form.Controls.SetChildIndex($list, 0)

  $i = 1
  foreach ($s in $script:WizardSteps) {
    $item = New-Object System.Windows.Forms.ListViewItem ("{0}/{1}" -f $i, $total)
    [void]$item.SubItems.Add($s.title)
    [void]$item.SubItems.Add('Pendente')
    [void]$item.SubItems.Add($s.hint)
    $item.Tag = $s.id
    [void]$list.Items.Add($item)
    $i++
  }

  $script:RefreshSteps = {
    for ($idx = 0; $idx -lt $script:WizardSteps.Count; $idx++) {
      $id = $script:WizardSteps[$idx].id
      $st = $script:StepState[$id]
      $statusText = switch ($st.status) {
        'ok' { 'OK' }
        'skip' { 'Pulado' }
        'running' { 'Executando…' }
        'error' { 'Erro' }
        default { 'Pendente' }
      }
      $list.Items[$idx].SubItems[2].Text = $statusText
      $detail = [string]$st.detail
      if (-not $detail) { $detail = [string]$script:WizardSteps[$idx].hint }
      $list.Items[$idx].SubItems[3].Text = $detail
      $list.Items[$idx].ForeColor = switch ($st.status) {
        'ok' { $t.Ok }
        'skip' { $t.AccentBright }
        'error' { $t.Danger }
        'running' { $t.Warn }
        default { $t.Text }
      }
    }
    $done = @($script:WizardSteps | Where-Object { $script:StepState[$_.id].status -in @('ok', 'skip') }).Count
    $pct = [int][Math]::Floor(($done / [double]$total) * 100)
    if ($pct -gt 100) { $pct = 100 }
    $script:barProgress.Value = $pct
  }

  function Update-Buttons([string]$Mode) {
    switch ($Mode) {
      'busy' {
        $btnStart.Enabled = $false
        $btnRetry.Enabled = $false
        $script:txtHost.Enabled = $false
        $btnStart.Text = 'Continuar'
      }
      'error' {
        $btnStart.Enabled = $true
        $btnRetry.Enabled = $true
        $script:txtHost.Enabled = ($script:WizardSteps[$script:WizardIndex].id -eq 'endereco')
        if ($script:WizardIndex -lt ($total - 1)) { $btnStart.Text = 'Continuar mesmo assim' }
        else { $btnStart.Text = 'Finalizar mesmo assim' }
      }
      'done' {
        $btnRetry.Enabled = $false
        $script:txtHost.Enabled = $false
        if ($script:HealthOk) {
          $btnStart.Enabled = $true
          $btnStart.Text = 'Concluir'
        } else {
          $btnStart.Enabled = $false
          $btnStart.Text = 'Concluir'
        }
      }
      default {
        $btnStart.Enabled = $true
        $btnRetry.Enabled = $false
        $script:txtHost.Enabled = $true
        $btnStart.Text = 'Continuar'
      }
    }
  }

  function Complete-WizardUi {
    & $script:RefreshSteps
    if ($script:HealthOk) {
      $script:lblStatus.Text = ("Pronto. Use o atalho ClienteOMPS ou {0}." -f $script:ServerUrl)
      $script:lblStatus.ForeColor = $t.Ok
      Update-Buttons 'done'
      # Fecha sozinho ao concluir com sucesso (sem voltar ao hub).
      [Windows.Forms.Application]::DoEvents()
      Start-Sleep -Milliseconds 800
      $form.Close()
      return
    }
    $nErr = @($script:WizardSteps | Where-Object { $script:StepState[$_.id].status -eq 'error' }).Count
    $script:lblStatus.Text = ("Fluxo encerrado com {0} erro(s). Veja a etapa em vermelho e use Tentar de novo." -f $nErr)
    $script:lblStatus.ForeColor = $t.Warn
    Update-Buttons 'done'
  }

  function Start-WizardFromCurrent {
    if ($script:WizardBusy) { return }
    $script:WizardBusy = $true
    Update-Buttons 'busy'
    try {
      $script:ServerHost = $script:txtHost.Text
      $script:WantDesktop = $true
      while ($script:WizardIndex -lt $total) {
        $step = $script:WizardSteps[$script:WizardIndex]
        $script:lblStatus.Text = ("Executando {0}/{1}: {2}" -f ($script:WizardIndex + 1), $total, $step.title)
        $script:lblStatus.ForeColor = $t.Muted
        & $script:RefreshSteps
        $ok = Invoke-WizardStep -Index $script:WizardIndex
        & $script:RefreshSteps
        if (-not $ok) {
          $script:lblStatus.Text = ("Erro na etapa {0}/{1}. Use Tentar de novo ou Continuar mesmo assim." -f ($script:WizardIndex + 1), $total)
          $script:lblStatus.ForeColor = $t.Danger
          Update-Buttons 'error'
          return
        }
        $script:WizardIndex++
      }
      Complete-WizardUi
    } finally {
      $script:WizardBusy = $false
    }
  }

  $btnStart.Add_Click({
      if ($script:WizardBusy) { return }
      if ($btnStart.Text -eq 'Concluir') {
        $form.Close()
        return
      }
      if ($script:WizardIndex -lt $total) {
        $curId = $script:WizardSteps[$script:WizardIndex].id
        if ($script:StepState[$curId].status -eq 'error') {
          $detail = [string]$script:StepState[$curId].detail
          if ($detail -and $detail -notmatch '(?i)pulad') {
            Set-StepUi $curId 'error' ("(pulada) {0}" -f $detail)
          }
          $script:WizardIndex++
          & $script:RefreshSteps
          if ($script:WizardIndex -ge $total) {
            Complete-WizardUi
            return
          }
        }
      }
      Start-WizardFromCurrent
    })

  $btnRetry.Add_Click({
      if ($script:WizardBusy) { return }
      $id = $script:WizardSteps[$script:WizardIndex].id
      Set-StepUi $id 'pending' ''
      Start-WizardFromCurrent
    })

  & $script:RefreshSteps
  [void]$form.ShowDialog()
}

try {
  Show-AssistenteCliente
} catch {
  $msg = $_.Exception.Message
  try {
    [Windows.Forms.MessageBox]::Show(
      ("Falha ao abrir o assistente cliente:`n`n{0}" -f $msg),
      'Instalar neste PC',
      'OK',
      'Error'
    ) | Out-Null
  } catch {
    Write-Host ("ERRO: {0}" -f $msg)
    Read-Host 'Pressione Enter para fechar'
  }
  exit 1
}
