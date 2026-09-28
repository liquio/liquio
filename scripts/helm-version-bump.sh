#!/bin/bash

# Helm chart version bump script
# First checks whether any components/* changed since the last chart version
# bump and offers to bump their own patch version (required for CI to actually
# rebuild their images). Then refreshes every component's package-lock.json,
# syncs their current package.json versions into
# helm-chart/templates/shared/_service-helpers.tpl, and bumps the chart version
# in helm-chart/Chart.yaml.
# Usage: ./scripts/helm-version-bump.sh [-v major|minor|patch] [-f]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPONENTS_DIR="$PROJECT_ROOT/components"
SERVICE_HELPERS_TPL="$PROJECT_ROOT/helm-chart/templates/shared/_service-helpers.tpl"
CHART_YAML="$PROJECT_ROOT/helm-chart/Chart.yaml"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_usage() {
  cat <<EOF
Usage: $0 [-v|--version major|minor|patch] [-f|--force]

First, checks whether any components/* have changed since the last commit that
touched helm-chart/Chart.yaml. If so, it prompts to bump those components' own
patch version - CI only rebuilds a component's image when its own version
changes, so a component whose code/dependencies changed but whose version
didn't will silently keep running its old image.

Then refreshes every component's package-lock.json under components/*
(dependency resolution only - this step never bumps a component version
itself), syncs their current package.json versions into
helm-chart/templates/shared/_service-helpers.tpl, and bumps the chart version
in helm-chart/Chart.yaml (appVersion is left untouched).

If no package-lock.json ends up changed and the service helper template is
already in sync, the chart version is left untouched and the script exits
without doing anything - pass --force to bump the chart version regardless.

Options:
  -v, --version LEVEL     Chart version bump level: major, minor, or patch (default: patch)
  -f, --force             Bump changed components' patch version without asking,
                           and bump the chart version even if nothing else changed
  -h, --help              Show this help message

Examples:
  $0                      # Prompt for component bumps if needed, then refresh lockfiles/tpl/chart
  $0 --version minor      # Same, but bump the chart by a minor version
  $0 --force              # Auto-bump changed components, always bump the chart version
EOF
}

# Bump a semver "X.Y.Z" string by the given level.
bump_semver() {
  local version="$1"
  local level="$2"
  local major minor patch

  IFS='.' read -r major minor patch <<< "$version"

  case "$level" in
    major)
      echo "$((major + 1)).0.0"
      ;;
    minor)
      echo "$major.$((minor + 1)).0"
      ;;
    patch)
      echo "$major.$minor.$((patch + 1))"
      ;;
  esac
}

main() {
  local bump_level="patch"
  local force=false

  while [[ $# -gt 0 ]]; do
    case $1 in
      -v|--version)
        bump_level="$2"
        shift 2
        ;;
      -f|--force)
        force=true
        shift
        ;;
      -h|--help)
        show_usage
        exit 0
        ;;
      *)
        echo -e "${RED}Unknown option: $1${NC}" >&2
        show_usage
        exit 1
        ;;
    esac
  done

  case "$bump_level" in
    major|minor|patch) ;;
    *)
      echo -e "${RED}Invalid --version value: $bump_level (expected major, minor, or patch)${NC}" >&2
      exit 1
      ;;
  esac

  if ! command -v jq &> /dev/null; then
    echo -e "${RED}jq is required but not installed${NC}" >&2
    exit 1
  fi

  if ! command -v sha256sum &> /dev/null; then
    echo -e "${RED}sha256sum is required but not installed${NC}" >&2
    exit 1
  fi

  if ! command -v git &> /dev/null; then
    echo -e "${RED}git is required but not installed${NC}" >&2
    exit 1
  fi

  echo -e "${BLUE}Checking for component changes since the last chart bump...${NC}"

  local last_chart_bump_commit
  last_chart_bump_commit="$(git -C "$PROJECT_ROOT" log -1 --format=%H -- "$CHART_YAML" 2>/dev/null || true)"

  local changed_components=()
  if [[ -n "$last_chart_bump_commit" ]]; then
    for component_dir in "$COMPONENTS_DIR"/*/; do
      local component
      component="$(basename "$component_dir")"
      [[ -f "$component_dir/package.json" ]] || continue

      if ! git -C "$PROJECT_ROOT" diff --quiet "$last_chart_bump_commit" -- "components/$component"; then
        changed_components+=("$component")
      fi
    done
  else
    echo -e "  ${YELLOW}No prior commit touched Chart.yaml - skipping this check.${NC}"
  fi

  if [[ ${#changed_components[@]} -gt 0 ]]; then
    echo -e "  ${YELLOW}Changed since ${last_chart_bump_commit:0:12}:${NC}"
    printf '    - %s\n' "${changed_components[@]}"
    echo -e "  ${YELLOW}CI only rebuilds a component's image when its own version changes.${NC}"

    local do_bump=false
    if [[ "$force" == true ]]; then
      do_bump=true
    else
      local reply=""
      read -r -p "  Bump patch version for these components now? [y/N] " reply || true
      [[ "$reply" =~ ^[Yy]$ ]] && do_bump=true
    fi

    if [[ "$do_bump" == true ]]; then
      for component in "${changed_components[@]}"; do
        local comp_old_version comp_new_version
        comp_old_version="$(jq -r '.version' "$COMPONENTS_DIR/$component/package.json")"
        (cd "$COMPONENTS_DIR/$component" && npm version patch --no-git-tag-version --allow-same-version > /dev/null)
        comp_new_version="$(jq -r '.version' "$COMPONENTS_DIR/$component/package.json")"
        echo -e "    ${GREEN}$component${NC}: $comp_old_version -> $comp_new_version"
      done
    else
      echo -e "  ${YELLOW}Skipping component version bumps.${NC}"
    fi
  else
    echo -e "  No component changes since the last chart bump."
  fi

  echo -e "${BLUE}Refreshing component lockfiles...${NC}"

  local tpl_hash_before
  tpl_hash_before="$(sha256sum "$SERVICE_HELPERS_TPL" | awk '{print $1}')"

  local any_lock_changed=false

  for component_dir in "$COMPONENTS_DIR"/*/; do
    local component
    component="$(basename "$component_dir")"

    if [[ ! -f "$component_dir/package.json" ]]; then
      continue
    fi

    local version
    version="$(jq -r '.version' "$component_dir/package.json")"

    local lock_file="$component_dir/package-lock.json"
    local lock_hash_before=""
    [[ -f "$lock_file" ]] && lock_hash_before="$(sha256sum "$lock_file" | awk '{print $1}')"

    # --ignore-scripts: this is a lockfile refresh, not a real install - some
    # components (e.g. pdf-generator) have postinstall steps (playwright) that
    # don't apply and aren't available in every environment this runs in.
    local npm_output
    if ! npm_output="$(cd "$component_dir" && npm install --package-lock-only --ignore-scripts 2>&1)"; then
      echo -e "${RED}npm install failed for $component${NC}" >&2
      echo "$npm_output" >&2
      exit 1
    fi

    local lock_hash_after=""
    [[ -f "$lock_file" ]] && lock_hash_after="$(sha256sum "$lock_file" | awk '{print $1}')"

    if [[ "$lock_hash_before" != "$lock_hash_after" ]]; then
      any_lock_changed=true
      echo -e "  ${GREEN}$component${NC} ($version): package-lock.json updated"
    else
      echo -e "  $component ($version): up to date"
    fi

    # Sync the component's current version (possibly just bumped above) into
    # the per-service version table, e.g.:
    #   "task" "0.1.9"
    sed -i -E "s/(\"$component\"[[:space:]]+\")[0-9]+\.[0-9]+\.[0-9]+(\")/\1$version\2/" "$SERVICE_HELPERS_TPL"
  done

  local tpl_hash_after
  tpl_hash_after="$(sha256sum "$SERVICE_HELPERS_TPL" | awk '{print $1}')"

  local tpl_changed=false
  if [[ "$tpl_hash_before" != "$tpl_hash_after" ]]; then
    tpl_changed=true
    echo -e "${GREEN}Service version table updated.${NC}"
  fi

  if [[ "$any_lock_changed" == false && "$tpl_changed" == false && "$force" == false ]]; then
    echo -e "${YELLOW}No changes detected - chart version left untouched. Pass --force to bump it anyway.${NC}"
    exit 0
  fi

  echo -e "${BLUE}Bumping helm chart version ($bump_level)...${NC}"

  local chart_old_version chart_new_version
  chart_old_version="$(grep -E '^version:' "$CHART_YAML" | awk '{print $2}')"
  chart_new_version="$(bump_semver "$chart_old_version" "$bump_level")"

  sed -i -E "s/^version:.*/version: $chart_new_version/" "$CHART_YAML"

  echo -e "  ${GREEN}helm-chart${NC}: $chart_old_version -> $chart_new_version"
  echo -e "${GREEN}✓ Done${NC}"

  echo
  echo -e "${BLUE}Suggested commit:${NC}"
  echo "git add -A && git commit -m \"chore(helm): update Helm chart version to $chart_new_version\""
}

main "$@"
