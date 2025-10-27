-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'manager', 'driver')),
  restaurant_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table for driver functionality (mirrors auth.users with additional fields)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'driver' CHECK (role IN ('admin', 'staff', 'manager', 'driver')),
  tenant_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  items JSONB DEFAULT '[]'::JSONB,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'active', 'delivered', 'cancelled')),
  delivery_address TEXT,
  delivery_lat DECIMAL(10, 8),
  delivery_lng DECIMAL(11, 8),
  driver_location_lat DECIMAL(10, 8),
  driver_location_lng DECIMAL(11, 8),
  activated_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_history table for tracking status changes
CREATE TABLE IF NOT EXISTS public.order_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_id ON public.orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_qr_code ON public.orders(qr_code);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON public.order_history(order_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users table policies
CREATE POLICY "Users can view own user record" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own user record" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view other users for order assignment" ON public.users
  FOR SELECT USING (true); -- Allow viewing all users for driver assignment

-- Orders policies
CREATE POLICY "Users can view own orders and assigned orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_driver_id);

CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders and assigned orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = assigned_driver_id);

CREATE POLICY "Users can delete own orders" ON public.orders
  FOR DELETE USING (auth.uid() = user_id);

-- Order history policies
CREATE POLICY "Users can view order history" ON public.order_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_history.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order history" ON public.order_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_history.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Function to automatically create profile and user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile record
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
  );
  
  -- Create user record for driver functionality
  INSERT INTO public.users (id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver'),
    COALESCE(NEW.raw_user_meta_data->>'tenant_id', 'default')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_users ON public.users;
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.orders;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create map_locations table for GPS tracking
CREATE TABLE IF NOT EXISTS public.map_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for map_locations
CREATE INDEX IF NOT EXISTS idx_map_locations_order_id ON public.map_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_map_locations_user_id ON public.map_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_map_locations_created_at ON public.map_locations(created_at DESC);

-- Enable RLS for map_locations
ALTER TABLE public.map_locations ENABLE ROW LEVEL SECURITY;

-- Map locations policies
CREATE POLICY "Users can view map locations for their orders" ON public.map_locations
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = map_locations.order_id 
      AND (orders.user_id = auth.uid() OR orders.assigned_driver_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own location data" ON public.map_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
