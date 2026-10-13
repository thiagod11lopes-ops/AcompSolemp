#!/usr/bin/env bash
# Etapa 6 — export connection.json
set -euo pipefail
LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
NAME=""
OUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) NAME="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    *) echo "Uso: $0 --name \"PC-1\" [--out path]"; exit 1 ;;
  esac
done
[[ -n "$NAME" ]] || { echo "Informe --name"; exit 1; }
ARGS=(--name "$NAME")
[[ -n "$OUT" ]] && ARGS+=(--out "$OUT")
node "$LAN_DIR/exportar-connection-json.mjs" "${ARGS[@]}"
