-- Migration script to fix the "column user_id does not exist" error
-- Run this FIRST in your Supabase SQL Editor before running the main schema

-- Step 1: Add missing columns to orders table if they don't exist
DO $$ 
BEGIN
    -- Add assigned_driver_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'assigned_driver_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN assigned_driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add driver location columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'driver_location_lat'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN driver_location_lat DECIMAL(10, 8);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'driver_location_lng'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN driver_location_lng DECIMAL(11, 8);
    END IF;

    -- Add activated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'activated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN activated_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Update status check constraint to include 'active'
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN ('pending', 'preparing', 'ready', 'active', 'delivered', 'cancelled'));
END $$;

-- Step 2: Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'driver' CHECK (role IN ('admin', 'staff', 'manager', 'driver')),
    tenant_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create map_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.map_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_id ON public.orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_map_locations_order_id ON public.map_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_map_locations_user_id ON public.map_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_map_locations_created_at ON public.map_locations(created_at DESC);

-- Step 5: Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_locations ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop and recreate policies for orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

CREATE POLICY "Users can view own orders and assigned orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_driver_id);

CREATE POLICY "Users can update own orders and assigned orders" ON public.orders
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = assigned_driver_id);

-- Step 7: Create policies for new tables
CREATE POLICY IF NOT EXISTS "Users can view own user record" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own user record" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can view other users for order assignment" ON public.users
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can view map locations for their orders" ON public.map_locations
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = map_locations.order_id 
            AND (orders.user_id = auth.uid() OR orders.assigned_driver_id = auth.uid())
        )
    );

CREATE POLICY IF NOT EXISTS "Users can insert their own location data" ON public.map_locations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 8: Update the user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile record
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
    ) ON CONFLICT (id) DO NOTHING;
    
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

-- Step 9: Create updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_users ON public.users;
CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMIT;