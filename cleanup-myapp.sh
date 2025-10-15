#!/bin/bash
# MyApp Cleanup Script - Remove duplicate and obsolete files

echo "🧹 MyApp Cleanup Script"
echo "======================="
echo ""

# Navigate to MyApp directory
cd /workspaces/MobileOrderTracker/MyApp/app

echo "Step 1: Removing backup files..."
if [ -f "_layout.jsBackap" ]; then
    rm "_layout.jsBackap"
    echo "✅ Deleted _layout.jsBackap"
else
    echo "⏭️  _layout.jsBackap not found (already deleted?)"
fi

if [ -f "(tabs)/DriverDashboard.js.old" ]; then
    rm "(tabs)/DriverDashboard.js.old"
    echo "✅ Deleted DriverDashboard.js.old"
else
    echo "⏭️  DriverDashboard.js.old not found (already deleted?)"
fi

echo ""
echo "Step 2: Removing obsolete order-details.js..."
echo "⚠️  WARNING: Make sure orders.js navigation has been fixed first!"
echo ""
read -p "Have you fixed orders.js navigation? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "(tabs)/order-details.js" ]; then
        rm "(tabs)/order-details.js"
        echo "✅ Deleted order-details.js"
    else
        echo "⏭️  order-details.js not found (already deleted?)"
    fi
else
    echo "⏭️  Skipping order-details.js deletion"
    echo "   Fix orders.js line 275 first, then run this script again"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Summary of changes:"
echo "  - Removed backup files"
echo "  - Cleaned up duplicate screens"
echo ""
echo "🔄 Next steps:"
echo "  1. Reload your Expo app (press 'R' in terminal)"
echo "  2. Test navigation from 'My Orders' tab"
echo "  3. Verify order details page works correctly"
echo ""
echo "📄 See MYAPP_CLEANUP_ANALYSIS.md for full details"
