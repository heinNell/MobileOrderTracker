# COMPLETE FIX - All Tracking Errors

## Current Error

```
Error inserting location into driver_locations:
function public.update_current_driver_location(uuid, double precision, double precision) does not exist
```

## Root Cause

Your database has **old triggers** from previous migrations that are trying to call functions that don't exist. When you insert into `driver_locations`, these triggers automatically fire and fail.

## Complete Solution (Run in Order)

### ⭐ Step 1: Remove All Bad Triggers (REQUIRED)

Open Supabase SQL Editor and run:

```sql
REMOVE_ALL_DRIVER_LOCATION_TRIGGERS.sql
```

**What this does:**

- ✅ Removes ALL custom triggers on `driver_locations`
- ✅ Drops all related functions (including `update_current_driver_location`)
- ✅ Creates one simple, safe trigger for updating user location
- ✅ Tests that inserts work correctly

### Step 2: Fix Foreign Keys (REQUIRED)

Run this to make the system more resilient:

```sql
FIX_MAP_LOCATIONS_TRIGGER.sql
```

**What this does:**

- ✅ Makes `order_id` nullable
- ✅ Changes foreign key to `ON DELETE SET NULL`
- ✅ Cleans up invalid data

### Step 3: Restart Mobile App

Force quit and restart the app to clear any cached state.

## What Was Wrong

Your database had multiple problematic triggers:

1. **`fill_driver_location_and_propagate()`** - Tried to insert into `map_locations` with wrong schema
2. **`update_current_driver_location()`** - Function doesn't exist but trigger was calling it
3. **Old migration triggers** - Leftover from previous attempts

These triggers run automatically on every insert to `driver_locations`, causing your location tracking to fail.

## After Running the Fix

You should see:

- ✅ No more function errors
- ✅ Location tracking works
- ✅ Dashboard shows real-time updates
- ✅ Only one simple trigger remains (updates user table)

## Verification

After running the SQL, check the console. You should see:

```
✅ All problematic triggers removed
✅ Test insert successful - triggers working correctly
```

## Files to Run

1. **`REMOVE_ALL_DRIVER_LOCATION_TRIGGERS.sql`** ⭐ **RUN THIS FIRST**
2. **`FIX_MAP_LOCATIONS_TRIGGER.sql`** - Run second
3. **`CLEANUP_INVALID_DRIVER_LOCATIONS.sql`** - Optional cleanup

## Test

After running the SQL:

1. Open mobile app
2. Activate an order
3. Check console - should see:
   ```
   📍 Location updated: { orderId: '...', latitude: ..., longitude: ... }
   ```
4. Open dashboard tracking page
5. Should see driver location updating in real-time

## Prevention

The new setup only has ONE simple trigger that:

- Updates `users.last_location_update`
- Doesn't call any external functions
- Has error handling built-in
- Won't block inserts if it fails

## If Still Having Issues

Run diagnostics:

```sql
-- Check what triggers exist
SELECT tgname, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.driver_locations'::regclass;

-- Try a manual insert
INSERT INTO public.driver_locations (
  driver_id,
  latitude,
  longitude,
  timestamp
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  -33.9249,
  18.4241,
  now()
);
```

If the manual insert works, the triggers are fixed!
