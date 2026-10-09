#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/Para-distribuir"
PAYLOAD="$ROOT/instalador/resources/client-payload"

echo "==> Cliente (Linux)"
cd "$ROOT/cliente"
npm install
npm run pack:linux

LINUX_DIR="$ROOT/cliente/dist/linux-unpacked"
if [[ ! -d "$LINUX_DIR" ]]; then
  echo "linux-unpacked não encontrado" >&2
  exit 1
fi

echo "==> Payload"
rm -rf "$PAYLOAD"
mkdir -p "$PAYLOAD"
cp -a "$LINUX_DIR/." "$PAYLOAD/"

echo "==> Instalador AppImage"
cd "$ROOT/instalador"
npm install
npm run dist:linux

mkdir -p "$OUT"
cp -f "$ROOT/instalador/dist/"*.AppImage "$OUT/" 2>/dev/null || true
cp -f "$ROOT/assets/"* "$OUT/" 2>/dev/null || true

echo "Distribuição em: $OUT"
