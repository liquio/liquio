#!/bin/bash

# Monorepo test script
# Runs tests across all services and the test directory
# Usage: ./scripts/test.sh [service] [options]

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Dynamically discover services with test script in package.json
discover_services() {
  local services=()
  cd "$PROJECT_ROOT"
  for dir in */; do
    dir=${dir%/}
    if [[ -f "$dir/package.json" ]]; then
      # Check if test script exists and is not empty/placeholder
      if grep -q '"test"' "$dir/package.json"; then
        local test_script=$(cd "$dir" && npm pkg get scripts.test 2>/dev/null | tr -d '"')
        # Skip if test script is empty or is a placeholder like "echo \"Error: no test specified\""
        if [[ -n "$test_script" ]] && [[ ! "$test_script" =~ "Error: no test specified" ]] && [[ ! "$test_script" =~ "exit 1" ]]; then
          services+=("$dir")
        fi
      fi
    fi
  done
  printf '%s\n' "${services[@]}" | sort
}

# Get list of all services with tests
mapfile -t SERVICES < <(discover_services)

# Show usage information
show_usage() {
  cat <<EOF
Usage: $0 [options] [service]

Options:
  -h, --help              Show this help message
  -l, --list              List all services with tests
  -c, --coverage          Run tests with coverage report
  -w, --watch             Run tests in watch mode (supported services only)
  -e, --e2e               Run E2E tests (default for most services)
  -u, --unit              Run unit tests only (if available)
  -d, --debug             Run with debug output (DEBUG=test:*)
  -q, --quiet             Suppress verbose output, show only summary

Service:
  Run tests for a specific service or 'all' to run all services
  If not specified, runs for all services

Examples:
  $0                              # Run all tests
  $0 --coverage                   # Run all tests with coverage
  $0 id-api                       # Run tests for id-api only
  $0 --watch admin-api            # Run admin-api tests in watch mode
  $0 --e2e test                   # Run E2E tests from test directory
  $0 --quiet                      # Run all tests with minimal output
EOF
}

# List services
list_services() {
  echo -e "${BLUE}Services with test support:${NC}"
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

# Run tests for a specific service
run_service_test() {
  local service=$1
  local options=$2
  local quiet_flag=$3

  if [[ ! -d "$PROJECT_ROOT/$service" ]]; then
    [[ -z "$quiet_flag" ]] && echo -e "${RED}❌ Service directory not found: $service${NC}" >&2
    return 1
  fi

  if [[ ! -f "$PROJECT_ROOT/$service/package.json" ]]; then
    [[ -z "$quiet_flag" ]] && echo -e "${RED}❌ No package.json found in $service${NC}" >&2
    return 1
  fi

  [[ -z "$quiet_flag" ]] && echo -e "${BLUE}▶ Running tests for $service...${NC}"

  cd "$PROJECT_ROOT/$service"

  # Determine which test command to run
  local test_cmd="npm run test"

  if [[ "$options" == *"e2e"* ]]; then
    if npm config get scripts.test:e2e > /dev/null 2>&1; then
      test_cmd="npm run test:e2e"
    fi
  elif [[ "$options" == *"unit"* ]]; then
    if npm config get scripts.test:unit > /dev/null 2>&1; then
      test_cmd="npm run test:unit"
    fi
  elif [[ "$options" == *"coverage"* ]]; then
    if npm config get scripts.test:coverage > /dev/null 2>&1; then
      test_cmd="npm run test:coverage"
    elif npm config get scripts.test:cov > /dev/null 2>&1; then
      test_cmd="npm run test:cov"
    else
      test_cmd="npm run test"
    fi
  elif [[ "$options" == *"watch"* ]]; then
    if npm config get scripts.test:watch > /dev/null 2>&1; then
      test_cmd="npm run test:watch"
    elif npm config get scripts.test > /dev/null 2>&1; then
      test_cmd="npm test -- --watch"
    fi
  fi

  # Add debug flag if requested
  if [[ "$options" == *"debug"* ]]; then
    export DEBUG="test:*"
  fi

  # Run the command and capture result
  local test_output
  test_output=$(eval "$test_cmd" 2>&1)
  local exit_code=$?

  # Extract test stats from output
  local suites_passed=0 suites_failed=0 suites_total=0
  local tests_passed=0 tests_failed=0 tests_total=0
  local test_time=""
  
  # Parse test suite stats
  if echo "$test_output" | grep -q "Test Suites:"; then
    suites_passed=$(echo "$test_output" | grep "Test Suites:" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+")
    suites_failed=$(echo "$test_output" | grep "Test Suites:" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+")
    suites_total=$(echo "$test_output" | grep "Test Suites:" | grep -oE "[0-9]+ total" | grep -oE "[0-9]+")
  fi
  
  # Parse test stats
  if echo "$test_output" | grep -q "Tests:"; then
    tests_passed=$(echo "$test_output" | grep "^Tests:" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+")
    tests_failed=$(echo "$test_output" | grep "^Tests:" | grep -oE "[0-9]+ failed" | grep -oE "[0-9]+")
    tests_total=$(echo "$test_output" | grep "^Tests:" | grep -oE "[0-9]+ total" | grep -oE "[0-9]+")
  fi
  
  # Parse time
  if echo "$test_output" | grep -q "^Time:"; then
    test_time=$(echo "$test_output" | grep "^Time:" | sed 's/Time:[[:space:]]*//; s/[[:space:]]*$//; s/, estimated.*$//')
  fi

  if [[ $exit_code -eq 0 ]]; then
    [[ -z "$quiet_flag" ]] && echo -e "${GREEN}✓ Tests passed for $service${NC}\n"
    TEST_RESULTS["$service"]="pass|$suites_passed|$suites_total|$tests_passed|$tests_total|$test_time"
    return 0
  else
    if [[ -z "$quiet_flag" ]]; then
      echo "$test_output"
      echo -e "${RED}✗ Tests failed for $service${NC}\n"
    fi
    # Mark as skipped if no tests were found (0/0)
    if [[ $suites_total -eq 0 ]] && [[ $tests_total -eq 0 ]]; then
      TEST_RESULTS["$service"]="skip|$suites_passed|$suites_total|$tests_passed|$tests_total|$test_time"
    else
      TEST_RESULTS["$service"]="fail|$suites_passed|$suites_total|$tests_passed|$tests_total|$test_time"
    fi
    return 1
  fi
}

# Main function
main() {
  local services_to_test=()
  local test_options=""
  local quiet_flag=""
  local service_arg=""
  
  # Declare associative array to store test results
  declare -gA TEST_RESULTS

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
      -c|--coverage)
        test_options="${test_options}coverage"
        shift
        ;;
      -w|--watch)
        test_options="${test_options}watch"
        shift
        ;;
      -e|--e2e)
        test_options="${test_options}e2e"
        shift
        ;;
      -u|--unit)
        test_options="${test_options}unit"
        shift
        ;;
      -d|--debug)
        test_options="${test_options}debug"
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

  # Determine which services to test
  if [[ -z "$service_arg" ]] || [[ "$service_arg" == "all" ]]; then
    services_to_test=("${SERVICES[@]}")
  elif service_exists "$service_arg"; then
    services_to_test=("$service_arg")
  else
    echo -e "${RED}❌ Unknown service: $service_arg${NC}" >&2
    echo "Use '$0 --list' to see available services"
    exit 1
  fi

  # Run tests
  local failed=0
  local passed=0
  local start_time=$(date +%s)

  if [[ -z "$quiet_flag" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Running tests for: ${SERVICES[*]}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  fi

  for service in "${SERVICES[@]}"; do
    if run_service_test "$service" "$test_options" "$quiet_flag"; then
      ((passed++))
    else
      ((failed++))
    fi
  done

  if [[ -z "$quiet_flag" ]]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Passed: $passed${NC} | ${RED}Failed: $failed${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  fi

  # Calculate total execution time
  local end_time=$(date +%s)
  local total_time=$((end_time - start_time))
  local total_time_display="${total_time}s"

  # Display results table
  echo -e "${BLUE}Test Results Summary:${NC}\n"
  echo -e "${BLUE}Service            │ Status │ Suites      │ Tests       │ Time${NC}"
  echo -e "${BLUE}───────────────────┼────────┼─────────────┼─────────────┼──────────────${NC}"
  
  local total_suites_passed=0
  local total_suites_total=0
  local total_tests_passed=0
  local total_tests_total=0
  local total_passed=0
  local total_services=${#SERVICES[@]}
  
  for service in "${SERVICES[@]}"; do
    local result="${TEST_RESULTS[$service]}"
    IFS='|' read -r status suites_passed suites_total tests_passed tests_total test_time <<< "$result"
    
    local suites_passed=${suites_passed:-0}
    local suites_total=${suites_total:-0}
    local tests_passed=${tests_passed:-0}
    local tests_total=${tests_total:-0}
    local test_time=${test_time:-"-"}
    
    # Accumulate totals
    ((total_suites_passed += suites_passed))
    ((total_suites_total += suites_total))
    ((total_tests_passed += tests_passed))
    ((total_tests_total += tests_total))
    
    # Count passed or skipped services
    if [[ "$status" == "pass" ]] || [[ "$status" == "skip" ]]; then
      ((total_passed++))
    fi
    
    local status_display
    if [[ "$status" == "pass" ]]; then
      status_display="${GREEN}✓${NC}     "
    elif [[ "$status" == "skip" ]]; then
      status_display="${YELLOW}-${NC}     "
    else
      status_display="${RED}✗${NC}     "
    fi
    
    local padded_service=$(printf "%-18s" "$service")
    local suites_col=$(printf "%-11s" "$suites_passed/$suites_total")
    local tests_col=$(printf "%-11s" "$tests_passed/$tests_total")
    printf "%s │ %b │ %s │ %s │ %s\n" "$padded_service" "$status_display" "$suites_col" "$tests_col" "$test_time"
  done
  
  echo -e "${BLUE}───────────────────┼────────┼─────────────┼─────────────┼──────────────${NC}"
  
  # Display totals
  local padded_total=$(printf "%-18s" "TOTAL")
  local status_col=$(printf "%-6s" "$total_passed/$total_services")
  local total_suites_col=$(printf "%-11s" "$total_suites_passed/$total_suites_total")
  local total_tests_col=$(printf "%-11s" "$total_tests_passed/$total_tests_total")
  printf "%s │ %s │ %s │ %s │ %s\n" "$padded_total" "$status_col" "$total_suites_col" "$total_tests_col" "$total_time_display"
  echo -e "${BLUE}───────────────────┼────────┼─────────────┼─────────────┼──────────────${NC}"

  if [[ $failed -gt 0 ]]; then
    exit 1
  fi
  exit 0
}

# Run main function
main "$@"
