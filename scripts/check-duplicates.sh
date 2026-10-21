#!/bin/bash

# Check for duplicate package resolutions in Bun monorepo
# This detects when packages like @payloadcms/ui or react are resolved
# to different copies, which causes React context issues.

CRITICAL_PACKAGES=(
  "react"
  "react-dom"
  "@payloadcms/ui"
  "@payloadcms/richtext-lexical"
  "payload"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking for duplicate package resolutions..."
echo ""

has_duplicates=false

for pkg in "${CRITICAL_PACKAGES[@]}"; do
  # Convert @scope/name to path format
  pkg_path="${pkg//@/}"
  pkg_path="${pkg_path//\///}"
  
  # Find all symlinks for this package in workspace node_modules
  resolutions=()
  
  while IFS= read -r link; do
    if [[ -L "$link" ]]; then
      target=$(readlink "$link")
      # Extract just the resolution part (e.g., @payloadcms+ui@3.64.0+hash)
      resolution=$(echo "$target" | grep -oE '[^/]+@[0-9]+\.[0-9]+\.[0-9]+[^/]*' | head -1)
      if [[ -n "$resolution" ]]; then
        resolutions+=("$resolution|$link")
      fi
    fi
  done < <(find . -path "*/node_modules/$pkg" -type l 2>/dev/null | grep -v "node_modules/.bun")
  
  if [[ ${#resolutions[@]} -gt 1 ]]; then
    # Check if all resolutions are the same
    unique_resolutions=($(printf '%s\n' "${resolutions[@]}" | cut -d'|' -f1 | sort -u))
    
    if [[ ${#unique_resolutions[@]} -gt 1 ]]; then
      has_duplicates=true
      echo -e "${RED}❌ DUPLICATE: ${pkg}${NC}"
      echo "   Found ${#unique_resolutions[@]} different resolutions:"
      for res in "${resolutions[@]}"; do
        resolution=$(echo "$res" | cut -d'|' -f1)
        location=$(echo "$res" | cut -d'|' -f2)
        echo -e "   ${YELLOW}→${NC} $resolution"
        echo "     at: $location"
      done
      echo ""
    else
      echo -e "${GREEN}✓ ${pkg}${NC} - single resolution: ${unique_resolutions[0]}"
    fi
  elif [[ ${#resolutions[@]} -eq 1 ]]; then
    resolution=$(echo "${resolutions[0]}" | cut -d'|' -f1)
    echo -e "${GREEN}✓ ${pkg}${NC} - single resolution: $resolution"
  else
    echo -e "${YELLOW}⚠ ${pkg}${NC} - not found in any workspace"
  fi
done

echo ""

if $has_duplicates; then
  echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}⚠️  DUPLICATE PACKAGES DETECTED!${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "This will cause 'useConfig is undefined' and similar React context errors."
  echo ""
  echo "To fix:"
  echo "  1. Ensure bunfig.toml has: [install] peer = false"
  echo "  2. Run: bun run clean:install"
  echo ""
  exit 1
else
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}✅ All critical packages have single resolutions!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  exit 0
fi

