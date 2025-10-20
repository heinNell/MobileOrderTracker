-- Comprehensive Status Update System for Mobile Order Tracker
-- This file creates the complete database infrastructure for status updates

-- Ensure the order_status enum includes all required statuses
DROP TYPE IF EXISTS order_status CASCADE;
CREATE TYPE order_status AS ENUM (
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

-- Function to create status update and sync order table
CREATE OR REPLACE FUNCTION create_status_update_and_sync_order()
RETURNS TRIGGER AS $$
DECLARE
  driver_user_id uuid;
BEGIN
  -- Get the driver's auth.users ID from the orders table
  SELECT driver_id INTO driver_user_id 
  FROM orders 
  WHERE id = NEW.order_id;

  -- Insert status update record
  INSERT INTO status_updates (
    order_id,
    status,
    note,
    created_by,
    driver_id,
    created_at
  ) VALUES (
    NEW.order_id,
    NEW.status,
    COALESCE(NEW.metadata->>'status_note', 'Status updated'),
    driver_user_id,
    NEW.assigned_driver_id,
    NOW()
  );

  -- Update timestamps based on status
  CASE NEW.status
    WHEN 'activated' THEN
      NEW.load_activated_at = NOW();
      NEW.load_activated_by = NEW.assigned_driver_id;
    WHEN 'in_progress' THEN
      NEW.trip_start_time = COALESCE(NEW.trip_start_time, NOW());
      NEW.actual_start_time = COALESCE(NEW.actual_start_time, NOW());
      NEW.tracking_active = true;
    WHEN 'in_transit' THEN
      NEW.trip_start_time = COALESCE(NEW.trip_start_time, NOW());
      NEW.actual_start_time = COALESCE(NEW.actual_start_time, NOW());
      NEW.tracking_active = true;
    WHEN 'arrived_at_loading_point' THEN
      NEW.tracking_active = true;
    WHEN 'arrived_at_unloading_point' THEN
      NEW.tracking_active = true;
    WHEN 'delivered' THEN
      NEW.trip_end_time = NOW();
      NEW.actual_end_time = NOW();
    WHEN 'completed' THEN
      NEW.trip_end_time = COALESCE(NEW.trip_end_time, NOW());
      NEW.actual_end_time = COALESCE(NEW.actual_end_time, NOW());
      NEW.tracking_active = false;
    WHEN 'cancelled' THEN
      NEW.tracking_active = false;
    ELSE
      -- For other statuses, don't change timestamps
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status update logging
DROP TRIGGER IF EXISTS trigger_auto_status_update ON orders;
CREATE TRIGGER trigger_auto_status_update
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION create_status_update_and_sync_order();

-- Function to update order status with proper logging
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id uuid,
  p_new_status order_status,
  p_driver_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_order_record orders%ROWTYPE;
  v_old_status order_status;
  v_result json;
BEGIN
  -- Get current order status
  SELECT * INTO v_order_record FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;

  v_old_status := v_order_record.status::order_status;

  -- Validate status transition (basic validation)
  IF v_old_status = 'completed' OR v_old_status = 'cancelled' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot update status of completed or cancelled order'
    );
  END IF;

  -- Update order status
  UPDATE orders 
  SET 
    status = p_new_status,
    updated_at = NOW(),
    metadata = CASE 
      WHEN p_note IS NOT NULL THEN 
        COALESCE(metadata, '{}') || json_build_object('status_note', p_note)
      ELSE metadata
    END
  WHERE id = p_order_id;

  -- Manual status update record (if automatic trigger doesn't handle it)
  INSERT INTO status_updates (
    order_id,
    status,
    note,
    created_by,
    driver_id,
    created_at
  ) VALUES (
    p_order_id,
    p_new_status,
    COALESCE(p_note, 'Status updated manually'),
    p_driver_id,
    COALESCE(p_driver_id, v_order_record.assigned_driver_id),
    NOW()
  );

  -- Return success with updated order info
  SELECT row_to_json(orders.*) INTO v_result
  FROM orders 
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order', v_result,
    'old_status', v_old_status,
    'new_status', p_new_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get order status history
CREATE OR REPLACE FUNCTION get_order_status_history(p_order_id uuid)
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', su.id,
      'status', su.status,
      'note', su.note,
      'created_at', su.created_at,
      'driver_name', u.name,
      'created_by_name', cu.name
    ) ORDER BY su.created_at DESC
  ) INTO v_result
  FROM status_updates su
  LEFT JOIN users u ON u.id = su.driver_id
  LEFT JOIN auth.users cu ON cu.id = su.created_by
  WHERE su.order_id = p_order_id;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_status_updates_order_status ON status_updates(order_id, status);
CREATE INDEX IF NOT EXISTS idx_status_updates_driver_created ON status_updates(driver_id, created_at DESC);

-- Create view for order status with latest update info
CREATE OR REPLACE VIEW orders_with_latest_status AS
SELECT 
  o.*,
  su.note as latest_status_note,
  su.created_at as status_updated_at,
  u.name as driver_name
FROM orders o
LEFT JOIN LATERAL (
  SELECT note, created_at, driver_id
  FROM status_updates 
  WHERE order_id = o.id 
  ORDER BY created_at DESC 
  LIMIT 1
) su ON true
LEFT JOIN users u ON u.id = o.assigned_driver_id;

-- Grant necessary permissions
GRANT USAGE ON TYPE order_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_status_history TO authenticated;
GRANT SELECT ON orders_with_latest_status TO authenticated;

-- RLS policies for status_updates table
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;

-- Policy: Drivers can insert their own status updates
CREATE POLICY "Drivers can insert status updates for their orders" ON status_updates
  FOR INSERT WITH CHECK (
    driver_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = order_id 
      AND (assigned_driver_id = auth.uid() OR driver_id = auth.uid())
    )
  );

-- Policy: Drivers can view status updates for their orders
CREATE POLICY "Drivers can view status updates for their orders" ON status_updates
  FOR SELECT USING (
    driver_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = order_id 
      AND (assigned_driver_id = auth.uid() OR driver_id = auth.uid())
    )
  );

-- Policy: Admins can view all status updates
CREATE POLICY "Admins can view all status updates" ON status_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

COMMENT ON FUNCTION update_order_status IS 'Updates order status with proper logging and validation';
COMMENT ON FUNCTION get_order_status_history IS 'Returns complete status history for an order';
COMMENT ON VIEW orders_with_latest_status IS 'Orders view with latest status update information';