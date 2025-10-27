#!/bin/bash

# Focused React Error Scanner
# Targets specific patterns that cause "Text strings must be rendered within a <Text> component"

SEARCH_PATH="./app"
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== Focused React Error Scanner ===${NC}"
echo -e "Targeting: Text strings must be rendered within a <Text> component\n"

# Function to check specific problematic patterns
check_jsx_patterns() {
    echo -e "${YELLOW}1. Checking for Components Rendered in Braces:${NC}"
    # Look for {ComponentName} pattern in JSX (should be <ComponentName />)
    find "$SEARCH_PATH" -name "*.js" -o -name "*.jsx" | while read file; do
        # Use a more precise pattern to find {Component} in JSX context
        if grep -nE '(<\w+[^>]*>\s*\{[A-Z][A-Za-z0-9]+\}\s*</\w+>|>\s*\{[A-Z][A-Za-z0-9]+\}\s*<)' "$file" 2>/dev/null; then
            echo -e "${RED}❌ Found in: $file${NC}"
        fi
    done

    echo -e "\n${YELLOW}2. Checking for Raw Objects in Text Components:${NC}"
    # Look for variables that might be objects in <Text> components
    find "$SEARCH_PATH" -name "*.js" -o -name "*.jsx" | while read file; do
        # Find <Text>{variable}</Text> where variable doesn't have property access
        if grep -nE '<Text[^>]*>\s*\{[a-z_][a-zA-Z0-9_]*\s*\}' "$file" 2>/dev/null | \
           grep -vE '(error|loading|user\.|order\.|item\.|\.toString|\.toUpperCase)' > /dev/null; then
            echo -e "${RED}❌ Found in: $file${NC}"
            grep -nE '<Text[^>]*>\s*\{[a-z_][a-zA-Z0-9_]*\s*\}' "$file" | \
            grep -vE '(error|loading|user\.|order\.|item\.|\.toString|\.toUpperCase)'
        fi
    done
}

# Function to manually inspect key files
inspect_key_files() {
    echo -e "\n${YELLOW}3. Manual Inspection of Key Files:${NC}"
    
    local key_files=(
        "./app/_layout.js"
        "./app/(tabs)/_layout.js"
        "./app/index.js"
        "./app/(tabs)/index.js"
    )
    
    for file in "${key_files[@]}"; do
        if [[ -f "$file" ]]; then
            echo -e "\n${CYAN}=== Inspecting $file ===${NC}"
            
            # Look for any suspicious return statements or JSX patterns
            echo -e "${YELLOW}Return statements:${NC}"
            grep -n "return" "$file" | head -10
            
            echo -e "${YELLOW}JSX with braces:${NC}"
            grep -nE '>\s*\{[^}]+\}\s*<' "$file" | head -10
            
            echo -e "${YELLOW}Component usage:${NC}"
            grep -nE '<[A-Z][A-Za-z]' "$file" | head -10
        fi
    done
}

# Function to check for common React Native mistakes
check_common_mistakes() {
    echo -e "\n${YELLOW}4. Common React Native Mistakes:${NC}"
    
    # Check for strings returned directly without Text wrapper
    echo -e "${CYAN}Checking for naked strings in returns:${NC}"
    find "$SEARCH_PATH" -name "*.js" -o -name "*.jsx" | xargs grep -lE 'return\s+[^{][^;]*$' 2>/dev/null | while read file; do
        # Look for return statements that don't return JSX
        if grep -nE 'return\s+[^{][^;]*$' "$file" | grep -vE '(return\s+null|return\s+undefined|return\s+[0-9]|return\s+[A-Z]|//)' > /dev/null; then
            echo -e "${RED}❌ Found naked return in: $file${NC}"
            grep -nE 'return\s+[^{][^;]*$' "$file" | grep -vE '(return\s+null|return\s+undefined|return\s+[0-9]|return\s+[A-Z]|//)'
        fi
    done
}

# Run the checks
check_jsx_patterns
inspect_key_files
check_common_mistakes

echo -e "\n${GREEN}=== Scan Complete ===${NC}"
echo -e "${YELLOW}Manual Check Instructions:${NC}"
echo "1. Look for {Component} patterns (should be <Component />)"
echo "2. Check if any variables in <Text> components might be objects"
echo "3. Verify all strings are wrapped in <Text> components"
echo "4. Check for undefined/null values in JSX"

# Check the main layout files for specific patterns
echo "=== Checking app/_layout.js for JSX issues ==="
cat -n ./app/_layout.js | grep -E "return|{.*[A-Z]|</.*>"

echo "=== Checking app/(tabs)/_layout.js for JSX issues ==="  
cat -n ./app/(tabs)/_layout.js | grep -E "return|{.*[A-Z]|</.*>"

echo "=== Checking app/index.js for JSX issues ==="
cat -n ./app/index.js | grep -E "return|{.*[A-Z]|</.*>"

# Look specifically for any component that might be used incorrectly
echo "=== Looking for component usage patterns ==="
find ./app -name "*.js" -exec grep -l "export default" {} \; | head -5