# Mobile Order Tracker - Complete Setup Guide

## Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Supabase Backend Setup](#supabase-backend-setup)
4. [Mobile Application Setup](#mobile-application-setup)
5. [Dashboard Setup](#dashboard-setup)
6. [Google Maps Integration](#google-maps-integration)
7. [Deployment](#deployment)
8. [Testing](#testing)

## System Overview

The Mobile Order Tracker is a complete logistics management system consisting of:

- **Supabase Backend**: PostgreSQL database with real-time subscriptions, Row-Level Security, and Edge Functions
- **Mobile App**: React Native/Expo driver application for iOS and Android
- **Dashboard**: Next.js web application for order management and tracking
- **Google Maps**: Navigation and real-time location tracking

## Prerequisites

### Required Software

- Node.js 18+ and npm/yarn
- Git
- Supabase CLI (`npm install -g supabase`)
- Expo CLI (`npm install -g expo-cli`)
- A Supabase account (free tier available)
- Google Cloud Platform account (for Maps API)

### Required API Keys

- Supabase Project URL and Anon Key
- Supabase Service Role Key
- Google Maps API Key (with Maps SDK, Directions API, and Places API enabled)

## Supabase Backend Setup

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details:
   - Name: `Mobile Order Tracker`
   - Database Password: (save this securely)
   - Region: Choose closest to your users
4. Wait for project to be created (takes ~2 minutes)

### Step 2: Initialize Database Schema

1. Navigate to the SQL Editor in your Supabase dashboard
2. Copy the entire contents of `/supabase/schema.sql`
3. Paste into the SQL Editor and click "Run"
4. Verify all tables were created successfully

### Step 3: Deploy Edge Functions

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy Edge Functions
cd supabase/functions
supabase functions deploy validate-qr-code
supabase functions deploy generate-qr-code
```

### Step 4: Set Environment Variables

In Supabase Dashboard → Settings → Edge Functions:

```bash
QR_CODE_SECRET=your-secure-random-secret-key-here
```

Generate a secure secret:

```bash
openssl rand -base64 32
```

### Step 5: Enable Realtime

1. Go to Database → Replication
2. Enable realtime for these tables:
   - `location_updates`
   - `status_updates`
   - `messages`
   - `notifications`
   - `incidents`
   - `orders`

### Step 6: Create Initial Admin User

```sql
-- Run in SQL Editor
INSERT INTO public.tenants (id, name, subdomain)
VALUES (gen_random_uuid(), 'Demo Company', 'demo');

-- Get the tenant_id from above, then create admin user
INSERT INTO auth.users (email, encrypted_password)
VALUES ('admin@example.com', crypt('your-password', gen_salt('bf')));

-- Link user to tenant with admin role
INSERT INTO public.users (id, email, full_name, role, tenant_id)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
  'admin@example.com',
  'Admin User',
  'admin',
  (SELECT id FROM public.tenants WHERE name = 'Demo Company')
);
```

## Mobile Application Setup

### Step 1: Install Dependencies

```bash
cd mobile-app
npm install
```

### Step 2: Configure Environment

Create `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Step 3: Configure Google Maps

**For Android:**

1. Add to `app.json` android section:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

**For iOS:**

1. Add to `app.json` ios section:

```json
"ios": {
  "config": {
    "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
  }
}
```

### Step 4: Run Development Build

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios
```

### Step 5: Build Production App

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Dashboard Setup

### Step 1: Install Dependencies

```bash
cd dashboard
npm install
```

### Step 2: Configure Environment

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Step 3: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 4: Build for Production

```bash
npm run build
npm start
```

## Google Maps Integration

### Step 1: Enable Required APIs

In Google Cloud Console:

1. Go to "APIs & Services" → "Library"
2. Enable these APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Maps JavaScript API
   - Directions API
   - Places API
   - Geocoding API

### Step 2: Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Restrict the key:
   - For mobile: Restrict to Android/iOS apps
   - For dashboard: Restrict to specific domains

### Step 3: Set Usage Limits (Optional)

1. Set daily quotas to prevent unexpected charges
2. Enable billing alerts

## Deployment

### Deploy Dashboard to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd dashboard
vercel

# Add environment variables in Vercel Dashboard
# Then deploy to production
vercel --prod
```

### Deploy Mobile App

**Android:**

1. Build APK/AAB with EAS Build
2. Submit to Google Play Store:

```bash
eas submit --platform android
```

**iOS:**

1. Build IPA with EAS Build
2. Submit to App Store:

```bash
eas submit --platform ios
```

## Testing

### Test QR Code Flow

1. **Create Order in Dashboard:**

   - Login to dashboard
   - Click "Create New Order"
   - Fill in all required fields
   - Generate QR code

2. **Scan QR Code in Mobile App:**

   - Login to mobile app as driver
   - Tap "Scan QR Code"
   - Scan the generated QR code
   - Verify order details appear

3. **Test Navigation:**

   - Click "Navigate to Loading Point"
   - Verify Google Maps opens with correct destination

4. **Test Location Tracking:**

   - Start location tracking in mobile app
   - Verify location appears on dashboard map
   - Updates should occur every 30 seconds

5. **Test Status Updates:**
   - Update order status in mobile app
   - Verify status appears on dashboard
   - Check notifications are sent

### Test Incident Reporting

1. In mobile app, tap "Report Incident"
2. Fill in incident details
3. Add photos if available
4. Submit report
5. Verify incident appears on dashboard

### Test Offline Mode

1. Turn off device internet
2. Create status update in mobile app
3. Turn internet back on
4. Verify update syncs to dashboard

## Security Checklist

- [ ] Change default passwords
- [ ] Generate strong QR_CODE_SECRET
- [ ] Restrict Google Maps API keys
- [ ] Enable RLS on all Supabase tables
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting
- [ ] Enable 2FA for admin accounts
- [ ] Regular security audits
- [ ] Backup database regularly
- [ ] Set up error tracking (Sentry)

## Monitoring

### Supabase Monitoring

1. Go to Supabase Dashboard → Logs
2. Monitor:
   - API requests
   - Edge Function executions
   - Database queries
   - Error rates

### Google Maps Usage

1. Go to Google Cloud Console → APIs & Services → Dashboard
2. Monitor daily quotas and costs

### Mobile App Monitoring

Consider integrating:

- Sentry for error tracking
- Firebase Analytics for user behavior
- New Relic for performance monitoring

## Troubleshooting

### QR Code Scanning Issues

- Verify camera permissions are granted
- Check QR code hasn't expired (24-hour validity)
- Ensure proper lighting when scanning
- Try generating new QR code

### Location Tracking Not Working

- Verify location permissions (including background)
- Check device location services are enabled
- Ensure mobile data/WiFi is connected
- Verify Supabase realtime is enabled

### Dashboard Not Showing Real-Time Updates

- Check browser console for errors
- Verify Supabase realtime is enabled for tables
- Ensure WebSocket connections aren't blocked
- Try refreshing the page

### Google Maps Not Loading

- Verify API key is correct
- Check API key restrictions
- Ensure billing is enabled on Google Cloud
- Verify required APIs are enabled

## Support

For issues and questions:

- Check documentation in `/docs` folder
- Review code comments
- Check Supabase logs
- Contact support team

## License

This project is proprietary software. All rights reserved.
