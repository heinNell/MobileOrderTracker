-- Fix contacts table - Add missing 'categories' column
-- This resolves: "Could not find the 'categories' column of 'contacts' in the schema cache"

-- Step 1: Add the categories column if it doesn't exist
ALTER TABLE public.contacts 
ADD COLUMN
IF NOT EXISTS categories text[];

-- Step 2: Add index for better query performance on categories
CREATE INDEX
IF NOT EXISTS idx_contacts_categories 
ON public.contacts USING GIN
(categories);

-- Step 3: Verify the column was added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'contacts'
    AND column_name = 'categories';

-- Step 4: Also ensure other commonly used array columns exist
ALTER TABLE public.contacts 
ADD COLUMN
IF NOT EXISTS tags text[];

-- Step 5: Add index for tags as well
CREATE INDEX
IF NOT EXISTS idx_contacts_tags 
ON public.contacts USING GIN
(tags);

-- Step 6: Final verification - check all text array columns
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'contacts'
    AND data_type = 'ARRAY'
ORDER BY column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Categories column added successfully to contacts table';
  RAISE NOTICE '✅ GIN indexes created for categories and tags arrays';
  RAISE NOTICE '📊 Contact creation should now work without errors';
END $$;

COMMENT ON COLUMN public.contacts.categories IS 
'Array of categories for contact classification (e.g., VIP, Regular, Wholesale)';

COMMENT ON COLUMN public.contacts.tags IS 
'Array of custom tags for contact organization and searching';
