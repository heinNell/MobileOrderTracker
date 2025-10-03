# Quick Start Guide

Get the Mobile Order Tracker up and running in 15 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn installed
- Supabase account (free at [supabase.com](https://supabase.com))
- Google Cloud account with billing enabled

## Step 1: Supabase Setup (5 minutes)

### Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Enter project details:
   - Name: `Mobile Order Tracker`
   - Database Password: (save this!)
   - Region: Choose closest to you
4. Wait 2 minutes for project creation

### Set Up Database

1. Go to SQL Editor
2. Copy contents from `supabase/schema.sql`
3. Paste and click "Run"
4. Wait for "Success" message

### Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project (get ref from project settings)
supabase link --project-ref YOUR_PROJECT_REF

# Generate QR secret
openssl rand -base64 32

# Set secret (use the generated value above)
supabase secrets set QR_CODE_SECRET="your-generated-secret"

# Deploy functions
cd supabase/functions
supabase functions deploy validate-qr-code
supabase functions deploy generate-qr-code
```

### Get API Keys

1. Go to Project Settings → API
2. Copy these values:
   - Project URL: `https://xxxxx.supabase.co`
   - `anon` public key
   - `service_role` secret key (keep secure!)

## Step 2: Google Maps Setup (3 minutes)

### Create API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Maps JavaScript API
   - Directions API
   - Places API
   - Geocoding API
4. Go to Credentials → Create API Key
5. Copy the API key

### Restrict API Key (Important!)

1. Click on API key to edit
2. Set Application restrictions:
   - For mobile: Add Android app SHA-1 and iOS bundle ID
   - For web: Add your domain (e.g., `localhost:3000` for dev)
3. Set API restrictions: Select only the APIs listed above
4. Save

## Step 3: Mobile App Setup (3 minutes)

```bash
# Navigate to mobile app
cd mobile-app

# Copy environment template
cp .env.example .env

# Edit .env and add your keys:
# EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key

# Install dependencies
npm install

# Start development server
npm start
```

### Run on Device

- **iOS Simulator** (Mac only): Press `i`
- **Android Emulator**: Press `a`
- **Physical Device**: Scan QR code with Expo Go app

## Step 4: Dashboard Setup (2 minutes)

```bash
# Navigate to dashboard
cd dashboard

# Copy environment template
cp .env.example .env.local

# Edit .env.local and add your keys:
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Create Test User (2 minutes)

### In Supabase Dashboard

1. Go to Authentication → Users
2. Click "Add User"
3. Enter email and password
4. Click "Create User"

### Add User to Database

Go to SQL Editor and run:

```sql
-- Create tenant
INSERT INTO public.tenants (name, subdomain)
VALUES ('Test Company', 'test')
RETURNING id;

-- Note the tenant ID from above, then create user profile
-- Replace the email and tenant_id with your values
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  tenant_id,
  is_active
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'your-email@example.com',
  'Admin User',
  'admin',
  'YOUR_TENANT_ID',
  true
);
```

## Step 6: Test the System! (5 minutes)

### Create Your First Order

1. **Login to Dashboard**

   - Open http://localhost:3000
   - Login with your test user

2. **Create Order**

   - Click "Create New Order"
   - Fill in order details:
     - Order Number: `TEST-001`
     - Loading Point: `Warehouse A, 123 Main St`
     - Unloading Point: `Store B, 456 Oak Ave`
   - Add addresses and instructions
   - Click "Create"

3. **Generate QR Code**
   - Find your order in the list
   - Click "Generate QR"
   - QR code image downloads automatically

### Test Mobile App

1. **Login to Mobile App**

   - Open Expo app on your device
   - Login with same credentials

2. **Scan QR Code**

   - Tap "Scan QR Code"
   - Scan the downloaded QR code
   - Order details should appear!

3. **Test Navigation**

   - Click "Navigate to Loading Point"
   - Google Maps should open

4. **Test Location Tracking**

   - Click "Start Tracking"
   - Grant location permissions
   - Location should appear on dashboard map

5. **Update Status**
   - Click "Start Transit"
   - Check dashboard for status update

## Common Issues & Solutions

### Issue: "QR code validation failed"

**Solution**: Make sure `QR_CODE_SECRET` is set in Supabase Edge Functions

### Issue: "Location not updating"

**Solution**: Grant location permissions including "Always Allow"

### Issue: "Google Maps not loading"

**Solution**: Verify API key is correct and APIs are enabled

### Issue: "Cannot connect to Supabase"

**Solution**: Check URL and anon key in .env files

### Issue: Database error

**Solution**: Ensure schema.sql ran successfully without errors

## Environment Variables Checklist

Make sure these are set:

### Mobile App (.env)

- [ ] `EXPO_PUBLIC_SUPABASE_URL`
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

### Dashboard (.env.local)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### Supabase Edge Functions

- [ ] `QR_CODE_SECRET` (set via CLI)

## Next Steps

Now that everything is working:

1. **Customize**: Update branding, colors, and labels
2. **Add Data**: Create more orders and test users
3. **Test Flows**: Try all features end-to-end
4. **Read Docs**: Check out `/docs` for detailed information
5. **Deploy**: Follow `docs/DEPLOYMENT.md` for production

## Getting Help

- 📖 Read full setup guide: `docs/SETUP_GUIDE.md`
- 🏗️ Understand architecture: `docs/ARCHITECTURE.md`
- 🔌 API reference: `docs/API_DOCUMENTATION.md`
- 🚀 Deploy to production: `docs/DEPLOYMENT.md`

## Development Tips

### Hot Reload

- Mobile app: Shake device and select "Reload"
- Dashboard: Changes auto-reload in browser

### Debugging

- Mobile: Use React Native Debugger or Flipper
- Dashboard: Use browser DevTools
- Backend: Check Supabase logs in dashboard

### Database Changes

- Run migrations in SQL Editor
- Test in staging environment first
- Always backup before schema changes

## Useful Commands

```bash
# Mobile App
npm start                 # Start Expo dev server
npm run android          # Run on Android
npm run ios              # Run on iOS (Mac only)

# Dashboard
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Supabase
supabase start           # Start local Supabase
supabase db reset        # Reset local database
supabase functions serve # Serve functions locally
```

## Success Checklist

- [ ] Supabase project created
- [ ] Database schema deployed
- [ ] Edge Functions deployed
- [ ] Google Maps API configured
- [ ] Mobile app running
- [ ] Dashboard running
- [ ] Test user created
- [ ] First order created
- [ ] QR code generated and scanned
- [ ] Location tracking working
- [ ] Status updates working

## 🎉 You're All Set!

Congratulations! Your logistics management system is now running. Start exploring the features and customize it for your needs.

**Pro Tip**: Check out `PROJECT_SUMMARY.md` for a complete overview of what's been built.

Happy tracking! 🚚📱🗺️
