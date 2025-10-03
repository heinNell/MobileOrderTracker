-- MobileOrderTracker Database Schema
-- Comprehensive logistics management system with QR code integration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver');
CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'in_transit', 'arrived', 'loading', 'loaded', 'unloading', 'completed', 'cancelled');
CREATE TYPE incident_type AS ENUM ('delay', 'mechanical', 'traffic', 'weather', 'accident', 'other');
CREATE TYPE notification_type AS ENUM ('status_change', 'sla_risk', 'geofence_breach', 'incident', 'message');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'driver',
    tenant_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    device_token TEXT,
    last_location GEOGRAPHY(POINT),
    last_location_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants/Organizations table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_number TEXT UNIQUE NOT NULL,
    sku TEXT,
    qr_code_data TEXT UNIQUE NOT NULL,
    qr_code_signature TEXT NOT NULL,
    qr_code_expires_at TIMESTAMPTZ,
    
    -- Order details
    status order_status DEFAULT 'pending',
    assigned_driver_id UUID REFERENCES users(id),
    
    -- Locations
    loading_point_name TEXT NOT NULL,
    loading_point_address TEXT NOT NULL,
    loading_point_location GEOGRAPHY(POINT) NOT NULL,
    loading_time_window_start TIMESTAMPTZ,
    loading_time_window_end TIMESTAMPTZ,
    
    unloading_point_name TEXT NOT NULL,
    unloading_point_address TEXT NOT NULL,
    unloading_point_location GEOGRAPHY(POINT) NOT NULL,
    unloading_time_window_start TIMESTAMPTZ,
    unloading_time_window_end TIMESTAMPTZ,
    
    -- Additional stops (JSONB array)
    waypoints JSONB DEFAULT '[]',
    
    -- Instructions and requirements
    delivery_instructions TEXT,
    special_handling_instructions TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    
    -- Tracking
    estimated_distance_km NUMERIC(10, 2),
    estimated_duration_minutes INTEGER,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_time_windows CHECK (
        loading_time_window_start < loading_time_window_end AND
        unloading_time_window_start < unloading_time_window_end
    )
);

-- Location tracking table (high-frequency updates)
CREATE TABLE public.location_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id),
    location GEOGRAPHY(POINT) NOT NULL,
    accuracy_meters NUMERIC(10, 2),
    speed_kmh NUMERIC(10, 2),
    heading NUMERIC(5, 2),
    battery_level INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status updates and milestones
CREATE TABLE public.status_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id),
    status order_status NOT NULL,
    location GEOGRAPHY(POINT),
    notes TEXT,
    photo_urls TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident reports
CREATE TABLE public.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id),
    incident_type incident_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    severity INTEGER DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
    photo_urls TEXT[],
    video_urls TEXT[],
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages between drivers and dispatch
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    message_text TEXT NOT NULL,
    is_template BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofences
CREATE TABLE public.geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    radius_meters NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_driver ON orders(assigned_driver_id);
CREATE INDEX idx_orders_qr_code ON orders(qr_code_data);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX idx_location_updates_order ON location_updates(order_id);
CREATE INDEX idx_location_updates_driver ON location_updates(driver_id);
CREATE INDEX idx_location_updates_timestamp ON location_updates(timestamp DESC);
CREATE INDEX idx_location_updates_location ON location_updates USING GIST(location);

CREATE INDEX idx_status_updates_order ON status_updates(order_id);
CREATE INDEX idx_status_updates_created_at ON status_updates(created_at DESC);

CREATE INDEX idx_incidents_order ON incidents(order_id);
CREATE INDEX idx_incidents_driver ON incidents(driver_id);
CREATE INDEX idx_incidents_resolved ON incidents(is_resolved);

CREATE INDEX idx_messages_order ON messages(order_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users in tenant" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.tenant_id = users.tenant_id 
            AND u.role = 'admin'
        )
    );

-- Orders policies
CREATE POLICY "Users can view orders in their tenant" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.tenant_id = orders.tenant_id
        )
    );

CREATE POLICY "Drivers can view assigned orders" ON orders
    FOR SELECT USING (assigned_driver_id = auth.uid());

CREATE POLICY "Admins and dispatchers can insert orders" ON orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.tenant_id = orders.tenant_id 
            AND u.role IN ('admin', 'dispatcher')
        )
    );

CREATE POLICY "Admins and dispatchers can update orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.tenant_id = orders.tenant_id 
            AND u.role IN ('admin', 'dispatcher')
        )
    );

-- Location updates policies
CREATE POLICY "Drivers can insert their location updates" ON location_updates
    FOR INSERT WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Users can view location updates for orders in their tenant" ON location_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN users u ON u.tenant_id = o.tenant_id
            WHERE o.id = location_updates.order_id
            AND u.id = auth.uid()
        )
    );

-- Status updates policies
CREATE POLICY "Drivers can insert status updates" ON status_updates
    FOR INSERT WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Users can view status updates for orders in their tenant" ON status_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN users u ON u.tenant_id = o.tenant_id
            WHERE o.id = status_updates.order_id
            AND u.id = auth.uid()
        )
    );

-- Incidents policies
CREATE POLICY "Drivers can insert incidents" ON incidents
    FOR INSERT WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Users can view incidents for orders in their tenant" ON incidents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN users u ON u.tenant_id = o.tenant_id
            WHERE o.id = incidents.order_id
            AND u.id = auth.uid()
        )
    );

CREATE POLICY "Admins can update incidents" ON incidents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM orders o
            JOIN users u ON u.tenant_id = o.tenant_id
            WHERE o.id = incidents.order_id
            AND u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Messages policies
CREATE POLICY "Users can view their messages" ON messages
    FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Functions and triggers

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_geofences_updated_at BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        tenant_id,
        user_id,
        order_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values
    ) VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        auth.uid(),
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for important tables
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_incidents AFTER INSERT OR UPDATE OR DELETE ON incidents
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Function to notify on status change
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        -- Create notification for assigned driver
        IF NEW.assigned_driver_id IS NOT NULL THEN
            INSERT INTO notifications (
                tenant_id,
                user_id,
                order_id,
                notification_type,
                title,
                message,
                metadata
            ) VALUES (
                NEW.tenant_id,
                NEW.assigned_driver_id,
                NEW.id,
                'status_change',
                'Order Status Updated',
                format('Order %s status changed from %s to %s', NEW.order_number, OLD.status, NEW.status),
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
            );
        END IF;
        
        -- Notify admins and dispatchers in tenant
        INSERT INTO notifications (
            tenant_id,
            user_id,
            order_id,
            notification_type,
            title,
            message,
            metadata
        )
        SELECT 
            NEW.tenant_id,
            u.id,
            NEW.id,
            'status_change',
            'Order Status Updated',
            format('Order %s status changed from %s to %s', NEW.order_number, OLD.status, NEW.status),
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
        FROM users u
        WHERE u.tenant_id = NEW.tenant_id 
        AND u.role IN ('admin', 'dispatcher')
        AND u.id != auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_status_change 
    AFTER UPDATE ON orders
    FOR EACH ROW 
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION notify_status_change();

-- Realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE location_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE status_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
