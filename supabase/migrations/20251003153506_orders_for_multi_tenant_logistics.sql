CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  order_number text NOT NULL,
  sku text,
  qr_code_data text,
  qr_code_signature text,
  qr_code_expires_at timestamptz,
  loading_point_name text,
  loading_point_address text,
  loading_point_location text,
  unloading_point_name text,
  unloading_point_address text,
  unloading_point_location text,
  status text,
  assigned_driver_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
