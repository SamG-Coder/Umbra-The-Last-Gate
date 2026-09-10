#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  exec node tools/serve.mjs --open
elif command -v python3 >/dev/null 2>&1; then
  exec python3 tools/serve.py --open
else
  echo 'Install Node.js 18+ or Python 3.8+, then run ./start.sh again.' >&2
  exit 1
fi
