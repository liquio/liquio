#!/bin/bash

# Monorepo quality check script
# Runs all quality checks (lint, test, audit) across the monorepo
# Usage: ./scripts/check.sh [options]

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Show usage information
show_usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  -h, --help              Show this help message
  -s, --skip STAGE        Skip a stage (lint, test, audit, or comma-separated)
  -l, --lint              Run only linting
  -t, --test              Run only tests
  -a, --audit             Run only audit
  -f, --fix               Auto-fix lint and audit issues
  -c, --coverage          Run tests with coverage
  -p, --production        Only check production dependencies in audit
  -q, --quiet             Suppress verbose output
  --parallel              Run independent checks in parallel (experimental)

Examples:
  $0                      # Run all checks
  $0 --fix                # Auto-fix all fixable issues
  $0 --skip test,audit    # Run only linting
  $0 --lint               # Run only linting
  $0 --test --coverage    # Run tests with coverage
EOF
}

# Main function
main() {
  local run_lint=true
  local run_test=true
  local run_audit=true
  local fix_flag=""
  local coverage_flag=""
  local production_flag=""
  local quiet_flag=""
  local parallel_flag=""

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      -h|--help)
        show_usage
        exit 0
        ;;
      -s|--skip)
        local skip_stages=$2
        IFS=',' read -ra STAGES <<< "$skip_stages"
        for stage in "${STAGES[@]}"; do
          stage=$(echo "$stage" | xargs) # trim whitespace
          case $stage in
            lint) run_lint=false ;;
            test) run_test=false ;;
            audit) run_audit=false ;;
          esac
        done
        shift 2
        ;;
      -l|--lint)
        run_test=false
        run_audit=false
        shift
        ;;
      -t|--test)
        run_lint=false
        run_audit=false
        shift
        ;;
      -a|--audit)
        run_lint=false
        run_test=false
        shift
        ;;
      -f|--fix)
        fix_flag="--fix"
        shift
        ;;
      -c|--coverage)
        coverage_flag="--coverage"
        shift
        ;;
      -p|--production)
        production_flag="--production"
        shift
        ;;
      -q|--quiet)
        quiet_flag="--quiet"
        shift
        ;;
      --parallel)
        parallel_flag="true"
        shift
        ;;
      *)
        echo -e "${RED}Unknown option: $1${NC}" >&2
        show_usage
        exit 1
        ;;
    esac
  done

  local total_failed=0

  # Print header (unless quiet)
  if [[ -z "$quiet_flag" ]]; then
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║         Monorepo Quality Check Suite                       ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}\n"
  fi

  # Build commands
  local commands=()
  local descriptions=()

  if [[ "$run_lint" == true ]]; then
    local lint_cmd="$SCRIPT_DIR/lint.sh all"
    [[ -n "$fix_flag" ]] && lint_cmd="$lint_cmd $fix_flag"
    [[ -n "$quiet_flag" ]] && lint_cmd="$lint_cmd $quiet_flag"
    commands+=("$lint_cmd")
    descriptions+=("Linting")
  fi

  if [[ "$run_test" == true ]]; then
    local test_cmd="$SCRIPT_DIR/test.sh all"
    [[ -n "$coverage_flag" ]] && test_cmd="$test_cmd $coverage_flag"
    [[ -n "$quiet_flag" ]] && test_cmd="$test_cmd $quiet_flag"
    commands+=("$test_cmd")
    descriptions+=("Testing")
  fi

  if [[ "$run_audit" == true ]]; then
    local audit_cmd="$SCRIPT_DIR/audit.sh all"
    [[ -n "$production_flag" ]] && audit_cmd="$audit_cmd $production_flag"
    [[ -n "$quiet_flag" ]] && audit_cmd="$audit_cmd $quiet_flag"
    commands+=("$audit_cmd")
    descriptions+=("Auditing")
  fi

  # Run commands sequentially (parallel not yet fully supported)
  for i in "${!commands[@]}"; do
    local desc="${descriptions[$i]}"
    local cmd="${commands[$i]}"

    if [[ -z "$quiet_flag" ]]; then
      echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      echo -e "${BLUE}Stage ${i+1}/${#commands[@]}: $desc${NC}"
      echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    fi

    if eval "$cmd"; then
      if [[ -z "$quiet_flag" ]]; then
        echo -e "${GREEN}✓ $desc completed successfully${NC}\n"
      fi
    else
      if [[ -z "$quiet_flag" ]]; then
        echo -e "${RED}✗ $desc failed${NC}\n"
      fi
      ((total_failed++))
    fi
  done

  # Print summary
  if [[ -n "$quiet_flag" ]]; then
    # In quiet mode, show only a brief summary
    local total_stages=${#commands[@]}
    local total_passed=$((total_stages - total_failed))
    if [[ $total_failed -gt 0 ]]; then
      echo -e "${RED}✗${NC} Quality checks: ${GREEN}$total_passed passed${NC}, ${RED}$total_failed failed${NC} out of $total_stages"
      exit 1
    else
      echo -e "${GREEN}✓${NC} All quality checks passed ($total_stages/$total_stages)"
      exit 0
    fi
  fi
  
  if [[ $total_failed -gt 0 ]]; then
    exit 1
  fi
  exit 0
}

# Run main function
main "$@"
