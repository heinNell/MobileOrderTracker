# Fix Vercel Deployment - Root Directory Issue

## Problem

The Vercel project settings have "Root Directory" set to "dashboard", but we're deploying FROM the dashboard directory, causing Vercel to look for `/dashboard/dashboard` which doesn't exist.

## Solution

### Option 1: Fix via Vercel Web Dashboard (RECOMMENDED)

1. Go to: https://vercel.com/matanuskatransport/dashboard/settings
2. Navigate to "General" settings
3. Find "Root Directory" setting
4. **CLEAR the Root Directory field** (set it to empty/root)
5. Click "Save"
6. Return to terminal and run: `vercel --prod`

### Option 2: Deploy from Repository Root

If you want to keep "Root Directory" as "dashboard":

1. Navigate to repo root: `cd /workspaces/MobileOrderTracker`
2. Create `.vercel` folder in root if not exists
3. Link the project: `vercel link --project prj_Rfn7VEGekqT1GL6ouphwSs1b2lJf`
4. Deploy: `vercel --prod`

### Option 3: Use Vercel API to Update Settings

```bash
# Get your Vercel token
vercel whoami

# Update project settings to clear root directory
curl -X PATCH \
  "https://api.vercel.com/v9/projects/prj_Rfn7VEGekqT1GL6ouphwSs1b2lJf?teamId=team_KT7gL2mAUnlt5xdMCU3ivwkq" \
  -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rootDirectory": null}'

# Then deploy
cd /workspaces/MobileOrderTracker/dashboard && vercel --prod
```

## Current Project Details

- **Project ID**: `prj_Rfn7VEGekqT1GL6ouphwSs1b2lJf`
- **Team ID**: `team_KT7gL2mAUnlt5xdMCU3ivwkq`
- **Project Name**: dashboard
- **Framework**: Next.js
- **Issue**: Root Directory is set to "dashboard" but should be empty

## Verification

After fixing, the deployment should succeed with:

```
✅ Production: https://dashboard-XXXXX-matanuskatransport.vercel.app
```

## Quick Fix Commands

```bash
# If you choose Option 1 (after clearing Root Directory in web UI):
cd /workspaces/MobileOrderTracker/dashboard
vercel --prod

# If you choose Option 2 (deploy from root):
cd /workspaces/MobileOrderTracker
vercel link --project prj_Rfn7VEGekqT1GL6ouphwSs1b2lJf
vercel --prod
```

## Build Status

✅ Local build: PASSING (18.3s compile time)
✅ Dependencies: FIXED (eslint-config-next upgraded to v15.5.4)
✅ Code: READY (All 3 phases complete)
⚠️ Deployment: BLOCKED by Root Directory setting

## Next Steps

1. Fix Root Directory setting using Option 1 above
2. Deploy to production
3. Test all 3 phases in production
4. Update todo list to mark deployment complete
