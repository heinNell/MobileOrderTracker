-- ============================================================
-- AUTO-GENERATE ORDER NUMBERS
-- ============================================================
-- 
-- This script adds automatic order number generation to the orders table.
-- Order numbers will be generated as: ORD-YYYYMMDD-0001, ORD-YYYYMMDD-0002, etc.
-- The sequence resets daily.
--
-- ============================================================

-- Step 0: Add order_number column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'order_number'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN order_number TEXT;
    RAISE NOTICE 'Added order_number column to orders table';
  ELSE
    RAISE NOTICE 'order_number column already exists';
  END IF;
END $$;

-- Step 1: Create function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  sequence_num INTEGER;
  new_order_number TEXT;
  max_order_num TEXT;
BEGIN
  -- Get today's date in YYYYMMDD format
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Find the highest order number for today
  SELECT order_number INTO max_order_num
  FROM public.orders
  WHERE order_number LIKE 'ORD-' || today_date || '-%'
  ORDER BY order_number DESC
  LIMIT 1;
  
  -- If no orders today, start at 1, otherwise increment
  IF max_order_num IS NULL THEN
    sequence_num := 1;
  ELSE
    -- Extract the sequence number from the last order
    sequence_num := CAST(SUBSTRING(max_order_num FROM '[0-9]+$') AS INTEGER) + 1;
  END IF;
  
  -- Format: ORD-YYYYMMDD-####
  new_order_number := 'ORD-' || today_date || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger function to auto-populate order_number
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if order_number is NULL or empty
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_order_number ON public.orders;

-- Step 4: Create trigger to auto-generate order_number on insert
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- Step 5: Make order_number nullable (so it can be auto-generated)
DO $$
BEGIN
  ALTER TABLE public.orders 
  ALTER COLUMN order_number DROP NOT NULL;
  RAISE NOTICE 'Made order_number nullable for auto-generation';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'order_number is already nullable or constraint does not exist';
END $$;

-- Step 6: Set default for order_number
ALTER TABLE public.orders 
ALTER COLUMN order_number SET DEFAULT public.generate_order_number();

-- Step 7: Update existing orders without order numbers
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  UPDATE public.orders
  SET order_number = public.generate_order_number()
  WHERE order_number IS NULL OR order_number = '';
  
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE NOTICE 'Updated % existing orders with auto-generated order numbers', row_count;
END $$;

-- Step 8: Create unique index on order_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number_unique 
ON public.orders(order_number);

-- Step 9: Make order_number NOT NULL (now that all have values)
DO $$
BEGIN
  ALTER TABLE public.orders 
  ALTER COLUMN order_number SET NOT NULL;
  RAISE NOTICE 'Set order_number as NOT NULL';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not set order_number as NOT NULL: %', SQLERRM;
    RAISE NOTICE 'Some orders may still have NULL order_number - run the UPDATE query again';
END $$;

-- Step 10: Test the function
DO $$
DECLARE
  test_order_number TEXT;
BEGIN
  test_order_number := public.generate_order_number();
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ AUTO ORDER NUMBER GENERATION ENABLED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sample order number: %', test_order_number;
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Format: ORD-YYYYMMDD-####';
  RAISE NOTICE '✅ Resets daily';
  RAISE NOTICE '✅ Auto-increments within the day';
  RAISE NOTICE '✅ Trigger installed';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 New orders will auto-generate numbers!';
  RAISE NOTICE '========================================';
END $$;

-- Step 11: Verification query - show recent order numbers
SELECT 
  id,
  order_number,
  status,
  created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 10;

-- Step 12: Show column info
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name = 'order_number';

COMMENT ON FUNCTION public.generate_order_number() IS 
'Generates unique order numbers in format ORD-YYYYMMDD-#### that reset daily and auto-increment';

COMMENT ON FUNCTION public.set_order_number() IS 
'Trigger function to automatically set order_number if not provided during order creation';

COMMENT ON TRIGGER trigger_set_order_number ON public.orders IS 
'Auto-generates order_number in format ORD-YYYYMMDD-#### for new orders';
