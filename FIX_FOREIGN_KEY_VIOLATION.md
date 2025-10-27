# Fix Foreign Key Violation Error - Complete Guide

## Error You're Seeing

```
ERROR: 23503: insert or update on table "driver_locations" violates foreign key constraint "driver_locations_order_id_fkey"
DETAIL: Key (order_id)=(265de23b-a31a-4dbe-9897-3bfdd1253c76) is not present in table "orders".
```

## Root Cause

The mobile app has an old/invalid order ID stored in AsyncStorage that doesn't exist in the database anymore. The app is trying to insert location updates with this invalid order_id.

## Solution (Run in Order)

### Step 1: Run the Updated SQL Fix

This will:

- Make the order_id foreign key more forgiving (SET NULL instead of CASCADE)
- Add automatic validation trigger that sets invalid order_ids to NULL
- Allow location tracking even without a valid order

```sql
-- Open Supabase SQL Editor and run:
FIX_DRIVER_LOCATIONS_FK.sql
```

### Step 2: Clean Up Existing Invalid Records

This will set all existing invalid order_ids to NULL.

```sql
-- Open Supabase SQL Editor and run:
CLEANUP_INVALID_DRIVER_LOCATIONS.sql
```

### Step 3: Restart the Mobile App

The app has been updated to:

- Validate order exists before using it
- Clear invalid order IDs from storage automatically
- Continue tracking even if order is invalid

**Action**: Force quit and restart the mobile app

## What Changed

### Database (FIX_DRIVER_LOCATIONS_FK.sql)

1. **Foreign Key**: Changed from `ON DELETE CASCADE` to `ON DELETE SET NULL`

   - Old: If order deleted, location records deleted
   - New: If order deleted, location records kept with NULL order_id

2. **Validation Trigger**: Added automatic order_id validation
   - Checks if order exists before insert
   - Sets order_id to NULL if invalid
   - Logs warning but allows insert

### Mobile App (LocationService.js)

1. **Order Validation**: Added check for invalid orders
2. **Storage Cleanup**: Automatically removes invalid order IDs
3. **Error Prevention**: Won't try to insert with invalid order_id

### Dashboard (page.tsx)

1. **Fallback Query**: Works even without foreign keys
2. **Error Handling**: Graceful fallback if relationships missing

## Testing Steps

1. **Run both SQL scripts** in Supabase SQL Editor
2. **Restart mobile app** to clear invalid order ID
3. **Activate a new order** in the mobile app
4. **Check dashboard** should show real-time tracking

## Diagnostic Queries

### Check if specific order exists:

```sql
-- Run CHECK_ORDER_EXISTS.sql
```

### See all active orders:

```sql
SELECT id, order_number, status, assigned_driver_id
FROM public.orders
WHERE status IN ('assigned', 'activated', 'in_progress', 'in_transit')
ORDER BY created_at DESC;
```

### See recent location updates:

```sql
SELECT id, driver_id, order_id, created_at
FROM public.driver_locations
ORDER BY created_at DESC
LIMIT 20;
```

## Files Modified

1. `FIX_DRIVER_LOCATIONS_FK.sql` - Updated with validation trigger
2. `CLEANUP_INVALID_DRIVER_LOCATIONS.sql` - Cleans existing bad data
3. `CHECK_ORDER_EXISTS.sql` - Diagnostic queries
4. `LocationService.js` - Added order validation and cleanup
5. `page.tsx` - Added fallback query handling

## Prevention

The updated system now prevents this error by:

- ✅ Validating orders exist before tracking
- ✅ Automatically clearing invalid order IDs
- ✅ Allowing NULL order_ids (tracks driver without order)
- ✅ Trigger validates order_id on every insert

## Expected Results

After running both SQL scripts and restarting the app:

- ✅ No more foreign key violation errors
- ✅ Location tracking works even with invalid/missing orders
- ✅ Dashboard shows real-time updates
- ✅ Old invalid data cleaned up
