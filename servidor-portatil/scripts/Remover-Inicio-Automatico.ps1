# Remove as tarefas de inicio automatico do AcompOPMS.
# Uso: .\Remover-Inicio-Automatico.ps1

$ErrorActionPreference = 'Continue'

$names = @(
  'AcompOPMS-IniciarServidor',
  'AcompOPMS-PrepararRede',
  'AcompOPMS-DnsAlias'
)

foreach ($taskName in $names) {
  $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if (-not $existing) {
    Write-Host "Nenhuma tarefa '$taskName' encontrada."
    continue
  }
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Removido: $taskName"
}

Write-Host 'O servidor/rede nao vao mais subir sozinhos no login.'
