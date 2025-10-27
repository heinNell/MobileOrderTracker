# Fix: Dashboard Tracking Page Not Showing Map/Driver Location

## Problem

Dashboard tracking page shows error:

```
Could not find a relationship between 'driver_locations' and 'users' in the schema cache
```

This means the `driver_locations` table either:

1. Doesn't exist in your database
2. Doesn't have proper foreign key relationships

## Solution

### Step 1: Run the SQL Migration

1. **Open Supabase Dashboard**

   - Go to your Supabase project
   - Navigate to: **SQL Editor**

2. **Run the Migration**

   - Copy the entire content from: `CREATE_DRIVER_LOCATIONS_TABLE.sql`
   - Paste into SQL Editor
   - Click **"Run"** or press `Ctrl+Enter`

3. **Verify Success**
   - You should see output like:
     ```
     driver_locations table created successfully | row_count: 0
     ```
   - Foreign keys listed (driver_id, order_id)
   - Indexes created
   - RLS policies active

### Step 2: Verify Table Structure

Run this query in SQL Editor to check:

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'driver_locations'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

Expected columns:

- `id` (UUID, PK)
- `driver_id` (UUID, FK to users)
- `order_id` (UUID, FK to orders)
- `latitude` (NUMERIC)
- `longitude` (NUMERIC)
- `timestamp` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `accuracy` (NUMERIC)
- `speed` (NUMERIC)
- `heading` (NUMERIC)
- `is_manual_update` (BOOLEAN)
- `notes` (TEXT)

### Step 3: Test the Dashboard

1. **Restart your dashboard** (if running locally):

   ```bash
   cd dashboard
   npm run dev
   ```

2. **Test the mobile app**:

   ```bash
   cd MyApp
   npm start
   ```

3. **Workflow**:
   - Assign an order to a driver in the dashboard
   - Open mobile app as that driver
   - Order should appear automatically
   - Driver location tracking starts
   - **Dashboard tracking page** should now show:
     - ✅ Map loads
     - ✅ Driver position marker
     - ✅ Route lines (completed, remaining, planned)
     - ✅ Real-time updates

### Step 4: Verify Data Flow

Check if locations are being inserted:

```sql
SELECT
  id,
  driver_id,
  order_id,
  latitude,
  longitude,
  timestamp,
  created_at
FROM public.driver_locations
ORDER BY created_at DESC
LIMIT 10;
```

If you see data, the mobile app is working! ✅

### Step 5: Check Dashboard Network Tab

1. Open dashboard tracking page
2. Open Browser DevTools (F12)
3. Go to **Network** tab
4. Refresh page
5. Look for API calls to Supabase
6. Check for errors

Expected:

- ✅ Successful query to `driver_locations`
- ✅ Join with `users` table works
- ✅ Join with `orders` table works

## Troubleshooting

### Error: "permission denied for table driver_locations"

**Solution**: RLS policies need adjustment. Run:

```sql
-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE public.driver_locations DISABLE ROW LEVEL SECURITY;

-- Test if it works now
-- If yes, the RLS policies need fixing
```

### Error: "relation 'driver_locations' does not exist"

**Solution**: Table wasn't created. Check for errors when running the migration SQL.

### Map shows but no driver markers

**Possible causes**:

1. No location data in `driver_locations` table
2. Mobile app not sending locations
3. Order not assigned to a driver

**Check**:

```sql
-- Check if there's any location data
SELECT COUNT(*) FROM public.driver_locations;

-- Check active orders with drivers
SELECT
  o.id,
  o.order_number,
  o.status,
  u.full_name as driver
FROM orders o
LEFT JOIN users u ON o.assigned_driver_id = u.id
WHERE o.status IN ('assigned', 'in_transit', 'loading', 'loaded', 'unloading', 'arrived');
```

### Dashboard still not working

1. **Clear browser cache** (Ctrl+Shift+Del)
2. **Hard refresh** (Ctrl+Shift+R)
3. **Check Supabase API URL** in dashboard `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. **Rebuild dashboard**:
   ```bash
   cd dashboard
   rm -rf .next
   npm run build
   npm run dev
   ```

## Expected Behavior After Fix

### Dashboard Tracking Page (`/tracking`)

- ✅ Shows list of active deliveries
- ✅ Google Maps loads
- ✅ Driver position markers visible (blue dots)
- ✅ Route lines show (green=completed, red=remaining, gray=planned)
- ✅ Loading/Unloading points marked (🏭 and 🏢)
- ✅ ETA calculations display
- ✅ Progress percentage updates
- ✅ Real-time position updates every 10 seconds

### Mobile App (MyApp)

- ✅ Driver logs in
- ✅ Assigned orders appear automatically
- ✅ Location tracking starts automatically
- ✅ Background tracking works
- ✅ No errors in console about location inserts

## Files Modified in Previous Fix

The mobile app was already updated to write to `driver_locations`:

1. **LocationService.js** - Writes to both `map_locations` and `driver_locations`
2. **DriverDashboard.js** - Writes activation locations to both tables

These changes are already in place. You just need to **create the database table**.

## Quick Verification Checklist

- [ ] SQL migration runs without errors
- [ ] Foreign keys created (`driver_id`, `order_id`)
- [ ] Indexes created (6 total)
- [ ] RLS policies active (4 policies)
- [ ] Realtime enabled for table
- [ ] Dashboard tracking page loads
- [ ] Map displays
- [ ] Driver markers visible
- [ ] Mobile app sends locations successfully

---

**Status**: Ready to deploy  
**Action Required**: Run `CREATE_DRIVER_LOCATIONS_TABLE.sql` in Supabase SQL Editor

Once the table is created, your tracking page will work immediately! 🎉
