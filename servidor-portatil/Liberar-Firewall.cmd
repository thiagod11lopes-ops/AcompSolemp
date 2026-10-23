@echo off
:: Preparacao UNICA neste PC servidor (Admin).
:: Depois disso, os outros PCs so digitam o nome cadastrado (ex.: sistema.acompomps.rede).
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Solicitando permissao de Administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cd /d "%~dp0"

echo.
echo [1/3] Aplicando IP e nome cadastrado...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Aplicar-Host.ps1"
if errorlevel 1 goto :fail

echo.
echo [2/3] Instalando DNS + firewall (porta 53 e 80)...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Instalar-Dns-Autostart.ps1"
if errorlevel 1 goto :fail

echo.
echo [3/3] Subindo gateway HTTP (porta 80)...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Iniciar-Gateway.ps1"
if errorlevel 1 (
  echo Aviso: gateway pode falhar se Docker ainda nao estiver no ar. Inicie o servidor depois.
)

echo.
echo ============================================================
echo  PRONTO NESTE PC SERVIDOR
echo.
echo  Nos OUTROS PCs, digite EXATAMENTE o nome do campo, ex.:
echo     sistema.acompomps.rede
echo  (sem http:// e sem :5173)
echo.
echo  Se o nome nao abrir nos outros PCs, abra o roteador e
echo  coloque o DNS primario = IP deste PC (uma vez so).
echo  Os usuarios finais nao precisam configurar nada.
echo ============================================================
echo.
pause
exit /b 0

:fail
echo.
echo ERRO na preparacao. Se a porta 53 estiver bloqueada pelo
echo Compartilhamento de Internet:
echo   Win+R -^> ncpa.cpl -^> Wi-Fi/Ethernet -^> Propriedades
echo   Aba Compartilhamento -^> DESMARQUE a opcao de compartilhar
echo   Depois rode este arquivo de novo.
echo.
pause
exit /b 1
