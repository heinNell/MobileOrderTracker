# Fix: RLS Policy Blocking driver_locations Inserts

## The Error

```
insert or update on table "driver_locations" violates foreign key constraint
Key (driver_id)=(100040d8-8e98-4bfe-8387-a9d611f20f1f) is not present in table "users"
```

## Diagnostic Results ✅

Your user **DOES EXIST** in the database:

```json
{
  "id": "100040d8-8e98-4bfe-8387-a9d611f20f1f",
  "email": "john@gmail.co",
  "full_name": "John",
  "role": "driver",
  "is_active": true,
  "tenant_id": "00000000-0000-0000-0000-000000000001"
}
```

## Root Cause

The user exists, so this is **NOT a missing user issue**. The real problem is:

**Row Level Security (RLS) policies are blocking the insert.**

The RLS policy on `driver_locations` table is too restrictive or not properly configured for the mobile app's authentication context. Even though the user exists and the foreign key is valid, RLS is preventing the INSERT operation.

## The Fix (Run in Supabase SQL Editor)

### Quick Fix: Simplify RLS Policy

```sql
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Drivers can insert own location updates" ON public.driver_locations;

-- Create a simpler, working policy
CREATE POLICY "Drivers can insert own location updates"
ON public.driver_locations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Simply check that driver_id matches the authenticated user
  driver_id = auth.uid()
);
```

### Complete Fix Script

Run: **`FIX_RLS_POLICY_DRIVER_LOCATIONS.sql`**

This script will:

1. ✅ Show current RLS policies
2. ✅ Drop the problematic policy
3. ✅ Create a simplified policy that works
4. ✅ Verify the fix
5. ✅ Test permissions

Run the complete script: **`FIX_SYNC_AUTH_USERS.sql`**

This script will:

1. ✅ Find all auth users missing from `public.users`
2. ✅ Sync them automatically
3. ✅ Create a trigger to prevent future issues
4. ✅ Verify all users are synced

## Why RLS Was Blocking

The original RLS policy was checking:

```sql
WITH CHECK (
  auth.uid() = driver_id AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'driver'
  )
)
```

**The Problem**: The `EXISTS` subquery might be evaluated in a security context where it can't see the user record, or there's an issue with how `auth.uid()` is being passed from the mobile app.

**The Solution**: Simplify the policy to only check `driver_id = auth.uid()` and let the foreign key constraint handle validation.

## After Running the Fix

1. **Verify the user exists**:

   ```sql
   SELECT * FROM public.users
   WHERE id = '100040d8-8e98-4bfe-8387-a9d611f20f1f';
   ```

2. **Test mobile app**:

   - Open mobile app
   - Login as the driver
   - Try to send location update
   - Should work without error ✅

3. **Check location data**:
   ```sql
   SELECT * FROM public.driver_locations
   ORDER BY created_at DESC
   LIMIT 5;
   ```

## Why This Happens

**Supabase has TWO user tables:**

1. **`auth.users`** - Authentication (email, password, etc.)

   - Managed by Supabase Auth
   - Created when user signs up

2. **`public.users`** - Application data (name, role, tenant, etc.)
   - Managed by your application
   - Should be created via trigger or manually

**The Problem:**
Mobile app uses `auth.uid()` (from `auth.users`) to insert into `driver_locations`, but foreign key checks against `public.users`.

**The Solution:**
Ensure every user in `auth.users` also exists in `public.users`.

## Step-by-Step Fix

### 1. Run Diagnostic (Optional)

```bash
# Open file: DIAGNOSE_AND_FIX_DRIVER_ID.sql
# Run in Supabase SQL Editor
# This shows which users are missing
```

### 2. Run the Sync Script

```bash
# Open file: FIX_SYNC_AUTH_USERS.sql
# Run in Supabase SQL Editor
# This fixes ALL missing users
```

### 3. Verify

```sql
-- Should return 0 unsynced users
SELECT COUNT(*) as unsynced_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

### 4. Test Mobile App

- Login
- Check console for errors
- Location should insert successfully

## Prevention

The trigger created by `FIX_SYNC_AUTH_USERS.sql` prevents this issue by:

- Automatically syncing new auth users to public.users
- Running on every new signup
- Using SECURITY DEFINER to bypass RLS

## Troubleshooting

### Error: "permission denied for table auth.users"

**Solution**: You may need to run parts of the script as a Supabase admin or use the Supabase dashboard's SQL editor with elevated permissions.

### Error: "relation 'tenants' does not exist"

**Solution**: Create a tenant first:

```sql
INSERT INTO public.tenants (name, is_active)
VALUES ('Default Tenant', true);
```

### Users still not syncing

**Check**:

1. Is the trigger created? `\d+ auth.users` (show triggers)
2. Is the function created? `\df handle_new_user`
3. Check for errors in Supabase logs

## Files to Use

1. **`FIX_RLS_POLICY_DRIVER_LOCATIONS.sql`** - Fix RLS policies (THIS IS THE FIX YOU NEED)
2. **`DIAGNOSE_AND_FIX_DRIVER_ID.sql`** - Diagnostic tool (already ran)
3. **`FIX_SYNC_AUTH_USERS.sql`** - User sync (not needed in your case)
4. **`CREATE_DRIVER_LOCATIONS_TABLE.sql`** - Original table creation (already done)

---

**Status**: User exists ✅ - Issue is RLS policies ❌  
**Action**: Run `FIX_RLS_POLICY_DRIVER_LOCATIONS.sql` in Supabase SQL Editor  
**Time**: ~30 seconds to run  
**Impact**: Allows authenticated drivers to insert location data 🎉

## Quick Summary

Your user exists in the database, so this is NOT a missing user issue. The problem is the **RLS (Row Level Security) policy** is too strict and blocking legitimate inserts from the mobile app.

**What to do:**

1. Open Supabase SQL Editor
2. Run: `FIX_RLS_POLICY_DRIVER_LOCATIONS.sql`
3. Test mobile app - location inserts should work now

The fix simplifies the RLS policy from checking multiple conditions to just verifying `driver_id = auth.uid()`, which is what you need.
