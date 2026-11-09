# Aplica o conteudo de Atualizacao\payload sobre Desktop\Transferir Servidor.
# Uso no PC destino: icone "Atualizar Agora.vbs" (nao precisa Admin).
# Estrutura esperada:
#   Atualizacao\
#     Atualizar Agora.vbs
#     scripts\Aplicar-Atualizacao-Transferir.ps1
#     payload\   (mesmos caminhos relativos de Transferir Servidor)

$ErrorActionPreference = 'Stop'

# ...\Atualizacao\scripts\este.ps1 -> pack = Atualizacao
$packRoot = Split-Path -Parent $PSScriptRoot
$payload = Join-Path $packRoot 'payload'

$desk = [Environment]::GetFolderPath('Desktop')
$dstRoot = Join-Path $desk 'Transferir Servidor'

function Write-Step([string]$Message) {
  Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message)
}

Write-Host '========================================'
Write-Host '  Atualizar Agora (patch pendrive)'
Write-Host '========================================'
Write-Host ("Pacote  : {0}" -f $packRoot)
Write-Host ("Destino : {0}" -f $dstRoot)
Write-Host ''

if (-not (Test-Path -LiteralPath $payload)) {
  throw "Pasta payload nao encontrada:`n$payload`nCopie a pasta Atualizacao completa do pendrive."
}

if (-not (Test-Path -LiteralPath $dstRoot)) {
  throw @"
Pasta destino nao encontrada:
$dstRoot

A Atualizacao so funciona se "Transferir Servidor" ja existir na Area de Trabalho.
Instale/copie o pacote completo primeiro; depois use Atualizar Agora para patches.
"@
}

$stampSrc = Join-Path $packRoot 'versao.txt'
if (Test-Path -LiteralPath $stampSrc) {
  Write-Host '--- versao do pacote ---'
  Get-Content -LiteralPath $stampSrc -Encoding UTF8 | ForEach-Object { Write-Host $_ }
  Write-Host ''
}

Write-Step 'Copiando arquivos do patch...'
New-Item -ItemType Directory -Force -Path $dstRoot | Out-Null
$rcArgs = @(
  $payload, $dstRoot,
  '/E', '/IS', '/IT', '/NFL', '/NDL', '/NJH', '/NJS', '/R:2', '/W:1'
)
& robocopy @rcArgs | Out-Null
$rc = $LASTEXITCODE
# robocopy: 0-7 = ok; >=8 = erro
if ($rc -ge 8) {
  throw "Falha no robocopy (codigo $rc)."
}

$stampDst = Join-Path $dstRoot 'ULTIMA-ATUALIZACAO.txt'
if (Test-Path -LiteralPath $stampSrc) {
  Copy-Item -Force $stampSrc $stampDst
} else {
  "Atualizado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content -LiteralPath $stampDst -Encoding UTF8
}

Write-Host ''
Write-Host 'CONCLUIDO: Transferir Servidor atualizado com o patch.' -ForegroundColor Green
Write-Host 'Proximo passo: rode 2-Iniciar-Servidor-OMPS se o servidor precisar reiniciar.'
Write-Host ''
if ([Environment]::UserInteractive -and -not $env:ACOMP_NO_PAUSE) {
  Write-Host 'Pressione Enter para fechar...'
  try { [void][Console]::ReadLine() } catch { Start-Sleep -Seconds 2 }
}
