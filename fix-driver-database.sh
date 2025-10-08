#!/bin/bash

# Database Fix Deployment Script
# This script applies the necessary database fixes for driver creation

echo "🔧 Applying database fixes for driver creation..."

# Check if we have environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable"
    exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Missing SUPABASE_ANON_KEY environment variable"
    exit 1
fi

echo "✅ Environment variables found"

# Apply the RLS policy fix
echo "📝 Applying RLS policy fixes..."
echo "Please run the following SQL in your Supabase SQL Editor:"
echo ""
echo "----------------------------------------"
cat supabase/fix_rls_policies.sql
echo "----------------------------------------"
echo ""
echo "After running the SQL above, the following should work:"
echo "1. ✅ Driver creation via dashboard"
echo "2. ✅ Driver assignment to orders"
echo "3. ✅ QR code scanning by assigned drivers"
echo ""
echo "🎯 Next steps:"
echo "1. Go to your Supabase project: https://supabase.com/dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the SQL from fix_rls_policies.sql"
echo "4. Execute the SQL"
echo "5. Test driver creation in dashboard at: http://localhost:3001/drivers"
echo ""
echo "🔗 Dashboard URL: http://localhost:3001"
echo "🔗 Drivers page: http://localhost:3001/drivers"