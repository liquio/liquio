#!/bin/bash

# Monorepo lint script
# Runs linting across all services
# Usage: ./scripts/lint.sh [service] [options]

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Dynamically discover services with lint script in package.json
discover_services() {
  local services=()
  cd "$PROJECT_ROOT"
  for dir in */; do
    dir=${dir%/}
    if [[ -f "$dir/package.json" ]]; then
      # Check if lint script exists using npm config
      (cd "$dir" && npm config get scripts.lint > /dev/null 2>&1) && services+=("$dir")
    fi
  done
  printf '%s\n' "${services[@]}" | sort
}

# Get list of all services with linting
mapfile -t SERVICES < <(discover_services)

# Show usage information
show_usage() {
  cat <<EOF
Usage: $0 [options] [service]

Options:
  -h, --help              Show this help message
  -l, --list              List all services
  -f, --fix               Auto-fix linting issues (--fix flag)
  -c, --check             Check only, don't fix (default)
  -q, --quiet             Suppress verbose output, show only summary

Service:
  Run linting for a specific service or 'all' to run all services
  If not specified, runs for all services

Examples:
  $0                      # Lint all services
  $0 --fix                # Auto-fix all services
  $0 id-api               # Lint id-api only
  $0 --fix admin-api      # Auto-fix admin-api
  $0 --quiet              # Lint all services with minimal output
EOF
}

# List services
list_services() {
  echo -e "${BLUE}Services with linting support:${NC}"
  for service in "${SERVICES[@]}"; do
    echo "  - $service"
  done
}

# Check if service exists
service_exists() {
  local service=$1
  for s in "${SERVICES[@]}"; do
    if [[ "$s" == "$service" ]]; then
      return 0
    fi
  done
  return 1
}

# Check if service has eslint configuration
has_eslint() {
  local service=$1
  if [[ -f "$PROJECT_ROOT/$service/eslint.config.js" ]] || [[ -f "$PROJECT_ROOT/$service/.eslintrc"* ]]; then
    return 0
  fi
  return 1
}

# Run linting for a specific service
run_service_lint() {
  local service=$1
  local fix_flag=$2
  local quiet_flag=$3

  if [[ ! -d "$PROJECT_ROOT/$service" ]]; then
    [[ -z "$quiet_flag" ]] && echo -e "${YELLOW}⊘ Service directory not found: $service (skipping)${NC}"
    return 0
  fi

  if [[ ! -f "$PROJECT_ROOT/$service/package.json" ]]; then
    [[ -z "$quiet_flag" ]] && echo -e "${YELLOW}⊘ No package.json found in $service (skipping)${NC}"
    return 0
  fi

  # Check if service has lint command in package.json
  if ! grep -q '"lint' "$PROJECT_ROOT/$service/package.json"; then
    [[ -z "$quiet_flag" ]] && echo -e "${YELLOW}⊘ No lint command in $service (skipping)${NC}"
    LINT_RESULTS["$service"]="skipped|0|0"
    return 0
  fi

  [[ -z "$quiet_flag" ]] && echo -e "${BLUE}▶ Linting $service...${NC}"

  cd "$PROJECT_ROOT/$service"

  local lint_cmd="npm run lint"
  if [[ "$fix_flag" == "true" ]]; then
    # Try to use lint:fix if available, otherwise append --fix
    if grep -q '"lint:fix"' package.json; then
      lint_cmd="npm run lint:fix"
    else
      lint_cmd="npm run lint -- --fix"
    fi
  fi

  # Run the command and capture output
  local lint_output
  lint_output=$(eval "$lint_cmd" 2>&1)
  local exit_code=$?

  # Parse warnings and errors from output
  local warnings=0
  local errors=0
  
  # Try to extract from eslint summary line like "✖ 5 problems (3 errors, 2 warnings)"
  if echo "$lint_output" | grep -qE "[0-9]+ problems?"; then
    errors=$(echo "$lint_output" | grep -oE "([0-9]+) errors?" | grep -oE "[0-9]+" | head -1)
    errors=${errors:-0}
    warnings=$(echo "$lint_output" | grep -oE "([0-9]+) warnings?" | grep -oE "[0-9]+" | head -1)
    warnings=${warnings:-0}
  fi

  if [[ $exit_code -eq 0 ]]; then
    [[ -z "$quiet_flag" ]] && echo -e "${GREEN}✓ Linting passed for $service${NC}\n"
    LINT_RESULTS["$service"]="pass|$warnings|$errors"
    return 0
  else
    if [[ -z "$quiet_flag" ]]; then
      echo "$lint_output"
      echo -e "${RED}✗ Linting failed for $service${NC}\n"
    fi
    LINT_RESULTS["$service"]="fail|$warnings|$errors"
    return 1
  fi
}

# Main function
main() {
  local services_to_lint=()
  local fix_flag="false"
  local quiet_flag=""
  local service_arg=""
  
  # Declare associative array to store lint results
  declare -gA LINT_RESULTS

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      -h|--help)
        show_usage
        exit 0
        ;;
      -l|--list)
        list_services
        exit 0
        ;;
      -f|--fix)
        fix_flag="true"
        shift
        ;;
      -c|--check)
        fix_flag="false"
        shift
        ;;
      -q|--quiet)
        quiet_flag="true"
        shift
        ;;
      *)
        service_arg=$1
        shift
        ;;
    esac
  done

  # Determine which services to lint
  if [[ -z "$service_arg" ]] || [[ "$service_arg" == "all" ]]; then
    services_to_lint=("${SERVICES[@]}")
  elif service_exists "$service_arg"; then
    services_to_lint=("$service_arg")
  else
    echo -e "${RED}❌ Unknown service: $service_arg${NC}" >&2
    echo "Use '$0 --list' to see available services"
    exit 1
  fi

  # Run linting
  local failed=0
  local passed=0

  mode_text="Check"
  [[ "$fix_flag" == "true" ]] && mode_text="Fix"

  if [[ -z "$quiet_flag" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$mode_text linting for: ${services_to_lint[*]}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  fi

  for service in "${services_to_lint[@]}"; do
    if run_service_lint "$service" "$fix_flag" "$quiet_flag"; then
      ((passed++))
    else
      ((failed++))
    fi
  done

  # Always show the results table (summary)
  if [[ -z "$quiet_flag" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Passed: $passed${NC} | ${RED}Failed: $failed${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  fi

  # Display results table
  echo -e "${BLUE}Linting Results Summary:${NC}\n"
  echo -e "${BLUE}Service            │ Warn │ Err │ Status${NC}"
  echo -e "${BLUE}───────────────────┼──────┼─────┼──────────────${NC}"
  
  local total_warnings=0
  local total_errors=0
  
  for service in "${services_to_lint[@]}"; do
    local result="${LINT_RESULTS[$service]}"
    IFS='|' read -r status warnings errors <<< "$result"
    
    warnings=${warnings:-0}
    errors=${errors:-0}
    
    ((total_warnings += warnings))
    ((total_errors += errors))
    
    local display_status
    case "$status" in
      pass)
        display_status="${GREEN}✓ Pass${NC}"
        ;;
      fail)
        display_status="${RED}✗ Fail${NC}"
        ;;
      skipped)
        display_status="${YELLOW}⊘ Skipped${NC}"
        ;;
      *)
        display_status="${YELLOW}? Unknown${NC}"
        ;;
    esac
    
    local padded_service=$(printf "%-18s" "$service")
    printf "%s │ %4d │ %3d │ %s\n" "$padded_service" "$warnings" "$errors" "$(echo -e "$display_status")"
  done
  
  echo -e "${BLUE}───────────────────┼──────┼─────┼──────────────${NC}"
  local padded_total=$(printf "%-18s" "TOTAL")
  printf "%s │ %4d │ %3d │\n" "$padded_total" "$total_warnings" "$total_errors"
  echo ""

  if [[ $failed -gt 0 ]]; then
    exit 1
  fi
  exit 0
}

# Run main function
main "$@"
