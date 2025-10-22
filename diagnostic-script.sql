-- Comprehensive Diagnostic Script for Order Retrieval Issues
-- Run this script to diagnose database connectivity and data visibility issues

-- 1. Check if users are properly linked to tenants
SELECT 
    'User-Tenant Linkage' as check_type,
        u.id,
            u.email,
                u.full_name,
                    u.role,
                        u.tenant_id,
                            t.name as tenant_name,
                                u.is_active
                                FROM auth.users au
                                LEFT JOIN public.users u ON au.id = u.id
                                LEFT JOIN public.tenants t ON u.tenant_id = t.id
                                ORDER BY u.created_at DESC
                                LIMIT 10;

                                -- 2. Check if orders exist and their tenant associations
                                SELECT 
                                    'Order-Tenant Association' as check_type,
                                        o.id,
                                            o.order_number,
                                                o.status,
                                                    o.tenant_id,
                                                        t.name as tenant_name,
                                                            o.assigned_driver_id,
                                                                u.full_name as driver_name,
                                                                    o.created_at
                                                                    FROM public.orders o
                                                                    LEFT JOIN public.tenants t ON o.tenant_id = t.id
                                                                    LEFT JOIN public.users u ON o.assigned_driver_id = u.id
                                                                    ORDER BY o.created_at DESC
                                                                    LIMIT 10;

                                                                    -- 3. Check if current authenticated user can see orders
                                                                    SELECT 
                                                                        'User Order Visibility' as check_type,
                                                                            COUNT(*) as visible_orders,
                                                                                auth.uid() as current_user_id
                                                                                FROM public.orders o
                                                                                WHERE EXISTS (
                                                                                    SELECT 1 FROM public.users u 
                                                                                        WHERE u.id = auth.uid() 
                                                                                            AND u.tenant_id = o.tenant_id
                                                                                            );

                                                                                            -- 4. Check RLS policies status
                                                                                            SELECT 
                                                                                                'RLS Status' as check_type,
                                                                                                    schemaname,
                                                                                                        tablename,
                                                                                                            rowsecurity,
                                                                                                                forcerlsforall
                                                                                                                FROM pg_tables t
                                                                                                                LEFT JOIN pg_class c ON c.relname = t.tablename
                                                                                                                LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
                                                                                                                WHERE t.schemaname = 'public' 
                                                                                                                AND t.tablename IN ('users', 'orders', 'tenants')
                                                                                                                ORDER BY tablename;

                                                                                                                -- 5. Check if there are any orphaned orders (orders without valid tenant)
                                                                                                                SELECT 
                                                                                                                    'Orphaned Orders' as check_type,
                                                                                                                        COUNT(*) as orphaned_count
                                                                                                                        FROM public.orders o
                                                                                                                        LEFT JOIN public.tenants t ON o.tenant_id = t.id
                                                                                                                        WHERE t.id IS NULL;

                                                                                                                        -- 6. Check if current user exists in users table
                                                                                                                        SELECT 
                                                                                                                            'Current User Status' as check_type,
                                                                                                                                CASE 
                                                                                                                                        WHEN u.id IS NOT NULL THEN 'User exists in users table'
                                                                                                                                                ELSE 'User missing from users table'
                                                                                                                                                    END as status,
                                                                                                                                                        auth.uid() as auth_user_id,
                                                                                                                                                            u.id as users_table_id,
                                                                                                                                                                u.tenant_id,
                                                                                                                                                                    u.role
                                                                                                                                                                    FROM public.users u
                                                                                                                                                                    RIGHT JOIN (SELECT auth.uid() as id) auth_user ON u.id = auth_user.id;

                                                                                                                                                                    -- 7. Check tenant status
                                                                                                                                                                    SELECT 
                                                                                                                                                                        'Tenant Status' as check_type,
                                                                                                                                                                            id,
                                                                                                                                                                                name,
                                                                                                                                                                                    is_active,
                                                                                                                                                                                        created_at,
                                                                                                                                                                                            (SELECT COUNT(*) FROM public.users WHERE tenant_id = t.id) as user_count,
                                                                                                                                                                                                (SELECT COUNT(*) FROM public.orders WHERE tenant_id = t.id) as order_count
                                                                                                                                                                                                FROM public.tenants t
                                                                                                                                                                                                ORDER BY created_at DESC;