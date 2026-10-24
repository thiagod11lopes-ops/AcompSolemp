# Remove a tarefa de inicio automatico do AcompOPMS.
# Uso: .\Remover-Inicio-Automatico.ps1

$ErrorActionPreference = 'Stop'

$taskName = 'AcompOPMS-IniciarServidor'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if (-not $existing) {
  Write-Host "Nenhuma tarefa '$taskName' encontrada. Nada a remover."
  exit 0
}

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
Write-Host "Removido: $taskName"
Write-Host 'O servidor nao vai mais subir sozinho no login.'
