## Complete Deployment Guide for Mobile Order Tracker

This guide covers deploying both the **Dashboard (Web)** and **Mobile App** components.

## 📱 Mobile App Deployment (React Native/Expo)

### Option 1: EAS Build (Production APK/AAB)

```bash
cd /workspaces/MobileOrderTracker/MyApp
npx eas build --platform android --profile production
```

### Option 2: Expo Development Build

```bash
cd /workspaces/MobileOrderTracker/MyApp
npx expo start --tunnel
# Scan QR code with Expo Go app
```

### Option 3: App Store/Google Play

```bash
# Build production bundle
npx eas build --platform all --profile production

# Submit to stores
npx eas submit --platform android
npx eas submit --platform ios
```

## 🌐 Dashboard Deployment (Next.js on Vercel)

### Automated Vercel Deployment

1. **Connect GitHub to Vercel:**

   - Go to vercel.com
   - Import your GitHub repository
   - Select `/dashboard` as the root directory

2. **Environment Variables in Vercel:**

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
   ```

3. **Build Settings:**
   - Framework: Next.js
   - Root Directory: `dashboard`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Manual Vercel Deployment

```bash
cd /workspaces/MobileOrderTracker/dashboard
npm install -g vercel
vercel --prod
```

## 🔧 Configuration Files

### Mobile App (app.json)

```json
{
  "expo": {
    "name": "Mobile Order Tracker",
    "slug": "mobile-order-tracker",
    "scheme": "ordertracker",
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### Dashboard (vercel.json)

```json
{
  "name": "logistics-dashboard",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

## 🔒 Security Considerations

### Mobile App

- Use EAS Secrets for sensitive environment variables
- Enable over-the-air (OTA) updates for quick fixes
- Implement proper authentication flow

### Dashboard

- Set up Vercel environment variables properly
- Enable CORS for API routes
- Implement proper session management

## 📊 Monitoring & Analytics

### Mobile App

```bash
# Enable crash analytics
npx expo install expo-application expo-constants
# Add Sentry for error tracking
npx expo install @sentry/react-native
```

### Dashboard

```bash
# Add Vercel Analytics
npm install @vercel/analytics
```

## 🚀 CI/CD Pipeline

### GitHub Actions for Mobile

```yaml
# .github/workflows/mobile.yml
name: Mobile Build
on:
  push:
    branches: [main]
    paths: ["MyApp/**"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Setup EAS
        uses: expo/expo-github-action@v8
      - name: Build APK
        run: eas build --platform android --non-interactive
```

### Vercel for Dashboard

- Automatic deployments on push to main
- Preview deployments for PRs
- Environment promotion between staging/production

## 📱 Distribution Methods

### Mobile App

1. **Internal Testing**: EAS Build → Direct APK download
2. **Beta Testing**: TestFlight (iOS) / Internal Testing (Android)
3. **Production**: App Store / Google Play Store
4. **Enterprise**: Direct APK distribution

### Dashboard

1. **Development**: Vercel preview deployments
2. **Staging**: Custom domain on Vercel
3. **Production**: Production domain with custom analytics

## 🔧 Troubleshooting Common Issues

### Mobile App Crashes

- Check Metro bundler logs
- Verify environment variables
- Test with Expo Go first
- Use ErrorBoundary components

### Dashboard Build Failures

- Check TypeScript errors
- Verify environment variables
- Test locally with `npm run build`
- Check Vercel function limits

## 📚 Resources

- [Expo Deployment Guide](https://docs.expo.dev/deploy/build-project/)
- [Vercel Next.js Guide](https://vercel.com/guides/deploying-nextjs-with-vercel)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
