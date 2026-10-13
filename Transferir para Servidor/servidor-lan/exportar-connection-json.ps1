# Etapa 6 — export connection.json para cliente overlay
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Out
)
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$args = @('--name', $Name)
if ($Out) { $args += @('--out', $Out) }
node (Join-Path $LanDir 'exportar-connection-json.mjs') @args
