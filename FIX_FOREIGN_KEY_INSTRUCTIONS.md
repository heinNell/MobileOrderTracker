# Fix Foreign Key Relationship Error

## Error You're Seeing
```
Error fetching driver locations: 
{
  code: 'PGRST200',
  message: "Could not find a relationship between 'driver_locations' and 'users' in the schema cache"
}
```

## Root Cause
The `driver_locations` table exists, but the foreign key relationship with the `users` table is missing from the database schema cache.

## Solution

### Option 1: Run the SQL Fix (Recommended)
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `FIX_DRIVER_LOCATIONS_FK.sql`
4. Click **RUN**
5. Verify you see "SUCCESS: Foreign keys verified" in the results

### Option 2: Dashboard Will Work Anyway
I've updated the dashboard code to automatically fall back to a simple query if the foreign key isn't found. The tracking page will work, but you won't see driver names in the data until you run the SQL fix.

## After Running the Fix

1. **Restart the mobile app** to ensure location updates are being sent
2. **Refresh the dashboard** tracking page
3. **Activate an order** in the mobile app
4. Watch the dashboard for real-time location updates

## Verification

After running the SQL, you should see:
- ✅ Foreign key constraints created
- ✅ Indexes created for performance
- ✅ RLS policies enabled
- ✅ Realtime enabled for live updates

## Files Updated
- `/dashboard/app/tracking/page.tsx` - Added fallback query
- `/MyApp/app/services/LocationService.js` - Fixed error handling
- `FIX_DRIVER_LOCATIONS_FK.sql` - Complete database fix

## What Changed
The dashboard now:
1. **First tries**: Query with foreign key relationships (full data)
2. **Falls back**: Simple query without relationships (basic data)
3. **Shows warning**: Console message to run the SQL fix
4. **Still works**: Tracking displays even without foreign keys

This ensures the tracking page works immediately while you fix the database schema.
