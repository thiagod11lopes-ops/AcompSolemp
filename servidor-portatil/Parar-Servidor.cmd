@echo off
cd /d "%~dp0scripts"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Parar-Servidor.ps1" %*
pause
