#!/usr/bin/env bash
# Etapa 2 — aplica Auth LAN e reinicia Supabase local.
set -euo pipefail
LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$LAN_DIR/../.." && pwd)"

if [[ ! -f "$LAN_DIR/servidor.env" ]]; then
  cp "$LAN_DIR/servidor.env.example" "$LAN_DIR/servidor.env"
fi

echo "==> Configurar Auth (config.toml)"
node "$LAN_DIR/configure-auth.mjs"

echo "==> Reiniciar Supabase local"
cd "$ROOT"
supabase stop
supabase start

echo "OK. Refaca o build LAN se mudou IP/porta: build-producao-lan.sh"
