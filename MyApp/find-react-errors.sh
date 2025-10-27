#!/bin/bash

# =============================================================================
# React Native / Expo - Rendering Error Scanner
# Finds: {Component}, <Text>{object}</Text>, MyComponent(), raw objects in JSX
# =============================================================================

SEARCH_PATH="./app"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${CYAN}===================================================================${NC}"
echo -e "${CYAN}  React Native Rendering Error Scanner (Expo Router)${NC}"
echo -e "${CYAN}  Scanning: $SEARCH_PATH${NC}"
echo -e "${CYAN}===================================================================${NC}\n"

# Helper: print section header
header() {
  echo -e "\n${YELLOW}$1${NC}"
}

# Helper: run grep with context
run_grep() {
  local pattern="$1"
  local description="$2"
  local file_filter="${3:-*.js *.jsx}"

  echo -e "${MAGENTA}$description${NC}"
  grep -rE -n --color=always "$pattern" "$SEARCH_PATH" \
    --include="*.js" --include="*.jsx" \
    --exclude-dir={node_modules,.expo,dist,__tests__} 2>/dev/null | \
    grep -v -E "(^Binary file|//.*@param|/\*.*@param|\* @property|@typedef|@type|import .* from|export .* from)" || \
    echo -e "  ${GREEN}No matches found.${NC}"
}

# =============================================================================
# 1. {Component} rendered instead of <Component />
# =============================================================================
header "1. Component rendered as variable: {MyComponent} (NOT <MyComponent />)"
run_grep '([{(]|\s)\{[A-Z][A-Za-z0-9_]*\}' \
  "Looking for {CapitalizedName} in JSX (likely bug)" \
  "*.js *.jsx" | \
  grep -v -E "(style=|\.length|\.map\(|\.filter\(|\.forEach\(|\.name|\.id|console|return.*<|import|export|const|let|var|=>)"

# =============================================================================
# 2. Raw object rendered inside <Text> or <View>
# =============================================================================
header "2. Raw object in JSX: <Text>{user}</Text> or {order}"
run_grep '<(Text|View)[^>]*>\s*\{[^}{]*\{.*\}[^}{]*\}' \
  "Nested object in JSX (e.g., {user.profile})" \
  "*.js *.jsx"

run_grep '<(Text|View)[^>]*>\s*\{\s*[a-z_][a-zA-Z0-9_]*\s*\}' \
  "Variable (likely object) rendered directly" \
  "*.js *.jsx" | \
  grep -v -E "\.toString\(\)|\.toUpperCase\(\)|\.toLowerCase\(\)|\.trim\(\)|\.length|join\(|format\("

# =============================================================================
# 3. Component called as function: const el = MyComponent()
# =============================================================================
header "3. Component called as function: MyComponent() instead of <MyComponent />"
run_grep '=[^=]*[A-Z][A-Za-z0-9_]*\s*\(' \
  "Assigning result of component function call" \
  "*.js *.jsx" | \
  grep -v -E "(console|log|new |return|if|\.map\(|\.filter\(|\.forEach\(|\.reduce\()"

# =============================================================================
# 4. Suspicious JSX interpolation: {expr} inside <Text> without .toString()
# =============================================================================
header "4. Risky interpolation in <Text>: {value} (might be object)"
run_grep '<Text[^>]*>\s*\{[^}]*\}' \
  "Any interpolation inside <Text>" \
  "*.js *.jsx" | \
  grep -v -E "\.toString\(\)|\.toUpperCase\(\)|\.toLowerCase\(\)|\.length|join\(|format\(" | \
  head -20

# =============================================================================
# 5. Focus: Critical Files (most likely to have the bug)
# =============================================================================
header "5. Scanning high-risk files: _layout.js, scanner.js, [orderId].js"
for file in app/_layout.js app/(tabs)/_layout.js app/(tabs)/scanner.js app/(tabs)/[orderId].js app/(tabs)/DriverDashboard.js; do
  [ -f "$file" ] || continue
  echo -e "${MAGENTA}→ $file${NC}"
  grep -n --color=always "{" "$file" | grep -v -E "(style=|@|import|export)" | head -10 || echo "  No suspicious {} found."
done

# =============================================================================
# Final Summary
# =============================================================================
echo -e "\n${CYAN}===================================================================${NC}"
echo -e "${RED}COMMON FIXES:${NC}"
echo -e "   • Replace {Component} → <Component />"
echo -e "   • Replace <Text>{obj}</Text> → <Text>{obj.name}</Text> or {String(obj)}"
echo -e "   • Never do: const el = MyComponent() in render"
echo -e ""
echo -e "${GREEN}Run: expo start -c  after fixing${NC}"
echo -e "${CYAN}===================================================================${NC}"