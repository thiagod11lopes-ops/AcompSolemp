@echo off
cd /d "%~dp0scripts"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Iniciar-Servidor.ps1" %*
pause
