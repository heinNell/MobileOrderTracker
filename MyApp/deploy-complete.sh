#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Mobile Order Tracker — Web-only deployment script
#  Usage: ./deploy-complete.sh [--force]
# ---------------------------------------------------------------------------
set -euo pipefail

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERR]${NC}  $*" >&2; }

# npm flag default
NPM_FLAG="--legacy-peer-deps"
if [[ "${1:-}" == "--force" ]]; then
  NPM_FLAG="--force"
fi

# Debugging: print current working directory and Vercel project info
info "Current directory: $(pwd)"
info "Vercel project info:"
npx vercel project ls || true

# Sanity checks
if [[ ! -f "package.json" ]]; then
  err "package.json not found. Run this from your project root."
  exit 1
fi

info "Starting web-only deployment"
info "npm install flag: ${NPM_FLAG}"
echo "------------------------------------------------------------"

command -v npm >/dev/null || { err "npm not installed"; exit 1; }
command -v npx >/dev/null || { err "npx not installed"; exit 1; }

# Install deps
info "Installing dependencies (npm install ${NPM_FLAG})..."
if npm install ${NPM_FLAG}; then
  ok "Dependencies installed"
else
  err "npm install failed with flag ${NPM_FLAG}. Try ./deploy-complete.sh --force"
  exit 1
fi

# Non-fatal code checks
info "Running lint and type checks (non-fatal)..."
npm run lint:fix 2>/dev/null || warn "Lint step failed or not defined"
npm run type-check 2>/dev/null || warn "Type-check step failed or not defined"

# Web build
info "Building web version (npm run web:build)..."
if npm run web:build; then
  ok "Web build completed"
else
  err "Web build failed — check build logs and fix errors"
  exit 1
fi

# Determine build output directory 
BUILD_DIR="./dist"
if [[ -d "./web-build" ]]; then
  BUILD_DIR="./web-build"
elif [[ -d "./out" ]]; then
  BUILD_DIR="./out"
fi

info "Build output directory: ${BUILD_DIR}"

# Vercel deployment
if command -v vercel >/dev/null 2>&1; then
  info "Vercel CLI found — preparing to deploy"
  
  # Directly deploy to production. Vercel CLI will handle linking if needed (via vercel.json or environment variables).
  info "Running Vercel production deployment..."
  if npx vercel --prod --yes; then
    ok "Deployed to Vercel successfully"
  else
    err "Vercel production deployment failed. Please check Vercel CLI configuration."
    info "Troubleshooting steps:"
    info "1. Ensure you're logged in: npx vercel login"
    info "2. Check project settings at https://vercel.com/dashboard"
    info "3. Ensure the project is linked (e.g., via a 'vercel.json' file or environment variables like VERCEL_ORG_ID, VERCEL_PROJECT_ID)."
    exit 1
  fi
else
  warn "Vercel CLI not found. Install with: npm i -g vercel"
  info "You can manually deploy the build output folder (${BUILD_DIR}) to Vercel or another host."
fi

echo
ok "Web-only deployment finished"
info "Next steps: test the deployed site, check logs on your hosting provider."
