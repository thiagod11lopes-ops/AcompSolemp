@echo off
cd /d "%~dp0"
title Preparar pacotes Servidor + Sistema
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Preparar-Pacotes-Transferencia.ps1"
echo.
pause
