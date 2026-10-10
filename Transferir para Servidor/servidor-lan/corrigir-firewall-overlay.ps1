# Etapa 5 — regra UDP WireGuard (Windows, Admin).
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 51820
$envFile = Join-Path $LanDir 'servidor.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^ACOMOPMS_OVERLAY_WG_PORT=(\d+)') { $script:port = [int]$Matches[1] }
  }
}
$name = "AcompOPMS - Overlay WireGuard UDP $port"
$existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
if ($existing) { Remove-NetFirewallRule -DisplayName $name }
New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow -Protocol UDP -LocalPort $port -Profile Private,Public | Out-Null
Write-Host "[overlay] Firewall: $name"
