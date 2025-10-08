-- Migration: Driver Allocation and Load Activation System
-- Date: 2025-10-08
-- Description: Adds driver allocation, load activation, and QR code management capabilities

-- ============================================================================
-- 1. QR CODES TABLE
-- ============================================================================
-- Stores QR codes generated for orders
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    qr_code_data TEXT NOT NULL, -- Encrypted payload
    qr_code_image_url TEXT, -- Public URL to QR image in Supabase Storage
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    scanned_at TIMESTAMPTZ,
    scanned_by UUID REFERENCES public.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(order_id) -- One QR code per order
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_order_id ON public.qr_codes(order_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at ON public.qr_codes(expires_at);

-- ============================================================================
-- 2. LOAD ACTIVATIONS TABLE
-- ============================================================================
-- Audit trail for load activations
CREATE TABLE IF NOT EXISTS public.load_activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.users(id),
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    location GEOGRAPHY(POINT, 4326), -- PostGIS point for location
    location_address TEXT,
    device_info JSONB DEFAULT '{}'::jsonb, -- Device metadata (app version, OS, etc.)
    notes TEXT,
    UNIQUE(order_id) -- One activation per order
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_load_activations_order_id ON public.load_activations(order_id);
CREATE INDEX IF NOT EXISTS idx_load_activations_driver_id ON public.load_activations(driver_id);
CREATE INDEX IF NOT EXISTS idx_load_activations_activated_at ON public.load_activations(activated_at);
CREATE INDEX IF NOT EXISTS idx_load_activations_location ON public.load_activations USING GIST(location);

-- ============================================================================
-- 3. ALTER ORDERS TABLE
-- ============================================================================
-- Add new columns for driver allocation and load activation

-- Add assigned_driver_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'assigned_driver_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN assigned_driver_id UUID REFERENCES public.users(id);
    END IF;
END $$;

-- Add load_activated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'load_activated_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN load_activated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add load_activated_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'load_activated_by'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN load_activated_by UUID REFERENCES public.users(id);
    END IF;
END $$;

-- Add qr_code_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'qr_code_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN qr_code_id UUID REFERENCES public.qr_codes(id);
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_id ON public.orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_load_activated_at ON public.orders(load_activated_at);
CREATE INDEX IF NOT EXISTS idx_orders_qr_code_id ON public.orders(qr_code_id);

-- ============================================================================
-- 4. UPDATE ORDER STATUS ENUM (if needed)
-- ============================================================================
-- Ensure order statuses include all workflow states
DO $$
BEGIN
    -- Check if the status column exists and update constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'status'
    ) THEN
        -- Drop existing constraint if it exists
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
        
        -- Add new constraint with all statuses
        ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
        CHECK (status IN (
            'created', 
            'assigned', 
            'activated', 
            'in_progress', 
            'picked_up',
            'in_transit',
            'delivered', 
            'completed',
            'cancelled',
            'failed'
        ));
    END IF;
END $$;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_activations ENABLE ROW LEVEL SECURITY;

-- QR Codes Policies
-- Admins can do everything
CREATE POLICY "Admins can manage all qr_codes" ON public.qr_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Drivers can view QR codes for their assigned orders
CREATE POLICY "Drivers can view their order qr_codes" ON public.qr_codes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = qr_codes.order_id
            AND orders.assigned_driver_id = auth.uid()
        )
    );

-- Drivers can update QR code scan status for their orders
CREATE POLICY "Drivers can update scan status for their orders" ON public.qr_codes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = qr_codes.order_id
            AND orders.assigned_driver_id = auth.uid()
        )
    );

-- Load Activations Policies
-- Admins can view all activations
CREATE POLICY "Admins can view all load_activations" ON public.load_activations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Drivers can view their own activations
CREATE POLICY "Drivers can view their load_activations" ON public.load_activations
    FOR SELECT
    USING (driver_id = auth.uid());

-- Drivers can create activations for their assigned orders
CREATE POLICY "Drivers can create load_activations for their orders" ON public.load_activations
    FOR INSERT
    WITH CHECK (
        driver_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = load_activations.order_id
            AND orders.assigned_driver_id = auth.uid()
        )
    );

-- Update existing orders RLS policies to include assigned driver access
-- Drop existing driver policies if they exist
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON public.orders;

-- Create new policy for drivers to view their assigned orders
CREATE POLICY "Drivers can view assigned orders" ON public.orders
    FOR SELECT
    USING (
        assigned_driver_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Drivers can update their assigned orders (for status changes)
DROP POLICY IF EXISTS "Drivers can update assigned orders" ON public.orders;

CREATE POLICY "Drivers can update assigned orders" ON public.orders
    FOR UPDATE
    USING (
        assigned_driver_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update order status when load is activated
CREATE OR REPLACE FUNCTION public.update_order_on_load_activation()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.orders
    SET 
        status = 'activated',
        load_activated_at = NEW.activated_at,
        load_activated_by = NEW.driver_id,
        updated_at = NOW()
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update order when load is activated
DROP TRIGGER IF EXISTS trigger_update_order_on_load_activation ON public.load_activations;

CREATE TRIGGER trigger_update_order_on_load_activation
    AFTER INSERT ON public.load_activations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_order_on_load_activation();

-- Function to validate driver can activate load
CREATE OR REPLACE FUNCTION public.validate_load_activation()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if driver is assigned to the order
    IF NOT EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = NEW.order_id
        AND assigned_driver_id = NEW.driver_id
    ) THEN
        RAISE EXCEPTION 'Driver % is not assigned to order %', NEW.driver_id, NEW.order_id;
    END IF;
    
    -- Check if order status allows activation
    IF EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = NEW.order_id
        AND status NOT IN ('created', 'assigned')
    ) THEN
        RAISE EXCEPTION 'Order % cannot be activated in current status', NEW.order_id;
    END IF;
    
    -- Check if load is already activated
    IF EXISTS (
        SELECT 1 FROM public.load_activations
        WHERE order_id = NEW.order_id
    ) THEN
        RAISE EXCEPTION 'Load for order % is already activated', NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to validate before activation
DROP TRIGGER IF EXISTS trigger_validate_load_activation ON public.load_activations;

CREATE TRIGGER trigger_validate_load_activation
    BEFORE INSERT ON public.load_activations
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_load_activation();

-- Function to auto-expire QR codes
CREATE OR REPLACE FUNCTION public.expire_old_qr_codes()
RETURNS void AS $$
BEGIN
    UPDATE public.qr_codes
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.qr_codes TO authenticated;
GRANT SELECT, INSERT ON public.load_activations TO authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.qr_codes IS 'Stores QR codes generated for orders';
COMMENT ON TABLE public.load_activations IS 'Audit trail for load activations by drivers';
COMMENT ON COLUMN public.orders.assigned_driver_id IS 'Driver assigned to this order';
COMMENT ON COLUMN public.orders.load_activated_at IS 'Timestamp when load was activated';
COMMENT ON COLUMN public.orders.load_activated_by IS 'Driver who activated the load';
COMMENT ON COLUMN public.orders.qr_code_id IS 'Reference to the QR code for this order';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
