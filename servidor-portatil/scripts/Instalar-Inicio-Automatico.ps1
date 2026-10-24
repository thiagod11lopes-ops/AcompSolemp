# Registra tarefa no Windows para subir o AcompOPMS ao fazer login.
# Uso: .\Instalar-Inicio-Automatico.ps1
#      .\Instalar-Inicio-Automatico.ps1 -DelaySeconds 120

param(
  [int]$DelaySeconds = 90
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"

$taskName = 'AcompOPMS-IniciarServidor'
$ps1 = Join-Path $PSScriptRoot 'Abrir-Tudo.ps1'
if (-not (Test-Path $ps1)) { throw "Nao achei: $ps1" }

# -STA: dialogos WinForms; -Silent: sem pause no console; cronometro/checklist aparecem.
$arg = "-NoProfile -STA -WindowStyle Minimized -ExecutionPolicy Bypass -File `"$ps1`" -Silent"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg -WorkingDirectory $PSScriptRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
# Atraso para rede/Docker apos o login
try {
  $trigger.Delay = 'PT{0}S' -f ([Math]::Max(15, $DelaySeconds))
} catch {
  Write-Host "Aviso: nao foi possivel definir atraso no trigger; a tarefa roda no login."
}

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1)

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'Inicia Docker + Supabase + app AcompOPMS apos o login do Windows.' `
  -Force | Out-Null

Write-Host ''
Write-Host "Inicio automatico instalado."
Write-Host "  Tarefa:  $taskName"
Write-Host "  Quando:  ao fazer login (atraso ~$DelaySeconds s)"
Write-Host "  Log:     $((Join-Path (Get-ServidorRoot) 'logs\iniciar-auto.log'))"
Write-Host ''
Write-Host 'Para remover: .\Remover-Inicio-Automatico.ps1'
Write-Host 'Para testar agora: Start-ScheduledTask -TaskName AcompOPMS-IniciarServidor'
