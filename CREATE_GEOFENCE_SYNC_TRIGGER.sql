-- Auto-sync trigger: When a geofence is created/updated, sync to enhanced_geofences
-- This ensures frontend geofence creation automatically populates enhanced_geofences

-- Function to sync geofences to enhanced_geofences
CREATE OR REPLACE FUNCTION sync_geofence_to_enhanced()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: Create new enhanced_geofence
  IF TG_OP = 'INSERT' THEN
    INSERT INTO enhanced_geofences (
      id,
      tenant_id,
      name,
      geofence_id,
      geofence_type,
      center_latitude,
      center_longitude,
      radius_meters,
      shape_type,
      is_active,
      usage_count,
      priority_level,
      trigger_event,
      notification_enabled,
      alert_enabled,
      is_template,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.tenant_id,
      NEW.name,
      NEW.id,  -- Foreign key to geofences table
      'custom',  -- Default type, can be updated later
      CAST(NEW.latitude AS NUMERIC(10,8)),
      CAST(NEW.longitude AS NUMERIC(11,8)),
      NEW.radius_meters,
      'circle',
      NEW.is_active,
      0,
      5,
      'entry',
      false,
      false,
      false,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (geofence_id) DO NOTHING;  -- Skip if already exists
    
    RETURN NEW;
  END IF;

  -- On UPDATE: Sync changes to enhanced_geofences
  IF TG_OP = 'UPDATE' THEN
    UPDATE enhanced_geofences
    SET
      name = NEW.name,
      center_latitude = CAST(NEW.latitude AS NUMERIC(10,8)),
      center_longitude = CAST(NEW.longitude AS NUMERIC(11,8)),
      radius_meters = NEW.radius_meters,
      is_active = NEW.is_active,
      updated_at = NEW.updated_at
    WHERE geofence_id = NEW.id;
    
    RETURN NEW;
  END IF;

  -- On DELETE: Remove from enhanced_geofences
  IF TG_OP = 'DELETE' THEN
    DELETE FROM enhanced_geofences
    WHERE geofence_id = OLD.id;
    
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_geofence_to_enhanced ON geofences;

-- Create trigger on geofences table
CREATE TRIGGER trigger_sync_geofence_to_enhanced
  AFTER INSERT OR UPDATE OR DELETE ON geofences
  FOR EACH ROW
  EXECUTE FUNCTION sync_geofence_to_enhanced();

-- Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_sync_geofence_to_enhanced';

COMMENT ON FUNCTION sync_geofence_to_enhanced() IS 'Automatically syncs geofences table changes to enhanced_geofences table';
COMMENT ON TRIGGER trigger_sync_geofence_to_enhanced ON geofences IS 'Keeps enhanced_geofences in sync with geofences table';
