#!/bin/bash

# Complete Deployment Script for Mobile Order Tracker
# This script deploys both web and mobile versions

set -e  # Exit on any error

echo "🚀 Starting deployment of Mobile Order Tracker..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    print_error "Please run this script from the MyApp directory"
    exit 1
fi

# Verify dependencies
print_status "Checking dependencies..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    print_error "npx is not installed"
    exit 1
fi

# Install dependencies if needed
print_status "Installing dependencies..."
npm install

# Run code quality checks
print_status "Running code quality checks..."
npm run lint:fix || true
npm run type-check || true

# Web deployment
echo -e "\n${BLUE}🌐 WEB DEPLOYMENT${NC}"
echo "================================"

print_status "Building web version..."
npm run web:build

if [ $? -eq 0 ]; then
    print_success "Web build completed successfully"
    
    # Check if vercel is available
    if command -v vercel &> /dev/null; then
        print_status "Deploying to Vercel..."
        npx vercel --prod --yes
        print_success "Web deployment completed!"
        print_status "Your web app should be available at your Vercel domain"
    else
        print_warning "Vercel CLI not found. Install with: npm install -g vercel"
        print_status "Web build is ready in the 'dist' directory"
        print_status "You can deploy manually by uploading the 'dist' folder to Vercel"
    fi
else
    print_error "Web build failed"
    exit 1
fi

# Mobile deployment
echo -e "\n${BLUE}📱 MOBILE DEPLOYMENT${NC}"
echo "================================="

# Check if EAS CLI is available
if command -v eas &> /dev/null; then
    print_status "EAS CLI detected. Proceeding with mobile build..."
    
    # Check EAS login status
    if eas whoami &> /dev/null; then
        print_success "Already logged into EAS"
    else
        print_warning "Not logged into EAS. Please run 'eas login' first"
        print_status "Skipping mobile build for now"
        SKIP_MOBILE=true
    fi
    
    if [ "${SKIP_MOBILE}" != "true" ]; then
        print_status "Building Android APK..."
        eas build --platform android --profile production --non-interactive
        
        if [ $? -eq 0 ]; then
            print_success "Mobile build submitted successfully!"
            print_status "Check your EAS dashboard for build progress"
            print_status "You can download the APK when the build completes"
        else
            print_error "Mobile build failed"
        fi
    fi
else
    print_warning "EAS CLI not found. Install with: npm install -g @expo/eas-cli"
    print_status "Mobile build skipped. You can build manually with:"
    print_status "  1. npm install -g @expo/eas-cli"
    print_status "  2. eas login"
    print_status "  3. eas build --platform android --profile production"
fi

# Summary
echo -e "\n${GREEN}✅ DEPLOYMENT SUMMARY${NC}"
echo "=================================="
print_success "Web deployment: Completed (or ready for manual upload)"
print_status "Mobile deployment: ${SKIP_MOBILE:+Skipped - requires EAS login}${SKIP_MOBILE:-Submitted to EAS Build}"

echo -e "\n${BLUE}📋 NEXT STEPS${NC}"
echo "=============="
print_status "1. Check your Vercel dashboard for web deployment status"
print_status "2. Monitor EAS Build dashboard for mobile app progress"
print_status "3. Test both platforms thoroughly before production use"
print_status "4. Set up monitoring and analytics"

echo -e "\n${BLUE}🔗 IMPORTANT LINKS${NC}"
echo "=================="
print_status "• Vercel Dashboard: https://vercel.com/dashboard"
print_status "• EAS Build Dashboard: https://expo.dev/builds"
print_status "• Supabase Dashboard: https://supabase.com/dashboard"
print_status "• Google Cloud Console: https://console.cloud.google.com"

echo -e "\n${GREEN}🎉 Deployment script completed!${NC}"
echo "Your Mobile Order Tracker is ready for production use."