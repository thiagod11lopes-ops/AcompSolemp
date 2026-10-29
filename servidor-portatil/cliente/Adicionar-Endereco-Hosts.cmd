@echo off
:: So use se Liberar-Firewall + DNS do roteador nao estiver disponivel.
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Solicitando permissao de Administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

set "MAP=%~dp0hosts-map.env"
set "ALIAS=sistema.acompomps.rede"
set "IP=192.168.0.17"

if exist "%MAP%" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%MAP%") do (
    if /I "%%A"=="ALIAS" set "ALIAS=%%B"
    if /I "%%A"=="IP" set "IP=%%B"
  )
)

set "HOSTS=%SystemRoot%\System32\drivers\etc\hosts"
set "MARK=# acompopms-alias"

echo.
echo Mapeando %ALIAS% -^> %IP% neste PC...
findstr /v /c:"%MARK%" "%HOSTS%" > "%TEMP%\hosts-acomp.tmp"
echo %IP%	%ALIAS%	%MARK%>> "%TEMP%\hosts-acomp.tmp"
copy /Y "%TEMP%\hosts-acomp.tmp" "%HOSTS%" >nul
echo.
echo Pronto. Digite EXATAMENTE no navegador:
echo   %ALIAS%
echo (sem http e sem porta)
echo.
pause
