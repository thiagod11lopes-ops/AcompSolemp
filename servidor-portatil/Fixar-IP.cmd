@echo off
:: Pede elevação (Administrador) e fixa o IP
powershell -NoProfile -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0scripts\Fixar-IP.ps1\"'"
