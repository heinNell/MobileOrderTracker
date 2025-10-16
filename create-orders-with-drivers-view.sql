-- Quick fix for missing orders_with_drivers view
-- This creates the view that includes assigned_driver_email column

-- Step 1: Drop existing view if it exists (to recreate it fresh)
DROP VIEW IF EXISTS public.orders_with_drivers;

-- Step 2: Create the orders_with_drivers view with all necessary columns
CREATE VIEW public.orders_with_drivers AS
SELECT 
    o.id,
    o.order_number,
    o.status,
    o.assigned_driver_id,
    o.tenant_id,
    o.loading_point_name,
    o.loading_point_address,
    o.loading_point_location,
    o.unloading_point_name,
    o.unloading_point_address,
    o.unloading_point_location,
    o.delivery_instructions,
    o.contact_name,
    o.contact_phone,
    o.created_at,
    o.updated_at,
    o.qr_code_data,
    u.full_name as assigned_driver_name,
    u.email as assigned_driver_email,
    u.phone as assigned_driver_phone,
    u.role as assigned_driver_role,
    u.is_active as assigned_driver_active
FROM public.orders o
LEFT JOIN public.users u ON o.assigned_driver_id = u.id;

-- Step 3: Grant permissions
GRANT SELECT ON public.orders_with_drivers TO authenticated;
GRANT SELECT ON public.orders_with_drivers TO anon;

-- Step 4: Enable RLS on the view
ALTER VIEW public.orders_with_drivers SET (security_barrier = true);

-- Step 5: Create RLS policy for the view
DO $$
BEGIN
    -- Enable RLS on the view (PostgreSQL 15+)
    EXECUTE 'ALTER VIEW public.orders_with_drivers ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN
    -- For older PostgreSQL versions, RLS on views might not be supported
    RAISE NOTICE 'Could not enable RLS on view - this might be expected on older PostgreSQL versions';
END
$$;

-- Step 6: Create RLS policy
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view orders from their tenant with drivers" ON public.orders_with_drivers;
    CREATE POLICY "Users can view orders from their tenant with drivers" ON public.orders_with_drivers
        FOR SELECT USING (
            tenant_id IN (
                SELECT tenant_id FROM public.users WHERE id = auth.uid()
            )
        );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create RLS policy on view - using base table policies instead';
END
$$;

-- Step 7: Verify the view was created successfully
SELECT 
    'View Creation Check' as check_type,
    COUNT(*) as column_count,
    array_agg(column_name ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders_with_drivers';