# Etapa 16 — backup Postgres local
$ErrorActionPreference = 'Stop'
$LanDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& node (Join-Path $LanDir 'backup-banco-local.mjs') @args
