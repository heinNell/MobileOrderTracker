echo "=== Checking Project Configuration ==="
echo ""

echo "1. Current package.json main entry:"
if [ -f "package.json" ]; then
    grep -A 2 -B 2 '"main"' package.json || echo "No 'main' field found in package.json"
else
    echo "package.json not found!"
fi
echo ""

echo "2. Checking expo-router entry.js content:"
if [ -f "node_modules/expo-router/entry.js" ]; then
    echo "✓ entry.js exists, content:"
    cat node_modules/expo-router/entry.js
else
    echo "✗ entry.js not found"
fi
echo ""

echo "3. Checking babel.config.js:"
if [ -f "babel.config.js" ]; then
    echo "✓ babel.config.js exists:"
    cat babel.config.js
else
    echo "✗ babel.config.js not found"
fi
echo ""

echo "4. Checking app.json/app.config.js:"
if [ -f "app.json" ]; then
    echo "✓ app.json exists:"
    cat app.json
elif [ -f "app.config.js" ]; then
    echo "✓ app.config.js exists:"
    cat app.config.js
else
    echo "✗ No app configuration found"
fi
echo ""

echo "5. Checking for app directory structure:"
if [ -d "app" ]; then
    echo "✓ app directory exists:"
    find app -type f -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | head -10
else
    echo "✗ app directory not found"
fi
echo ""

echo "6. Checking metro.config.js:"
if [ -f "metro.config.js" ]; then
    echo "✓ metro.config.js exists:"
    cat metro.config.js
else
    echo "✗ metro.config.js not found"
fi
