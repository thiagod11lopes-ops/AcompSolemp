#!/usr/bin/env bash
set -euo pipefail
LAN_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$LAN_DIR/restaurar-banco-local.mjs" "$@"
