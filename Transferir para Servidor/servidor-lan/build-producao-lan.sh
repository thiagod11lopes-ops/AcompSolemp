#!/usr/bin/env bash
# Etapa 3 — Build frontend/dist com VITE_* apontando para a origem LAN (Caddy).
set -euo pipefail

LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$LAN_DIR/../.." && pwd)"
ENV_FILE="$LAN_DIR/servidor.env"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$LAN_DIR/servidor.env.example" "$ENV_FILE"
  echo "Criado $ENV_FILE — ajuste ACOMOPMS_LAN_HOST se necessário."
fi

cd "$ROOT"
node "$LAN_DIR/lib/write-frontend-env-lan.mjs"

cd "$ROOT/frontend"
if [[ ! -x node_modules/.bin/tsc || ! -x node_modules/.bin/vite ]]; then
  # typescript e vite sao devDependencies; NODE_ENV=production omitiria os dois.
  echo "Instalando dependencias do frontend (npm ci --include=dev)..."
  npm ci --include=dev
fi
npm run build

node "$LAN_DIR/lib/record-lan-build.mjs"
node "$LAN_DIR/gerar-server-connection.mjs"
node "$LAN_DIR/verificar-build-lan.mjs"

PUBLIC_ORIGIN="$(cd "$LAN_DIR" && node --input-type=module -e "import { loadServidorEnv } from './lib/load-servidor-env.mjs'; console.log(loadServidorEnv().publicOrigin)")"
echo "OK: frontend/dist pronto — acesse ${PUBLIC_ORIGIN}/login"
