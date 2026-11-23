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
LOOPBACK_NET="$(node "$LAN_DIR/lib/ensure-supabase-loopback-network.mjs")"
supabase stop
supabase start --network-id "$LOOPBACK_NET"

echo "OK. Refaca o build LAN se mudou IP/porta: build-producao-lan.sh"
