-- Fix: Activate tracking for order with locations
-- This order has 10+ location updates but tracking_active is false

UPDATE orders
SET 
    tracking_active = TRUE,
    trip_start_time = COALESCE(trip_start_time, (
        SELECT MIN(created_at) 
        FROM driver_locations 
        WHERE order_id = orders.id
    ))
WHERE id = '1bbd73f2-e05e-423f-b57f-cfc8206f6e83';

-- Verify the fix:
SELECT
    order_number,
    status,
    tracking_active,
    trip_start_time,
    last_driver_location
FROM orders
WHERE id = '1bbd73f2-e05e-423f-b57f-cfc8206f6e83';

-- Also calculate trip analytics now that tracking is active:
WITH
    analytics
    AS
    (
        SELECT *
        FROM calculate_trip_analytics('1bbd73f2-e05e-423f-b57f-cfc8206f6e83')
    )
UPDATE orders
SET 
    total_distance_km = analytics.total_distance_km,
    total_duration_minutes = analytics.total_duration_minutes,
    average_speed_kmh = analytics.average_speed_kmh
FROM analytics
WHERE orders.id = '1bbd73f2-e05e-423f-b57f-cfc8206f6e83';

-- Final verification - this should now return complete tracking data:
SELECT *
FROM get_tracking_data('1bbd73f2-e05e-423f-b57f-cfc8206f6e83');
