# Cria C:\Users\User\Desktop\Thiago\Projetos\Instalador OPMS e copia os instaladores gerados.
$ErrorActionPreference = "Stop"
$Dest = "C:\Users\User\Desktop\Thiago\Projetos\Instalador OPMS"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Source = Join-Path $RepoRoot "Para-distribuir"

$Projetos = Split-Path -Parent $Dest
if (-not (Test-Path $Projetos)) {
  New-Item -ItemType Directory -Path $Projetos -Force | Out-Null
}
New-Item -ItemType Directory -Path $Dest -Force | Out-Null

if (Test-Path $Source) {
  Copy-Item -Path (Join-Path $Source "*") -Destination $Dest -Force -Recurse
  Write-Host "Arquivos copiados de Para-distribuir para:"
} else {
  Write-Host "AVISO: Rode scripts\build-tudo.ps1 antes para gerar Para-distribuir."
  Write-Host "Pasta criada vazia:"
}

Write-Host "  $Dest"
Write-Host ""
Write-Host "Dê duplo clique em Instalar-AcompOPMS-*-Windows.exe para instalar."

# Ícone da pasta (opcional)
$Ico = Join-Path $Dest "Instalar-AcompOPMS.ico"
if (Test-Path $Ico) {
  @"
[.ShellClassInfo]
IconResource=Instalar-AcompOPMS.ico,0
ConfirmFileOp=0
"@ | Set-Content -Path (Join-Path $Dest "desktop.ini") -Encoding Unicode
  attrib +s +h (Join-Path $Dest "desktop.ini")
  attrib +r $Dest
}
