-- Sample data for testing transporter supplier functionality
-- Insert a sample order with transporter supplier information

INSERT INTO public.orders (
    tenant_id,
    order_number,
    sku,
    qr_code_data,
    qr_code_signature,
    status,
    loading_point_name,
    loading_point_address,
    loading_point_location,
    unloading_point_name,
    unloading_point_address,
    unloading_point_location,
    estimated_distance_km,
    estimated_duration_minutes,
    delivery_instructions,
    special_handling_instructions,
    contact_name,
    contact_phone,
    transporter_supplier,
    created_by
) VALUES (
    (SELECT id FROM tenants LIMIT 1), -- Use the first available tenant
    'ORD-SAMPLE-001',
    'WIDGET-ABC-123',
    'SAMPLE-QR-001',
    'pending',
    'pending',
    'Central Warehouse',
    '123 Industrial Ave, Cape Town, South Africa',
    ST_GeomFromText('POINT(18.4241 -33.9249)', 4326),
    'Customer Distribution Center',
    '456 Commerce St, Johannesburg, South Africa',
    ST_GeomFromText('POINT(28.0473 -26.2041)', 4326),
    1400.5,
    1200,
    'Please deliver to loading dock C. Contact security at gate for access.',
    'Fragile items - handle with care. Temperature controlled transport required.',
    'John Smith',
    '+27 11 123 4567',
    '{
        "name": "Express Logistics SA",
        "contact_phone": "+27 21 987 6543",
        "contact_email": "dispatch@expresslogistics.co.za",
        "cost_amount": 15000.00,
        "cost_currency": "ZAR",
        "notes": "Preferred supplier for temperature-controlled deliveries. Available 24/7 emergency contact."
    }'::jsonb,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1) -- Use the first admin user
);

-- Insert another sample order without transporter supplier (for comparison)
INSERT INTO public.orders (
    tenant_id,
    order_number,
    sku,
    qr_code_data,
    qr_code_signature,
    status,
    loading_point_name,
    loading_point_address,
    loading_point_location,
    unloading_point_name,
    unloading_point_address,
    unloading_point_location,
    estimated_distance_km,
    estimated_duration_minutes,
    contact_name,
    contact_phone,
    created_by
) VALUES (
    (SELECT id FROM tenants LIMIT 1),
    'ORD-SAMPLE-002',
    'GADGET-XYZ-789',
    'SAMPLE-QR-002',
    'pending',
    'assigned',
    'North Warehouse',
    '789 Storage Rd, Durban, South Africa',
    ST_GeomFromText('POINT(31.0218 -29.8587)', 4326),
    'Retail Store',
    '321 Shopping Mall, Pretoria, South Africa',
    ST_GeomFromText('POINT(28.1881 -25.7479)', 4326),
    650.2,
    480,
    'Jane Doe',
    '+27 12 555 0123',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);