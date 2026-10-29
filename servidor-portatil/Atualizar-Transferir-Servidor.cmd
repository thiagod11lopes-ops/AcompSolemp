@echo off
title Atualizar Transferir Servidor
cd /d "%~dp0"
set "PS1=%~dp0scripts\Atualizar-Transferir-Servidor.ps1"
if not exist "%PS1%" (
  echo Nao achei:
  echo %PS1%
  pause
  exit /b 1
)
echo Atualizando pasta Transferir Servidor...
echo Aguarde (pode demorar alguns minutos).
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" (
  echo ERRO codigo %ERR%
  pause
  exit /b %ERR%
)
echo Concluido.
pause
