// Shared TypeScript types for the logistics system

export type UserRole = "admin" | "dispatcher" | "driver";

export type OrderStatus =
  | "pending"
  | "assigned"
  | "activated"
  | "in_progress"
  | "in_transit"
  | "arrived"
  | "loading"
  | "loaded"
  | "unloading"
  | "completed"
  | "cancelled";

export type IncidentType =
  | "delay"
  | "mechanical"
  | "traffic"
  | "weather"
  | "accident"
  | "other";

export type NotificationType =
  | "status_change"
  | "sla_risk"
  | "geofence_breach"
  | "incident"
  | "message";

export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * IMPORTANT: PostGIS Geography Columns
 *
 * The database stores locations as PostGIS GEOGRAPHY(POINT) which Supabase
 * returns as WKT strings: "SRID=4326;POINT(longitude latitude)"
 *
 * When fetching orders from Supabase, location fields will be strings!
 * Use the locationUtils helper functions to convert:
 *
 * ```typescript
 * import { parsePostGISPoint } from './locationUtils';
 *
 * const location = parsePostGISPoint(order.loading_point_location);
 * console.log(location.latitude, location.longitude);
 * ```
 *
 * When creating/updating orders, use toPostGISPoint():
 *
 * ```typescript
 * import { toPostGISPoint } from './locationUtils';
 *
 * const wkt = toPostGISPoint({ latitude: -26.2041, longitude: 28.0473 });
 * // Inserts as: "SRID=4326;POINT(28.0473 -26.2041)"
 * ```
 */

export interface TimeWindow {
  start: string;
  end: string;
}

export interface DeliveryPoint {
  name: string;
  address: string;
  location: Location;
  timeWindow?: TimeWindow;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  tenant_id: string;
  is_active: boolean;
  device_token?: string;
  last_location?: Location;
  last_location_update?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain?: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransporterSupplier {
  name: string;
  contact_phone?: string;
  contact_email?: string;
  cost_amount?: number;
  cost_currency?: string;
  notes?: string;
}

export interface Order {
  id: string;
  tenant_id: string;
  order_number: string;
  sku?: string;
  qr_code_data: string;
  qr_code_signature: string;
  qr_code_expires_at?: string;
  status: OrderStatus;
  assigned_driver_id?: string;
  assigned_driver?: {
    id: string;
    full_name: string;
  };
  loading_point_name: string;
  loading_point_address: string;
  loading_point_location: string | Location; // PostGIS returns as WKT string, parse with parsePostGISPoint()
  loading_time_window_start?: string;
  loading_time_window_end?: string;
  unloading_point_name: string;
  unloading_point_address: string;
  unloading_point_location: string | Location; // PostGIS returns as WKT string, parse with parsePostGISPoint()
  unloading_time_window_start?: string;
  unloading_time_window_end?: string;
  // Legacy coordinate fields for backward compatibility
  destination_lat?: number | null;
  destination_lng?: number | null;
  waypoints?: DeliveryPoint[];
  delivery_instructions?: string;
  special_handling_instructions?: string;
  contact_name?: string;
  contact_phone?: string;
  estimated_distance_km?: number;
  estimated_duration_minutes?: number;
  actual_start_time?: string;
  actual_end_time?: string;
  load_activated_at?: string;
  // Transporter supplier information
  transporter_supplier?: TransporterSupplier;
  metadata?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LocationUpdate {
  id: string;
  order_id: string;
  driver_id: string;
  location: Location; // PostGIS point for backward compatibility
  latitude: number;  // Direct coordinate fields for easier access
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
  timestamp: string;
  created_at: string;
  is_manual_update?: boolean;
  // Joined data from queries
  driver?: {
    id: string;
    full_name: string;
    email: string;
  };
  order?: {
    id: string;
    order_number: string;
    status: string;
  };
}

// Alias for backward compatibility
export type TrackingUpdate = LocationUpdate;

export interface StatusUpdate {
  id: string;
  order_id: string;
  driver_id: string;
  status: OrderStatus;
  location?: Location;
  notes?: string;
  photo_urls?: string[];
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Incident {
  id: string;
  order_id: string;
  driver_id: string;
  incident_type: IncidentType;
  title: string;
  description?: string;
  status: "open" | "investigating" | "resolved";
  priority: "low" | "medium" | "high" | "critical";
  severity: "low" | "medium" | "high" | "critical";  // Add severity field
  location?: Location;
  photo_urls?: string[];
  resolution_notes?: string;
  resolved_at?: string;
  is_resolved?: boolean;  // Add is_resolved field
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  sender: {
    id: string;
    full_name: string;
    role: UserRole;
  };
  content: string;
  message_text: string;  // Add message_text field
  recipient?: {          // Add recipient field
    id: string;
    full_name: string;
    role: UserRole;
  };
  attachment_urls?: string[];
  is_read: boolean;
  created_at: string;
}

export interface Geofence {
  id: string;
  name: string;
  type: "loading_point" | "unloading_point" | "waypoint" | "custom";
  center: Location;
  radius: number; // in meters
  radius_meters?: number; // Alternative field name for compatibility
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeofenceEvent {
  id: string;
  order_id: string;
  driver_id: string;
  event_type: "enter" | "exit";
  geofence_type: "loading_point" | "unloading_point" | "waypoint";
  location: Location;
  created_at: string;
}

export interface DeliveryProof {
  id: string;
  order_id: string;
  driver_id: string;
  proof_type: "photo" | "signature" | "note";
  content: string; // URL for photos, base64 for signatures, text for notes
  location?: Location;
  created_at: string;
}

export interface QRCode {
  id: string;
  order_id: string;
  qr_code_data: string;
  status: "active" | "used" | "expired";
  expires_at?: string;
  scanned_at?: string;
  scanned_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LoadActivation {
  id: string;
  order_id: string;
  driver_id: string;
  activated_at: string;
  location?: string; // PostGIS point
  location_address?: string;
  device_info?: Record<string, any>;
  notes?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  order_id?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Form and UI Types
export interface OrderFilters {
  status?: OrderStatus[];
  assigned_driver_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface DashboardStats {
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  active_drivers: number;
}

// Export utility type for form validation
export type RequiredOrderFields = Pick<
  Order,
  | "loading_point_name"
  | "loading_point_address"
  | "loading_point_location"
  | "unloading_point_name"
  | "unloading_point_address"
  | "unloading_point_location"
>;

// Navigation types
export interface RouteInfo {
  origin: Location;
  destination: Location;
  waypoints?: Location[];
  distance?: number;
  duration?: number;
  traffic_info?: any;
}

// Real-time event types
export interface RealtimeOrderUpdate {
  order_id: string;
  status: OrderStatus;
  location?: Location;
  timestamp: string;
}

export interface RealtimeDriverUpdate {
  driver_id: string;
  location: Location;
  order_id?: string;
  timestamp: string;
}