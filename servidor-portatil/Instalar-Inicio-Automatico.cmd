@echo off
cd /d "%~dp0scripts"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Instalar-Inicio-Automatico.ps1" %*
echo.
pause
