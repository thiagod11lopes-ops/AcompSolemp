#!/usr/bin/env bash
# Etapa 5 — sobe interface WireGuard do servidor (Linux, requer sudo).
set -euo pipefail
LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
CONF="$LAN_DIR/overlay/wireguard/acomopms-server.conf"
if [[ ! -f "$CONF" ]]; then
  echo "Rode configurar-overlay-servidor.mjs antes."
  exit 1
fi
sudo wg-quick up "$CONF"
echo "[overlay] WireGuard ativo: $CONF"
