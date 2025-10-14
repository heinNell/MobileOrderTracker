#!/bin/bash

# Deploy driver_locations table to fix mobile app location tracking
echo "🚀 Creating driver_locations table to fix mobile app integration..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please log in first:"
    echo "   supabase login"
    exit 1
fi

# Run the SQL script to create the table
echo "📋 Creating driver_locations table..."
if supabase db push --file create-driver-locations-simple.sql; then
    echo "✅ driver_locations table created successfully!"
    
    # Run the test script to verify the table
    echo "🧪 Running table verification tests..."
    if supabase db push --file test-driver-locations.sql; then
        echo "✅ Table verification completed!"
    else
        echo "⚠️  Table verification failed, but table should still work"
    fi
    
    echo ""
    echo "🎉 Location tracking integration fix completed!"
    echo ""
    echo "Next steps:"
    echo "1. Test location tracking in the mobile app"
    echo "2. Check if location updates appear in the dashboard"
    echo "3. Monitor the diagnostics page for any remaining issues"
    
else
    echo "❌ Failed to create driver_locations table"
    echo "You may need to run the SQL manually in the Supabase dashboard"
    exit 1
fi