CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  order_number TEXT NOT NULL,
  sku TEXT NOT NULL,
  qr_code_data TEXT NOT NULL,
  qr_code_signature TEXT NOT NULL,
  qr_code_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  loading_point_name TEXT NOT NULL,
  loading_point_address TEXT NOT NULL,
  loading_point_location GEOGRAPHY NOT NULL,
  unloading_point_name TEXT NOT NULL,
  unloading_point_address TEXT NOT NULL,
  unloading_point_location GEOGRAPHY NOT NULL,
  status TEXT NOT NULL,
  assigned_driver_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

