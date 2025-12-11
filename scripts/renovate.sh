#!/bin/bash

# Monorepo Renovate dependency management script
# Helps check, trigger, and manage Renovate bot updates
# Usage: ./scripts/renovate.sh [options]

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
  -h, --help                    Show this help message
  -s, --status                  Check Renovate configuration status
  -c, --check                   Validate renovate.json configuration
  -u, --update-packages         Run npm update in all services
  -n, --npm-version             Show npm and node versions
  -l, --list-outdated           List outdated packages in each service
  -t, --test-renovate           Show Renovate setup information

Examples:
  $0 --status                   # Check Renovate status
  $0 --check                    # Validate renovate.json
  $0 --update-packages          # Update all packages
  $0 --list-outdated            # Show what needs updating
  $0 --test-renovate            # Dry-run Renovate locally
EOF
}

# Check system info
check_versions() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}System & Tool Versions${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  
  echo -e "${MAGENTA}Node.js:${NC} $(node --version)"
  echo -e "${MAGENTA}npm:${NC} $(npm --version)"
  echo -e "${MAGENTA}Renovate:${NC} $(npm list -g renovate 2>/dev/null | grep renovate || echo 'Not installed globally')"
  echo ""
}

# Check Renovate configuration
check_renovate_config() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Renovate Configuration Check${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  
  if [[ ! -f "$PROJECT_ROOT/renovate.json" ]]; then
    echo -e "${RED}✗ renovate.json not found${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✓ renovate.json found${NC}"
  
  # Validate JSON
  if ! jq . "$PROJECT_ROOT/renovate.json" > /dev/null 2>&1; then
    echo -e "${RED}✗ renovate.json has invalid JSON syntax${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✓ renovate.json is valid JSON${NC}"
  
  # Show key config
  echo -e "\n${MAGENTA}Key Configuration:${NC}"
  echo -n "  - extends: "
  jq -r '.extends[]' "$PROJECT_ROOT/renovate.json" | head -1
  echo -n "  - schedule: "
  jq -r '.schedule[0]' "$PROJECT_ROOT/renovate.json"
  echo -n "  - semantic commits: "
  jq -r '.semanticCommits' "$PROJECT_ROOT/renovate.json"
  echo ""
}

# List outdated packages
list_outdated() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Outdated Packages by Service${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  
  cd "$PROJECT_ROOT"
  
  local services=()
  for dir in */; do
    dir=${dir%/}
    if [[ -f "$dir/package.json" ]]; then
      services+=("$dir")
    fi
  done
  
  local total_outdated=0
  
  for service in "${services[@]}"; do
    if [[ ! -d "$service/node_modules" ]]; then
      continue
    fi
    
    local outdated=$(cd "$service" && npm outdated 2>/dev/null | tail -n +2 | wc -l)
    
    if [[ $outdated -gt 0 ]]; then
      echo -e "${YELLOW}$service:${NC} ${RED}$outdated outdated packages${NC}"
      cd "$service" && npm outdated 2>/dev/null | tail -n +2 | sed 's/^/  /'
      total_outdated=$((total_outdated + outdated))
    fi
  done
  
  echo ""
  if [[ $total_outdated -eq 0 ]]; then
    echo -e "${GREEN}✓ All dependencies are up to date${NC}"
  else
    echo -e "${YELLOW}Total outdated: $total_outdated packages${NC}"
  fi
  echo ""
}

# Update packages in all services
update_all_packages() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Updating All Packages${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  
  cd "$PROJECT_ROOT"
  
  local services=()
  for dir in */; do
    dir=${dir%/}
    if [[ -f "$dir/package.json" ]]; then
      services+=("$dir")
    fi
  done
  
  local failed=0
  local success=0
  
  for service in "${services[@]}"; do
    if [[ ! -d "$PROJECT_ROOT/$service/node_modules" ]]; then
      echo -e "${YELLOW}⊘ $service: Skipping (node_modules not found)${NC}"
      continue
    fi
    
    echo -e "${BLUE}▶ Updating $service...${NC}"
    if cd "$PROJECT_ROOT/$service" && npm update 2>&1 | tail -3; then
      echo -e "${GREEN}✓ $service updated${NC}\n"
      ((success++))
    else
      echo -e "${RED}✗ $service update failed${NC}\n"
      ((failed++))
    fi
  done
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}Success: $success${NC} | ${RED}Failed: $failed${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Test Renovate configuration (show info)
test_renovate() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Renovate Configuration Info${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  
  echo -e "${MAGENTA}Renovate is configured via:${NC}"
  echo -e "  • renovate.json (in repository root)"
  echo -e "  • .github/dependabot.yml (GitHub native alternative)"
  echo -e "  • GitHub App: https://github.com/apps/renovate\n"
  
  echo -e "${MAGENTA}To enable Renovate:${NC}"
  echo -e "  1. Install Renovate GitHub App"
  echo -e "  2. Grant access to this repository"
  echo -e "  3. Renovate will automatically read renovate.json\n"
  
  echo -e "${MAGENTA}Current configuration:${NC}"
  check_renovate_config
}

# Main function
main() {
  local action=""
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      -h|--help)
        show_usage
        exit 0
        ;;
      -s|--status)
        action="status"
        shift
        ;;
      -c|--check)
        action="check"
        shift
        ;;
      -u|--update-packages)
        action="update"
        shift
        ;;
      -n|--npm-version)
        action="versions"
        shift
        ;;
      -l|--list-outdated)
        action="outdated"
        shift
        ;;
      -t|--test-renovate)
        action="test"
        shift
        ;;
      *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_usage
        exit 1
        ;;
    esac
  done
  
  # If no action specified, show default
  if [[ -z "$action" ]]; then
    action="status"
  fi
  
  case "$action" in
    status)
      check_versions
      check_renovate_config
      ;;
    check)
      check_renovate_config
      ;;
    update)
      update_all_packages
      ;;
    versions)
      check_versions
      ;;
    outdated)
      list_outdated
      ;;
    test)
      test_renovate
      ;;
  esac
}

# Run main function
main "$@"
