-- Add truck registration fields to orders table

-- Add truck and trailer registration number fields
ALTER TABLE public.orders
ADD COLUMN
IF NOT EXISTS truck_registration VARCHAR
(50),
ADD COLUMN
IF NOT EXISTS trailer_registration VARCHAR
(50);

-- Add comments for documentation
COMMENT ON COLUMN public.orders.truck_registration IS 'Registration number for the horse/truck';
COMMENT ON COLUMN public.orders.trailer_registration IS 'Registration number for the trailer';

-- Verify the columns were added
SELECT
    '✅ Truck registration fields added' as status,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'orders'
    AND table_schema = 'public'
    AND column_name IN ('truck_registration', 'trailer_registration');
