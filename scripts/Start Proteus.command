#!/bin/zsh
set -e
cd "$(dirname "$0")/.."
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [[ ! -d node_modules ]]; then
  echo 'Install dependencies first with npm ci.'
  exit 1
fi
exec npm run desktop
