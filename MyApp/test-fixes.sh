#!/bin/bash
# Comprehensive test script for mobile app fixes
# Run this script to test all the critical fixes

echo "🧪 Testing Mobile App Critical Fixes"
echo "===================================="

# 1. Test LocationService imports and methods
echo "1. Testing LocationService..."
cd /workspaces/MobileOrderTracker/MyApp

# Check if LocationService has required methods
echo "   Checking LocationService methods..."
if grep -q "isCurrentlyTracking" app/services/LocationService.js; then
    echo "   ✅ isCurrentlyTracking method found"
else
    echo "   ❌ isCurrentlyTracking method missing"
fi

if grep -q "isTrackingActive" app/services/LocationService.js; then
    echo "   ✅ isTrackingActive method found"
else
    echo "   ❌ isTrackingActive method missing"
fi

# 2. Test orders.js import
echo "2. Testing orders.js imports..."
if grep -q "require.*LocationService" app/\(tabs\)/orders.js; then
    echo "   ❌ Still using require() for LocationService"
else
    echo "   ✅ LocationService import looks correct"
fi

# 3. Test coordinate validation utility
echo "3. Testing coordinate validation..."
if [ -f "app/utils/coordinateValidation.js" ]; then
    echo "   ✅ Coordinate validation utility created"
else
    echo "   ❌ Coordinate validation utility missing"
fi

# 4. Test array utilities
echo "4. Testing array utilities..."
if [ -f "app/utils/arrayUtils.js" ]; then
    echo "   ✅ Array utilities created"
else
    echo "   ❌ Array utilities missing"
fi

# 5. Test Google Maps proxy
echo "5. Testing Google Maps proxy..."
if [ -f "app/services/GoogleMapsProxy.js" ]; then
    echo "   ✅ Google Maps proxy created"
else
    echo "   ❌ Google Maps proxy missing"
fi

# 6. Check for CORS fixes
echo "6. Testing CORS fixes..."
if [ -f "supabase-edge-function-cors-fix.ts" ]; then
    echo "   ✅ CORS fix template created"
else
    echo "   ❌ CORS fix template missing"
fi

# 7. Check database schema fix
echo "7. Testing database schema fix..."
if [ -f "fix-map-locations-schema.sql" ]; then
    echo "   ✅ Database schema fix created"
else
    echo "   ❌ Database schema fix missing"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Apply the SQL schema fix to your Supabase database"
echo "2. Deploy the CORS fix to your Supabase Edge Functions"
echo "3. Test the app with: npm run web"
echo "4. Monitor console for remaining errors"

echo ""
echo "📋 Files Created:"
echo "- app/utils/coordinateValidation.js"
echo "- app/utils/arrayUtils.js" 
echo "- app/services/GoogleMapsProxy.js"
echo "- fix-map-locations-schema.sql"
echo "- supabase-edge-function-cors-fix.ts"