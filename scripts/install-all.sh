#!/bin/bash

# Install dependencies for all packages in the monorepo
# Finds all package.json files (max depth 2) and runs npm install/ci in their directories
# Usage: ./scripts/install-all.sh [options]
#
# Options:
#   -c, --ci    Use npm ci instead of npm install

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
USE_CI=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -c|--ci)
      USE_CI=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

cd "$PROJECT_ROOT"

if [ "$USE_CI" = true ]; then
  INSTALL_CMD="npm ci"
  echo "Installing dependencies (ci mode) for all packages..."
else
  INSTALL_CMD="npm install"
  echo "Installing dependencies (install mode) for all packages..."
fi

find . -maxdepth 2 -name "package.json" -type f | xargs -I {} dirname {} | xargs -I {} sh -c "cd \"{}\" && $INSTALL_CMD"

echo "All dependencies installed successfully!"
