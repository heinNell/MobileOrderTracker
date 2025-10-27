-- COMPLETE LIVE MAP & TRACKING SYSTEM FIX
-- This creates the full system for automatic driver tracking
-- Run this in your Supabase SQL Editor

-- Step 1: Fix map_locations table structure (remove NOT NULL constraint on name)
ALTER TABLE public.map_locations ALTER COLUMN name DROP NOT NULL;

-- Step 2: Create the driver_locations table that dashboard expects
CREATE TABLE IF NOT EXISTS public.driver_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5,2),
    heading DECIMAL(5,2), 
    accuracy DECIMAL(8,2),
    altitude DECIMAL(8,2),
    is_active BOOLEAN DEFAULT TRUE,
    location_source TEXT DEFAULT 'mobile_app',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id ON public.driver_locations(order_id); 
CREATE INDEX IF NOT EXISTS idx_driver_locations_created_at ON public.driver_locations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_active ON public.driver_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_order ON public.driver_locations(driver_id, order_id);

-- Step 4: Enable RLS on driver_locations
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for driver_locations
DROP POLICY IF EXISTS "Users can view driver locations" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can insert own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can update own location" ON public.driver_locations;

CREATE POLICY "Users can view driver locations" ON public.driver_locations
    FOR SELECT USING (
        -- Drivers can see their own locations
        auth.uid() = driver_id OR 
        -- Users can see locations for their orders
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = driver_locations.order_id 
            AND (orders.user_id = auth.uid() OR orders.assigned_driver_id = auth.uid())
        ) OR
        -- Admin/staff can see all locations
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'staff', 'manager')
        )
    );

CREATE POLICY "Drivers can insert own location" ON public.driver_locations
    FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own location" ON public.driver_locations
    FOR UPDATE USING (auth.uid() = driver_id);

-- Step 6: Create function for automatic order activation when driver is assigned
CREATE OR REPLACE FUNCTION auto_activate_assigned_order()
RETURNS TRIGGER AS $$
BEGIN
    -- If assigned_driver_id is being set and order isn't already active
    IF NEW.assigned_driver_id IS NOT NULL 
       AND (OLD.assigned_driver_id IS NULL OR OLD.assigned_driver_id != NEW.assigned_driver_id)
       AND NEW.status NOT IN ('active', 'completed', 'cancelled') THEN
        
        -- Auto-activate the order
        NEW.status = 'active';
        NEW.activated_at = NOW();
        NEW.updated_at = NOW();
        
        RAISE NOTICE 'Auto-activated order % for driver %', NEW.id, NEW.assigned_driver_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for auto-activation
DROP TRIGGER IF EXISTS trigger_auto_activate_on_assignment ON public.orders;
CREATE TRIGGER trigger_auto_activate_on_assignment
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_activate_assigned_order();

-- Step 8: Create function to sync location data between tables
CREATE OR REPLACE FUNCTION sync_location_data()
RETURNS TRIGGER AS $$
BEGIN
    -- When location is inserted into driver_locations, also update orders table
    IF NEW.order_id IS NOT NULL THEN
        UPDATE public.orders 
        SET 
            driver_location_lat = NEW.latitude,
            driver_location_lng = NEW.longitude,
            updated_at = NOW()
        WHERE id = NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for location sync
DROP TRIGGER IF EXISTS trigger_sync_order_location ON public.driver_locations;
CREATE TRIGGER trigger_sync_order_location
    AFTER INSERT ON public.driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION sync_location_data();

-- Step 10: Create view for live tracking dashboard
CREATE OR REPLACE VIEW live_driver_tracking AS
SELECT 
    dl.id,
    dl.driver_id,
    u.full_name as driver_name,
    u.email as driver_email,
    u.role as driver_role,
    dl.order_id,
    o.order_number,
    o.status as order_status,
    o.customer_name,
    o.delivery_address,
    dl.latitude,
    dl.longitude,
    dl.speed,
    dl.heading,
    dl.accuracy,
    dl.created_at as location_time,
    dl.updated_at,
    -- Calculate time since last update
    EXTRACT(EPOCH FROM (NOW() - dl.created_at)) as seconds_since_update,
    -- Determine if location is recent (within 5 minutes)
    (dl.created_at > NOW() - INTERVAL '5 minutes') as is_recent,
    -- Determine if driver is currently active
    dl.is_active
FROM public.driver_locations dl
JOIN public.users u ON u.id = dl.driver_id
LEFT JOIN public.orders o ON o.id = dl.order_id
WHERE dl.is_active = true
ORDER BY dl.created_at DESC;

-- Step 11: Grant permissions
GRANT SELECT ON live_driver_tracking TO authenticated;
GRANT ALL ON public.driver_locations TO authenticated;

-- Step 12: Add is_active column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'is_active'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added is_active column to users table';
    ELSE
        RAISE NOTICE 'is_active column already exists in users table';
    END IF;
END $$;

-- Step 13: Create function to automatically start tracking on login
CREATE OR REPLACE FUNCTION start_tracking_on_active_order()
RETURNS TRIGGER AS $$
BEGIN
    -- When a driver logs in (user record updated), check for active orders
    IF NEW.updated_at > OLD.updated_at THEN
        -- Insert a placeholder location to trigger tracking
        INSERT INTO public.driver_locations (
            driver_id,
            order_id,
            latitude,
            longitude,
            location_source,
            is_active
        )
        SELECT 
            NEW.id,
            o.id,
            COALESCE(o.driver_location_lat, 0),
            COALESCE(o.driver_location_lng, 0),
            'auto_start',
            true
        FROM public.orders o
        WHERE o.assigned_driver_id = NEW.id
        AND o.status = 'active'
        AND NOT EXISTS (
            SELECT 1 FROM public.driver_locations dl
            WHERE dl.driver_id = NEW.id
            AND dl.order_id = o.id
            AND dl.created_at > NOW() - INTERVAL '1 hour'
        )
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Create trigger for auto-start tracking
DROP TRIGGER IF EXISTS trigger_start_tracking_on_login ON public.users;
CREATE TRIGGER trigger_start_tracking_on_login
    AFTER UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION start_tracking_on_active_order();

-- Step 15: Create real-time subscription setup
CREATE OR REPLACE FUNCTION setup_realtime_tracking()
RETURNS TEXT AS $$
BEGIN
    -- Enable real-time for critical tables
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations';
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
    
    RETURN 'Real-time tracking enabled for driver_locations and orders tables';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Note: Run this manually in Supabase Dashboard: Settings > API > Realtime';
END;
$$ LANGUAGE plpgsql;

-- Try to enable realtime (may need manual setup)
SELECT setup_realtime_tracking();

-- Verification and status check
SELECT 'LIVE MAP SYSTEM SETUP COMPLETE!' as status;

-- Check system status
SELECT 
    'System Status:' as info,
    (SELECT COUNT(*) FROM public.driver_locations WHERE is_active = true) as active_drivers,
    (SELECT COUNT(*) FROM public.orders WHERE assigned_driver_id IS NOT NULL) as assigned_orders,
    (SELECT COUNT(*) FROM public.orders WHERE status = 'active') as active_orders;

-- Show sample data for testing
SELECT 
    'Recent driver locations (last 1 hour):' as info,
    COUNT(*) as total_locations
FROM public.driver_locations 
WHERE created_at > NOW() - INTERVAL '1 hour';