@echo off
cd /d "%~dp0scripts"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Compartilhar-Cliente.ps1"
pause
