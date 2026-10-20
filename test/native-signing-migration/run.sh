#!/bin/sh
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
staging=$(mktemp -d "${TMPDIR:-/tmp}/proteus-signing-migration-test.XXXXXX")
trap 'rm -rf "$staging"' EXIT HUP INT TERM
xcrun swiftc -module-cache-path "$staging/modules" -parse-as-library \
  "$repo/scripts/native-signing-migration.swift" "$repo/test/native-signing-migration/main.swift" \
  -o "$staging/tests"
"$staging/tests"
