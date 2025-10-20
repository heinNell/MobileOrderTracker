-- Fix transporters table to auto-generate name from company_name
-- This ensures compatibility with the CreateTransporterModal.tsx component

-- Step 1: Make name column nullable with default
ALTER TABLE public.transporters 
ALTER COLUMN name DROP NOT NULL;

ALTER TABLE public.transporters 
ALTER COLUMN name SET DEFAULT '';

-- Step 2: Update existing records that might have null or empty names
UPDATE public.transporters
SET name = COALESCE(company_name, 'Unknown Transporter')
WHERE name IS NULL OR name = '';

-- Step 3: Create trigger function to auto-generate name
CREATE OR REPLACE FUNCTION public.generate_transporter_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If name is not provided or is empty, generate it from company_name
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := COALESCE(NEW.company_name, 'Unknown Transporter');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_generate_transporter_name ON public.transporters;

-- Step 5: Create trigger to auto-generate name before insert or update
CREATE TRIGGER trigger_generate_transporter_name
  BEFORE INSERT OR UPDATE ON public.transporters
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_transporter_name();

-- Step 6: Add check constraint to ensure at least company_name or name is provided
ALTER TABLE public.transporters 
DROP CONSTRAINT IF EXISTS transporters_name_check;

ALTER TABLE public.transporters
ADD CONSTRAINT transporters_name_check 
CHECK (
  (name IS NOT NULL AND name != '') OR 
  (company_name IS NOT NULL AND company_name != '')
);

-- Step 7: Verify the fix
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transporters'
  AND column_name IN ('name', 'company_name');

-- Step 8: Test the trigger with a sample insert
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Get a valid tenant_id (use the first one found)
  INSERT INTO public.transporters (
    tenant_id,
    company_name,
    is_active
  ) VALUES (
    (SELECT id FROM public.tenants LIMIT 1),
    'Test Transport Co',
    true
  ) RETURNING id INTO test_id;
  
  -- Check if name was auto-generated
  PERFORM 1 FROM public.transporters 
  WHERE id = test_id 
  AND name = 'Test Transport Co';
  
  IF FOUND THEN
    RAISE NOTICE 'SUCCESS: Trigger working correctly - name auto-generated from company_name';
  ELSE
    RAISE WARNING 'FAILED: Trigger did not generate name correctly';
  END IF;
  
  -- Clean up test record
  DELETE FROM public.transporters WHERE id = test_id;
  
  RAISE NOTICE 'Test transporter cleaned up';
END $$;

-- Final verification
SELECT 
  'Transporters table fixed!' as status,
  COUNT(*) as total_transporters,
  COUNT(name) as transporters_with_name,
  COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as transporters_without_name
FROM public.transporters;

COMMENT ON TRIGGER trigger_generate_transporter_name ON public.transporters IS 
'Auto-generates name from company_name if not provided';

COMMENT ON FUNCTION public.generate_transporter_name() IS 
'Trigger function to auto-generate name for transporters from company_name.';
