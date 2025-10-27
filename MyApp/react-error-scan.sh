#!/bin/bash

SEARCH_PATH="./app"
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}--- Scanning for React Rendering Bugs in $SEARCH_PATH ---${NC}\n"

# 1. {Component} instead of <Component />
echo -e "${YELLOW}1. Component rendered as variable: {MyComponent}${NC}"
grep -rE '([{(]|\s){[A-Z][A-Za-z0-9]*}' "$SEARCH_PATH" --include="*.js" --include="*.jsx" 2>/dev/null | \
grep -vE "import|export|const|let|var|return.*<|console|PropTypes|isValidElement|\.map\(|\.filter\(|\.length" | \
sed 's/^\(.*\):.*\(\{[A-Z][A-Za-z0-9]*\}\).*/\1:\2/g' || echo "  None found."

# 2. Raw object in Text
echo -e "\n${YELLOW}2. Raw object in Text: <Text>{obj}</Text>${NC}"
grep -rE "<Text[^>]*>\s*\{[^}]*\}\s*</Text>" "$SEARCH_PATH" --include="*.js" --include="*.jsx" 2>/dev/null | \
grep -vE "\.toString|\.name|\.id|length|join" || echo "  None found."

# 3. Component called as function
echo -e "\n${YELLOW}3. Component called as function: MyComponent()${NC}"
grep -rE "=[^=]*[A-Z][A-Za-z0-9]*\s*\(" "$SEARCH_PATH" --include="*.js" --include="*.jsx" 2>/dev/null | \
grep -vE "console|log|new |return|if|\.map\(|\.filter\(|\.forEach\(" || echo "  None found."

echo -e "\n${RED}CHECK: app/(tabs)/scanner.js → Is {QRCodeScanner} used instead of <QRCodeScanner />?${NC}"
echo -e "${CYAN}--- Done ---${NC}"