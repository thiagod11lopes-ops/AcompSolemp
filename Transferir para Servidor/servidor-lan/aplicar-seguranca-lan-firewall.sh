#!/usr/bin/env bash
# Etapa 15 — bloqueia portas Supabase na LAN (ufw quando disponível).
set -euo pipefail
LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$LAN_DIR/../.." && pwd)"

cd "$LAN_DIR"
PORTS="$(node --input-type=module -e "import('./lib/supabase-internal-ports.mjs').then((m)=>console.log(m.getInternalSupabaseTcpPorts().join(' ')))")"
HTTP_PORT=8080
if [[ -f "$LAN_DIR/servidor.env" ]]; then
  line="$(grep -E '^\s*ACOMOPMS_HTTP_PORT\s*=' "$LAN_DIR/servidor.env" | tail -1 || true)"
  if [[ "$line" =~ =([0-9]+) ]]; then
    HTTP_PORT="${BASH_REMATCH[1]}"
  fi
fi

echo "=== Etapa 15 — Firewall Linux (portas Supabase) ==="
echo "Portas internas: $PORTS"
echo "HTTP público (permitir): $HTTP_PORT/tcp"

if ! command -v ufw >/dev/null 2>&1; then
  cat <<EOF
ufw não encontrado. Aplique manualmente (exemplo):

  sudo iptables -I INPUT -p tcp --dport 54322 -s 192.168.0.0/16 -j DROP
  sudo iptables -I INPUT -p tcp --dport 54321 -s 192.168.0.0/16 -j DROP
  # repita para: $PORTS

Ou instale ufw e execute este script novamente.
Valide: node "$LAN_DIR/verificar-seguranca-lan.mjs"
EOF
  exit 0
fi

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Execute com sudo: sudo bash \"$0\""
  exit 1
fi

ufw allow "${HTTP_PORT}/tcp" comment 'AcompOPMS Caddy LAN' || true
for p in $PORTS; do
  ufw deny "$p/tcp" comment 'AcompOPMS bloqueio Supabase LAN' || true
done
ufw status numbered || true
echo "Valide: node \"$LAN_DIR/verificar-seguranca-lan.mjs\""
