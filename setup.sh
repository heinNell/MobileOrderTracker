#!/bin/bash

# Mobile Order Tracker - Quick Setup Script

echo "🚀 Mobile Order Tracker - Quick Setup"
echo "======================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    npm install -g supabase
else
    echo "✅ Supabase CLI is already installed"
fi

echo ""
echo "📊 Next Steps:"
echo ""
echo "1️⃣  Deploy Database Schema:"
echo "   Go to: https://supabase.com/dashboard/project/liagltqpeilbswuqcahp/sql/new"
echo "   Copy and paste the contents of: supabase/schema.sql"
echo "   Click 'Run' to execute"
echo ""
echo "2️⃣  Deploy Edge Functions:"
echo "   cd /workspaces/MobileOrderTracker"
echo "   supabase login"
echo "   supabase link --project-ref liagltqpeilbswuqcahp"
echo "   supabase functions deploy validate-qr-code"
echo "   supabase functions deploy generate-qr-code"
echo ""
echo "3️⃣  Set QR Code Secret:"
echo "   openssl rand -base64 32"
echo "   supabase secrets set QR_CODE_SECRET=\"<generated-secret>\""
echo ""
echo "4️⃣  Create Test User:"
echo "   Go to: https://supabase.com/dashboard/project/liagltqpeilbswuqcahp/auth/users"
echo "   Click 'Add User' and create a test account"
echo ""
echo "5️⃣  Dashboard is running at: http://localhost:3001"
echo ""
echo "📚 For detailed instructions, see: QUICKSTART.md"
echo ""
