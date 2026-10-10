#!/usr/bin/env bash
set -euo pipefail
LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$LAN_DIR/caddy.pid"
if [[ -f "$PID_FILE" ]]; then
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "Caddy encerrado."
else
  echo "Nenhum PID Caddy registrado."
fi
