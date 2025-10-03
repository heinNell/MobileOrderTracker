# Deployment Guide

## Production Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Edge Functions deployed and tested
- [ ] Google Maps API keys configured with restrictions
- [ ] SSL certificates valid
- [ ] Monitoring and alerting setup
- [ ] Backup procedures verified
- [ ] Security audit completed
- [ ] Performance testing passed
- [ ] Documentation updated

## Supabase Production Setup

### 1. Project Configuration

```bash
# Create production project
1. Go to https://supabase.com/dashboard
2. Create new project
3. Choose production tier
4. Select optimal region
5. Set strong database password
```

### 2. Database Setup

```sql
-- Run in SQL Editor (production)
-- Execute schema.sql file
\i /path/to/supabase/schema.sql

-- Verify tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Check RLS policies
SELECT * FROM pg_policies;
```

### 3. Configure Realtime

```bash
# Enable realtime for production tables
1. Database → Replication
2. Enable for:
   - orders
   - location_updates
   - status_updates
   - messages
   - notifications
   - incidents
```

### 4. Deploy Edge Functions

```bash
# Login and link
supabase login
supabase link --project-ref YOUR_PROD_PROJECT_REF

# Deploy functions
cd supabase/functions
supabase functions deploy validate-qr-code --project-ref YOUR_PROD_PROJECT_REF
supabase functions deploy generate-qr-code --project-ref YOUR_PROD_PROJECT_REF

# Set secrets
supabase secrets set QR_CODE_SECRET="$(openssl rand -base64 32)" --project-ref YOUR_PROD_PROJECT_REF
```

### 5. Configure Storage

```bash
# Create storage buckets
1. Storage → Create bucket "incident-photos"
2. Set policies:
   - Allow authenticated users to upload
   - Public read access for viewing
3. Configure CDN settings
```

### 6. Set Up Monitoring

```bash
# Configure alerts
1. Settings → Alerts
2. Add alerts for:
   - High CPU usage (> 80%)
   - Database connections (> 90%)
   - Error rate (> 5%)
   - Slow queries (> 1s)
```

## Mobile App Deployment

### Android Deployment

#### 1. Prepare App

```bash
cd mobile-app

# Update version in app.json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    }
  }
}

# Install dependencies
npm install
```

#### 2. Configure EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Update eas.json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      }
    }
  }
}
```

#### 3. Build Release

```bash
# Build for production
eas build --platform android --profile production

# Wait for build to complete (10-20 minutes)
# Download AAB file when ready
```

#### 4. Submit to Play Store

```bash
# Option 1: Use EAS Submit
eas submit --platform android --latest

# Option 2: Manual upload
1. Go to Play Console
2. Create new app
3. Upload AAB file
4. Fill in store listing
5. Set up content rating
6. Set pricing (free/paid)
7. Submit for review
```

### iOS Deployment

#### 1. Prepare App

```bash
# Update version in app.json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    }
  }
}
```

#### 2. Configure Certificates

```bash
# Create Apple Developer account
# Configure App ID and provisioning profiles

# Update eas.json
{
  "build": {
    "production": {
      "ios": {
        "bundleIdentifier": "com.logistics.ordertracker",
        "buildConfiguration": "Release"
      }
    }
  }
}
```

#### 3. Build Release

```bash
# Build for production
eas build --platform ios --profile production

# Wait for build to complete
# Download IPA when ready
```

#### 4. Submit to App Store

```bash
# Option 1: Use EAS Submit
eas submit --platform ios --latest

# Option 2: Manual upload via Transporter
1. Open Transporter app
2. Sign in with Apple ID
3. Drag IPA file
4. Upload to App Store Connect
5. Complete app information
6. Submit for review
```

## Dashboard Deployment

### Option 1: Vercel (Recommended)

#### 1. Prepare Dashboard

```bash
cd dashboard

# Install dependencies
npm install

# Test build locally
npm run build
npm start
```

#### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Configure environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production

# Deploy to production
vercel --prod
```

#### 3. Configure Domain

```bash
# Add custom domain
1. Vercel Dashboard → Settings → Domains
2. Add domain: dashboard.yourcompany.com
3. Configure DNS records
4. Wait for SSL certificate
```

### Option 2: AWS Amplify

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Configure
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

### Option 3: Docker/VPS

```bash
# Create Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# Build and run
docker build -t logistics-dashboard .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY \
  logistics-dashboard
```

## Domain and DNS Configuration

### 1. Configure DNS Records

```
# Dashboard
Type: A
Name: dashboard
Value: [Vercel IP or your server IP]
TTL: 3600

# API (if separate)
Type: A
Name: api
Value: [API server IP]
TTL: 3600

# WWW redirect
Type: CNAME
Name: www
Value: dashboard.yourcompany.com
TTL: 3600
```

### 2. SSL/TLS Setup

```bash
# For Vercel/Amplify - Automatic

# For VPS with Let's Encrypt
sudo apt-get install certbot
sudo certbot --nginx -d dashboard.yourcompany.com
```

## Google Maps Configuration

### 1. Production API Key

```bash
# Create restricted API key
1. Google Cloud Console
2. APIs & Services → Credentials
3. Create API key
4. Restrict by:
   - Android app (SHA-1 fingerprint)
   - iOS app (bundle identifier)
   - HTTP referrers (dashboard domain)
```

### 2. Enable Required APIs

```bash
Required APIs:
- Maps SDK for Android
- Maps SDK for iOS
- Maps JavaScript API
- Directions API
- Places API
- Geocoding API
- Distance Matrix API
```

### 3. Set Usage Limits

```bash
1. APIs & Services → Quotas
2. Set daily limits:
   - Maps SDK: 25,000 loads/day
   - Directions: 10,000 requests/day
   - Geocoding: 10,000 requests/day
3. Enable billing alerts
```

## Monitoring Setup

### 1. Application Monitoring

```bash
# Option 1: Sentry
npm install @sentry/nextjs @sentry/react-native

# Configure in mobile app
Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
});

# Configure in dashboard
Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
});
```

### 2. Supabase Monitoring

```bash
# Dashboard → Logs
- API logs
- Database logs
- Edge Function logs

# Set up alerts
- Error rate threshold
- Response time threshold
- Database connection threshold
```

### 3. Uptime Monitoring

```bash
# Use services like:
- UptimeRobot
- Pingdom
- StatusCake

# Monitor:
- Dashboard URL
- API endpoints
- Edge Functions
```

## Backup Configuration

### 1. Database Backups

```bash
# Supabase automatic backups (Pro plan)
1. Settings → Database
2. Enable daily backups
3. Set retention: 30 days
4. Enable point-in-time recovery

# Manual backup
pg_dump -h db.YOUR_PROJECT.supabase.co \
  -U postgres \
  -d postgres \
  -f backup_$(date +%Y%m%d).sql
```

### 2. Storage Backups

```bash
# Backup storage buckets
gsutil -m rsync -r \
  gs://YOUR_SUPABASE_BUCKET \
  gs://YOUR_BACKUP_BUCKET
```

### 3. Code Repository

```bash
# Ensure code backed up to:
- GitHub/GitLab (primary)
- Secondary backup location
- Regular commits and tags
```

## Security Hardening

### 1. Supabase Security

```bash
# Enable 2FA for all admin accounts
# Restrict database access by IP
# Enable audit logging
# Regular security reviews
# Keep dependencies updated
```

### 2. API Security

```bash
# Rate limiting (Supabase Edge Functions)
const rateLimit = 100; // requests per minute

# CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dashboard.yourcompany.com',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
```

### 3. Mobile App Security

```bash
# Enable ProGuard (Android)
android {
  buildTypes {
    release {
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
  }
}

# Certificate pinning
# Jailbreak/root detection
# Code obfuscation
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX idx_location_updates_order_timestamp ON location_updates(order_id, timestamp DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'in_transit';

-- Vacuum and analyze
VACUUM ANALYZE;
```

### 2. CDN Configuration

```bash
# Configure Vercel Edge Network
# Cache static assets
# Optimize images
# Enable compression
```

### 3. Mobile App Optimization

```bash
# Enable Hermes engine (React Native)
# Reduce bundle size
# Lazy load components
# Optimize images
```

## Post-Deployment

### 1. Smoke Tests

```bash
# Test critical flows
- User login
- QR code generation
- QR code scanning
- Location tracking
- Status updates
- Messaging
- Incident reporting
```

### 2. Load Testing

```bash
# Use tools like:
- Artillery
- k6
- JMeter

# Test scenarios:
- 1000 concurrent users
- 10,000 orders
- Real-time updates
- Peak traffic simulation
```

### 3. Monitoring Dashboard

```bash
# Setup monitoring dashboard
- Real-time metrics
- Error tracking
- User analytics
- Performance graphs
```

## Rollback Procedure

### If Deployment Fails

```bash
# 1. Revert database migrations
supabase db reset

# 2. Redeploy previous version
vercel rollback

# 3. Revert mobile app (if needed)
# Submit previous version to stores

# 4. Notify users
# Send push notification
# Update status page
```

## Maintenance

### Regular Tasks

```bash
# Weekly
- Review error logs
- Check performance metrics
- Update dependencies (dev/staging first)

# Monthly
- Security audit
- Database optimization
- Backup verification
- Cost analysis

# Quarterly
- Performance review
- Feature usage analysis
- User feedback review
- Capacity planning
```

## Support

For deployment issues:

1. Check logs in Supabase dashboard
2. Review Vercel deployment logs
3. Check Google Cloud Console
4. Contact support team
