-- ============================================================
-- FIX: Map new field names to legacy columns
-- ============================================================
-- 
-- Issue: Dashboard sends first_name, last_name, primary_email
--        But database requires name (NOT NULL) and email (NOT NULL)
--
-- Solution: Create trigger to auto-populate legacy columns
--
-- ============================================================

-- Step 1: Make legacy 'name' and 'email' columns nullable temporarily
ALTER TABLE public.contacts 
ALTER COLUMN name DROP NOT NULL;

ALTER TABLE public.contacts 
ALTER COLUMN email DROP NOT NULL;

-- Step 2: Create trigger function to sync legacy columns
CREATE OR REPLACE FUNCTION public.sync_contact_legacy_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate 'name' from full_name, first_name+last_name, or company_name
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := COALESCE(
      NULLIF(NEW.full_name, ''),
      NULLIF(TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, ''))), ''),
      NEW.company_name,
      'Unknown'
    );
  END IF;
  
  -- Auto-populate 'email' from primary_email
  IF NEW.email IS NULL OR NEW.email = '' THEN
    NEW.email := COALESCE(
      NEW.primary_email,
      NEW.secondary_email,
      CONCAT('noemail_', NEW.id, '@placeholder.com') -- Fallback placeholder
    );
  END IF;
  
  -- Also ensure full_name is populated (from existing trigger)
  IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
    NEW.full_name := TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')));
    IF NEW.full_name = '' OR NEW.full_name IS NULL THEN
      NEW.full_name := COALESCE(NEW.company_name, NEW.name, 'Unknown Contact');
    END IF;
  END IF;
  
  -- Sync primary_email from email if not provided
  IF NEW.primary_email IS NULL OR NEW.primary_email = '' THEN
    NEW.primary_email := NEW.email;
  END IF;
  
  -- Sync phone from primary_phone if provided
  IF NEW.primary_phone IS NOT NULL AND NEW.primary_phone != '' THEN
    NEW.phone := NEW.primary_phone;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop old trigger and create new one
DROP TRIGGER IF EXISTS trigger_sync_contact_legacy_fields ON public.contacts;

CREATE TRIGGER trigger_sync_contact_legacy_fields
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contact_legacy_fields();

-- Step 4: Update existing records to populate legacy fields
UPDATE public.contacts
SET 
  name = COALESCE(
    NULLIF(name, ''),
    NULLIF(full_name, ''),
    NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''),
    company_name,
    'Unknown'
  ),
  email = COALESCE(
    NULLIF(email, ''),
    primary_email,
    secondary_email,
    CONCAT('contact_', id, '@placeholder.com')
  )
WHERE name IS NULL 
   OR name = '' 
   OR email IS NULL 
   OR email = '';

-- Step 5: Now make them NOT NULL again with defaults
ALTER TABLE public.contacts 
ALTER COLUMN name SET DEFAULT 'Unknown';

ALTER TABLE public.contacts 
ALTER COLUMN email SET DEFAULT 'noemail@placeholder.com';

-- Add NOT NULL constraints back
ALTER TABLE public.contacts 
ALTER COLUMN name SET NOT NULL;

ALTER TABLE public.contacts 
ALTER COLUMN email SET NOT NULL;

-- Step 6: Verification
SELECT 
  id,
  name,
  email,
  first_name,
  last_name,
  full_name,
  primary_email
FROM public.contacts
ORDER BY created_at DESC
LIMIT 5;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ LEGACY FIELD MAPPING FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ name column auto-populated from first_name + last_name';
  RAISE NOTICE '✅ email column auto-populated from primary_email';
  RAISE NOTICE '✅ Trigger created to sync fields automatically';
  RAISE NOTICE '✅ Existing records updated';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Contact creation should now work!';
  RAISE NOTICE '========================================';
END $$;

COMMENT ON FUNCTION public.sync_contact_legacy_fields() IS 
'Auto-syncs legacy name/email columns with new first_name/last_name/primary_email fields for backward compatibility';
