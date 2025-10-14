-- 🔍 CHECK CONSTRAINTS ON DRIVER_LOCATIONS TABLE
-- Run this to see what constraints exist

-- Check indexes and constraints
SELECT
    'Indexes and Constraints' as info,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'driver_locations' AND schemaname = 'public';

-- Check primary key and unique constraints
SELECT
    'Constraint Info' as info,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.driver_locations'
::regclass;

-- Check if there's a primary key on id
SELECT
    'Primary Key Check' as info,
    column_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'driver_locations'
    AND tc.table_schema = 'public'
    AND tc.constraint_type = 'PRIMARY KEY';

-- Show table structure with constraints
\d public.driver_locations;