-- Complete Fix for contacts table
-- Resolves ALL contact creation issues:
-- 1. Missing 'categories' column
-- 2. Missing 'tags' column  
-- 3. full_name generation issues
-- 4. Makes first_name and last_name nullable for company-only contacts

-- ============================================================
-- PART 1: Add Missing Columns
-- ============================================================

-- Add categories column (text array)
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS categories text[];

-- Add tags column (text array)
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS tags text[];

-- Add indexes for array columns (GIN indexes for better array search performance)
CREATE INDEX IF NOT EXISTS idx_contacts_categories 
ON public.contacts USING GIN (categories);

CREATE INDEX IF NOT EXISTS idx_contacts_tags 
ON public.contacts USING GIN (tags);

-- ============================================================
-- PART 2: Fix full_name Column
-- ============================================================

-- Make full_name nullable if it's currently NOT NULL
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
    -- Make it nullable with a default
    ALTER TABLE public.contacts 
    ALTER COLUMN full_name DROP NOT NULL;
    
    ALTER TABLE public.contacts 
    ALTER COLUMN full_name SET DEFAULT '';
    
    -- Update existing records that have null full_name
    UPDATE public.contacts
    SET full_name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
    WHERE full_name IS NULL OR full_name = '';
    
    RAISE NOTICE 'Made full_name nullable with default value';
  END IF;
END $$;

-- Create trigger function to auto-generate full_name
CREATE OR REPLACE FUNCTION public.generate_contact_full_name()
RETURNS TRIGGER AS $$
BEGIN
  -- If full_name is not provided or is empty, generate it from first_name and last_name
  IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
    NEW.full_name := TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')));
  END IF;
  
  -- Ensure it's not empty after generation - fallback to company_name
  IF NEW.full_name = '' OR NEW.full_name IS NULL THEN
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

-- ============================================================
-- PART 3: Make first_name and last_name Nullable
-- ============================================================

-- Allow first_name and last_name to be NULL (for company-only contacts)
ALTER TABLE public.contacts 
ALTER COLUMN first_name DROP NOT NULL;

ALTER TABLE public.contacts 
ALTER COLUMN last_name DROP NOT NULL;

-- Add check constraint to ensure at least one name field is provided
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

-- ============================================================
-- PART 4: Verification
-- ============================================================

-- Verify all columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contacts'
  AND column_name IN ('full_name', 'first_name', 'last_name', 'categories', 'tags')
ORDER BY column_name;

-- Verify indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'contacts'
  AND (indexname LIKE '%categories%' OR indexname LIKE '%tags%');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CONTACTS TABLE FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ categories column added (text[])';
  RAISE NOTICE '✅ tags column added (text[])';
  RAISE NOTICE '✅ GIN indexes created for array columns';
  RAISE NOTICE '✅ full_name auto-generation trigger created';
  RAISE NOTICE '✅ first_name and last_name made nullable';
  RAISE NOTICE '✅ Check constraint added for name validation';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Contact creation should now work perfectly!';
  RAISE NOTICE '========================================';
END $$;

-- Add helpful comments
COMMENT ON COLUMN public.contacts.categories IS 
'Array of categories for contact classification (e.g., VIP, Regular, Wholesale, Partner)';

COMMENT ON COLUMN public.contacts.tags IS 
'Array of custom tags for contact organization and searching';

COMMENT ON TRIGGER trigger_generate_contact_full_name ON public.contacts IS 
'Auto-generates full_name from first_name and last_name if not provided. Falls back to company_name.';

COMMENT ON FUNCTION public.generate_contact_full_name() IS 
'Trigger function to auto-generate full_name for contacts. Handles nullable names and fallback to company_name.';
