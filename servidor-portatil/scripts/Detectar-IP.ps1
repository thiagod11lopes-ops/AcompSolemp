# Mostra IPs IPv4 da máquina e sugere o da LAN.
$ips = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } |
  Select-Object -ExpandProperty IPAddress

Write-Host "IPs detectados:"
$ips | ForEach-Object { Write-Host "  $_" }

$lan = $ips | Where-Object { $_ -like '192.168.*' -or $_ -like '10.*' } | Select-Object -First 1
if ($lan) {
  Write-Host ""
  Write-Host "Sugestão LAN: $lan"
  Write-Host "Para aplicar: .\Aplicar-Host.ps1 -HostAddress $lan"
}
