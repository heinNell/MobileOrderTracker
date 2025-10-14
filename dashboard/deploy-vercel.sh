#!/bin/bash

# Mobile Order Tracker Dashboard - Vercel Deployment Script
echo "🚀 Starting Vercel Deployment Process..."

# Change to dashboard directory
cd /workspaces/MobileOrderTracker/dashboard

# Check if logged into Vercel
echo "📋 Checking Vercel authentication..."
if ! vercel whoami > /dev/null 2>&1; then
    echo "❌ Not logged into Vercel. Please run 'vercel login' first."
    exit 1
fi

echo "✅ Vercel authentication verified"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project locally to check for errors
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful"

# Set environment variables (if not already set)
echo "🔧 Setting up environment variables..."

# Check if environment variables are set in Vercel
echo "📝 Setting Vercel environment variables..."

# Set production environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://liagltqpeilbswuqcahp.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNTcxODUsImV4cCI6MjA3MzkzMzE4NX0.71jtSKXQsCb2Olxzxf6CCX9zl5Hqtgp9k--gsvCw11s"
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production <<< "AIzaSyAhoyKz_MWD2hoesNvhP1ofEP4SZl3dxtg"
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM1NzE4NSwiZXhwIjoyMDczOTMzMTg1fQ.dtEl-YMJZ-YmEaS9B7Loy7I3bRcf-2sHjpHRF8sCD8o"

# Set preview environment variables  
vercel env add NEXT_PUBLIC_SUPABASE_URL preview <<< "https://liagltqpeilbswuqcahp.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNTcxODUsImV4cCI6MjA3MzkzMzE4NX0.71jtSKXQsCb2Olxzxf6CCX9zl5Hqtgp9k--gsvCw11s"
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY preview <<< "AIzaSyAhoyKz_MWD2hoesNvhP1ofEP4SZl3dxtg"

echo "✅ Environment variables configured"

# Deploy to production
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🔗 Your dashboard is now live!"
    echo ""
    echo "📊 Deployment Summary:"
    echo "- Platform: Vercel"
    echo "- Environment: Production"
    echo "- Framework: Next.js"
    echo "- Build Status: ✅ Success"
    echo ""
    echo "🔧 Next Steps:"
    echo "1. Test your live dashboard"
    echo "2. Configure custom domain (optional)"
    echo "3. Set up monitoring and analytics"
    echo ""
    echo "💡 Useful Commands:"
    echo "- vercel --prod    (redeploy to production)"
    echo "- vercel logs      (view deployment logs)"
    echo "- vercel domains   (manage custom domains)"
    echo "- vercel env ls    (list environment variables)"
else
    echo "❌ Deployment failed!"
    echo "💡 Troubleshooting:"
    echo "1. Check your environment variables"
    echo "2. Verify your build passes locally"
    echo "3. Check Vercel logs: vercel logs"
    exit 1
fi