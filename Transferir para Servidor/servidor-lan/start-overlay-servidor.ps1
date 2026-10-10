# Etapa 5 — instala/serviço túnel WireGuard servidor (Windows, Admin recomendado).
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Conf = Join-Path $LanDir 'overlay\wireguard\acomopms-server.conf'
if (-not (Test-Path $Conf)) {
  throw 'Rode configurar-overlay-servidor.mjs antes.'
}
$wg = Get-Command wireguard.exe -ErrorAction SilentlyContinue
if (-not $wg) { $wg = Get-Command wg -ErrorAction SilentlyContinue }
if (-not $wg) { throw 'Instale WireGuard for Windows.' }
& $wg.Source '/installtunnelservice', $Conf
Write-Host "[overlay] Servico WireGuard instalado para $Conf"
