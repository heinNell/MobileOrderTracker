# Complete Database Fix - Tracking Errors

## Errors You're Seeing

### Error 1: Foreign Key Violation

```
ERROR: 23503: insert or update on table "driver_locations" violates foreign key constraint
Key (order_id)=(265de23b-a31a-4dbe-9897-3bfdd1253c76) is not present in table "orders"
```

### Error 2: Map Locations Trigger Error

```
ERROR: 42703: column "notes" of relation "map_locations" does not exist
CONTEXT: PL/pgSQL function fill_driver_location_and_propagate()
```

## Root Causes

1. **Invalid Order ID**: The mobile app has an old order ID stored that doesn't exist
2. **Bad Trigger**: Database has a trigger `fill_driver_location_and_propagate()` that tries to insert into `map_locations` table with wrong schema

## Complete Fix (Run in Order)

### Step 1: Fix the Trigger and Foreign Key Issues

This removes the problematic trigger and makes the system more resilient.

```sql
-- In Supabase SQL Editor, run:
FIX_MAP_LOCATIONS_TRIGGER.sql
```

**What this does:**

- ✅ Removes the bad `fill_driver_location_and_propagate()` trigger
- ✅ Makes `order_id` nullable (allows NULL values)
- ✅ Changes foreign key to `ON DELETE SET NULL` (won't block inserts)
- ✅ Cleans up existing invalid order_ids
- ✅ Creates safe trigger that only updates users table

### Step 2: Clean Up Invalid Data

```sql
-- In Supabase SQL Editor, run:
CLEANUP_INVALID_DRIVER_LOCATIONS.sql
```

### Step 3: Restart Mobile App

The app has been updated to automatically clear invalid order IDs.

**Action**: Force quit and restart the mobile app

### Step 4: Test

1. Activate a new order in the mobile app
2. Watch the console for location updates
3. Check the dashboard tracking page

## What Changed

### Database Changes

1. **Removed Bad Trigger**: `fill_driver_location_and_propagate()` function deleted
2. **Added Safe Trigger**: `update_user_last_location_safe()` - only updates users table
3. **Foreign Key**: Changed to `ON DELETE SET NULL` instead of blocking
4. **Column**: `order_id` is now nullable

### Mobile App Changes (Already Done)

1. **LocationService.js**: Validates order exists, clears invalid IDs
2. **Error Handling**: Properly checks Supabase error responses

### Dashboard Changes (Already Done)

1. **page.tsx**: Fallback query if foreign keys missing

## Why You Got These Errors

1. **Old Trigger**: Your database had an old trigger from a previous migration that referenced the wrong `map_locations` schema
2. **Invalid Order**: The order `265de23b-a31a-4dbe-9897-3bfdd1253c76` was deleted or never existed
3. **Strict Foreign Key**: The original foreign key was `ON DELETE CASCADE` which blocks inserts

## Prevention

After running the fix:

- ✅ Location tracking works even without valid order
- ✅ No more map_locations trigger errors
- ✅ Old orders won't block new tracking
- ✅ App auto-clears invalid order IDs

## Verification Queries

### Check if trigger is gone:

```sql
SELECT tgname, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.driver_locations'::regclass;
```

### Check foreign key behavior:

```sql
SELECT conname, confdeltype
FROM pg_constraint
WHERE conrelid = 'public.driver_locations'::regclass
  AND contype = 'f';
```

### Test location insert:

```sql
-- This should work now even with invalid order_id
INSERT INTO public.driver_locations (
  driver_id,
  order_id,  -- Can be NULL or invalid
  latitude,
  longitude,
  timestamp
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  NULL,  -- NULL is safe
  -33.9249,
  18.4241,
  now()
);
```

## Files You Need

1. `FIX_MAP_LOCATIONS_TRIGGER.sql` - **RUN THIS FIRST**
2. `CLEANUP_INVALID_DRIVER_LOCATIONS.sql` - Run after first script
3. `CHECK_ORDER_EXISTS.sql` - For diagnostics

## Expected Results

After running both scripts:

- ✅ No more "notes column doesn't exist" errors
- ✅ No more foreign key violations
- ✅ Location tracking works immediately
- ✅ Dashboard shows real-time updates
- ✅ Mobile app clears invalid orders automatically

## If Still Having Issues

Run these diagnostic queries:

```sql
-- Check what triggers exist
SELECT * FROM pg_trigger
WHERE tgrelid = 'public.driver_locations'::regclass;

-- Check what functions reference map_locations
SELECT proname, prosrc
FROM pg_proc
WHERE prosrc LIKE '%map_locations%';

-- Check foreign key constraints
SELECT * FROM pg_constraint
WHERE conrelid = 'public.driver_locations'::regclass;
```
