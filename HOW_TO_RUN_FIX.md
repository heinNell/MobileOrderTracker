# How to Run FIX_ALL_ACCURACY_ERRORS.sql

## Steps:

1. **Open Supabase Dashboard**

   - Go to your Supabase project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Navigate to SQL Editor**

   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Paste the SQL**

   - Open `FIX_ALL_ACCURACY_ERRORS.sql` from your workspace
   - Copy ALL contents (Ctrl+A, Ctrl+C)
   - Paste into the Supabase SQL Editor

4. **Run the Script**

   - Click "Run" button (or press Ctrl+Enter)
   - Wait for all statements to execute

5. **Check the Results**

   - You should see:
     - ✅ Columns added to driver_locations
     - ✅ Old broken triggers dropped
     - ✅ New correct trigger created
     - ✅ Verification queries showing table structure
     - ✅ Success message with next steps

6. **After Success, Update Your Order Status**

   ```sql
   UPDATE orders
   SET status = 'in_progress'
   WHERE order_number = 'ORD-1759507343591';
   ```

7. **Test the Tracking**
   - Open your dashboard: https://your-dashboard.vercel.app
   - Go to Orders page
   - Find order ORD-1759507343591
   - Click "View Tracking" button
   - You should see the map with location updates

## What This Script Does:

### Problem it Fixes:

- ❌ Old triggers on `orders` table trying to access `accuracy_meters` column that doesn't exist there
- ❌ Missing columns in `driver_locations` table
- ❌ Incorrect trigger placement

### Solution:

- ✅ Adds missing columns to `driver_locations`: accuracy_meters, speed_kmh, heading, timestamp, geometry, location
- ✅ Drops all broken triggers from `orders` table
- ✅ Creates correct trigger on `driver_locations` table (where columns actually exist)
- ✅ Updates `orders.last_driver_location` with full tracking data

### What Happens After:

1. Mobile app sends location: `driver_id, order_id, latitude, longitude, accuracy_meters, speed_kmh, heading`
2. Trigger fires on INSERT to `driver_locations`
3. Trigger creates PostGIS geometry from lat/lng
4. Trigger updates `orders` table with current location JSONB
5. Dashboard tracking page shows real-time location on map
6. No more errors! 🎉

## Troubleshooting:

If you get any errors:

1. Copy the EXACT error message
2. Share it with me
3. I'll create a more targeted fix

## Expected Output:

You should see something like:

```
ALTER TABLE
ALTER TABLE
CREATE INDEX
DROP TRIGGER
DROP FUNCTION
CREATE FUNCTION
CREATE TRIGGER

column_name        | data_type
-------------------|------------
accuracy_meters    | numeric
geometry           | USER-DEFINED
heading            | numeric
latitude           | numeric
location           | jsonb
longitude          | numeric
speed_kmh          | numeric
timestamp          | timestamp with time zone

status                            | existing_locations
----------------------------------|-------------------
driver_locations table is ready   | X

✅ All fixes applied!
✅ driver_locations has all required columns
✅ Broken triggers on orders table removed
✅ Correct trigger on driver_locations created

Next steps:
1. Mobile app can now send locations without errors
2. Update order status to in_progress: UPDATE orders SET status = 'in_progress' WHERE order_number = 'ORD-1759507343591';
3. Check dashboard tracking page
```
