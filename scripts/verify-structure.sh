#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Verifying GTM structure..."
required=(
  README.md LICENSE .gitignore .env.example
  frontend/package.json frontend/src/App.tsx frontend/src/main.tsx
  worker/package.json worker/src/index.ts worker/wrangler.toml
  .github/workflows/build.yml .github/workflows/ci.yml
  docs/API.md docs/SECURITY.md docs/DEPLOYMENT.md
)
for f in "${required[@]}"; do
  if [[ ! -e "$f" ]]; then
    echo "MISSING: $f"
    exit 1
  fi
  echo "OK $f"
done
echo "Structure verification PASS"
