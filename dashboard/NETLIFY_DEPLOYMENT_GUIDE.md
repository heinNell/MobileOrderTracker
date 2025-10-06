# 🚀 Netlify Deployment Guide - Mobile Order Tracker Dashboard

This guide will help you deploy the Mobile Order Tracker Dashboard to Netlify with all the QR code functionality intact.

## 📋 Prerequisites

1. **Netlify Account**: Create a free account at [netlify.com](https://netlify.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Environment Variables**: You'll need your Supabase credentials

## 🔧 Required Environment Variables

Set these in your Netlify dashboard under **Site settings > Environment variables**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://liagltqpeilbswuqcahp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_QR_CODE_SECRET=your_qr_secret_here
NODE_VERSION=18
NPM_VERSION=9
```

## 🚀 Option 1: Deploy via Netlify Dashboard (Recommended)

### Step 1: Connect Your Repository

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site"** > **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Select your `MobileOrderTracker` repository
5. Configure build settings:
   - **Base directory**: `dashboard`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`

### Step 2: Configure Build Settings

In the deployment configuration:

```yaml
Build Settings:
  - Base directory: dashboard
  - Build command: npm run build
  - Publish directory: .next
  - Node version: 18
```

### Step 3: Add Environment Variables

In **Site settings > Environment variables**, add:

1. `NEXT_PUBLIC_SUPABASE_URL` → `https://liagltqpeilbswuqcahp.supabase.co`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` → (your Supabase anon key)
3. `NEXT_PUBLIC_QR_CODE_SECRET` → (a secure random string)
4. `NODE_VERSION` → `18`

### Step 4: Deploy

1. Click **"Deploy site"**
2. Wait for the build to complete (3-5 minutes)
3. Your site will be available at `https://[random-name].netlify.app`

## 🚀 Option 2: Deploy via Netlify CLI

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify

```bash
netlify login
```

### Step 3: Navigate to Dashboard Directory

```bash
cd /workspaces/MobileOrderTracker/dashboard
```

### Step 4: Link Your Site

```bash
netlify link
```

### Step 5: Set Environment Variables

```bash
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://liagltqpeilbswuqcahp.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your_anon_key_here"
netlify env:set NEXT_PUBLIC_QR_CODE_SECRET "your_secret_here"
netlify env:set NODE_VERSION "18"
```

### Step 6: Deploy

```bash
# Build and deploy
npm run build
netlify deploy --prod
```

Or use the automated script:

```bash
./deploy.sh
```

## 🔧 netlify.toml Configuration

The `netlify.toml` file is already configured with:

- ✅ Next.js plugin integration
- ✅ Proper MIME type headers
- ✅ Static asset caching
- ✅ Security headers
- ✅ Redirect rules for SPA routing
- ✅ Supabase API proxying

## 🧪 Post-Deployment Testing

### 1. Verify Dashboard Access

Visit your deployed site and check:

- ✅ Dashboard loads without MIME type errors
- ✅ All CSS and JavaScript files load correctly
- ✅ Navigation between pages works
- ✅ No 404 errors in browser console

### 2. Test QR Code Functionality

1. **Navigate to Orders page**
2. **Click QR button** on any order
3. **Verify QR code downloads** successfully
4. **Click 🧪 debug button** to run full test suite
5. **Check mobile app links** work correctly

### 3. Test Mobile App Integration

1. **Generate QR code** for an order
2. **Scan with mobile device** (any QR scanner app)
3. **Verify deep link** opens mobile app or prompts to install
4. **Test web fallback** in browser

## 🔍 Troubleshooting

### Build Failures

If the build fails:

1. **Check Node version**: Ensure Node 18 is used
2. **Clear cache**: Delete `.next` and `node_modules`, then `npm install`
3. **Check environment variables**: Ensure all required vars are set
4. **Review build logs**: Look for specific error messages

### Runtime Errors

If the site loads but has errors:

1. **Check browser console**: Look for MIME type or loading errors
2. **Verify environment variables**: Check they're correctly set in Netlify
3. **Test locally**: Ensure everything works with `npm run dev`
4. **Check Supabase connection**: Verify URL and keys are correct

### QR Code Issues

If QR codes don't work:

1. **Check Supabase edge functions**: Ensure they're deployed
2. **Verify QR_CODE_SECRET**: Must be set in environment variables
3. **Test fallback generation**: Client-side generation should work even if edge functions fail
4. **Check mobile app scheme**: Ensure `ordertracker://` is configured

## 🌐 Custom Domain (Optional)

To use a custom domain:

1. **Go to Site settings > Domain management**
2. **Click "Add custom domain"**
3. **Enter your domain** (e.g., `tracker.yourdomain.com`)
4. **Configure DNS** according to Netlify instructions
5. **Enable HTTPS** (automatic with Netlify)

## 📊 Performance Optimization

The deployment includes:

- ✅ **Static asset caching** (1 year for immutable assets)
- ✅ **Compression** (gzip/brotli)
- ✅ **Image optimization** via Netlify Images
- ✅ **Edge functions** for fast QR generation
- ✅ **CDN distribution** worldwide

## 🔒 Security Features

Built-in security:

- ✅ **HTTPS enforcement**
- ✅ **Security headers** (HSTS, CSP, etc.)
- ✅ **Environment variable protection**
- ✅ **Supabase RLS** (Row Level Security)
- ✅ **Signed QR tokens** with expiration

## 📈 Monitoring

Monitor your deployment:

1. **Netlify Analytics**: Built-in traffic analytics
2. **Deploy notifications**: Email alerts for build status
3. **Function logs**: Monitor edge function performance
4. **Error tracking**: Browser error reporting

## 🎯 Success Checklist

After deployment, verify:

- ✅ Site loads at your Netlify URL
- ✅ All pages accessible (orders, tracking, analytics, etc.)
- ✅ QR code generation works
- ✅ Mobile app deep links function
- ✅ Debug tools operational (🧪 button)
- ✅ PDF export working
- ✅ No browser console errors
- ✅ Mobile responsive design works

## 🆘 Support

If you encounter issues:

1. **Check build logs** in Netlify dashboard
2. **Review browser console** for client-side errors
3. **Test locally** to isolate deployment-specific issues
4. **Verify environment variables** are correctly set
5. **Check Supabase status** and connection

Your Mobile Order Tracker Dashboard is now ready for production use on Netlify! 🎉
