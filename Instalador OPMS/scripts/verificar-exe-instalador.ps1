# Mostra qual .exe usar (data/hora e tamanho)
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$paths = @(
  (Join-Path $Root "Para-distribuir"),
  (Join-Path $Root "instalador\dist"),
  "C:\Users\User\Desktop\Thiago\Projetos\Instalador OPMS"
)
foreach ($dir in $paths) {
  if (-not (Test-Path $dir)) { continue }
  Write-Host "`n=== $dir ===" -ForegroundColor Yellow
  Get-ChildItem $dir -Filter "Instalar*.exe" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Format-Table Name, Length, LastWriteTime -AutoSize
}
