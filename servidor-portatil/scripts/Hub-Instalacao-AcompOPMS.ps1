# Hub unico: escolhe instalar Servidor ou Cliente (acesso ao sistema).
# Uso: .\Hub-Instalacao-AcompOPMS.ps1
#      ..\Iniciar AcompOPMS.vbs

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$themePs1 = Join-Path $PSScriptRoot 'Ui-Theme-Dashboard.ps1'
if (-not (Test-Path -LiteralPath $themePs1)) {
  throw "Ui-Theme-Dashboard.ps1 nao encontrado: $themePs1"
}
. $themePs1

$script:PackRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$script:AssistenteServidor = Join-Path $script:PackRoot 'painel\Assistente-Instalacao-Servidor.ps1'
$script:AssistenteCliente = Join-Path $PSScriptRoot 'Assistente-Instalacao-Cliente.ps1'
$script:DesktopHelper = Join-Path $PSScriptRoot 'Criar-Atalho-Desktop.ps1'
$script:HubVbs = Join-Path $script:PackRoot 'Iniciar AcompOPMS.vbs'

function Start-Assistente([string]$Ps1Path, [bool]$CreateDesktop) {
  if (-not (Test-Path -LiteralPath $Ps1Path)) {
    throw "Assistente nao encontrado:`n$Ps1Path"
  }
  $args = @(
    '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass',
    '-File', $Ps1Path
  )
  if ($CreateDesktop) { $args += '-CreateDesktopShortcut' }
  Start-Process -FilePath 'powershell.exe' -ArgumentList $args -WorkingDirectory (Split-Path $Ps1Path -Parent) -Wait
}

function Ensure-HubDesktopShortcut {
  if (-not (Test-Path -LiteralPath $script:DesktopHelper)) { return }
  if (-not (Test-Path -LiteralPath $script:HubVbs)) { return }
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script:DesktopHelper `
    -Name 'AcompOPMS' `
    -TargetPath $script:HubVbs `
    -WorkingDirectory $script:PackRoot `
    -Description 'Instalar ou abrir o AcompOPMS (servidor ou cliente)' | Out-Null
}

function Show-HubInstalacao {
  $t = Get-DashTheme
  $form = New-Object System.Windows.Forms.Form
  Set-DashForm $form 'AcompOPMS — Instalador' 620 520

  $header = New-DashPanel 0 0 620 110
  $form.Controls.Add($header)
  $header.Controls.Add((New-DashKicker 'Instalador portatil' 24 16 560 $t.Panel))
  $header.Controls.Add((New-DashTitle 'Instalar AcompOPMS' 24 36 560 $t.Panel))
  $header.Controls.Add((New-DashSub 'Instalador: escolha Servidor ou Cliente. Ao instalar o servidor, cria o icone Desktop "Servidor" para abrir o sistema depois.' 24 72 570 32 $t.Panel))

  $cardSrv = New-DashPanel 24 130 278 210
  $cardCli = New-DashPanel 318 130 278 210
  $form.Controls.Add($cardSrv)
  $form.Controls.Add($cardCli)

  $cardSrv.Controls.Add((New-DashLabel 'PC SERVIDOR' 16 16 246 22 $t.AccentBright $t.Panel 9 ([System.Drawing.FontStyle]::Bold)))
  $cardSrv.Controls.Add((New-DashLabel 'Instala Docker, Node, rede, HTTPS, sobe o servidor, Dashboard e cria o icone "Servidor".' 16 48 246 70 $t.Muted $t.Panel 9))
  $cardSrv.Controls.Add((New-DashLabel 'Use neste PC que vai hospedar o sistema para a rede.' 16 122 246 40 $t.Text $t.Panel 8.5))
  $btnSrv = New-DashButton 'Instalar servidor' 16 168 246 34 'primary'
  $cardSrv.Controls.Add($btnSrv)

  $cardCli.Controls.Add((New-DashLabel 'PC CLIENTE' 16 16 246 22 $t.AccentBright $t.Panel 9 ([System.Drawing.FontStyle]::Bold)))
  $cardCli.Controls.Add((New-DashLabel 'Instala a confianca do certificado, mapeia o endereco e cria atalho para abrir o sistema.' 16 48 246 70 $t.Muted $t.Panel 9))
  $cardCli.Controls.Add((New-DashLabel 'Use nos outros PCs da rede (nao precisa Docker).' 16 122 246 40 $t.Text $t.Panel 8.5))
  $btnCli = New-DashButton 'Instalar neste PC' 16 168 246 34 'primary'
  $cardCli.Controls.Add($btnCli)

  $chkDesktop = New-DashCheckBox 'Criar atalho na Area de Trabalho' 24 360 560 28
  $chkDesktop.Checked = $true
  $chkDesktop.BackColor = $t.Bg
  $form.Controls.Add($chkDesktop)

  $lblHint = New-DashSub 'Dica: no servidor rode uma vez o fluxo Servidor; depois, nos outros PCs, use o fluxo Cliente com o mesmo endereco.' 24 396 570 40
  $form.Controls.Add($lblHint)

  $footer = New-DashFooter 448 620 72
  $form.Controls.Add($footer)
  $btnClose = New-DashButton 'Fechar' 480 18 116 36 'ghost'
  $footer.Controls.Add($btnClose)
  $lblFoot = New-DashLabel 'HTTPS com CA confiavel (sem aviso no Chrome/Edge)' 24 24 420 28 $t.Muted $t.Footer 8.5
  $footer.Controls.Add($lblFoot)

  $btnSrv.Add_Click({
      $form.Hide()
      try {
        if ($chkDesktop.Checked) { Ensure-HubDesktopShortcut }
        Start-Assistente -Ps1Path $script:AssistenteServidor -CreateDesktop:$chkDesktop.Checked
      } catch {
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Servidor', 'OK', 'Error') | Out-Null
      } finally {
        try { $form.Show() } catch { }
      }
    })

  $btnCli.Add_Click({
      $form.Hide()
      try {
        if ($chkDesktop.Checked) { Ensure-HubDesktopShortcut }
        Start-Assistente -Ps1Path $script:AssistenteCliente -CreateDesktop:$chkDesktop.Checked
      } catch {
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Cliente', 'OK', 'Error') | Out-Null
      } finally {
        try { $form.Show() } catch { }
      }
    })

  $btnClose.Add_Click({ $form.Close() })

  [void]$form.ShowDialog()
}

try {
  Show-HubInstalacao
} catch {
  $msg = $_.Exception.Message
  try {
    [Windows.Forms.MessageBox]::Show(
      ("Falha ao abrir o hub:`n`n{0}" -f $msg),
      'Iniciar AcompOPMS',
      'OK',
      'Error'
    ) | Out-Null
  } catch {
    Write-Host ("ERRO: {0}" -f $msg)
    Read-Host 'Pressione Enter para fechar'
  }
  exit 1
}
