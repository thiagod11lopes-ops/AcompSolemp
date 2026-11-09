# Instalacao direta do PC SERVIDOR (senha Marinha) — sem hub Cliente.
# Uso: .\Instalar-Pacote-Servidor.ps1
#      ..\Instalar Servidor.vbs (na pasta transferivel Servidor)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$themePs1 = Join-Path $PSScriptRoot 'Ui-Theme-Dashboard.ps1'
if (-not (Test-Path -LiteralPath $themePs1)) { throw "Ui-Theme-Dashboard.ps1 nao encontrado: $themePs1" }
. $themePs1

function Test-SenhaInstalacaoServidor {
  $t = Get-DashTheme
  $dlg = New-Object System.Windows.Forms.Form
  Set-DashForm $dlg 'Senha — Instalacao do Servidor' 420 220
  $dlg.TopMost = $true
  $dlg.Controls.Add((New-DashKicker 'Protecao' 24 16 360 $t.Bg))
  $dlg.Controls.Add((New-DashTitle 'Senha do servidor' 24 36 360 $t.Bg))
  $dlg.Controls.Add((New-DashSub 'Informe a senha para continuar a instalacao do PC servidor.' 24 74 370 28 $t.Bg))
  $dlg.Controls.Add((New-DashLabel 'Senha:' 24 112 80 28 $t.Text $t.Bg 9.5))
  $txt = New-DashTextBox '' 100 110 280 30
  $txt.UseSystemPasswordChar = $true
  $dlg.Controls.Add($txt)
  $btnOk = New-DashButton 'Continuar' 170 158 110 34 'primary'
  $btnCancel = New-DashButton 'Cancelar' 290 158 100 34 'ghost'
  $dlg.Controls.Add($btnOk)
  $dlg.Controls.Add($btnCancel)
  $dlg.AcceptButton = $btnOk
  $dlg.CancelButton = $btnCancel
  $script:SenhaOk = $false
  $btnOk.Add_Click({
      if ([string]$txt.Text -ceq 'Marinha') {
        $script:SenhaOk = $true
        $dlg.DialogResult = [System.Windows.Forms.DialogResult]::OK
        $dlg.Close()
      } else {
        [Windows.Forms.MessageBox]::Show('Senha incorreta.', 'Instalacao do Servidor', 'OK', 'Warning') | Out-Null
        $txt.SelectAll(); $txt.Focus()
      }
    })
  $btnCancel.Add_Click({
      $script:SenhaOk = $false
      $dlg.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
      $dlg.Close()
    })
  [void]$dlg.ShowDialog()
  $ok = [bool]$script:SenhaOk
  try { $dlg.Dispose() } catch { }
  return $ok
}

if (-not (Test-SenhaInstalacaoServidor)) { exit 0 }

function Sync-PackConfigPaths {
  # Atualiza FRONTEND_DIR / SUPABASE_DOCKER_DIR para o local atual do pacote (outro PC).
  $spRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $acomp = Split-Path $spRoot -Parent
  $gereal = Split-Path $acomp -Parent
  $fe = Join-Path $acomp 'frontend'
  $sb = Join-Path $gereal 'supabase-master\docker'
  if (-not (Test-Path -LiteralPath $sb)) {
    $sb = Join-Path (Split-Path $acomp -Parent) 'supabase-master\docker'
  }
  $cfg = Join-Path $spRoot 'config.env'
  if (-not (Test-Path -LiteralPath $cfg)) { return }
  $raw = Get-Content -LiteralPath $cfg -Raw -Encoding UTF8
  if ($fe -and (Test-Path -LiteralPath $fe)) {
    $raw = [regex]::Replace($raw, '(?m)^FRONTEND_DIR=.*$', ("FRONTEND_DIR={0}" -f $fe))
  }
  if ($sb -and (Test-Path -LiteralPath $sb)) {
    $raw = [regex]::Replace($raw, '(?m)^SUPABASE_DOCKER_DIR=.*$', ("SUPABASE_DOCKER_DIR={0}" -f $sb))
  }
  Set-Content -LiteralPath $cfg -Value $raw.TrimEnd() -Encoding UTF8
}

try { Sync-PackConfigPaths } catch { }

$candidates = @(
  (Join-Path $PSScriptRoot '..\painel\Assistente-Instalacao-Servidor.ps1'),
  (Join-Path $PSScriptRoot '..\..\painel\Assistente-Instalacao-Servidor.ps1'),
  (Join-Path $PSScriptRoot '..\AcompSolemp\servidor-portatil\painel\Assistente-Instalacao-Servidor.ps1')
)
$assistente = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $assistente) {
  $walk = $PSScriptRoot
  for ($i = 0; $i -lt 6; $i++) {
    $try = Join-Path $walk 'painel\Assistente-Instalacao-Servidor.ps1'
    if (Test-Path -LiteralPath $try) { $assistente = $try; break }
    $try = Join-Path $walk 'AcompSolemp\servidor-portatil\painel\Assistente-Instalacao-Servidor.ps1'
    if (Test-Path -LiteralPath $try) { $assistente = $try; break }
    $parent = Split-Path $walk -Parent
    if (-not $parent -or $parent -eq $walk) { break }
    $walk = $parent
  }
}
if (-not $assistente) { throw 'Assistente-Instalacao-Servidor.ps1 nao encontrado neste pacote.' }

$assistente = (Resolve-Path -LiteralPath $assistente).Path
Push-Location (Split-Path $assistente -Parent)
try {
  # Mesmo processo — sem janela preta extra e sem voltar ao hub.
  & $assistente -CreateDesktopShortcut
} finally {
  Pop-Location
}
exit 0
