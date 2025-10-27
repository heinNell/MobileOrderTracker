-- Safe Migration Script - Add missing columns to existing database
-- Run this in your Supabase SQL Editor FIRST

-- First, let's see what we're working with
SELECT 
    'Current orders table structure:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Step 1: Add missing columns to orders table if they don't exist
DO $$ 
BEGIN
    -- Check and add assigned_driver_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'assigned_driver_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN assigned_driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added assigned_driver_id column to orders table';
    ELSE
        RAISE NOTICE 'assigned_driver_id column already exists';
    END IF;

    -- Check and add driver location columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'driver_location_lat'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN driver_location_lat DECIMAL(10, 8);
        RAISE NOTICE 'Added driver_location_lat column to orders table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'driver_location_lng'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN driver_location_lng DECIMAL(11, 8);
        RAISE NOTICE 'Added driver_location_lng column to orders table';
    END IF;

    -- Check and add activated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'activated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN activated_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added activated_at column to orders table';
    END IF;
END $$;

-- Step 2: Update status constraint to include 'active' if needed
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    
    -- Add updated constraint
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'preparing', 'ready', 'active', 'delivered', 'cancelled'));
    
    RAISE NOTICE 'Updated status constraint to include active status';
END $$;

-- Step 3: Create users table if it doesn't exist (for driver functionality)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'driver' CHECK (role IN ('admin', 'staff', 'manager', 'driver')),
    tenant_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create map_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.map_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_id ON public.orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_map_locations_order_id ON public.map_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_map_locations_user_id ON public.map_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_map_locations_created_at ON public.map_locations(created_at DESC);

-- Step 6: Enable RLS on new tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_locations ENABLE ROW LEVEL SECURITY;

-- Step 7: Add user_id column if it doesn't exist and update RLS policies
DO $$ 
BEGIN
    -- Check and add user_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to orders table';
    ELSE
        RAISE NOTICE 'user_id column already exists';
    END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own orders and assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders and assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete own orders" ON public.orders;

-- Create updated policies that work with both user_id and assigned_driver_id
CREATE POLICY "Users can view own orders and assigned orders" ON public.orders
    FOR SELECT USING (
        (user_id IS NOT NULL AND auth.uid() = user_id) OR 
        (assigned_driver_id IS NOT NULL AND auth.uid() = assigned_driver_id)
    );

CREATE POLICY "Users can update own orders and assigned orders" ON public.orders
    FOR UPDATE USING (
        (user_id IS NOT NULL AND auth.uid() = user_id) OR 
        (assigned_driver_id IS NOT NULL AND auth.uid() = assigned_driver_id)
    );

CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders" ON public.orders
    FOR DELETE USING (auth.uid() = user_id);

-- Step 8: Create policies for new tables (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own user record" ON public.users;
DROP POLICY IF EXISTS "Users can update own user record" ON public.users;
DROP POLICY IF EXISTS "Users can view other users for order assignment" ON public.users;
DROP POLICY IF EXISTS "Users can view map locations for their orders" ON public.map_locations;
DROP POLICY IF EXISTS "Users can insert their own location data" ON public.map_locations;

CREATE POLICY "Users can view own user record" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own user record" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view other users for order assignment" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can view map locations for their orders" ON public.map_locations
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = map_locations.order_id 
            AND (orders.user_id = auth.uid() OR orders.assigned_driver_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert their own location data" ON public.map_locations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 9: Create or update user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user record for driver functionality
    INSERT INTO public.users (id, email, full_name, role, tenant_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'driver'),
        COALESCE(NEW.raw_user_meta_data->>'tenant_id', 'default')
    ) ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verification query - run this to check everything is working
SELECT 
    'Migration Complete!' as status,
    'Check the results below:' as next_step;

-- Check that all required columns exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
AND column_name IN ('user_id', 'assigned_driver_id', 'driver_location_lat', 'driver_location_lng', 'activated_at')
ORDER BY table_name, column_name;