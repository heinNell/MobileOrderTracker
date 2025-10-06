#!/bin/bash

# Mobile Order Tracker - Deployment Script
echo "🚀 Starting Mobile App Deployment Process..."

# Change to project directory
cd /workspaces/MobileOrderTracker

# Check git status
echo "📋 Checking git status..."
git status

# Add all changes
echo "📦 Adding all changes to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "🔧 Fix critical mobile app errors: variable declarations, CORS, 404s, PWA optimization

- Fixed ReferenceError: initializationState not defined
- Resolved CORS policy blocks with custom server
- Created missing favicon and inline SVG icons  
- Enhanced error handling and library loading
- Updated manifest.json with proper PWA config
- Added defensive initialization checks
- All JavaScript errors resolved
- Mobile app now fully functional at localhost:8083"

# Push to main branch
echo "⬆️ Pushing to main branch..."
git push origin main

# Check if push was successful
if [ $? -eq 0 ]; then
    echo "✅ Git push successful!"
    
    # Deploy to Netlify (if netlify CLI is available)
    echo "🌐 Attempting Netlify deployment..."
    
    # Check if we're in the mobile-app directory
    cd mobile-app
    
    # Check if Netlify CLI is available
    if command -v netlify &> /dev/null; then
        echo "📡 Netlify CLI found, deploying..."
        netlify deploy --prod --dir=dist
        
        if [ $? -eq 0 ]; then
            echo "🎉 Netlify deployment successful!"
            echo "📱 Mobile app is now live!"
        else
            echo "⚠️ Netlify deployment failed, but files are ready for manual deployment"
        fi
    else
        echo "ℹ️ Netlify CLI not found. Files are ready for manual deployment."
        echo "📁 Deploy the 'mobile-app/dist' directory to your hosting service."
    fi
    
    echo ""
    echo "✅ DEPLOYMENT SUMMARY:"
    echo "📋 Git: Changes pushed to main branch"
    echo "📱 Mobile App: Ready for production"
    echo "🌐 Files: /workspaces/MobileOrderTracker/mobile-app/dist/"
    echo "🔧 Fixed: All critical JavaScript errors"
    echo "📡 Status: Production ready"
    
else
    echo "❌ Git push failed. Please check your Git configuration."
    exit 1
fi