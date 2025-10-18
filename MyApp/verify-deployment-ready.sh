#!/bin/bash

# Pre-deployment verification script
# Checks if the Mobile Order Tracker is ready for deployment

set -e

echo "🔍 Pre-Deployment Verification"
echo "=============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
TOTAL=0

check_status() {
    TOTAL=$((TOTAL + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅${NC} $2"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌${NC} $2"
    fi
}

echo -e "${BLUE}📁 File Structure Checks${NC}"
echo "========================"

# Check essential files
[ -f "package.json" ] && check_status 0 "package.json exists" || check_status 1 "package.json missing"
[ -f "app.json" ] && check_status 0 "app.json exists" || check_status 1 "app.json missing"
[ -f "eas.json" ] && check_status 0 "eas.json exists" || check_status 1 "eas.json missing"
[ -f "vercel.json" ] && check_status 0 "vercel.json exists" || check_status 1 "vercel.json missing"

# Check service files
[ -f "services/StatusUpdateService.js" ] && check_status 0 "StatusUpdateService exists" || check_status 1 "StatusUpdateService missing"
[ -f "components/StatusUpdateButtons.js" ] && check_status 0 "StatusUpdateButtons exists" || check_status 1 "StatusUpdateButtons missing"
[ -f "services/GeocodingService.js" ] && check_status 0 "GeocodingService exists" || check_status 1 "GeocodingService missing"

echo -e "\n${BLUE}🔧 Configuration Checks${NC}"
echo "======================="

# Check environment variables in app.json
if grep -q "EXPO_PUBLIC_SUPABASE_URL" app.json; then
    check_status 0 "Supabase URL configured"
else
    check_status 1 "Supabase URL missing"
fi

if grep -q "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" app.json; then
    check_status 0 "Google Maps API key configured"
else
    check_status 1 "Google Maps API key missing"
fi

if grep -q "projectId" app.json; then
    check_status 0 "EAS project ID configured"
else
    check_status 1 "EAS project ID missing"
fi

echo -e "\n${BLUE}🧪 Code Quality Checks${NC}"
echo "======================"

# Check for syntax errors
echo "Checking JavaScript syntax..."
find . -name "*.js" -not -path "./node_modules/*" -not -path "./dist/*" | while read file; do
    if node -c "$file" 2>/dev/null; then
        continue
    else
        echo -e "${RED}❌${NC} Syntax error in $file"
        exit 1
    fi
done && check_status 0 "JavaScript syntax valid" || check_status 1 "JavaScript syntax errors found"

# Check for common issues
if grep -r "Location\.geocodeAsync(" --include="*.js" --exclude-dir=node_modules . >/dev/null 2>&1; then
    check_status 1 "Deprecated Location.geocodeAsync found"
else
    check_status 0 "No deprecated geocoding APIs"
fi

echo -e "\n${BLUE}📦 Dependencies Check${NC}"
echo "===================="

# Check if node_modules exists
[ -d "node_modules" ] && check_status 0 "Dependencies installed" || check_status 1 "Dependencies not installed (run npm install)"

# Check package.json scripts
if grep -q "web:build" package.json; then
    check_status 0 "Web build script configured"
else
    check_status 1 "Web build script missing"
fi

if grep -q "deploy" package.json; then
    check_status 0 "Deploy script configured"
else
    check_status 1 "Deploy script missing"
fi

echo -e "\n${BLUE}🚀 Build Test${NC}"
echo "============="

# Test web build
echo "Testing web build..."
if npm run web:build >/dev/null 2>&1; then
    check_status 0 "Web build successful"
    [ -d "dist" ] && check_status 0 "Web build output generated" || check_status 1 "Web build output missing"
else
    check_status 1 "Web build failed"
fi

echo -e "\n${BLUE}📊 VERIFICATION SUMMARY${NC}"
echo "======================="
echo -e "Passed: ${GREEN}$PASSED${NC}/$TOTAL checks"

if [ $PASSED -eq $TOTAL ]; then
    echo -e "\n${GREEN}🎉 ALL CHECKS PASSED!${NC}"
    echo -e "${GREEN}✅ Your app is ready for deployment!${NC}"
    echo ""
    echo "Run the deployment script:"
    echo "  ./deploy-complete.sh"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Some checks failed${NC}"
    echo -e "${YELLOW}Please fix the issues above before deploying${NC}"
    exit 1
fi