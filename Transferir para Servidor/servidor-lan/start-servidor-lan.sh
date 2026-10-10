#!/usr/bin/env bash
# Sobe Caddy (HTTP LAN) + valida Supabase local. Não registra serviço Windows.
set -euo pipefail

LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$LAN_DIR/../.." && pwd)"
ENV_FILE="$LAN_DIR/servidor.env"
PID_FILE="$LAN_DIR/caddy.pid"
LOG_FILE="$LAN_DIR/caddy.log"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$LAN_DIR/servidor.env.example" "$ENV_FILE"
fi

if [[ ! -d "$ROOT/frontend/dist" ]]; then
  echo "frontend/dist ausente. Rode: bash \"$LAN_DIR/build-producao-lan.sh\""
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI não encontrado."
  exit 1
fi

cd "$ROOT"
if ! supabase status >/dev/null 2>&1; then
  echo "Iniciando Supabase local..."
  supabase start
fi

node "$LAN_DIR/generate-caddyfile.mjs"
node "$LAN_DIR/gerar-server-connection.mjs"

if ! command -v caddy >/dev/null 2>&1; then
  echo "Caddy não encontrado. Instale (ex.: https://caddyserver.com/docs/install#debian-ubuntu-raspbian)"
  echo "  sudo apt install -y caddy   # ou baixe caddy.exe no Windows"
  exit 1
fi

print_urls() {
  (cd "$LAN_DIR" && node --input-type=module <<NODE
import { loadServidorEnv } from './lib/load-servidor-env.mjs'
const c = loadServidorEnv('${ENV_FILE}')
console.log('[servidor-lan] UI:', c.publicOrigin)
console.log('[servidor-lan] Supabase (via proxy):', c.supabasePublicUrl)
console.log('[servidor-lan] Postgres NÃO exposto (127.0.0.1:54322)')
console.log('[servidor-lan] Studio não publicado na LAN (54323 localhost)')
NODE
  )
}

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Caddy já em execução (PID $(cat "$PID_FILE"))."
  print_urls
  exit 0
fi

(cd "$LAN_DIR" && nohup caddy run --config "$LAN_DIR/Caddyfile.generated" --adapter caddyfile >"$LOG_FILE" 2>&1 &)
echo $! >"$PID_FILE"
sleep 2

if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Caddy não iniciou. Veja $LOG_FILE"
  tail -20 "$LOG_FILE" || true
  exit 1
fi

print_urls
echo "Log Caddy: $LOG_FILE"
