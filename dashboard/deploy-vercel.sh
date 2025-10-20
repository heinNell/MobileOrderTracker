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

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies."
    exit 1
fi

# Build the project locally to check for errors
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Build successful"

# Try to link the project, but don't fail if it doesn't work
echo "🔗 Attempting to link project..."
vercel link --project prj_Rfn7VEGekqT1GL6ouphwSs1b2lJf 2>/dev/null || {
    echo "⚠️  Linking failed, but continuing with deployment..."
    echo "💡 Vercel will handle project association during deployment"
}

# Set environment variables (with error handling)
echo "🔧 Setting up environment variables..."

# Function to add environment variable with error handling
add_env_var() {
    local key=$1
    local env=$2
    local value=$3
    
    echo "Setting $key for $env environment..."
    echo "$value" | vercel env add "$key" "$env" 2>/dev/null || {
        echo "⚠️  Failed to set $key (may already exist)"
    }
}

# Set production environment variables
add_env_var "NEXT_PUBLIC_SUPABASE_URL" "production" "https://liagltqpeilbswuqcahp.supabase.co"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "production" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNTcxODUsImV4cCI6MjA3MzkzMzE4NX0.71jtSKXQsCb2Olxzxf6CCX9zl5Hqtgp9k--gsvCw11s"
add_env_var "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" "production" "AIzaSyAhoyKz_MWD2hoesNvhP1ofEP4SZl3dxtg"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "production" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODM1NzE4NSwiZXhwIjoyMDczOTMzMTg1fQ.dtEl-YMJZ-YmEaS9B7Loy7I3bRcf-2sHjpHRF8sCD8o"

# Set preview environment variables
add_env_var "NEXT_PUBLIC_SUPABASE_URL" "preview" "https://liagltqpeilbswuqcahp.supabase.co"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "preview" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYWdsdHFwZWlsYnN3dXFjYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNTcxODUsImV4cCI6MjA3MzkzMzE4NX0.71jtSKXQsCb2Olxzxf6CCX9zl5Hqtgp9k--gsvCw11s"
add_env_var "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" "preview" "AIzaSyAhoyKz_MWD2hoesNvhP1ofEP4SZl3dxtg"

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
    echo "1. Check your environment variables: vercel env ls"
    echo "2. Verify your build passes locally: npm run build"
    echo "3. Check Vercel logs: vercel logs"
    echo "4. Try manual deployment: vercel --prod"
    exit 1
fi
