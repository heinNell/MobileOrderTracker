-- Solution Script: Fix Order Retrieval and QR Code Issues
-- This script will create the necessary data and fix common issues

-- Step 1: Ensure we have a default tenant
INSERT INTO public.tenants (name, subdomain, is_active)
VALUES ('Default Organization', 'default', true)
ON CONFLICT (subdomain) DO NOTHING;

-- Step 2: Get the default tenant ID for reference
DO $$
DECLARE
    default_tenant_id UUID;
BEGIN
    SELECT id INTO default_tenant_id FROM public.tenants WHERE subdomain = 'default' LIMIT 1;
    
    -- Step 3: Ensure current authenticated user exists in users table
    INSERT INTO public.users (
        id, 
        email, 
        full_name, 
        role, 
        tenant_id,
        is_active
    )
    SELECT 
        auth.uid(),
        COALESCE(au.email, 'user@example.com'),
        COALESCE(au.raw_user_meta_data->>'full_name', 'Test User'),
        'admin',
        default_tenant_id,
        true
    FROM auth.users au 
    WHERE au.id = auth.uid()
    ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        role = EXCLUDED.role,
        is_active = true,
        updated_at = NOW();
        
    RAISE NOTICE 'User setup completed for tenant: %', default_tenant_id;
END $$;

-- Step 4: Create a test order if none exist
INSERT INTO public.orders (
    tenant_id,
    order_number,
    qr_code_data,
    qr_code_signature,
    status,
    loading_point_name,
    loading_point_address,
    loading_point_location,
    unloading_point_name,
    unloading_point_address,
    unloading_point_location,
    sku,
    estimated_distance_km,
    estimated_duration_minutes,
    created_by
)
SELECT 
    t.id,
    'TEST-ORDER-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'test-qr-data-' || uuid_generate_v4()::TEXT,
    'pending',
    'pending',
    'Test Warehouse',
    '123 Warehouse Street, Industrial Area',
    ST_SetSRID(ST_MakePoint(28.0473, -26.2041), 4326),
    'Customer Location',
    '456 Customer Avenue, Business District',
    ST_SetSRID(ST_MakePoint(28.2293, -25.7479), 4326),
    'TEST-SKU-001',
    25.5,
    45,
    u.id
FROM public.tenants t
CROSS JOIN public.users u
WHERE t.subdomain = 'default' 
AND u.id = auth.uid()
AND NOT EXISTS (
    SELECT 1 FROM public.orders 
    WHERE tenant_id = t.id 
    AND created_by = u.id
)
LIMIT 1;

-- Step 5: Verify the setup
SELECT 
    'Setup Verification' as check_type,
    (SELECT COUNT(*) FROM public.tenants WHERE is_active = true) as active_tenants,
    (SELECT COUNT(*) FROM public.users WHERE tenant_id IS NOT NULL) as users_with_tenant,
    (SELECT COUNT(*) FROM public.orders) as total_orders,
    (SELECT COUNT(*) FROM public.orders WHERE tenant_id IN (
        SELECT t.id FROM public.tenants t 
        JOIN public.users u ON u.tenant_id = t.id 
        WHERE u.id = auth.uid()
    )) as visible_orders_to_current_user;