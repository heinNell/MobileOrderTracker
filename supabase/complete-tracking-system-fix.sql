-- CRITICAL FIX: Live Map & Real-Time Tracking System
-- This enables full dashboard tracking functionality
-- Run this in your Supabase SQL Editor

-- Step 1: Fix map_locations table to remove NOT NULL constraint on name
ALTER TABLE public.map_locations ALTER COLUMN name DROP NOT NULL;

-- Step 2: Add any missing columns for comprehensive tracking
ALTER TABLE public.map_locations ADD COLUMN IF NOT EXISTS speed DECIMAL(5,2);
ALTER TABLE public.map_locations ADD COLUMN IF NOT EXISTS heading DECIMAL(5,2);
ALTER TABLE public.map_locations ADD COLUMN IF NOT EXISTS accuracy DECIMAL(8,2);
ALTER TABLE public.map_locations ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 3: Create driver_locations table for real-time tracking
CREATE TABLE IF NOT EXISTS public.driver_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5,2),
    heading DECIMAL(5,2),
    accuracy DECIMAL(8,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order_id ON public.driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_created_at ON public.driver_locations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_active ON public.driver_locations(is_active);

-- Step 5: Enable RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for driver_locations
DROP POLICY IF EXISTS "Users can view driver locations" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can insert own location" ON public.driver_locations;
DROP POLICY IF EXISTS "Drivers can update own location" ON public.driver_locations;

CREATE POLICY "Users can view driver locations" ON public.driver_locations
    FOR SELECT USING (
        auth.uid() = driver_id OR 
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = driver_locations.order_id 
            AND (orders.user_id = auth.uid() OR orders.assigned_driver_id = auth.uid())
        )
    );

CREATE POLICY "Drivers can insert own location" ON public.driver_locations
    FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own location" ON public.driver_locations
    FOR UPDATE USING (auth.uid() = driver_id);

-- Step 7: Create function for automatic order activation on driver assignment
CREATE OR REPLACE FUNCTION auto_activate_order_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- If assigned_driver_id is being set (not null) and order is not already active
    IF NEW.assigned_driver_id IS NOT NULL 
       AND OLD.assigned_driver_id IS NULL 
       AND NEW.status != 'active' THEN
        
        -- Automatically activate the order
        NEW.status = 'active';
        NEW.activated_at = NOW();
        NEW.updated_at = NOW();
        
        -- Insert order history record
        INSERT INTO public.order_history (order_id, status, changed_by, notes)
        VALUES (NEW.id, 'active', NEW.assigned_driver_id, 'Auto-activated on driver assignment');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for auto-activation
DROP TRIGGER IF EXISTS trigger_auto_activate_order ON public.orders;
CREATE TRIGGER trigger_auto_activate_order
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_activate_order_on_assignment();

-- Step 9: Create function to update driver location
CREATE OR REPLACE FUNCTION upsert_driver_location(
    p_driver_id UUID,
    p_order_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_speed DECIMAL DEFAULT NULL,
    p_heading DECIMAL DEFAULT NULL,
    p_accuracy DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    location_id UUID;
BEGIN
    -- Insert or update driver location
    INSERT INTO public.driver_locations (
        driver_id, order_id, latitude, longitude, speed, heading, accuracy, updated_at
    )
    VALUES (
        p_driver_id, p_order_id, p_latitude, p_longitude, p_speed, p_heading, p_accuracy, NOW()
    )
    ON CONFLICT (driver_id) DO UPDATE SET
        order_id = EXCLUDED.order_id,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        speed = EXCLUDED.speed,
        heading = EXCLUDED.heading,
        accuracy = EXCLUDED.accuracy,
        updated_at = NOW()
    RETURNING id INTO location_id;
    
    -- Also update the order with driver location
    IF p_order_id IS NOT NULL THEN
        UPDATE public.orders 
        SET 
            driver_location_lat = p_latitude,
            driver_location_lng = p_longitude,
            updated_at = NOW()
        WHERE id = p_order_id;
    END IF;
    
    RETURN location_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create real-time view for dashboard
CREATE OR REPLACE VIEW active_driver_tracking AS
SELECT 
    dl.id as location_id,
    dl.driver_id,
    u.full_name as driver_name,
    u.email as driver_email,
    dl.order_id,
    o.order_number,
    o.status as order_status,
    dl.latitude,
    dl.longitude,
    dl.speed,
    dl.heading,
    dl.accuracy,
    dl.updated_at as last_update,
    EXTRACT(EPOCH FROM (NOW() - dl.updated_at)) as seconds_since_update
FROM public.driver_locations dl
JOIN public.users u ON u.id = dl.driver_id
LEFT JOIN public.orders o ON o.id = dl.order_id
WHERE dl.is_active = true
  AND dl.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY dl.updated_at DESC;

-- Step 11: Grant permissions
GRANT SELECT ON active_driver_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_driver_location TO authenticated;

-- Verification queries
SELECT 'Database setup complete!' as status;

SELECT 
    'Active driver locations:' as info,
    COUNT(*) as total_locations
FROM public.driver_locations 
WHERE is_active = true;

SELECT 
    'Orders with assigned drivers:' as info,
    COUNT(*) as total_orders
FROM public.orders 
WHERE assigned_driver_id IS NOT NULL;