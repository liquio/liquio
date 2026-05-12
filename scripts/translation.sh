#!/bin/bash

# Translation parity report script
# Compares front-core locale files and prints rows missing at least one translation.
# Output format:
# path|en-GB|fr-FR|uk-UA

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

show_usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  -h, --help              Show this help message
  -q, --quiet             Suppress verbose output (prints table only)

Output:
  path|en-GB|fr-FR|uk-UA
  Only rows where at least one locale is missing are included.
EOF
}

main() {
  local quiet_flag=""

  while [[ $# -gt 0 ]]; do
    case $1 in
      -h|--help)
        show_usage
        exit 0
        ;;
      -q|--quiet)
        quiet_flag="true"
        shift
        ;;
      *)
        echo -e "${RED}Unknown option: $1${NC}" >&2
        show_usage
        exit 1
        ;;
    esac
  done

  local uk_file="$PROJECT_ROOT/front-core/translation/uk-UA.js"
  local en_file="$PROJECT_ROOT/front-core/translation/en-GB.js"
  local fr_file="$PROJECT_ROOT/front-core/translation/fr-FR.js"

  for file in "$uk_file" "$en_file" "$fr_file"; do
    if [[ ! -f "$file" ]]; then
      echo -e "${RED}Missing locale file: $file${NC}" >&2
      exit 1
    fi
  done

  if [[ -z "$quiet_flag" ]]; then
    echo -e "${BLUE}Generating translation parity report...${NC}" >&2
  fi

  node - "$uk_file" "$en_file" "$fr_file" <<'NODE'
const fs = require('fs');
const vm = require('vm');

const [ukPath, enPath, frPath] = process.argv.slice(2);

function loadLocale(path) {
  let src = fs.readFileSync(path, 'utf8');
  src = src.replace(/export\s+default/, 'module.exports =');
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(src, sandbox, { filename: path });
  return sandbox.module.exports;
}

function flattenLeaves(value, prefix = '', out = new Map()) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of Object.keys(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      flattenLeaves(value[key], path, out);
    }
    return out;
  }

  out.set(prefix, value);
  return out;
}

function normalizeCell(value) {
  if (value === undefined) {
    return '';
  }
  return String(value)
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}

const uk = flattenLeaves(loadLocale(ukPath));
const en = flattenLeaves(loadLocale(enPath));
const fr = flattenLeaves(loadLocale(frPath));

const allPaths = new Set([...uk.keys(), ...en.keys(), ...fr.keys()]);
const sortedPaths = [...allPaths].sort();

console.log('path|en-GB|fr-FR|uk-UA');

for (const path of sortedPaths) {
  const enValue = en.get(path);
  const frValue = fr.get(path);
  const ukValue = uk.get(path);

  if (enValue === undefined || frValue === undefined || ukValue === undefined) {
    console.log(
      `${path}|${normalizeCell(enValue)}|${normalizeCell(frValue)}|${normalizeCell(ukValue)}`
    );
  }
}
NODE

  local rc=$?
  if [[ $rc -ne 0 ]]; then
    echo -e "${RED}Failed to generate translation report${NC}" >&2
    exit $rc
  fi

  if [[ -z "$quiet_flag" ]]; then
    echo -e "${GREEN}Translation parity report generated${NC}" >&2
  fi
}

main "$@"
