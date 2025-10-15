-- FIX: Add missing last_location_update column to users table
-- This column tracks when a driver last sent their location

-- Add the missing column
ALTER TABLE public.users
ADD COLUMN
IF NOT EXISTS last_location_update TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX
IF NOT EXISTS idx_users_last_location_update 
ON public.users
(last_location_update);

-- Verify the column was added
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'last_location_update';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ users.last_location_update column added!';
    RAISE NOTICE '✅ Mobile app can now update user location timestamps';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Test the mobile app again - location updates should work now!';
END $$;
