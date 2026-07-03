# Publica o AcompSolemp no GitHub (execute na pasta raiz do projeto)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Verificando login do GitHub CLI..." -ForegroundColor Cyan
gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Autorize o terminal (mesmo logado no site):" -ForegroundColor Yellow
    Write-Host "  1. Abra: https://github.com/login/device"
    Write-Host "  2. Cole o codigo que aparecer abaixo"
    Write-Host ""
    gh auth login --hostname github.com --git-protocol https --web
}

Write-Host ""
Write-Host "Criando repositorio e enviando codigo..." -ForegroundColor Cyan
$exists = git remote get-url origin 2>$null
if (-not $exists) {
    gh repo create AcompSolemp --private --source=. --remote=origin --push
} else {
    git push -u origin main
}

Write-Host ""
Write-Host "Concluido! Ative GitHub Pages em:" -ForegroundColor Green
Write-Host "  Repositorio -> Settings -> Pages -> Source: GitHub Actions"
