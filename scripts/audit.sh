#!/bin/bash

# Monorepo audit script
# Runs npm audit across all services to check for security vulnerabilities
# Usage: ./scripts/audit.sh [service] [options]

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

# Dynamically discover services with package.json
discover_services() {
  local services=()
  cd "$PROJECT_ROOT"
  for dir in */; do
    dir=${dir%/}
    if [[ -f "$dir/package.json" ]]; then
      services+=("$dir")
    fi
  done
  printf '%s\n' "${services[@]}" | sort
}

# Get list of all services with package.json
mapfile -t SERVICES < <(discover_services)

# Show usage information
show_usage() {
  cat <<EOF
Usage: $0 [options] [service]

Options:
  -h, --help              Show this help message
  -l, --list              List all services
  -f, --fix               Attempt to auto-fix vulnerabilities (npm audit fix)
  -p, --production        Only check production dependencies
  -s, --severity LEVEL    Filter by severity (critical, high, moderate, low)
  -j, --json              Output results as JSON
  -q, --quiet             Suppress verbose output, show only summary
  --update-packages       Update package-lock.json (npm ci)

Service:
  Run audit for a specific service or 'all' to run all services
  If not specified, runs for all services

Examples:
  $0                      # Audit all services
  $0 --fix                # Auto-fix vulnerabilities in all services
  $0 id-api               # Audit id-api only
  $0 --severity critical  # Show only critical vulnerabilities
  $0 --production task    # Audit production deps only for task service
  $0 --quiet              # Audit all services with minimal output
EOF
}

# List services
list_services() {
  echo -e "${BLUE}Services available for audit:${NC}"
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

# Run audit for a specific service
run_service_audit() {
  local service=$1
  local options=$2
  local quiet_flag=$3

  if [[ ! -d "$PROJECT_ROOT/$service" ]]; then
    [[ -z "$quiet_flag" ]] && echo -e "${YELLOW}⊘ Service directory not found: $service (skipping)${NC}"
    return 0
  fi

  if [[ ! -f "$PROJECT_ROOT/$service/package.json" ]]; then
    [[ -z "$quiet_flag" ]] && echo -e "${YELLOW}⊘ No package.json found in $service (skipping)${NC}"
    return 0
  fi

  [[ -z "$quiet_flag" ]] && echo -e "${BLUE}▶ Auditing $service...${NC}"

  cd "$PROJECT_ROOT/$service"

  # Build audit command
  local audit_cmd="npm audit"

  if [[ "$options" == *"fix"* ]]; then
    audit_cmd="npm audit fix"
  fi

  if [[ "$options" == *"production"* ]]; then
    audit_cmd="$audit_cmd --production"
  fi

  if [[ "$options" == *"json"* ]]; then
    audit_cmd="$audit_cmd --json"
  fi

  # Extract severity if specified
  if [[ "$options" =~ severity:([^ ]+) ]]; then
    local severity="${BASH_REMATCH[1]}"
    audit_cmd="$audit_cmd --audit-level=$severity"
  fi

  # Run the command and capture output - don't exit on error to continue with other services
  local audit_output
  audit_output=$(eval "$audit_cmd" 2>&1)
  
  # Extract vulnerability counts
  local low=0 med=0 high=0 critical=0
  
  # Parse the summary line like "10 vulnerabilities (4 moderate, 6 high)"
  if echo "$audit_output" | grep -E "^[0-9]+ vulnerabilities?" >/dev/null; then
    local summary
    summary=$(echo "$audit_output" | grep -E "^[0-9]+ vulnerabilities?")
    
    # Extract counts from summary, default to 0 if not found
    low=$(echo "$summary" | grep -oE "([0-9]+) low" | grep -oE "[0-9]+" | head -1)
    low=${low:-0}
    med=$(echo "$summary" | grep -oE "([0-9]+) moderate" | grep -oE "[0-9]+" | head -1)
    med=${med:-0}
    high=$(echo "$summary" | grep -oE "([0-9]+) high" | grep -oE "[0-9]+" | head -1)
    high=${high:-0}
    critical=$(echo "$summary" | grep -oE "([0-9]+) critical" | grep -oE "[0-9]+" | head -1)
    critical=${critical:-0}
    
    # Store in global associative array for later display
    AUDIT_RESULTS["$service"]="$low|$med|$high|$critical"
    
    if [[ $(($low + $med + $high + $critical)) -gt 0 ]]; then
      if [[ -z "$quiet_flag" ]]; then
        echo "$audit_output"
        echo -e "${RED}✗ Vulnerabilities found in $service${NC}\n"
      fi
      return 1
    fi
  fi
  
  # Store result
  AUDIT_RESULTS["$service"]="$low|$med|$high|$critical"
  
  # No vulnerabilities pattern found or count is 0
  [[ -z "$quiet_flag" ]] && echo -e "${GREEN}✓ No vulnerabilities found in $service${NC}\n"
  return 0
}

# Main function
main() {
  local services_to_audit=()
  local audit_options=""
  local service_arg=""
  local severity_filter=""
  local quiet_flag=""
  
  # Declare associative array to store audit results
  declare -gA AUDIT_RESULTS

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
        audit_options="${audit_options}fix"
        shift
        ;;
      -p|--production)
        audit_options="${audit_options}production"
        shift
        ;;
      -j|--json)
        audit_options="${audit_options}json"
        shift
        ;;
      -q|--quiet)
        quiet_flag="true"
        shift
        ;;
      -s|--severity)
        severity_filter=$2
        audit_options="${audit_options}severity:${severity_filter}"
        shift 2
        ;;
      --update-packages)
        echo -e "${BLUE}Updating package-lock.json files...${NC}"
        for service in "${SERVICES[@]}"; do
          if [[ -d "$PROJECT_ROOT/$service" ]] && [[ -f "$PROJECT_ROOT/$service/package.json" ]]; then
            cd "$PROJECT_ROOT/$service"
            echo -e "${BLUE}▶ Running npm ci in $service...${NC}"
            npm ci 2>/dev/null || echo -e "${YELLOW}⊘ npm ci failed in $service${NC}"
          fi
        done
        shift
        ;;
      *)
        service_arg=$1
        shift
        ;;
    esac
  done

  # Determine which services to audit
  if [[ -z "$service_arg" ]] || [[ "$service_arg" == "all" ]]; then
    services_to_audit=("${SERVICES[@]}")
  elif service_exists "$service_arg"; then
    services_to_audit=("$service_arg")
  else
    echo -e "${RED}❌ Unknown service: $service_arg${NC}" >&2
    echo "Use '$0 --list' to see available services"
    exit 1
  fi

  # Run audit
  local failed=0
  local passed=0

  if [[ -z "$quiet_flag" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Auditing services: ${services_to_audit[*]}${NC}"
    [[ -n "$severity_filter" ]] && echo -e "${BLUE}Severity filter: $severity_filter${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  fi

  for service in "${services_to_audit[@]}"; do
    if run_service_audit "$service" "$audit_options" "$quiet_flag"; then
      ((passed++))
    else
      ((failed++))
    fi
  done

  if [[ -z "$quiet_flag" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Services checked: $passed${NC} | ${RED}With vulnerabilities: $failed${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  fi

  # Display summary table
  echo -e "${BLUE}Audit Results Summary:${NC}\n"
  echo -e "${BLUE}Service            │ Low │ Med │ High │ Status${NC}"
  echo -e "${BLUE}───────────────────┼─────┼─────┼──────┼────────${NC}"
  
  local total_low=0 total_med=0 total_high=0 total_critical=0
  
  for service in "${services_to_audit[@]}"; do
    if [[ -n "${AUDIT_RESULTS[$service]}" ]]; then
      IFS='|' read -r low med high critical <<< "${AUDIT_RESULTS[$service]}"
      low=${low:-0}
      med=${med:-0}
      high=${high:-0}
      critical=${critical:-0}
      
      ((total_low += low))
      ((total_med += med))
      ((total_high += high))
      ((total_critical += critical))
      
      local status="${GREEN}✓ Clean${NC}"
      if [[ $(($low + $med + $high + $critical)) -gt 0 ]]; then
        status="${RED}✗ Found${NC}"
      fi
      
      # Pad service name to 18 chars, right-align numbers
      local padded_service=$(printf "%-18s" "$service")
      printf "%s │ %3d │ %3d │ %4d │ %s\n" "$padded_service" "$low" "$med" "$high" "$(echo -e "$status")"
    fi
  done
  
  echo -e "${BLUE}───────────────────┼─────┼─────┼──────┼────────${NC}"
  local padded_total=$(printf "%-18s" "TOTAL")
  printf "%s │ %3d │ %3d │ %4d │\n" "$padded_total" "$total_low" "$total_med" "$total_high"
  echo ""

  if [[ $failed -gt 0 ]]; then
    [[ -z "$quiet_flag" ]] && echo -e "\n${YELLOW}Run with --fix to attempt automatic fixes${NC}"
    exit 1
  fi
  exit 0
}

# Run main function
main "$@"
