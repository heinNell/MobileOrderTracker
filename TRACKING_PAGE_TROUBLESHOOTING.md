# 🗺️ Dashboard Tracking Page Empty - Troubleshooting Guide

## Problem
The dashboard tracking page (`/tracking`) is empty - no driver locations showing on the map, even though we confirmed location tracking is working (10 entries in database).

## Possible Causes

### 1. **RLS Policies Blocking Dashboard Reads** ⚠️ MOST LIKELY
**Symptom:** Data exists but dashboard can't read it

**Why this happens:**
- Mobile app can INSERT locations (driver owns the data)
- But dashboard user might not have SELECT permission
- RLS policy might only allow drivers to see their OWN locations
- Dashboard needs to see ALL drivers' locations

**Test this:**
```sql
-- Run this query in Supabase SQL Editor while logged in as dashboard user
SELECT COUNT(*) FROM driver_locations;
```

If you get an error or 0 results → RLS is blocking reads

**Fix:**
```sql
-- Create policy to allow authenticated users to read all driver locations
CREATE POLICY "allow_authenticated_users_read_driver_locations"
ON driver_locations
FOR SELECT
TO authenticated
USING (true);
```

---

### 2. **Missing Foreign Keys** 
**Symptom:** Dashboard query fails silently due to join errors

The dashboard query uses joins:
```typescript
.select(`
  *,
  driver:users!driver_locations_driver_id_fkey(id, full_name, email),
  order:orders!driver_locations_order_id_fkey(id, order_number, status)
`)
```

**Test this:**
Run `DIAGNOSE_TRACKING_PAGE_EMPTY.sql` - Step 3 should show 2 foreign keys

**Fix:**
```sql
-- Add missing foreign keys
ALTER TABLE driver_locations
ADD CONSTRAINT driver_locations_driver_id_fkey 
FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE driver_locations
ADD CONSTRAINT driver_locations_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
```

---

### 3. **Data Outside 24-Hour Window**
**Symptom:** Old data not showing due to time filter

The dashboard only shows locations from last 24 hours:
```typescript
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
.gte("created_at", twentyFourHoursAgo)
```

**Test this:**
```sql
SELECT COUNT(*) FROM driver_locations 
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

If 0 → Your test data is too old

**Fix:**
Generate fresh location data by:
1. Open mobile app
2. Activate an order
3. Start location tracking
4. Wait 30 seconds for first update

---

### 4. **No Active Orders**
**Symptom:** Map shows but no markers because no orders match filter

Dashboard only shows orders with these statuses:
```typescript
.in("status", [
  "assigned",
  "activated", 
  "in_progress",
  "in_transit",
  "loaded",
  "unloading",
  "loading",
  "arrived",
])
```

**Test this:**
```sql
SELECT id, order_number, status, assigned_driver_id
FROM orders
WHERE status IN (
  'assigned', 'activated', 'in_progress', 'in_transit',
  'loaded', 'unloading', 'loading', 'arrived'
);
```

If 0 results → No active orders to track

**Fix:**
1. Go to dashboard orders page
2. Assign a driver to an order
3. Activate the order
4. Driver starts tracking

---

### 5. **Google Maps API Key Issue**
**Symptom:** Map doesn't load at all - shows error or blank

**Check browser console for:**
- "Google Maps JavaScript API error"
- "InvalidKeyMapError"
- "RefererNotAllowedMapError"

**Fix:**
1. Verify `.env.local` has: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key-here`
2. Verify API key is valid in Google Cloud Console
3. Verify domain is authorized (localhost and production URL)
4. Restart Next.js dev server after changing .env

---

### 6. **JavaScript Errors Breaking Map Rendering**
**Symptom:** Console shows errors preventing map from rendering

**Common errors:**
- "google is not defined"
- "Cannot read property 'lat' of undefined"
- "Failed to parse coordinates"

**Fix:**
Open browser console (F12) and look for errors. The error message will tell you exactly what's wrong.

---

## Quick Diagnostic Steps

### Step 1: Run SQL Diagnostic
1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `DIAGNOSE_TRACKING_PAGE_EMPTY.sql`
3. Click "Run"
4. Check results for each step

### Step 2: Check Browser Console
1. Open dashboard tracking page
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for errors (red text)
5. Note any error messages

### Step 3: Check Network Tab
1. In DevTools, go to Network tab
2. Refresh the page
3. Look for failed requests (red)
4. Check if Supabase API calls succeed (200 status)

### Step 4: Check Dashboard Console Logs
The tracking page logs useful info:
```
Fetched driver locations: 0  ← Should be > 0
New driver location received: {...}  ← Should appear every 30s
```

If you see "Fetched driver locations: 0" → RLS or query issue

---

## Most Likely Solution

Based on our earlier fixes, the issue is almost certainly **RLS policies**.

We fixed the INSERT policy for drivers, but the dashboard needs a separate SELECT policy.

**Run this SQL:**

```sql
-- ================================================================
-- FIX: Allow Dashboard to Read Driver Locations
-- ================================================================

-- Drop any overly restrictive SELECT policies
DROP POLICY IF EXISTS "drivers_can_view_own_locations" ON driver_locations;

-- Create policy for drivers to see their own locations
CREATE POLICY "drivers_can_view_own_locations"
ON driver_locations
FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- Create policy for dashboard/admins to see ALL locations
CREATE POLICY "dashboard_can_view_all_locations"
ON driver_locations
FOR SELECT
TO authenticated
USING (
  -- Allow if user is admin or has role that should see all locations
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role = 'admin' 
      OR users.role = 'dispatcher'
      OR users.role = 'manager'
    )
  )
  OR
  -- Also allow service role (for server-side queries)
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- Verify policies are active
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'driver_locations'
AND cmd = 'SELECT';
```

---

## Test After Fix

1. **Refresh dashboard tracking page**
2. **Check console logs** - should see "Fetched driver locations: X" where X > 0
3. **Map should show markers** for each driver location
4. **Click a marker** - should show driver and order info

---

## Still Not Working?

If you still see an empty page after running the RLS fix:

1. **Share the output** of `DIAGNOSE_TRACKING_PAGE_EMPTY.sql`
2. **Share browser console errors** (screenshot or copy/paste)
3. **Share network tab** - check if Supabase requests succeed
4. **Check current user role:**
   ```sql
   SELECT id, email, role FROM users WHERE id = auth.uid();
   ```

This will help identify the exact issue!
