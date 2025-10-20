-- Fix contacts table to auto-generate full_name if not provided
-- This ensures compatibility with the CreateContactModal.tsx component

-- Step 1: Add a generated column for full_name (if it doesn't exist as generated)
-- First, check if we need to alter the column
DO $$ 
BEGIN
  -- Check if full_name column exists and is not a generated column
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contacts' 
    AND column_name = 'full_name'
    AND is_generated = 'NEVER'
  ) THEN
    -- If it's a regular column, we need to handle it differently
    -- Option 1: Make it nullable with a default
    ALTER TABLE public.contacts 
    ALTER COLUMN full_name DROP NOT NULL;
    
    ALTER TABLE public.contacts 
    ALTER COLUMN full_name SET DEFAULT '';
    
    -- Update existing records that have null full_name
    UPDATE public.contacts
    SET full_name = CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))
    WHERE full_name IS NULL OR full_name = '';
    
    RAISE NOTICE 'Made full_name nullable with default value';
  END IF;
END $$;

-- Step 2: Create or replace a trigger to auto-generate full_name
CREATE OR REPLACE FUNCTION public.generate_contact_full_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If full_name is not provided or is empty, generate it from first_name and last_name
  IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
    NEW.full_name := TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')));
  END IF;
  
  -- Ensure it's not empty after generation
  IF NEW.full_name = '' THEN
    NEW.full_name := COALESCE(NEW.company_name, 'Unknown Contact');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_generate_contact_full_name ON public.contacts;

-- Create trigger to auto-generate full_name before insert or update
CREATE TRIGGER trigger_generate_contact_full_name
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_contact_full_name();

-- Step 3: Verify the fix by checking column constraints
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  is_generated
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contacts'
  AND column_name IN ('full_name', 'first_name', 'last_name');

-- Step 4: Test the trigger with a sample insert (optional - comment out if not needed)
-- This will be rolled back, just for testing
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Get a valid tenant_id (use the first one found)
  INSERT INTO public.contacts (
    tenant_id,
    first_name,
    last_name,
    contact_type
  ) VALUES (
    (SELECT id FROM public.tenants LIMIT 1),
    'Test',
    'Contact',
    'customer'
  ) RETURNING id INTO test_id;
  
  -- Check if full_name was generated
  PERFORM 1 FROM public.contacts 
  WHERE id = test_id 
  AND full_name = 'Test Contact';
  
  IF FOUND THEN
    RAISE NOTICE 'SUCCESS: Trigger working correctly - full_name auto-generated';
  ELSE
    RAISE WARNING 'FAILED: Trigger did not generate full_name correctly';
  END IF;
  
  -- Clean up test record
  DELETE FROM public.contacts WHERE id = test_id;
  
  RAISE NOTICE 'Test contact cleaned up';
END $$;

-- Step 5: Additional fix - ensure first_name and last_name are also nullable
-- This provides flexibility for company-only contacts
ALTER TABLE public.contacts 
ALTER COLUMN first_name DROP NOT NULL;

ALTER TABLE public.contacts 
ALTER COLUMN last_name DROP NOT NULL;

-- Step 6: Add a check constraint to ensure at least one name field is provided
ALTER TABLE public.contacts 
DROP CONSTRAINT IF EXISTS contacts_name_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_name_check 
CHECK (
  (first_name IS NOT NULL AND first_name != '') OR 
  (last_name IS NOT NULL AND last_name != '') OR 
  (company_name IS NOT NULL AND company_name != '') OR
  (full_name IS NOT NULL AND full_name != '')
);

-- Final verification query
SELECT 
  'Contacts table fixed!' as status,
  COUNT(*) as total_contacts,
  COUNT(full_name) as contacts_with_full_name,
  COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as contacts_without_full_name
FROM public.contacts;

COMMENT ON TRIGGER trigger_generate_contact_full_name ON public.contacts IS 
'Auto-generates full_name from first_name and last_name if not provided';

COMMENT ON FUNCTION public.generate_contact_full_name() IS 
'Trigger function to auto-generate full_name for contacts. Falls back to company_name if names are empty.';
