# Recarrega o app_state a partir de um snapshot JSON da pasta Dados.
# Uso:
#   .\Restaurar-Dados-Snapshot.ps1
#   .\Restaurar-Dados-Snapshot.ps1 -SnapshotPath "C:\...\AcompOPMS-Snapshot-atual.json"

param(
  [string]$SnapshotPath
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_common.ps1"
. "$PSScriptRoot\Gestor-Config.ps1"

function Get-AcompSolempRoot {
  $root = Get-ServidorRoot
  $parent = Split-Path $root -Parent
  if (Test-Path (Join-Path $parent 'frontend')) { return $parent }
  return $parent
}

if (-not $SnapshotPath) {
  $SnapshotPath = Join-Path (Get-AcompSolempRoot) 'Dados\AcompOPMS-Snapshot-atual.json'
}
if (-not (Test-Path -LiteralPath $SnapshotPath)) {
  throw "Snapshot nao encontrado: $SnapshotPath"
}

$raw = Get-Content -LiteralPath $SnapshotPath -Raw -Encoding UTF8
$obj = $raw | ConvertFrom-Json
$payload = $obj.data
if (-not $payload) { $payload = $obj }
$payloadJson = $payload | ConvertTo-Json -Depth 40 -Compress
# Escape for SQL dollar-quoting
$tag = 'acomp' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$sql = @"
UPDATE public.app_state a
SET
  payload = ${tag}$payloadJson${tag}::jsonb,
  updated_at = now()
WHERE a.tenant_id = (
  SELECT tenant_id FROM public.app_state ORDER BY updated_at DESC NULLS LAST LIMIT 1
);
SELECT 'ok';
"@

Write-Host "==> Restaurando snapshot:`n  $SnapshotPath"
[void](Invoke-SupabaseSql $sql)
Write-Host 'Restauracao concluida. Atualize o sistema no navegador (F5).'
