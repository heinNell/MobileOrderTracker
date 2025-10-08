# 🚀 Deployment Instructions

Quick guide to deploy Mobile Order Tracker to Netlify.

## Prerequisites

1. **Netlify Account** - [Sign up here](https://netlify.com)
2. **Netlify CLI** - Install with: `npm install -g netlify-cli`
3. **Node.js** v18+ and npm v9+

## Quick Deploy

### Option 1: Automated Script (Fastest) ⚡

**Linux/Mac:**
```bash
./deploy-all.sh
```

**Windows:**
```powershell
.\deploy-all.ps1
```

The script will:
- ✅ Check for Netlify CLI
- ✅ Authenticate you (if needed)
- ✅ Build the dashboard
- ✅ Deploy dashboard to production
- ✅ Deploy mobile web app to production

### Option 2: Manual Deployment 🔧

**Deploy Dashboard:**
```bash
cd dashboard
npm install
npm run build
netlify deploy --prod --dir=.next
```

**Deploy Mobile Web App:**
```bash
cd mobile-app
netlify deploy --prod --dir=dist
```

## First Time Setup

### 1. Authenticate with Netlify

```bash
netlify login
```

This opens your browser to authenticate.

### 2. Link Your Sites

**For Dashboard:**
```bash
cd dashboard
netlify init
# Or link to existing site:
netlify link
```

**For Mobile App:**
```bash
cd mobile-app
netlify init
# Or link to existing site:
netlify link
```

### 3. Configure Environment Variables

#### Dashboard Environment Variables

Set in Netlify Dashboard → Site settings → Environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://liagltqpeilbswuqcahp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NODE_VERSION=18
NPM_VERSION=9
```

#### Mobile Web App

Already configured in `mobile-app/netlify.toml` - no action needed!

## Post-Deployment

### 1. Get Your URLs

```bash
# Dashboard URL
cd dashboard && netlify open

# Mobile App URL
cd mobile-app && netlify open
```

### 2. Update Supabase Redirect URLs

1. Go to Supabase Dashboard
2. Navigate to Authentication → URL Configuration
3. Add your Netlify URLs:
   - `https://your-dashboard.netlify.app`
   - `https://your-mobile-app.netlify.app`

### 3. Test Your Deployments

**Test Dashboard:**
1. Open dashboard URL
2. Try logging in as admin
3. Create a test order
4. Assign a driver
5. Generate QR code

**Test Mobile App:**
1. Open mobile app URL on your phone
2. Login as driver
3. View assigned orders
4. Activate load
5. Test QR scanning

## Troubleshooting

### "Netlify CLI not found"
```bash
npm install -g netlify-cli
```

### "Authentication failed"
```bash
netlify logout
netlify login
```

### "Build failed"
```bash
# Clear cache and rebuild
cd dashboard
rm -rf .next node_modules
npm install
npm run build
```

### "Site not found"
```bash
cd dashboard  # or mobile-app
netlify link
```

## Continuous Deployment

### GitHub Integration (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to Netlify Dashboard
   - Click "Add new site" → "Import an existing project"
   - Select GitHub
   - Choose your repository
   - Configure build settings:
     - **Dashboard:** Base: `dashboard`, Build: `npm run build`, Publish: `.next`
     - **Mobile:** Base: `mobile-app`, Build: none, Publish: `dist`

3. **Auto-Deploy:**
   - Every push to `main` automatically deploys
   - Pull requests create preview deployments
   - Rollback anytime from Netlify Dashboard

## Deployment Checklist

### Pre-Deployment
- [ ] Code committed to Git
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Build succeeds locally
- [ ] Database migrations applied

### Deployment
- [ ] Dashboard deployed successfully
- [ ] Mobile app deployed successfully
- [ ] URLs accessible
- [ ] HTTPS enabled (automatic)

### Post-Deployment
- [ ] Supabase URLs updated
- [ ] Authentication working
- [ ] QR code generation working
- [ ] Mobile features functional
- [ ] Team notified of URLs

## URLs Reference

After deployment, you'll have:

| Application | Example URL | Purpose |
|-------------|-------------|---------|
| **Dashboard** | `https://order-tracker-dashboard.netlify.app` | Admin & dispatcher management |
| **Mobile App** | `https://order-tracker-mobile.netlify.app` | Driver application (PWA) |

## Support

- 📖 **Full Guide:** See `docs/NETLIFY_DEPLOYMENT_GUIDE.md`
- 🔧 **Troubleshooting:** See `TROUBLESHOOTING.md`
- 📱 **Implementation:** See `docs/DRIVER_ALLOCATION_AND_QR_IMPLEMENTATION.md`

## Quick Commands Reference

```bash
# Deploy both apps
./deploy-all.sh

# Check deployment status
netlify status

# View site in browser
netlify open

# View deployment logs
netlify logs

# Rollback deployment
netlify rollback
```

---

**Ready to deploy?** Run `./deploy-all.sh` and you'll be live in minutes! 🚀
