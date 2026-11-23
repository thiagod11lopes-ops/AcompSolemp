# Etapa 16 — restore Postgres local (destrutivo — exige --confirm)
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& node (Join-Path $LanDir 'restaurar-banco-local.mjs') @args
