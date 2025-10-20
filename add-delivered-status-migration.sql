-- Migration to add new order statuses
-- Run this script to update the database with the new statuses

-- Add new statuses to the enum type
DO $$ 
BEGIN
    -- Check if the new statuses already exist, if not add them
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'arrived_at_loading_point' AND enumtypid = 'order_status'::regtype) THEN
        ALTER TYPE order_status ADD VALUE 'arrived_at_loading_point' BEFORE 'loading';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'arrived_at_unloading_point' AND enumtypid = 'order_status'::regtype) THEN
        ALTER TYPE order_status ADD VALUE 'arrived_at_unloading_point' BEFORE 'unloading';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'delivered' AND enumtypid = 'order_status'::regtype) THEN
        ALTER TYPE order_status ADD VALUE 'delivered' BEFORE 'completed';
    END IF;
END
$$;

-- Update the trigger function to handle new statuses
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

-- Create an index on the new statuses for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status_delivered ON orders(status) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_orders_status_arrived_loading ON orders(status) WHERE status = 'arrived_at_loading_point';
CREATE INDEX IF NOT EXISTS idx_orders_status_arrived_unloading ON orders(status) WHERE status = 'arrived_at_unloading_point';

-- Update any existing status update records to ensure consistency
UPDATE status_updates 
SET status = 'delivered' 
WHERE status = 'completed' 
  AND note LIKE '%delivered%' 
  AND created_at > NOW() - INTERVAL '30 days';

COMMENT ON TYPE order_status IS 'Enhanced order status enum with granular location-based statuses for better tracking';