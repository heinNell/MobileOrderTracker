INSERT INTO public.orders (
  tenant_id, order_number, sku, qr_code_data, qr_code_signature, qr_code_expires_at,
  loading_point_name, loading_point_address, loading_point_location,
  unloading_point_name, unloading_point_address, unloading_point_location,
  status, assigned_driver_id, created_by
) VALUES (
  '17ed751d-9c45-4cbb-9ccc-50607c151d43', -- tenant_id
  'ORD-0001',                             -- order_number
  'SKU-123',                              -- sku
  'some-qr-data',                         -- qr_code_data
  'sig-abc',                              -- qr_code_signature
  '2025-10-10T00:00:00Z',                 -- qr_code_expires_at (timestamptz)
  'Warehouse A',                          -- loading_point_name
  '123 Loading St',                       -- loading_point_address
  'POINT(1 2)',                           -- loading_point_location (text in your schema)
  'Store B',                              -- unloading_point_name
  '456 Unload Ave',                       -- unloading_point_address
  'POINT(3 4)',                           -- unloading_point_location
  'pending',                              -- status
  NULL,                                   -- assigned_driver_id
  'a1b2c3d4-5678-90ab-cdef-111111111111'  -- created_by
);
