#!/usr/bin/env bash
# Etapa 5 — overlay + Auth + server-connection
set -euo pipefail
LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$LAN_DIR/../.." && pwd)"

node "$LAN_DIR/configurar-overlay-servidor.mjs"
node "$LAN_DIR/configure-auth.mjs"
cd "$ROOT"
supabase stop && supabase start
node "$LAN_DIR/gerar-server-connection.mjs"
echo "Opcional: bash \"$LAN_DIR/start-overlay-servidor.sh\" e firewall UDP."
