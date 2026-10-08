#!/usr/bin/env bash
# Build de produção apontando Supabase/API para a URL pública LAN (porta HTTP, via Caddy).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$LAN_DIR/servidor.env"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$LAN_DIR/servidor.env.example" "$ENV_FILE"
  echo "Criado $ENV_FILE — ajuste ACOMOPMS_LAN_HOST se necessário."
fi

read_vars() {
  # shellcheck disable=SC1090
  set -a
  source <(grep -v '^#' "$ENV_FILE" | grep '=' | sed 's/\r$//')
  set +a
}
read_vars

PUBLIC_ORIGIN="$(cd "$LAN_DIR" && node --input-type=module <<NODE
import { loadServidorEnv } from './lib/load-servidor-env.mjs'
console.log(loadServidorEnv('${ENV_FILE}').publicOrigin)
NODE
)"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI não encontrado. Instale antes do build LAN."
  exit 1
fi

cd "$ROOT"
ANON_KEY="$(supabase status -o env 2>/dev/null | sed -n 's/^ANON_KEY=//p' | tr -d '"' || true)"
if [[ -z "$ANON_KEY" ]]; then
  echo "Supabase local não está rodando. Execute: supabase start"
  exit 1
fi

echo "Build LAN: VITE_SUPABASE_URL=${PUBLIC_ORIGIN}"
cd "$ROOT/frontend"
export VITE_DATA_SOURCE=supabase
export VITE_SUPABASE_URL="$PUBLIC_ORIGIN"
export VITE_SUPABASE_ANON_KEY="$ANON_KEY"
npm run build

echo "OK: frontend/dist pronto para servir em ${PUBLIC_ORIGIN}"
