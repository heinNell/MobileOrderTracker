-- Fix geofence deletion issue
-- The frontend tries to delete from "geofences" table but data is in "enhanced_geofences"

-- ============================================================================
-- STEP 1: Grant DELETE permissions on enhanced_geofences
-- ============================================================================

GRANT DELETE ON public.enhanced_geofences TO authenticated;

-- ============================================================================
-- STEP 2: Also ensure geofences table has delete permissions
-- ============================================================================

GRANT DELETE ON public.geofences TO authenticated;

-- ============================================================================
-- STEP 3: Create INSTEAD OF DELETE trigger on geofences_api view
-- ============================================================================

-- This allows deleting through the view and will delete from enhanced_geofences
CREATE OR REPLACE FUNCTION delete_geofence_via_api
()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.enhanced_geofences WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS geofences_api_delete
ON public.geofences_api;

-- Create the INSTEAD OF DELETE trigger
CREATE TRIGGER geofences_api_delete
  INSTEAD OF
DELETE ON public.geofences_api
  FOR EACH
ROW
EXECUTE FUNCTION delete_geofence_via_api
();

-- ============================================================================
-- STEP 4: Verify permissions
-- ============================================================================

SELECT '✅ DELETE permissions granted!' as result;

SELECT
    '📊 Permissions Summary' as info,
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('geofences', 'enhanced_geofences', 'geofences_api')
    AND grantee = 'authenticated'
    AND privilege_type IN ('DELETE', 'SELECT')
ORDER BY table_name, privilege_type;

SELECT '✅ You can now delete geofences from the frontend!' as next_action;
