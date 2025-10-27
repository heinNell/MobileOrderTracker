-- Complete fix for status update function
-- This creates the enum type and fixes the function conflict

-- First, create the order_status_enum type if it doesn't exist
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

-- Create the definitive function that works with existing schema
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
    v_result jsonb;
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
    
    -- Update order status (use text directly, let PostgreSQL handle the conversion)
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
    
    -- Return success response
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text, uuid, text) TO service_role;

-- Also create a simple fallback function for direct updates
CREATE OR REPLACE FUNCTION public.simple_status_update(
    order_id_param uuid,
    new_status_param text,
    driver_id_param uuid,
    note_param text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the order
    UPDATE orders 
    SET 
        status = new_status_param,
        updated_at = now()
    WHERE id = order_id_param AND assigned_driver_id = driver_id_param;
    
    -- Insert status update record
    IF FOUND THEN
        INSERT INTO status_updates (
            order_id,
            driver_id,
            status,
            notes,
            created_at
        ) VALUES (
            order_id_param,
            driver_id_param,
            new_status_param,
            COALESCE(note_param, 'Status updated to ' || new_status_param),
            now()
        );
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Grant permissions for fallback function
GRANT EXECUTE ON FUNCTION public.simple_status_update(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_status_update(uuid, text, uuid, text) TO service_role;
