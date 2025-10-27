-- Fix update_order_status function overload conflict
-- This resolves the PostgreSQL function ambiguity error

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS public.update_order_status(p_driver_id text, p_new_status text, p_note text, p_order_id integer);
DROP FUNCTION IF EXISTS public.update_order_status(p_order_id uuid, p_new_status text, p_driver_id uuid, p_note text);
DROP FUNCTION IF EXISTS public.update_order_status(text, text, text, integer);
DROP FUNCTION IF EXISTS public.update_order_status(uuid, text, uuid, text);

-- Create single, definitive version with proper UUID types
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
    
    -- Update order status
    UPDATE orders 
    SET 
        status = p_new_status::order_status_enum,
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
        p_new_status::order_status_enum,
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

-- Create a simpler fallback function for direct status updates
CREATE OR REPLACE FUNCTION public.simple_update_order_status(
    order_id_param uuid,
    new_status_param text,
    driver_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE orders 
    SET 
        status = new_status_param::order_status_enum,
        updated_at = now()
    WHERE id = order_id_param AND assigned_driver_id = driver_id_param;
    
    RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.simple_update_order_status(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_update_order_status(uuid, text, uuid) TO service_role;
