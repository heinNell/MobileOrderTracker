#!/bin/bash

# Debug specific Text components that might be rendering objects

echo "=== Checking Text components with potential object values ==="

# Check the most suspicious files first
check_file() {
    local file="$1"
    echo -e "\n🔍 Checking: $file"
    
    # Extract the line numbers and variables used in Text components
    grep -nE '<Text[^>]*>\s*\{[^}]+\}' "$file" | while read line; do
        linenum=$(echo "$line" | cut -d: -f1)
        variable=$(echo "$line" | grep -oE '\{([^}]+)\}' | sed 's/[{}]//g' | tr -d ' ')
        
        # Skip if it's a function call or safe pattern
        if [[ "$variable" =~ \.(toUpperCase|toString|toLocaleDateString|replace) ]]; then
            continue
        fi
        
        echo "Line $linenum: <Text>{$variable}</Text>"
        
        # Check if this variable might be an object
        if grep -nE "(const|let|var)\s+$variable\s*=" "$file" | head -1; then
            echo "  Variable definition found above"
        fi
    done
}

# Check the most critical files
check_file "./app/components/map/WebMapView.js"
check_file "./app/components/ui/QuickStatCard.js"
check_file "./app/components/ui/InfoRow.js"
check_file "./app/(tabs)/\[\orderId\].js"  # Escaped brackets

# Let's also check what these variables actually contain
echo -e "\n=== Checking variable types in problematic files ==="

# Check WebMapView.js - the {title} might be an object
echo -e "\n📁 WebMapView.js - checking 'title' variable:"
grep -n "title" ./app/components/map/WebMapView.js | head -10

# Check QuickStatCard.js - {label} and {value} might be objects
echo -e "\n📁 QuickStatCard.js - checking 'label' and 'value':"
grep -nE "(label|value)\s*=" ./app/components/ui/QuickStatCard.js | head -10

# Check the most likely culprit - [orderId].js has locationError
echo -e "\n📁 [orderId].js - checking 'locationError' variable:"
grep -n "locationError" ./app/(tabs)/\[\orderId\].js | head -10

# Check what type of values are being passed to these Text components
echo "=== Checking variable definitions ==="

# Check if locationError might be an object
echo "locationError in [orderId].js:"
grep -A5 -B5 "locationError" ./app/(tabs)/\[\orderId\].js | head -20

# Check the title in WebMapView
echo -e "\ntitle in WebMapView.js:"
grep -A5 -B5 "title" ./app/components/map/WebMapView.js | head -20

# Check label and value in QuickStatCard
echo -e "\nlabel/value in QuickStatCard.js:"
grep -A5 -B5 "label\\|value" ./app/components/ui/QuickStatCard.js | head -20
