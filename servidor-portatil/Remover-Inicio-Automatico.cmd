@echo off
cd /d "%~dp0scripts"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Remover-Inicio-Automatico.ps1" %*
echo.
pause
