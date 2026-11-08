@echo off
:: Coloca o icone AcompOPMS na Area de Trabalho deste PC.
:: Use apos copiar o pacote para outro computador (pen drive / rede).
setlocal
cd /d "%~dp0"
title AcompOPMS - Atalho na Area de Trabalho

if not exist "%~dp0scripts\Publicar-Atalho-Instalacao.ps1" (
  echo Nao achei scripts\Publicar-Atalho-Instalacao.ps1
  echo Copie a pasta servidor-portatil completa.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Publicar-Atalho-Instalacao.ps1"
if errorlevel 1 (
  echo.
  echo Falha ao criar o atalho.
  pause
  exit /b 1
)

echo.
echo Icone "AcompOPMS" criado na Area de Trabalho.
echo Duplo clique nele para instalar (Servidor ou Cliente).
pause
exit /b 0
