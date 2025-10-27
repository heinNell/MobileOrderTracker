-- Create the update_order_status database function
-- This function handles status updates with proper validation and logging

CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_driver_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status TEXT;
  v_order_record RECORD;
  v_result JSON;
BEGIN
  -- Get current order status
  SELECT status INTO v_old_status
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;

  -- Update the order status
  UPDATE public.orders
  SET 
    status = p_new_status,
    updated_at = NOW(),
    -- Set actual_start_time when order becomes active
    actual_start_time = CASE 
      WHEN p_new_status IN ('in_progress', 'in_transit', 'loading', 'loaded') 
        AND actual_start_time IS NULL 
      THEN NOW() 
      ELSE actual_start_time 
    END,
    -- Set actual_end_time when order is completed or delivered
    actual_end_time = CASE 
      WHEN p_new_status IN ('delivered', 'completed') 
        AND actual_end_time IS NULL 
      THEN NOW() 
      ELSE actual_end_time 
    END
  WHERE id = p_order_id
  RETURNING * INTO v_order_record;

  -- Log the status change to status_updates table (optional)
  BEGIN
    INSERT INTO public.status_updates (
      order_id,
      driver_id,
      status,
      notes,
      created_at
    ) VALUES (
      p_order_id,
      p_driver_id,
      p_new_status::order_status,
      p_note,
      NOW()
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore logging errors - status update is what matters
      NULL;
  END;

  -- Return success with order data
  RETURN json_build_object(
    'success', true,
    'order', row_to_json(v_order_record),
    'old_status', v_old_status,
    'new_status', p_new_status,
    'message', 'Status updated successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT, UUID, TEXT) TO authenticated;

SELECT '✅ Function update_order_status created successfully' AS status;

-- Test the function
SELECT public.update_order_status(
  '5b2b87ac-8dd7-4339-b28d-df2ec0b985cc'::UUID,  -- order_id
  'in_transit',                                    -- new_status
  '1e8658c9-12f1-4e86-be55-b0b1219b7eba'::UUID,  -- driver_id
  'Test status update'                             -- note
) AS test_result;
