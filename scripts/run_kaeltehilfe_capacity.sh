#!/usr/bin/env bash
set -euo pipefail

# Run the Kaeltehilfe capacity scraper from the repo root, using the repo venv if present.
#
# Examples:
#   scripts/run_kaeltehilfe_capacity.sh            # dry-run
#   scripts/run_kaeltehilfe_capacity.sh --commit   # write to Supabase

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PY="$REPO_ROOT/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  PY="$(command -v python3)"
fi

exec "$PY" -m scripts.scrape_kaeltehilfe_capacity "$@"


