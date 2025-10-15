# Tracking System - Quick Access Guide & Troubleshooting 🚀

## How to Access the Customer Tracking Link

### Method 1: From Orders Page (Easiest!)

1. Go to **Orders** page in your dashboard
2. Find any order with status: `in_progress`, `in_transit`, or `loaded`
3. Look in the **Actions** column - you'll see two new buttons:

   - **🔗 Track** - Opens a modal with the tracking link
   - **📍 View** - Opens the tracking page directly

4. Click **"🔗 Track"** button
5. A modal pops up with:
   - The full tracking link
   - **Copy Link** button (copies to clipboard)
   - **Open Link** button (opens in new tab)
   - **Email** button (opens email client with link)

### Method 2: Manual URL Construction

The tracking link format is:

```
https://your-dashboard-url.com/tracking/[ORDER-ID]/public
```

Example:

```
https://dashboard.vercel.app/tracking/abc-123-uuid-here/public
```

Just replace `[ORDER-ID]` with the actual order UUID from your database.

### Method 3: From Individual Order Details

1. Click **"View"** on any order
2. The URL will be: `/orders/[order-id]`
3. Add `/public` to the tracking URL pattern

---

## Why Locations Might Not Show on Tracking Page

### Checklist - Run This First!

#### 1. **Check if SQL Script Was Run**

```sql
-- Check if tracking functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_tracking_data', 'calculate_trip_analytics', 'sync_driver_location_geometry');

-- Should return 3 rows
```

If **NO results**: Run `COMPLETE_TRACKING_SYSTEM.sql` in Supabase SQL Editor

#### 2. **Check if Geometry Columns Exist**

```sql
-- Check driver_locations table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'driver_locations'
AND column_name IN ('latitude', 'longitude', 'geometry');

-- Should return 3 rows
```

If **geometry column missing**: Run `COMPLETE_TRACKING_SYSTEM.sql`

#### 3. **Check if Location Data Exists**

```sql
-- Check recent driver locations
SELECT
    id,
    driver_id,
    order_id,
    latitude,
    longitude,
    geometry,
    created_at
FROM driver_locations
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;
```

**What to look for:**

- ✅ `latitude` and `longitude` should have values (not NULL)
- ✅ `geometry` should say "POINT(...)" or have PostGIS data
- ✅ `created_at` should be recent
- ✅ `order_id` should match an active order

If **latitude/longitude are NULL**: Issue with mobile app location service

If **geometry is NULL but lat/lng exist**: Run backfill script:

```sql
-- Backfill geometry from existing lat/lng
UPDATE driver_locations
SET geometry = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND geometry IS NULL;
```

#### 4. **Check Order is Trackable**

```sql
-- Check if order has tracking active
SELECT
    id,
    order_number,
    status,
    tracking_active,
    last_driver_location
FROM orders
WHERE id = 'your-order-id-here';
```

**What to look for:**

- ✅ `tracking_active` should be `TRUE`
- ✅ `last_driver_location` should have JSON data like: `{"lat": -25.8, "lng": 28.1, ...}`
- ✅ `status` should be `in_progress`, `in_transit`, or `loaded`

If **tracking_active is FALSE**:

```sql
-- Manually activate tracking
UPDATE orders
SET tracking_active = TRUE, trip_start_time = NOW()
WHERE id = 'your-order-id-here';
```

#### 5. **Check Public Access Policies**

```sql
-- Verify RLS policies for public access
SELECT
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('orders', 'driver_locations')
AND policyname LIKE '%Public%';
```

Should return at least 2 policies:

- "Public can view active order tracking" on orders table
- "Public can view driver locations for active orders" on driver_locations table

If **missing**: Run `COMPLETE_TRACKING_SYSTEM.sql`

#### 6. **Test RPC Function Directly**

```sql
-- Test the get_tracking_data function
SELECT * FROM get_tracking_data('your-order-id-here');
```

**Expected result:**

- One row with order_number, driver_name, current_lat, current_lng, etc.
- If **NO ROWS**: Order not found or not trackable
- If **ERROR**: RPC function not created or has issues

---

## Common Issues & Solutions

### Issue 1: "Tracking link shows 'Tracking Not Available'"

**Cause:** Order doesn't have `tracking_active = TRUE`

**Solution:**

```sql
-- Check and fix tracking status
UPDATE orders
SET tracking_active = TRUE
WHERE status IN ('in_progress', 'in_transit', 'loaded')
AND tracking_active = FALSE;
```

### Issue 2: "Map loads but no driver location marker"

**Cause:** Location data exists but geometry is NULL

**Solution:**

```sql
-- Backfill geometry
UPDATE driver_locations
SET geometry = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geometry IS NULL;

-- Update orders table
UPDATE orders o
SET current_driver_geometry = (
    SELECT ST_SetSRID(ST_MakePoint(dl.longitude, dl.latitude), 4326)
    FROM driver_locations dl
    WHERE dl.order_id = o.id
    ORDER BY dl.created_at DESC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM driver_locations dl
    WHERE dl.order_id = o.id
);
```

### Issue 3: "🔗 Track button doesn't appear"

**Cause:** Order status not in the allowed list

**Solution:** Change order status to one of:

- `in_progress`
- `in_transit`
- `loaded`

The button only shows for these active statuses.

### Issue 4: "Mobile app sends locations but tracking page doesn't update"

**Debug Steps:**

1. **Check mobile app console for errors:**

   - Look for "Error saving location"
   - Check if order_id is valid

2. **Check if LocationService is running:**

   ```javascript
   // In mobile app, check logs for:
   "📍 Location updated";
   "📍 Processing location update";
   ```

3. **Verify location reaches database:**

   ```sql
   -- Check latest location insert
   SELECT * FROM driver_locations
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Check trigger fired:**
   ```sql
   -- Verify trigger exists
   SELECT * FROM information_schema.triggers
   WHERE trigger_name = 'trigger_sync_driver_location_geometry';
   ```

### Issue 5: "Distance/Time analytics show 0 or NULL"

**Cause:** Not enough location points or tracking hasn't been active long enough

**Requirements:**

- At least 2 location points
- Order must have been in `in_progress`/`in_transit` status
- `trip_start_time` must be set

**Check:**

```sql
-- Count location points for order
SELECT
    order_id,
    COUNT(*) as location_count,
    MIN(created_at) as first_location,
    MAX(created_at) as last_location
FROM driver_locations
WHERE order_id = 'your-order-id-here'
GROUP BY order_id;
```

**Manual calculation:**

```sql
-- Force recalculate analytics
SELECT * FROM calculate_trip_analytics('your-order-id-here');

-- Apply to order
UPDATE orders o
SET
    total_distance_km = t.total_distance_km,
    total_duration_minutes = t.total_duration_minutes,
    average_speed_kmh = t.average_speed_kmh
FROM calculate_trip_analytics(o.id) t
WHERE o.id = 'your-order-id-here';
```

---

## Testing Checklist

### ✅ Step-by-Step Testing

#### Test 1: Verify SQL Deployment

- [ ] Run `COMPLETE_TRACKING_SYSTEM.sql` in Supabase
- [ ] Check for success message in query output
- [ ] Verify no errors

#### Test 2: Verify Database Structure

```sql
-- Run all these checks
SELECT COUNT(*) FROM driver_locations WHERE geometry IS NOT NULL;
SELECT COUNT(*) FROM orders WHERE tracking_active = TRUE;
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_tracking_data';
```

#### Test 3: Activate an Order

- [ ] Go to Orders page
- [ ] Edit an order
- [ ] Change status to "in_progress"
- [ ] Save
- [ ] Check database: `tracking_active` should be TRUE

#### Test 4: Send Location from Mobile App

- [ ] Open mobile app
- [ ] Activate an order
- [ ] Send location update
- [ ] Check mobile console for success message
- [ ] Check database for new record in `driver_locations`

#### Test 5: Access Tracking Link

- [ ] Go to Orders page
- [ ] Find order with status "in_progress"
- [ ] Click "🔗 Track" button
- [ ] Modal should appear with link
- [ ] Click "Copy Link"
- [ ] Should see success message

#### Test 6: View Public Tracking Page

- [ ] Click "Open Link" from modal (OR)
- [ ] Click "📍 View" button on orders page
- [ ] Should open in new tab
- [ ] Should show map with driver location
- [ ] Should show order details
- [ ] Should show trip analytics

#### Test 7: Real-Time Updates

- [ ] Keep tracking page open
- [ ] Send new location from mobile app
- [ ] Tracking page should update within seconds (Realtime)
- [ ] OR wait 10 minutes for auto-refresh

---

## Quick Fixes

### Fix 1: Enable Tracking for All In-Progress Orders

```sql
UPDATE orders
SET tracking_active = TRUE, trip_start_time = COALESCE(trip_start_time, NOW())
WHERE status IN ('in_progress', 'in_transit', 'loaded')
AND tracking_active != TRUE;
```

### Fix 2: Backfill All Missing Geometry

```sql
-- Driver locations
UPDATE driver_locations
SET geometry = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geometry IS NULL;

-- Orders current location
UPDATE orders o
SET current_driver_geometry = (
    SELECT ST_SetSRID(ST_MakePoint(dl.longitude, dl.latitude), 4326)
    FROM driver_locations dl
    WHERE dl.order_id = o.id
    ORDER BY dl.created_at DESC
    LIMIT 1
)
WHERE tracking_active = TRUE
AND current_driver_geometry IS NULL;
```

### Fix 3: Reset and Restart Tracking

```sql
-- For a specific order
UPDATE orders
SET
    tracking_active = TRUE,
    trip_start_time = NOW(),
    trip_end_time = NULL,
    total_distance_km = NULL,
    total_duration_minutes = NULL,
    average_speed_kmh = NULL
WHERE id = 'your-order-id-here';
```

---

## Mobile App Verification

### Check LocationService is Working

Look for these console logs in mobile app:

```
✅ Good signs:
- "📍 Processing location update: {orderId: '...', ...}"
- "📍 Location updated: {orderId: '...', lat: ..., lng: ...}"
- "📍 Manual location update sent to dashboard"

❌ Bad signs:
- "Error saving location: {...}"
- "⚠️ Order not found, setting order_id to null"
- "Error sending immediate location update"
```

### Force Location Update

In mobile app, you can force an immediate update by:

1. Going to an active order
2. Pulling down to refresh
3. The app should send location immediately

---

## Dashboard Verification

### Orders Page Should Show:

For orders with status `in_progress`, `in_transit`, or `loaded`:

- **🔗 Track** button (blue)
- **📍 View** button (indigo)

These buttons should appear in the Actions column, alongside Edit, Delete, PDF, View.

### Tracking Modal Features:

When you click "🔗 Track":

- Large modal with tracking link
- "Copy Link" button
- "Open Link" button
- "Email" button
- Info text about features

---

## Support Queries

### Get Order Tracking Status:

```sql
SELECT
    o.order_number,
    o.status,
    o.tracking_active,
    o.trip_start_time,
    o.total_distance_km,
    COUNT(dl.id) as location_count,
    MAX(dl.created_at) as last_location_time
FROM orders o
LEFT JOIN driver_locations dl ON dl.order_id = o.id
WHERE o.id = 'your-order-id-here'
GROUP BY o.id, o.order_number, o.status, o.tracking_active, o.trip_start_time, o.total_distance_km;
```

### Get Recent Location Activity:

```sql
SELECT
    dl.created_at,
    dl.latitude,
    dl.longitude,
    dl.geometry IS NOT NULL as has_geometry,
    o.order_number,
    o.tracking_active
FROM driver_locations dl
LEFT JOIN orders o ON o.id = dl.order_id
WHERE dl.created_at > NOW() - INTERVAL '1 hour'
ORDER BY dl.created_at DESC;
```

---

## 🎉 Success Indicators

When everything is working correctly:

1. ✅ Orders page shows "🔗 Track" and "📍 View" buttons
2. ✅ Clicking "🔗 Track" opens modal with link
3. ✅ Public tracking page loads without errors
4. ✅ Map shows driver location marker
5. ✅ Trip analytics show distance/time/speed
6. ✅ Page auto-refreshes every 10 minutes
7. ✅ New locations appear instantly via Realtime
8. ✅ Mobile app console shows successful location updates
9. ✅ Database has geometry data populated
10. ✅ tracking_active = TRUE for in-progress orders

---

**Need more help?** Check the database logs or mobile app console for specific error messages!
