// Shared TypeScript types for the logistics system

export type UserRole = "admin" | "dispatcher" | "driver";

export type OrderStatus =
  | "pending"
  | "assigned"
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
  waypoints?: DeliveryPoint[];
  delivery_instructions?: string;
  special_handling_instructions?: string;
  contact_name?: string;
  contact_phone?: string;
  estimated_distance_km?: number;
  estimated_duration_minutes?: number;
  actual_start_time?: string;
  actual_end_time?: string;
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
  location: Location;
  accuracy_meters?: number;
  speed_kmh?: number;
  heading?: number;
  battery_level?: number;
  timestamp: string;
  created_at: string;
}

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
  description: string;
  location: Location;
  severity: number;
  photo_urls?: string[];
  video_urls?: string[];
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  sender?: User;
  recipient_id?: string;
  recipient?: User;
  message_text: string;
  is_template: boolean;
  is_read: boolean;
  read_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  order_id?: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Geofence {
  id: string;
  tenant_id: string;
  name: string;
  location: Location;
  radius_meters: number;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  order_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface QRCodeResponse {
  data: string;
  image: string;
  expiresAt: string;
}

export interface OrderDetailsResponse {
  order: Order;
  recentUpdates: StatusUpdate[];
  incidents: Incident[];
  locationUpdates: LocationUpdate[];
}

// Template messages for quick status updates
export const STATUS_TEMPLATES = {
  arrived: "Arrived at location",
  loading: "Started loading",
  loaded: "Loading completed",
  departed: "Departed from location",
  delayed: "Experiencing delay",
  on_route: "On route to destination",
  unloading: "Started unloading",
  completed: "Delivery completed",
} as const;

// Status color mapping for UI
export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#6B7280",
  assigned: "#3B82F6",
  in_transit: "#8B5CF6",
  arrived: "#10B981",
  loading: "#F59E0B",
  loaded: "#10B981",
  unloading: "#F59E0B",
  completed: "#059669",
  cancelled: "#EF4444",
};

// Incident severity levels
export const INCIDENT_SEVERITY = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
  5: "Emergency",
} as const;
