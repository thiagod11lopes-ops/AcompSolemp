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

echo.
echo Aplicando host/alias...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Aplicar-Host.ps1"
if errorlevel 1 (
  echo ERRO em Aplicar-Host.ps1
  pause
  exit /b 1
)

echo.
echo Iniciando DNS do endereco amigavel...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Dns-Alias-Servidor.ps1"
if errorlevel 1 (
  echo.
  echo ============================================================
  echo  DNS automatico falhou. Faca isto e rode este arquivo de novo:
  echo  1. Win+R -^> ncpa.cpl
  echo  2. Botao direito no Wi-Fi/Ethernet -^> Propriedades
  echo  3. Aba Compartilhamento
  echo  4. DESMARQUE "Permitir que outros usuarios da rede..."
  echo ============================================================
  echo.
  echo Enquanto isso, nos outros PCs use o IP:
  echo   http://192.168.0.17:5173
  echo Ou rode no cliente (uma vez):
  echo   servidor-portatil\cliente\Adicionar-Endereco-Hosts.cmd
  echo.
  pause
  exit /b 1
)

echo.
echo Criando compartilhamento para os clientes...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Compartilhar-Cliente.ps1"

echo.
echo Pronto.
echo   Nos outros PCs AGORA:  http://192.168.0.17:5173
echo   Ou nome do Windows:    http://%COMPUTERNAME%:5173
echo   Nome amigavel:         http://sistema.acompomps.rede:5173
echo     (precisa DNS no roteador = IP deste PC, OU rode no cliente:)
echo     \\%COMPUTERNAME%\AcompOPMS-Cliente\Adicionar-Endereco-Hosts.cmd
echo.
pause
