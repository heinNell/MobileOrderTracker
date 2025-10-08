#!/bin/bash

# Deploy All Applications to Netlify
# This script deploys both the dashboard and mobile web app

set -e

echo "🚀 Starting deployment of all applications..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${RED}❌ Netlify CLI is not installed${NC}"
    echo "Installing Netlify CLI..."
    npm install -g netlify-cli
fi

echo -e "${BLUE}📋 Checking Netlify authentication...${NC}"
netlify status || netlify login

echo ""
echo "=================================="
echo "  1. DEPLOYING DASHBOARD"
echo "=================================="
echo ""

cd dashboard

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found in dashboard directory${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dashboard dependencies...${NC}"
    npm install
fi

# Build the dashboard
echo -e "${BLUE}🔨 Building dashboard...${NC}"
npm run build

# Deploy to Netlify
echo -e "${BLUE}🚀 Deploying dashboard to Netlify...${NC}"
netlify deploy --prod --dir=.next

echo -e "${GREEN}✅ Dashboard deployed successfully!${NC}"

cd ..

echo ""
echo "=================================="
echo "  2. DEPLOYING MOBILE WEB APP"
echo "=================================="
echo ""

cd mobile-app

# The mobile app uses static files from dist directory
echo -e "${BLUE}📱 Deploying mobile web app (PWA)...${NC}"

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ dist directory not found${NC}"
    echo "Creating dist directory..."
    mkdir -p dist
fi

# Check if index.html exists
if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ dist/index.html not found${NC}"
    exit 1
fi

# Deploy to Netlify
netlify deploy --prod --dir=dist

echo -e "${GREEN}✅ Mobile web app deployed successfully!${NC}"

cd ..

echo ""
echo "=================================="
echo "  ✅ ALL DEPLOYMENTS COMPLETE"
echo "=================================="
echo ""
echo "To view your sites:"
echo "  Dashboard: Run 'cd dashboard && netlify open'"
echo "  Mobile App: Run 'cd mobile-app && netlify open'"
echo ""
echo "To check deployment status:"
echo "  Dashboard: Run 'cd dashboard && netlify status'"
echo "  Mobile App: Run 'cd mobile-app && netlify status'"
echo ""
