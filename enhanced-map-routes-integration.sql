-- Enhanced Map Routes Integration
-- This adds functionality to populate and use the map_routes table with your existing system

-- Add order_id reference to map_routes for better integration
ALTER TABLE public.map_routes 
ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id),
ADD COLUMN IF NOT EXISTS route_type text DEFAULT 'planned' CHECK (route_type IN ('planned', 'actual', 'optimized')),
ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS average_speed_kmh numeric,
ADD COLUMN IF NOT EXISTS route_efficiency_score numeric,
ADD COLUMN IF NOT EXISTS weather_conditions jsonb,
ADD COLUMN IF NOT EXISTS traffic_conditions jsonb,
ADD COLUMN IF NOT EXISTS driver_notes text,
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS template_category text,
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_map_routes_order_id ON public.map_routes(order_id);
CREATE INDEX IF NOT EXISTS idx_map_routes_tenant_id ON public.map_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_map_routes_route_type ON public.map_routes(route_type);
CREATE INDEX IF NOT EXISTS idx_map_routes_is_template ON public.map_routes(is_template);
CREATE INDEX IF NOT EXISTS idx_map_routes_template_category ON public.map_routes(template_category);
CREATE INDEX IF NOT EXISTS idx_map_routes_usage_count ON public.map_routes(usage_count DESC);

-- Function to automatically save successful routes
CREATE OR REPLACE FUNCTION save_completed_route(
  p_order_id uuid,
  p_route_name text DEFAULT NULL,
  p_actual_route jsonb,
  p_total_distance_meters integer,
  p_total_duration_seconds integer,
  p_average_speed_kmh numeric,
  p_driver_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_route_id uuid;
  v_user_id uuid;
  v_tenant_id uuid;
  v_origin_coords jsonb;
  v_destination_coords jsonb;
  v_polyline text;
  v_route_name text;
BEGIN
  -- Get order details
  SELECT 
    o.assigned_driver_id,
    o.tenant_id,
    o.loading_point_location,
    o.unloading_point_location
  INTO v_user_id, v_tenant_id, v_origin_coords, v_destination_coords
  FROM orders o
  WHERE o.id = p_order_id;

  -- Generate route name if not provided
  IF p_route_name IS NULL THEN
    SELECT CONCAT('Route for Order #', o.order_number) 
    INTO v_route_name
    FROM orders o 
    WHERE o.id = p_order_id;
  ELSE
    v_route_name := p_route_name;
  END IF;

  -- Extract coordinates
  DECLARE
    v_origin_lat numeric := (v_origin_coords->>'lat')::numeric;
    v_origin_lng numeric := (v_origin_coords->>'lng')::numeric;
    v_dest_lat numeric := (v_destination_coords->>'lat')::numeric;
    v_dest_lng numeric := (v_destination_coords->>'lng')::numeric;
  BEGIN
    -- Insert the route
    INSERT INTO map_routes (
      user_id,
      tenant_id,
      order_id,
      route_name,
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng,
      waypoints,
      distance_meters,
      duration_seconds,
      route_polyline,
      route_type,
      average_speed_kmh,
      driver_notes,
      usage_count,
      last_used_at
    ) VALUES (
      v_user_id,
      v_tenant_id,
      p_order_id,
      v_route_name,
      v_origin_lat,
      v_origin_lng,
      v_dest_lat,
      v_dest_lng,
      p_actual_route,
      p_total_distance_meters,
      p_total_duration_seconds,
      NULL, -- Will be calculated later
      'actual',
      p_average_speed_kmh,
      p_driver_notes,
      1,
      NOW()
    ) RETURNING id INTO v_route_id;

    RETURN v_route_id;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar routes for suggestions
CREATE OR REPLACE FUNCTION find_similar_routes(
  p_origin_lat numeric,
  p_origin_lng numeric,
  p_dest_lat numeric,
  p_dest_lng numeric,
  p_radius_meters numeric DEFAULT 1000,
  p_limit integer DEFAULT 5
)
RETURNS TABLE(
  route_id uuid,
  route_name text,
  distance_meters integer,
  average_duration_seconds numeric,
  usage_count integer,
  efficiency_score numeric,
  last_used_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.id,
    mr.route_name,
    mr.distance_meters,
    AVG(mr.duration_seconds)::numeric as avg_duration,
    SUM(mr.usage_count)::integer as total_usage,
    AVG(mr.route_efficiency_score)::numeric as avg_efficiency,
    MAX(mr.last_used_at) as last_used
  FROM map_routes mr
  WHERE 
    -- Find routes with similar origin (within radius)
    (6371000 * acos(
      cos(radians(p_origin_lat)) * 
      cos(radians(mr.origin_lat)) * 
      cos(radians(mr.origin_lng) - radians(p_origin_lng)) + 
      sin(radians(p_origin_lat)) * 
      sin(radians(mr.origin_lat))
    )) <= p_radius_meters
    AND
    -- Find routes with similar destination (within radius)
    (6371000 * acos(
      cos(radians(p_dest_lat)) * 
      cos(radians(mr.destination_lat)) * 
      cos(radians(mr.destination_lng) - radians(p_dest_lng)) + 
      sin(radians(p_dest_lat)) * 
      sin(radians(mr.destination_lat))
    )) <= p_radius_meters
    AND mr.tenant_id = auth.jwt() ->> 'tenant_id'
  GROUP BY mr.id, mr.route_name, mr.distance_meters
  ORDER BY total_usage DESC, avg_efficiency DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create route template from successful routes
CREATE OR REPLACE FUNCTION create_route_template(
  p_base_route_id uuid,
  p_template_name text,
  p_template_category text DEFAULT 'general'
)
RETURNS uuid AS $$
DECLARE
  v_template_id uuid;
BEGIN
  INSERT INTO map_routes (
    user_id,
    tenant_id,
    route_name,
    origin_lat,
    origin_lng,
    destination_lat,
    destination_lng,
    waypoints,
    distance_meters,
    duration_seconds,
    route_polyline,
    route_type,
    average_speed_kmh,
    is_template,
    template_category,
    usage_count
  )
  SELECT 
    user_id,
    tenant_id,
    p_template_name,
    origin_lat,
    origin_lng,
    destination_lat,
    destination_lng,
    waypoints,
    distance_meters,
    duration_seconds,
    route_polyline,
    'optimized',
    average_speed_kmh,
    true,
    p_template_category,
    0
  FROM map_routes
  WHERE id = p_base_route_id
  RETURNING id INTO v_template_id;

  RETURN v_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get route suggestions for order creation
CREATE OR REPLACE FUNCTION get_route_suggestions_for_order(
  p_loading_lat numeric,
  p_loading_lng numeric,
  p_unloading_lat numeric,
  p_unloading_lng numeric
)
RETURNS TABLE(
  suggestion_type text,
  route_id uuid,
  route_name text,
  estimated_distance_meters integer,
  estimated_duration_seconds integer,
  confidence_score numeric,
  usage_statistics jsonb
) AS $$
BEGIN
  -- Return similar successful routes
  RETURN QUERY
  SELECT 
    'historical'::text as suggestion_type,
    sr.route_id,
    sr.route_name,
    sr.distance_meters as estimated_distance_meters,
    sr.average_duration_seconds::integer as estimated_duration_seconds,
    LEAST(1.0, sr.usage_count::numeric / 10.0) as confidence_score,
    jsonb_build_object(
      'usage_count', sr.usage_count,
      'last_used', sr.last_used_at,
      'efficiency_score', sr.efficiency_score
    ) as usage_statistics
  FROM find_similar_routes(
    p_loading_lat, 
    p_loading_lng, 
    p_unloading_lat, 
    p_unloading_lng,
    2000, -- 2km radius
    3     -- Top 3 suggestions
  ) sr
  
  UNION ALL
  
  -- Return template routes
  SELECT 
    'template'::text as suggestion_type,
    mr.id as route_id,
    mr.route_name,
    mr.distance_meters as estimated_distance_meters,
    mr.duration_seconds as estimated_duration_seconds,
    0.8 as confidence_score, -- Templates have high confidence
    jsonb_build_object(
      'template_category', mr.template_category,
      'created_at', mr.created_at,
      'usage_count', mr.usage_count
    ) as usage_statistics
  FROM map_routes mr
  WHERE 
    mr.is_template = true
    AND mr.tenant_id = auth.jwt() ->> 'tenant_id'
  ORDER BY confidence_score DESC, usage_statistics->>'usage_count' DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include tenant_id
DROP POLICY IF EXISTS "Users can insert their own routes" ON public.map_routes;
DROP POLICY IF EXISTS "Users can update their own routes" ON public.map_routes;
DROP POLICY IF EXISTS "Users can read their own routes" ON public.map_routes;

CREATE POLICY "Users can insert their own routes" 
ON public.map_routes FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = user_id 
  AND (tenant_id IS NULL OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
);

CREATE POLICY "Users can update their own routes" 
ON public.map_routes FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = user_id 
  AND (tenant_id IS NULL OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
);

CREATE POLICY "Users can read their own routes" 
ON public.map_routes FOR SELECT 
TO authenticated 
USING (
  auth.uid() = user_id 
  AND (tenant_id IS NULL OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
);

-- Trigger to automatically save completed routes
CREATE OR REPLACE FUNCTION trigger_save_completed_route()
RETURNS TRIGGER AS $$
DECLARE
  v_route_data jsonb;
  v_total_distance integer;
  v_total_duration integer;
  v_avg_speed numeric;
BEGIN
  -- Only process when order status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get route data from driver_locations
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'lat', latitude,
          'lng', longitude,
          'timestamp', timestamp
        ) ORDER BY timestamp
      ),
      SUM(
        CASE 
          WHEN LAG(latitude) OVER (ORDER BY timestamp) IS NOT NULL THEN
            6371000 * acos(
              cos(radians(latitude)) * 
              cos(radians(LAG(latitude) OVER (ORDER BY timestamp))) * 
              cos(radians(LAG(longitude) OVER (ORDER BY timestamp)) - radians(longitude)) + 
              sin(radians(latitude)) * 
              sin(radians(LAG(latitude) OVER (ORDER BY timestamp)))
            )
          ELSE 0
        END
      )::integer,
      EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))::integer
    INTO v_route_data, v_total_distance, v_total_duration
    FROM driver_locations 
    WHERE order_id = NEW.id;

    -- Calculate average speed
    IF v_total_duration > 0 AND v_total_distance > 0 THEN
      v_avg_speed := (v_total_distance::numeric / 1000) / (v_total_duration::numeric / 3600);
    END IF;

    -- Save the route if we have data
    IF v_route_data IS NOT NULL THEN
      PERFORM save_completed_route(
        NEW.id,
        NULL, -- Auto-generate name
        v_route_data,
        COALESCE(v_total_distance, 0),
        COALESCE(v_total_duration, 0),
        v_avg_speed,
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_save_completed_route ON orders;
CREATE TRIGGER auto_save_completed_route
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_save_completed_route();

-- Sample data to populate the table (for testing)
INSERT INTO map_routes (
  user_id,
  route_name,
  origin_lat,
  origin_lng,
  destination_lat,
  destination_lng,
  waypoints,
  distance_meters,
  duration_seconds,
  route_type,
  is_template,
  template_category
) VALUES 
(
  (SELECT id FROM auth.users LIMIT 1),
  'Downtown Delivery Route',
  40.7128,
  -74.0060,
  40.7589,
  -73.9851,
  '[{"lat": 40.7410, "lng": -73.9897}, {"lat": 40.7505, "lng": -73.9934}]'::jsonb,
  8500,
  1200,
  'template',
  true,
  'express_delivery'
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Warehouse to Distribution Center',
  40.6782,
  -73.9442,
  40.7505,
  -73.9934,
  '[]'::jsonb,
  12000,
  1800,
  'template',
  true,
  'standard_delivery'
) ON CONFLICT DO NOTHING;