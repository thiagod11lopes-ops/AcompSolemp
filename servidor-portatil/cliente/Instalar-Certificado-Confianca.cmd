@echo off
:: Instala a CA do Servidor OMPS (Admin) — UMA VEZ por PC cliente
net session >nul 2>&1
if errorlevel 1 (
  echo Solicitando Administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Instalar-Certificado-Confianca.ps1"
echo.
pause
