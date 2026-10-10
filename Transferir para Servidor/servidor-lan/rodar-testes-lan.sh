#!/usr/bin/env bash
# Etapa 4 — executa teste-servidor-lan.mjs
set -euo pipefail
LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$LAN_DIR/../.." && pwd)"

cd "$ROOT/frontend"
if [[ ! -d node_modules ]]; then
  echo "Instalando dependências (npm ci)..."
  npm ci
fi

node "$LAN_DIR/lib/ensure-test-deps.mjs"
node "$LAN_DIR/teste-servidor-lan.mjs"
