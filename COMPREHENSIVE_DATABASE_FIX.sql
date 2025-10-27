-- COMPREHENSIVE DATABASE FIX
-- Fixes status update functions AND driver creation issues

-- ===========================================
-- PART 1: Fix Status Update Function Issues
-- ===========================================

-- Create the order_status_enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
        CREATE TYPE order_status_enum AS ENUM (
            'pending',
            'assigned', 
            'activated',
            'in_progress',
            'in_transit',
            'arrived',
            'arrived_at_loading_point',
            'loading',
            'loaded',
            'arrived_at_unloading_point', 
            'unloading',
            'delivered',
            'completed',
            'cancelled'
        );
    END IF;
END $$;

-- Drop all existing conflicting functions
DROP FUNCTION IF EXISTS public.update_order_status(p_driver_id text, p_new_status text, p_note text, p_order_id integer);
DROP FUNCTION IF EXISTS public.update_order_status(p_order_id uuid, p_new_status text, p_driver_id uuid, p_note text);
DROP FUNCTION IF EXISTS public.update_order_status(text, text, text, integer);
DROP FUNCTION IF EXISTS public.update_order_status(uuid, text, uuid, text);

-- Create the definitive status update function
CREATE OR REPLACE FUNCTION public.update_order_status(
    p_order_id uuid,
    p_new_status text,
    p_driver_id uuid,
    p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_status text;
    v_updated_order jsonb;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status 
    FROM orders 
    WHERE id = p_order_id AND assigned_driver_id = p_driver_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found or driver not authorized'
        );
    END IF;
    
    -- Update order status
    UPDATE orders 
    SET 
        status = p_new_status,
        updated_at = now()
    WHERE id = p_order_id AND assigned_driver_id = p_driver_id
    RETURNING to_jsonb(orders.*) INTO v_updated_order;
    
    -- Insert status update record
    INSERT INTO status_updates (
        order_id,
        driver_id,
        status,
        notes,
        created_at
    ) VALUES (
        p_order_id,
        p_driver_id,
        p_new_status,
        COALESCE(p_note, 'Status updated to ' || p_new_status),
        now()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'order', v_updated_order,
        'old_status', v_old_status,
        'new_status', p_new_status,
        'message', 'Status updated successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant permissions for status update function
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text, uuid, text) TO service_role;

-- ===========================================
-- PART 2: Fix Driver Locations Table Schema
-- ===========================================

-- Add missing location_source column to driver_locations table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_locations' 
        AND column_name = 'location_source'
    ) THEN
        ALTER TABLE driver_locations 
        ADD COLUMN location_source text DEFAULT 'gps';
    END IF;
END $$;

-- Add other potentially missing columns to driver_locations table
DO $$ 
BEGIN
    -- Add accuracy column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_locations' 
        AND column_name = 'accuracy'
    ) THEN
        ALTER TABLE driver_locations 
        ADD COLUMN accuracy numeric;
    END IF;
    
    -- Add speed column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_locations' 
        AND column_name = 'speed'
    ) THEN
        ALTER TABLE driver_locations 
        ADD COLUMN speed numeric;
    END IF;
    
    -- Add heading column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_locations' 
        AND column_name = 'heading'
    ) THEN
        ALTER TABLE driver_locations 
        ADD COLUMN heading numeric;
    END IF;
    
    -- Add timestamp column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_locations' 
        AND column_name = 'timestamp'
    ) THEN
        ALTER TABLE driver_locations 
        ADD COLUMN timestamp timestamptz DEFAULT now();
    END IF;
END $$;

-- ===========================================
-- PART 3: Fix Driver Profile Creation
-- ===========================================

-- Create or update the sync_user_from_auth function to handle driver creation properly
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert into profiles table
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'driver'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = NEW.email,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth
        RAISE WARNING 'Failed to sync user profile: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS sync_user_from_auth_trigger ON auth.users;
CREATE TRIGGER sync_user_from_auth_trigger
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_from_auth();

-- ===========================================
-- PART 4: Create Enhanced Driver Creation Function
-- ===========================================

-- Create a robust driver creation function
CREATE OR REPLACE FUNCTION public.create_driver_account(
    p_email text,
    p_password text,
    p_full_name text,
    p_phone text DEFAULT NULL,
    p_license_number text DEFAULT NULL,
    p_license_expiry date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_result jsonb;
BEGIN
    -- Create auth user
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        confirmation_token,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object(
            'full_name', p_full_name,
            'role', 'driver'
        ),
        '',
        '',
        ''
    )
    RETURNING id INTO v_user_id;
    
    -- Create profile record
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        phone,
        license_number,
        license_expiry,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_email,
        p_full_name,
        'driver',
        p_phone,
        p_license_number,
        p_license_expiry,
        NOW(),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'message', 'Driver account created successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant permissions for driver creation function
GRANT EXECUTE ON FUNCTION public.create_driver_account(text, text, text, text, text, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_driver_account(text, text, text, text, text, date) TO authenticated;

-- ===========================================
-- PART 5: Ensure Required Tables Exist
-- ===========================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text,
    role text DEFAULT 'driver',
    phone text,
    license_number text,
    license_expiry date,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- Create driver_locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.driver_locations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    accuracy numeric,
    speed numeric,
    heading numeric,
    location_source text DEFAULT 'gps',
    timestamp timestamptz DEFAULT NOW(),
    created_at timestamptz DEFAULT NOW()
);

-- ===========================================
-- PART 6: Set Up Proper RLS Policies
-- ===========================================

-- Enable RLS on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for driver_locations
DROP POLICY IF EXISTS "Drivers can insert their own locations" ON public.driver_locations;
CREATE POLICY "Drivers can insert their own locations" ON public.driver_locations
    FOR INSERT WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can view their own locations" ON public.driver_locations;
CREATE POLICY "Drivers can view their own locations" ON public.driver_locations
    FOR SELECT USING (auth.uid() = driver_id);

-- ===========================================
-- PART 7: Grant Necessary Permissions
-- ===========================================

-- Grant permissions on tables
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.driver_locations TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.driver_locations TO service_role;

-- Grant usage on sequences if they exist
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Final success message
SELECT 'Database schema fixed successfully' AS status;
