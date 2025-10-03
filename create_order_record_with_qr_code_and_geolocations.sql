INSERT INTO public.orders (
  tenant_id, order_number, sku, qr_code_data, qr_code_signature, qr_code_expires_at,
  loading_point_name, loading_point_address, loading_point_location,
  unloading_point_name, unloading_point_address, unloading_point_location,
  status, assigned_driver_id, created_by
) VALUES (
  '17ed751d-9c45-4cbb-9ccc-50607c151d43',  -- Tenant ID
  'ORD-001', 'SKU-TEST-123', 'qr-data-sample', 'signature-hash', NOW() + INTERVAL '1 day',
  'Warehouse A', '123 Main St, City', 'POINT(-122.084 37.422)',  -- Stored as TEXT
  'Client Site B', '456 Elm St, Town', 'POINT(-122.000 37.400)',  -- Stored as TEXT
  'pending', NULL, '17ed751d-9c45-4cbb-9ccc-50607c151d43'  -- Replace with real UUID
);

