
// src/shared/types.js
// Shared JavaScript types (via JSDoc) and constants for the mobile logistics app

/**
 * @typedef {"admin" | "dispatcher" | "driver"} UserRole
 */

/**
 * @typedef {"pending" | "assigned" | "activated" | "in_progress" | "in_transit" | "arrived" | "loading" | "loaded" | "unloading" | "completed" | "cancelled"} OrderStatus
 */

/**
 * @typedef {"delay" | "mechanical" | "traffic" | "weather" | "accident" | "other"} IncidentType
 */

/**
 * @typedef {"status_change" | "sla_risk" | "geofence_breach" | "incident" | "message"} NotificationType
 */

/**
 * Simple location coordinates for mobile (compatible with Expo location).
 * @typedef {Object} Location
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * Time window for deliveries.
 * @typedef {Object} TimeWindow
 * @property {string} start
 * @property {string} end
 */

/**
 * Delivery point details.
 * @typedef {Object} DeliveryPoint
 * @property {string} name
 * @property {string} address
 * @property {Location} location
 * @property {TimeWindow} [timeWindow]
 */

/**
 * User profile.
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} full_name
 * @property {string} [phone]
 * @property {UserRole} role
 * @property {string} tenant_id
 * @property {boolean} is_active
 * @property {string} [device_token]
 * @property {Location} [last_location]
 * @property {string} [last_location_update]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Tenant (organization) details.
 * @typedef {Object} Tenant
 * @property {string} id
 * @property {string} name
 * @property {string} [subdomain]
 * @property {Object.<string, any>} settings
 * @property {boolean} is_active
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Order details.
 * Note: Location fields are WKT strings from Supabase; use parsePostGISPoint() to convert.
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} tenant_id
 * @property {string} order_number
 * @property {string} [sku]
 * @property {string} qr_code_data
 * @property {string} qr_code_signature
 * @property {string} [qr_code_expires_at]
 * @property {OrderStatus} status
 * @property {string} [assigned_driver_id]
 * @property {{ id: string, full_name: string }} [assigned_driver]
 * @property {string} loading_point_name
 * @property {string} loading_point_address
 * @property {string | Location} loading_point_location
 * @property {string} [loading_time_window_start]
 * @property {string} [loading_time_window_end]
 * @property {string} unloading_point_name
 * @property {string} unloading_point_address
 * @property {string | Location} unloading_point_location
 * @property {string} [unloading_time_window_start]
 * @property {string} [unloading_time_window_end]
 * @property {DeliveryPoint[]} [waypoints]
 * @property {string} [delivery_instructions]
 * @property {string} [special_handling_instructions]
 * @property {string} [contact_name]
 * @property {string} [contact_phone]
 * @property {number} [estimated_distance_km]
 * @property {number} [estimated_duration_minutes]
 * @property {string} [actual_start_time]
 * @property {string} [actual_end_time]
 * @property {Object.<string, any>} [metadata]
 * @property {string} [created_by]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Location update log.
 * @typedef {Object} LocationUpdate
 * @property {string} id
 * @property {string} order_id
 * @property {string} driver_id
 * @property {Location} location
 * @property {number} [accuracy_meters]
 * @property {number} [speed_kmh]
 * @property {number} [heading]
 * @property {number} [battery_level]
 * @property {string} timestamp
 * @property {string} created_at
 */

/**
 * Status update log.
 * @typedef {Object} StatusUpdate
 * @property {string} id
 * @property {string} order_id
 * @property {string} driver_id
 * @property {OrderStatus} status
 * @property {Location} [location]
 * @property {string} [notes]
 * @property {string[]} [photo_urls]
 * @property {Object.<string, any>} [metadata]
 * @property {string} created_at
 */

/**
 * Incident report.
 * @typedef {Object} Incident
 * @property {string} id
 * @property {string} order_id
 * @property {string} driver_id
 * @property {IncidentType} incident_type
 * @property {string} title
 * @property {string} description
 * @property {Location} location
 * @property {number} severity
 * @property {string[]} [photo_urls]
 * @property {string[]} [video_urls]
 * @property {boolean} is_resolved
 * @property {string} [resolved_at]
 * @property {string} [resolved_by]
 * @property {string} [resolution_notes]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Message between users.
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} order_id
 * @property {string} sender_id
 * @property {User} [sender]
 * @property {string} [recipient_id]
 * @property {User} [recipient]
 * @property {string} message_text
 * @property {boolean} is_template
 * @property {boolean} is_read
 * @property {string} [read_at]
 * @property {Object.<string, any>} [metadata]
 * @property {string} created_at
 */

/**
 * Notification for users.
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} tenant_id
 * @property {string} user_id
 * @property {string} [order_id]
 * @property {NotificationType} notification_type
 * @property {string} title
 * @property {string} message
 * @property {boolean} is_read
 * @property {string} [read_at]
 * @property {Object.<string, any>} [metadata]
 * @property {string} created_at
 */

/**
 * Geofence area.
 * @typedef {Object} Geofence
 * @property {string} id
 * @property {string} tenant_id
 * @property {string} name
 * @property {Location} location
 * @property {number} radius_meters
 * @property {boolean} is_active
 * @property {Object.<string, any>} [metadata]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * Audit log entry.
 * @typedef {Object} AuditLog
 * @property {string} id
 * @property {string} tenant_id
 * @property {string} [user_id]
 * @property {string} [order_id]
 * @property {string} action
 * @property {string} resource_type
 * @property {string} [resource_id]
 * @property {Object.<string, any>} [old_values]
 * @property {Object.<string, any>} [new_values]
 * @property {string} [ip_address]
 * @property {string} [user_agent]
 * @property {string} created_at
 */

/**
 * @template T
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {T} [data]
 * @property {string} [error]
 * @property {string} [message]
 */

/**
 * @typedef {Object} QRCodeResponse
 * @property {string} data
 * @property {string} image
 * @property {string} expiresAt
 */

/**
 * @typedef {Object} OrderDetailsResponse
 * @property {Order} order
 * @property {StatusUpdate[]} recentUpdates
 * @property {Incident[]} incidents
 * @property {LocationUpdate[]} locationUpdates
 */

// Template messages for quick status updates
export const STATUS_TEMPLATES = Object.freeze({
  arrived: "Arrived at location",
  loading: "Started loading",
  loaded: "Loading completed",
  departed: "Departed from location",
  delayed: "Experiencing delay",
  on_route: "On route to destination",
  unloading: "Started unloading",
  completed: "Delivery completed",
});

// Status color mapping for UI
/** @type {Readonly<Object.<OrderStatus, string>>} */
export const STATUS_COLORS = Object.freeze({
  pending: "#6B7280",
  assigned: "#3B82F6",
  in_transit: "#8B5CF6",
  arrived: "#10B981",
  loading: "#F59E0B",
  loaded: "#10B981",
  unloading: "#F59E0B",
  completed: "#059669",
  cancelled: "#EF4444",
});

// Incident severity levels
/** @type {Readonly<Object.<number, string>>} */
export const INCIDENT_SEVERITY = Object.freeze({
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
  5: "Emergency",
});
