@echo off
:: Preparacao UNICA neste PC servidor (Admin).
:: Modo atual: clientes usam o IP (ex.: https://10.6.167.66/). DNS :53 e opcional.
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
echo [2/3] Firewall (80/443) + DNS opcional...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Instalar-Dns-Autostart.ps1"
if errorlevel 1 goto :fail

echo.
echo [3/4] Subindo gateway HTTP/HTTPS...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Iniciar-Gateway.ps1"
if errorlevel 1 (
  echo Aviso: gateway pode falhar se Docker ainda nao estiver no ar. Inicie o servidor depois.
)

echo.
echo [4/4] Instalando inicio automatico no login (rede + servidor)...
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\Instalar-Inicio-Automatico.ps1"
if errorlevel 1 (
  echo Aviso: nao foi possivel registrar o inicio automatico.
)

echo.
echo ============================================================
echo  PRONTO NESTE PC SERVIDOR
echo.
echo  Clientes / outros PCs: abra no navegador o IP HTTPS, ex.:
echo     https://10.6.167.66/
echo  (sem :5173; use o IP fixo escolhido no assistente)
echo.
echo  DNS na porta 53 NAO e obrigatorio no modo IP.
echo ============================================================
echo.
pause
exit /b 0

:fail
echo.
echo ERRO na preparacao (firewall/Aplicar-Host).
echo Se aparecer aviso de porta 53, pode ignorar no modo IP —
echo use https://IP_DO_SERVIDOR/ e rode 2-Iniciar-Servidor.
echo.
pause
exit /b 1
