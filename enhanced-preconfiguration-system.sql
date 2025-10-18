-- Enhanced Pre-configuration System for Mobile Order Tracker
-- This creates comprehensive pre-configuration capabilities for transporters, contacts, and geofences

-- Enhanced Transporters table with complete information
CREATE TABLE IF NOT EXISTS transporters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  company_name varchar(255),
  registration_number varchar(100),
  tax_id varchar(100),
  
  -- Contact Information
  primary_contact_name varchar(255),
  primary_contact_phone varchar(50),
  primary_contact_email varchar(255),
  secondary_contact_name varchar(255),
  secondary_contact_phone varchar(50),
  secondary_contact_email varchar(255),
  
  -- Address Information
  business_address text,
  business_city varchar(100),
  business_state varchar(100),
  business_postal_code varchar(20),
  business_country varchar(100),
  
  -- Service Details
  service_types text[], -- Array of service types they offer
  coverage_areas text[], -- Geographic areas they cover
  vehicle_types text[], -- Types of vehicles available
  max_capacity_kg numeric(10,2),
  max_volume_m3 numeric(8,2),
  
  -- Pricing Information
  base_rate_per_km numeric(10,2),
  base_rate_per_hour numeric(10,2),
  fuel_surcharge_rate numeric(5,2), -- Percentage
  minimum_charge numeric(10,2),
  currency varchar(3) DEFAULT 'USD',
  
  -- Operational Details
  operating_hours jsonb, -- Store as JSON: {"monday": {"start": "08:00", "end": "17:00"}, ...}
  available_days integer[], -- Array of day numbers (0=Sunday, 1=Monday, etc.)
  lead_time_hours integer DEFAULT 24,
  
  -- Quality & Compliance
  insurance_details jsonb,
  certifications text[],
  compliance_documents jsonb,
  performance_rating numeric(3,2) DEFAULT 5.0,
  
  -- Status and Preferences
  is_active boolean DEFAULT true,
  is_preferred boolean DEFAULT false,
  auto_assign_eligible boolean DEFAULT true,
  priority_level integer DEFAULT 5, -- 1-10 scale
  
  -- Metadata
  tags text[],
  notes text,
  metadata jsonb,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Enhanced Contacts table for comprehensive contact management
CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic Information
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  full_name varchar(255) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  company_name varchar(255),
  job_title varchar(100),
  department varchar(100),
  
  -- Contact Methods
  primary_phone varchar(50),
  secondary_phone varchar(50),
  mobile_phone varchar(50),
  primary_email varchar(255),
  secondary_email varchar(255),
  fax varchar(50),
  
  -- Address Information
  address_line1 text,
  address_line2 text,
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  country varchar(100),
  
  -- Contact Preferences
  preferred_contact_method varchar(20) DEFAULT 'email', -- email, phone, sms
  best_contact_times jsonb, -- Store preferred contact hours
  language_preference varchar(10) DEFAULT 'en',
  timezone varchar(50),
  
  -- Contact Type and Categories
  contact_type varchar(50) NOT NULL, -- customer, supplier, driver, internal, emergency
  categories text[], -- Additional categorization
  relationship_type varchar(50), -- primary, secondary, emergency, billing, etc.
  
  -- Customer/Supplier Specific
  customer_id varchar(100), -- External customer ID
  supplier_id varchar(100), -- External supplier ID
  account_number varchar(100),
  credit_limit numeric(12,2),
  payment_terms varchar(50),
  
  -- Status and Metadata
  is_active boolean DEFAULT true,
  is_primary boolean DEFAULT false,
  tags text[],
  notes text,
  metadata jsonb,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Enhanced Geofences table with better management capabilities
CREATE TABLE IF NOT EXISTS enhanced_geofences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Basic Information
  name varchar(255) NOT NULL,
  description text,
  geofence_type varchar(50) NOT NULL, -- loading_point, unloading_point, waypoint, depot, restricted_area, custom
  
  -- Geographic Data
  center_latitude numeric(10,8) NOT NULL,
  center_longitude numeric(11,8) NOT NULL,
  radius_meters integer NOT NULL DEFAULT 100,
  shape_type varchar(20) DEFAULT 'circle', -- circle, polygon, rectangle
  polygon_coordinates jsonb, -- For complex shapes
  
  -- Location Details
  address text,
  city varchar(100),
  state varchar(100),
  postal_code varchar(20),
  country varchar(100),
  landmark varchar(255),
  access_instructions text,
  
  -- Operational Information
  operating_hours jsonb,
  access_restrictions text,
  contact_person varchar(255),
  contact_phone varchar(50),
  facility_type varchar(100), -- warehouse, depot, customer_site, distribution_center
  
  -- Business Rules
  auto_trigger_status varchar(50), -- Status to trigger when entering/exiting
  trigger_event varchar(20) DEFAULT 'enter', -- enter, exit, both
  notification_enabled boolean DEFAULT true,
  alert_enabled boolean DEFAULT false,
  
  -- Categorization and Search
  categories text[],
  tags text[],
  business_unit varchar(100),
  region varchar(100),
  zone varchar(100),
  
  -- Usage Statistics
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  
  -- Status and Metadata
  is_active boolean DEFAULT true,
  is_template boolean DEFAULT false,
  priority_level integer DEFAULT 5,
  notes text,
  metadata jsonb,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Order Templates for pre-configured order information
CREATE TABLE IF NOT EXISTS order_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Template Information
  template_name varchar(255) NOT NULL,
  description text,
  template_type varchar(50) DEFAULT 'standard', -- standard, express, bulk, custom
  
  -- Pre-configured Order Data
  default_transporter_id uuid REFERENCES transporters(id),
  default_customer_contact_id uuid REFERENCES contacts(id),
  default_loading_contact_id uuid REFERENCES contacts(id),
  default_unloading_contact_id uuid REFERENCES contacts(id),
  
  -- Default Locations (using geofences)
  default_loading_geofence_id uuid REFERENCES enhanced_geofences(id),
  default_unloading_geofence_id uuid REFERENCES enhanced_geofences(id),
  
  -- Service Configuration
  default_service_type varchar(100),
  default_vehicle_type varchar(100),
  default_priority varchar(20) DEFAULT 'standard',
  
  -- Default Time Windows
  default_loading_time_window jsonb,
  default_unloading_time_window jsonb,
  default_lead_time_hours integer DEFAULT 24,
  
  -- Instructions and Notes
  default_loading_instructions text,
  default_unloading_instructions text,
  default_special_instructions text,
  default_delivery_instructions text,
  
  -- Pre-filled Fields Configuration
  auto_populate_fields jsonb, -- Which fields to auto-populate
  field_mapping jsonb, -- Custom field mappings
  
  -- Usage and Management
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT false, -- Can be used by other users in tenant
  
  -- Metadata
  tags text[],
  metadata jsonb,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Enhanced Orders table with template and contact references
ALTER TABLE orders ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES order_templates(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transporter_id uuid REFERENCES transporters(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_contact_id uuid REFERENCES contacts(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loading_contact_id uuid REFERENCES contacts(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unloading_contact_id uuid REFERENCES contacts(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loading_geofence_id uuid REFERENCES enhanced_geofences(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unloading_geofence_id uuid REFERENCES enhanced_geofences(id);

-- Contact-Order relationship table for multiple contacts per order
CREATE TABLE IF NOT EXISTS order_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  contact_role varchar(50) NOT NULL, -- primary, secondary, billing, emergency, notification
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT NOW(),
  
  UNIQUE(order_id, contact_id, contact_role)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transporters_tenant_active ON transporters(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_transporters_service_types ON transporters USING GIN(service_types);
CREATE INDEX IF NOT EXISTS idx_transporters_coverage_areas ON transporters USING GIN(coverage_areas);
CREATE INDEX IF NOT EXISTS idx_transporters_priority ON transporters(priority_level DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_type ON contacts(tenant_id, contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(full_name);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(primary_email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(primary_phone);

CREATE INDEX IF NOT EXISTS idx_enhanced_geofences_tenant_type ON enhanced_geofences(tenant_id, geofence_type);
CREATE INDEX IF NOT EXISTS idx_enhanced_geofences_location ON enhanced_geofences(center_latitude, center_longitude);
CREATE INDEX IF NOT EXISTS idx_enhanced_geofences_categories ON enhanced_geofences USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_enhanced_geofences_tags ON enhanced_geofences USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_enhanced_geofences_usage ON enhanced_geofences(usage_count DESC, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_templates_tenant ON order_templates(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_order_templates_usage ON order_templates(usage_count DESC, last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_contacts_order ON order_contacts(order_id);
CREATE INDEX IF NOT EXISTS idx_order_contacts_contact ON order_contacts(contact_id);

-- Functions for automatic transporter learning and selection

-- Function to automatically save transporter information from orders
CREATE OR REPLACE FUNCTION learn_transporter_from_order()
RETURNS TRIGGER AS $$
DECLARE
  transporter_record transporters%ROWTYPE;
BEGIN
  -- Only process if transporter_supplier metadata exists and no transporter_id is set
  IF NEW.metadata ? 'transporter_supplier' AND NEW.transporter_id IS NULL THEN
    
    -- Check if transporter already exists by name or contact
    SELECT * INTO transporter_record
    FROM transporters 
    WHERE tenant_id = NEW.tenant_id 
      AND (
        name = (NEW.metadata->'transporter_supplier'->>'name') OR
        primary_contact_phone = (NEW.metadata->'transporter_supplier'->>'contact_phone') OR
        primary_contact_email = (NEW.metadata->'transporter_supplier'->>'contact_email')
      )
    LIMIT 1;
    
    IF NOT FOUND THEN
      -- Create new transporter record
      INSERT INTO transporters (
        tenant_id,
        name,
        primary_contact_name,
        primary_contact_phone,
        primary_contact_email,
        notes,
        metadata,
        created_by
      ) VALUES (
        NEW.tenant_id,
        NEW.metadata->'transporter_supplier'->>'name',
        NEW.metadata->'transporter_supplier'->>'name',
        NEW.metadata->'transporter_supplier'->>'contact_phone',
        NEW.metadata->'transporter_supplier'->>'contact_email',
        NEW.metadata->'transporter_supplier'->>'notes',
        NEW.metadata->'transporter_supplier',
        NEW.created_by
      ) RETURNING * INTO transporter_record;
      
    ELSE
      -- Update existing transporter with any new information
      UPDATE transporters 
      SET 
        usage_count = COALESCE(usage_count, 0) + 1,
        updated_at = NOW(),
        metadata = COALESCE(metadata, '{}') || NEW.metadata->'transporter_supplier'
      WHERE id = transporter_record.id;
    END IF;
    
    -- Link the order to the transporter
    NEW.transporter_id = transporter_record.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically learn transporters
DROP TRIGGER IF EXISTS trigger_learn_transporter ON orders;
CREATE TRIGGER trigger_learn_transporter
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION learn_transporter_from_order();

-- Function to suggest best transporter for new orders
CREATE OR REPLACE FUNCTION suggest_best_transporter(
  p_tenant_id uuid,
  p_service_type text DEFAULT NULL,
  p_coverage_area text DEFAULT NULL,
  p_vehicle_type text DEFAULT NULL
)
RETURNS TABLE(
  transporter_id uuid,
  name varchar(255),
  score numeric,
  reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    (
      -- Base score from performance rating
      COALESCE(t.performance_rating, 5.0) * 10 +
      -- Bonus for preferred status
      CASE WHEN t.is_preferred THEN 20 ELSE 0 END +
      -- Bonus for priority level
      (t.priority_level * 2) +
      -- Bonus for service type match
      CASE WHEN p_service_type IS NOT NULL AND p_service_type = ANY(t.service_types) THEN 15 ELSE 0 END +
      -- Bonus for coverage area match
      CASE WHEN p_coverage_area IS NOT NULL AND p_coverage_area = ANY(t.coverage_areas) THEN 15 ELSE 0 END +
      -- Bonus for vehicle type match
      CASE WHEN p_vehicle_type IS NOT NULL AND p_vehicle_type = ANY(t.vehicle_types) THEN 10 ELSE 0 END
    ) as calculated_score,
    'Auto-selected based on performance, preferences, and service compatibility' as selection_reason
  FROM transporters t
  WHERE t.tenant_id = p_tenant_id
    AND t.is_active = true
    AND t.auto_assign_eligible = true
  ORDER BY calculated_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to update geofence usage statistics
CREATE OR REPLACE FUNCTION update_geofence_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update loading geofence usage
  IF NEW.loading_geofence_id IS NOT NULL THEN
    UPDATE enhanced_geofences 
    SET 
      usage_count = COALESCE(usage_count, 0) + 1,
      last_used_at = NOW()
    WHERE id = NEW.loading_geofence_id;
  END IF;
  
  -- Update unloading geofence usage
  IF NEW.unloading_geofence_id IS NOT NULL THEN
    UPDATE enhanced_geofences 
    SET 
      usage_count = COALESCE(usage_count, 0) + 1,
      last_used_at = NOW()
    WHERE id = NEW.unloading_geofence_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update geofence usage
DROP TRIGGER IF EXISTS trigger_update_geofence_usage ON orders;
CREATE TRIGGER trigger_update_geofence_usage
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_geofence_usage();

-- Function to get comprehensive order creation suggestions
CREATE OR REPLACE FUNCTION get_order_creation_suggestions(
  p_tenant_id uuid,
  p_customer_name text DEFAULT NULL,
  p_loading_location text DEFAULT NULL,
  p_unloading_location text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{}';
  suggested_transporters jsonb;
  suggested_contacts jsonb;
  suggested_geofences jsonb;
  suggested_templates jsonb;
BEGIN
  -- Get suggested transporters
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', transporter_id,
      'name', name,
      'score', score,
      'reason', reason
    )
  ) INTO suggested_transporters
  FROM suggest_best_transporter(p_tenant_id);
  
  -- Get relevant contacts
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', full_name,
      'company', company_name,
      'contact_type', contact_type,
      'phone', primary_phone,
      'email', primary_email
    )
  ) INTO suggested_contacts
  FROM contacts
  WHERE tenant_id = p_tenant_id
    AND is_active = true
    AND (
      p_customer_name IS NULL OR 
      full_name ILIKE '%' || p_customer_name || '%' OR
      company_name ILIKE '%' || p_customer_name || '%'
    )
  ORDER BY 
    CASE WHEN is_primary THEN 1 ELSE 2 END,
    full_name
  LIMIT 20;
  
  -- Get relevant geofences
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'type', geofence_type,
      'address', address,
      'usage_count', usage_count,
      'latitude', center_latitude,
      'longitude', center_longitude,
      'radius', radius_meters
    ) ORDER BY usage_count DESC, name
  ) INTO suggested_geofences
  FROM enhanced_geofences
  WHERE tenant_id = p_tenant_id
    AND is_active = true
  LIMIT 50;
  
  -- Get relevant order templates
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', template_name,
      'description', description,
      'type', template_type,
      'usage_count', usage_count
    ) ORDER BY usage_count DESC, template_name
  ) INTO suggested_templates
  FROM order_templates
  WHERE tenant_id = p_tenant_id
    AND is_active = true
  LIMIT 20;
  
  -- Build comprehensive result
  result := jsonb_build_object(
    'transporters', COALESCE(suggested_transporters, '[]'),
    'contacts', COALESCE(suggested_contacts, '[]'),
    'geofences', COALESCE(suggested_geofences, '[]'),
    'templates', COALESCE(suggested_templates, '[]'),
    'generated_at', to_jsonb(NOW())
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE transporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_contacts ENABLE ROW LEVEL SECURITY;

-- Transporters policies
CREATE POLICY "Users can view transporters in their tenant" ON transporters
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage transporters in their tenant" ON transporters
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Contacts policies
CREATE POLICY "Users can view contacts in their tenant" ON contacts
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage contacts in their tenant" ON contacts
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Enhanced geofences policies
CREATE POLICY "Users can view geofences in their tenant" ON enhanced_geofences
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage geofences in their tenant" ON enhanced_geofences
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Order templates policies
CREATE POLICY "Users can view templates in their tenant" ON order_templates
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own templates" ON order_templates
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    ) AND (
      created_by = auth.uid() OR 
      is_public = true
    )
  );

-- Order contacts policies  
CREATE POLICY "Users can view order contacts in their tenant" ON order_contacts
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage order contacts in their tenant" ON order_contacts
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders WHERE tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Grant permissions
GRANT ALL ON transporters TO authenticated;
GRANT ALL ON contacts TO authenticated;
GRANT ALL ON enhanced_geofences TO authenticated;
GRANT ALL ON order_templates TO authenticated;
GRANT ALL ON order_contacts TO authenticated;

GRANT EXECUTE ON FUNCTION suggest_best_transporter TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_creation_suggestions TO authenticated;

-- Comments
COMMENT ON TABLE transporters IS 'Enhanced transporter management with comprehensive business information';
COMMENT ON TABLE contacts IS 'Comprehensive contact management for customers, suppliers, and internal users';
COMMENT ON TABLE enhanced_geofences IS 'Enhanced geofence management with improved search and categorization';
COMMENT ON TABLE order_templates IS 'Pre-configured order templates for streamlined order creation';
COMMENT ON TABLE order_contacts IS 'Many-to-many relationship between orders and contacts';

COMMENT ON FUNCTION learn_transporter_from_order() IS 'Automatically learns and saves transporter information from order metadata';
COMMENT ON FUNCTION suggest_best_transporter(uuid, text, text, text) IS 'Suggests the best transporter based on performance, preferences, and service compatibility';
COMMENT ON FUNCTION get_order_creation_suggestions(uuid, text, text, text) IS 'Provides comprehensive suggestions for order creation including transporters, contacts, geofences, and templates';