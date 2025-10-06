#!/bin/bash

# Mobile Order Tracker Dashboard - Netlify Deployment Script

echo "🚀 Starting Netlify deployment for Mobile Order Tracker Dashboard..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the dashboard directory."
    exit 1
fi

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Ensure we have all dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests if they exist
if [ -d "__tests__" ]; then
    echo "🧪 Running tests..."
    npm test --passWithNoTests
fi

# Build the application
echo "🔨 Building the application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."

# Check if this is the first deployment
if [ ! -f ".netlify/state.json" ]; then
    echo "🎯 First deployment detected. You'll need to:"
    echo "1. Login to Netlify CLI: netlify login"
    echo "2. Link this project: netlify link"
    echo "3. Set environment variables in Netlify dashboard"
    echo ""
    echo "Required environment variables:"
    echo "- NEXT_PUBLIC_SUPABASE_URL"
    echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY" 
    echo "- NEXT_PUBLIC_QR_CODE_SECRET"
    echo ""
    read -p "Press enter when you've completed the setup above..."
fi

# Deploy
netlify deploy --prod

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo "🔗 Your site is now live at: $(netlify status --json | jq -r '.site.url')"
    echo ""
    echo "📋 Post-deployment checklist:"
    echo "✅ Test the dashboard functionality"
    echo "✅ Verify QR code generation works"
    echo "✅ Test mobile app deep links"
    echo "✅ Check all pages load correctly"
    echo "✅ Verify environment variables are set"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi

echo "🏁 Deployment script completed!"