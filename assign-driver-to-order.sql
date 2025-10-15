-- Assign a driver to an order so they can update it
-- Replace the UUIDs with your actual values

-- First, let's see the current state
SELECT 
    id,
    order_number,
    status,
    assigned_driver_id,
    driver_id
FROM orders 
WHERE order_number = 'ORD-1759507343591';

-- Assign the driver to this order
-- Replace 'YOUR_DRIVER_USER_ID' with the actual driver's user ID from auth.users
UPDATE orders
SET 
    assigned_driver_id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd', -- Replace with actual driver ID
    driver_id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd', -- Same driver ID
    status = 'assigned', -- Change from 'pending' to 'assigned'
    updated_at = NOW()
WHERE id = '1bbd73f2-e05e-423f-b57f-cfc8206f6e83'; -- The order ID you provided

-- Verify the update
SELECT 
    id,
    order_number,
    status,
    assigned_driver_id,
    driver_id
FROM orders 
WHERE id = '1bbd73f2-e05e-423f-b57f-cfc8206f6e83';

-- Show what the driver can now see
SELECT 
    'Orders this driver can now update:' as info,
    order_number,
    status,
    assigned_driver_id
FROM orders
WHERE assigned_driver_id = '5e5ebf46-d35f-4dc4-9025-28fdf81059fd';
