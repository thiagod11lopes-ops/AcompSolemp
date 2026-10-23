@echo off
:: Libera portas do app/API/DNS e sobe o DNS do endereco amigavel (pede Admin).
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Solicitando permissao de Administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cd /d "%~dp0"

netsh advfirewall firewall delete rule name="AcompOPMS App 5173" >nul 2>&1
netsh advfirewall firewall delete rule name="AcompOPMS Supabase 8000" >nul 2>&1
netsh advfirewall firewall delete rule name="AcompOPMS DNS Alias 53" >nul 2>&1
netsh advfirewall firewall add rule name="AcompOPMS App 5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="AcompOPMS Supabase 8000" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="AcompOPMS DNS Alias 53" dir=in action=allow protocol=UDP localport=53

powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Aplicar-Host.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Dns-Alias-Servidor.ps1"

echo.
echo Pronto.
echo   1) Nos outros PCs use o endereco amigavel, ex.:
echo      http://sistema.acompomps.rede:5173
echo   2) No roteador (DHCP/DNS), coloque o IP deste PC como DNS primario.
echo      Assim Chrome/Firefox/Edge resolvem o nome sem instalar nada no cliente.
echo.
pause
