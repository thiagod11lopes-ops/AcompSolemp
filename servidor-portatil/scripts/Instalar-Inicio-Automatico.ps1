# Registra inicio automatico completo apos o login:
#  1) AcompOPMS-PrepararRede  (SYSTEM) — hosts, firewall, DNS, HTTPS
#  2) AcompOPMS-DnsAlias      (SYSTEM) — DNS do alias na porta 53
#  3) AcompOPMS-IniciarServidor (usuario) — Docker + stack + gateway (sem UI)
#
# Uso: .\Instalar-Inicio-Automatico.ps1
#      .\Instalar-Inicio-Automatico.ps1 -DelaySeconds 120
# Prefira rodar como Administrador (Liberar-Firewall.cmd ja chama este script).

param(
  [int]$DelaySeconds = 90,
  [int]$RedeDelaySeconds = 25
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

function Test-IsAdmin {
  try {
    return ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).
      IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch { return $false }
}

$ps1Start = Join-Path $PSScriptRoot 'Abrir-Tudo.ps1'
$ps1Rede = Join-Path $PSScriptRoot 'Preparar-Rede-Boot.ps1'
$ps1Dns = Join-Path $PSScriptRoot 'Dns-Alias-Servidor.ps1'
if (-not (Test-Path $ps1Start)) { throw "Nao achei: $ps1Start" }
if (-not (Test-Path $ps1Rede)) { throw "Nao achei: $ps1Rede" }

$isAdmin = Test-IsAdmin
if (-not $isAdmin) {
  Write-Host 'Sem Admin: instalando so a tarefa do servidor (rede/DNS elevados ficam incompletos).'
  Write-Host 'Rode Liberar-Firewall.cmd como Administrador UMA VEZ para automacao total.'
}

# --- Tarefa: subir stack sem UI ---
# Silent + SkipLauncherUi + NoBrowser = zero intervencao no boot.
$argStart = "-NoProfile -STA -WindowStyle Minimized -ExecutionPolicy Bypass -File `"$ps1Start`" -Silent -SkipLauncherUi -NoBrowser"
$actionStart = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argStart -WorkingDirectory $PSScriptRoot
$triggerStart = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
try {
  $triggerStart.Delay = 'PT{0}S' -f ([Math]::Max(30, $DelaySeconds))
} catch {
  Write-Host 'Aviso: nao foi possivel definir atraso no trigger do servidor.'
}
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$principalUser = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName 'AcompOPMS-IniciarServidor' `
  -Action $actionStart `
  -Trigger $triggerStart `
  -Settings $settings `
  -Principal $principalUser `
  -Description 'Inicia Docker + Supabase + app + gateway AcompOPMS apos o login (sem UI).' `
  -Force | Out-Null

if ($isAdmin) {
  # --- Tarefa: preparar rede (hosts/firewall/DNS/HTTPS) ---
  $argRede = "-NoProfile -ExecutionPolicy Bypass -File `"$ps1Rede`""
  $actionRede = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argRede -WorkingDirectory $PSScriptRoot
  $triggerRede = New-ScheduledTaskTrigger -AtLogOn
  try { $triggerRede.Delay = 'PT{0}S' -f ([Math]::Max(10, $RedeDelaySeconds)) } catch { }
  $principalSys = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

  Register-ScheduledTask `
    -TaskName 'AcompOPMS-PrepararRede' `
    -Action $actionRede `
    -Trigger $triggerRede `
    -Settings $settings `
    -Principal $principalSys `
    -Description 'Prepara hosts, firewall, DNS e HTTPS do AcompOPMS no login.' `
    -Force | Out-Null

  # DNS dedicado (mantem o que Liberar-Firewall ja instalava)
  try {
    & "$PSScriptRoot\Instalar-Dns-Autostart.ps1"
  } catch {
    Write-Host "Aviso DNS autostart: $($_.Exception.Message)"
  }

  # Executa a preparacao agora (nao espera o proximo reboot)
  try {
    Write-Host 'Executando Preparar-Rede-Boot agora...'
    & $ps1Rede
  } catch {
    Write-Host "Aviso preparacao imediata: $($_.Exception.Message)"
  }
}

Write-Host ''
Write-Host 'Inicio automatico instalado.'
Write-Host '  Tarefa servidor: AcompOPMS-IniciarServidor (login + ~' + $DelaySeconds + 's)'
if ($isAdmin) {
  Write-Host '  Tarefa rede:     AcompOPMS-PrepararRede (login + ~' + $RedeDelaySeconds + 's, SYSTEM)'
  Write-Host '  Tarefa DNS:      AcompOPMS-DnsAlias'
}
Write-Host ('  Log servidor:  {0}' -f (Join-Path (Get-ServidorRoot) 'logs\iniciar-auto.log'))
Write-Host ('  Log rede:      {0}' -f (Join-Path (Get-ServidorRoot) 'logs\preparar-rede-boot.log'))
Write-Host ''
Write-Host 'Para remover: .\Remover-Inicio-Automatico.ps1'
Write-Host 'Para testar servidor: Start-ScheduledTask -TaskName AcompOPMS-IniciarServidor'
if ($isAdmin) {
  Write-Host 'Para testar rede:     Start-ScheduledTask -TaskName AcompOPMS-PrepararRede'
}
