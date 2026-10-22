@echo off
:: Libera portas 5173 e 8000 para outros PCs na rede (pede Admin uma vez).
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Solicitando permissao de Administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

netsh advfirewall firewall delete rule name="AcompOPMS App 5173" >nul 2>&1
netsh advfirewall firewall delete rule name="AcompOPMS Supabase 8000" >nul 2>&1
netsh advfirewall firewall add rule name="AcompOPMS App 5173" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="AcompOPMS Supabase 8000" dir=in action=allow protocol=TCP localport=8000

echo.
echo Firewall liberado para:
echo   http://192.168.1.202:5173
echo   http://192.168.1.202:8000
echo.
pause
