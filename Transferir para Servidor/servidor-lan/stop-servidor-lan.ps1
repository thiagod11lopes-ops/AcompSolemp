# Para o Caddy iniciado por start-servidor-lan.ps1
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $LanDir 'caddy.pid'

if (-not (Test-Path $PidFile)) {
  Write-Host 'Nenhum PID Caddy registrado.'
  exit 0
}

$pid = Get-Content $PidFile -Raw
$pid = $pid.Trim()
if ($pid -match '^\d+$') {
  Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue
}
Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
Write-Host 'Caddy encerrado.'
