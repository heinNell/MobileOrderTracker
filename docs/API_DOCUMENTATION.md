# API Documentation

## Overview

The Mobile Order Tracker system provides RESTful APIs through Supabase and Edge Functions for managing logistics operations, QR code generation/validation, and real-time tracking.

## Base URLs

- **Supabase API**: `https://your-project.supabase.co/rest/v1`
- **Edge Functions**: `https://your-project.supabase.co/functions/v1`
- **Authentication**: All requests require Bearer token authentication

## Authentication

### Headers Required

```
Authorization: Bearer YOUR_JWT_TOKEN
apikey: YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

### Get Session Token

```javascript
const {
  data: { session },
} = await supabase.auth.getSession();
const token = session.access_token;
```

## Edge Functions

### 1. Generate QR Code

Generates a signed QR code for an order.

**Endpoint:** `POST /functions/v1/generate-qr-code`

**Request Body:**

```json
{
  "orderId": "uuid"
}
```

**Response:**

```json
{
  "success": true,
  "qrCode": {
    "data": "base64_encoded_payload",
    "image": "data:image/png;base64,...",
    "expiresAt": "2024-10-04T12:00:00Z"
  }
}
```

**Permissions:** Admin, Dispatcher

**Example:**

```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/generate-qr-code`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ orderId: "order-uuid" }),
});
```

### 2. Validate QR Code

Validates a scanned QR code and returns order details.

**Endpoint:** `POST /functions/v1/validate-qr-code`

**Request Body:**

```json
{
  "qrCodeData": "base64_encoded_qr_data"
}
```

**Response:**

```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "orderNumber": "ORD-12345",
    "status": "pending",
    "loadingPoint": {
      "name": "Warehouse A",
      "address": "123 Main St",
      "location": { "latitude": 40.7128, "longitude": -74.006 },
      "timeWindow": {
        "start": "2024-10-04T08:00:00Z",
        "end": "2024-10-04T10:00:00Z"
      }
    },
    "unloadingPoint": {
      "name": "Store B",
      "address": "456 Oak Ave",
      "location": { "latitude": 40.7589, "longitude": -73.9851 },
      "timeWindow": {
        "start": "2024-10-04T14:00:00Z",
        "end": "2024-10-04T16:00:00Z"
      }
    },
    "deliveryInstructions": "Handle with care",
    "contact": {
      "name": "John Doe",
      "phone": "+1-555-0123"
    }
  }
}
```

**Permissions:** Driver, Dispatcher, Admin

## Database API (via Supabase Client)

### Orders

#### Create Order

```javascript
const { data, error } = await supabase
  .from("orders")
  .insert({
    tenant_id: "tenant-uuid",
    order_number: "ORD-12345",
    sku: "SKU-001",
    loading_point_name: "Warehouse A",
    loading_point_address: "123 Main St",
    loading_point_location: "POINT(-74.0060 40.7128)",
    unloading_point_name: "Store B",
    unloading_point_address: "456 Oak Ave",
    unloading_point_location: "POINT(-73.9851 40.7589)",
    delivery_instructions: "Handle with care",
    contact_name: "John Doe",
    contact_phone: "+1-555-0123",
  })
  .select()
  .single();
```

#### List Orders

```javascript
const { data, error } = await supabase
  .from("orders")
  .select(
    `
    *,
    assigned_driver:users!orders_assigned_driver_id_fkey(
      id,
      full_name,
      phone
    )
  `
  )
  .order("created_at", { ascending: false })
  .limit(50);
```

#### Update Order Status

```javascript
const { data, error } = await supabase
  .from("orders")
  .update({ status: "in_transit" })
  .eq("id", "order-uuid")
  .select()
  .single();
```

#### Get Order Details

```javascript
const { data, error } = await supabase
  .from("orders")
  .select(
    `
    *,
    assigned_driver:users!orders_assigned_driver_id_fkey(*),
    status_updates(*),
    incidents(*),
    location_updates(*)
  `
  )
  .eq("id", "order-uuid")
  .single();
```

### Location Updates

#### Send Location Update

```javascript
const { data, error } = await supabase.from("location_updates").insert({
  order_id: "order-uuid",
  driver_id: "driver-uuid",
  location: `POINT(${longitude} ${latitude})`,
  accuracy_meters: 10,
  speed_kmh: 55.5,
  heading: 180,
  battery_level: 85,
});
```

#### Get Location History

```javascript
const { data, error } = await supabase
  .from("location_updates")
  .select("*")
  .eq("order_id", "order-uuid")
  .order("timestamp", { ascending: false })
  .limit(100);
```

### Status Updates

#### Create Status Update

```javascript
const { data, error } = await supabase.from("status_updates").insert({
  order_id: "order-uuid",
  driver_id: "driver-uuid",
  status: "loading",
  location: `POINT(${longitude} ${latitude})`,
  notes: "Started loading process",
  photo_urls: ["https://storage.url/photo1.jpg"],
});
```

### Incidents

#### Report Incident

```javascript
const { data, error } = await supabase.from("incidents").insert({
  order_id: "order-uuid",
  driver_id: "driver-uuid",
  incident_type: "traffic",
  title: "Traffic Delay",
  description: "Heavy traffic on Route 95",
  location: `POINT(${longitude} ${latitude})`,
  severity: 2,
  photo_urls: ["https://storage.url/incident.jpg"],
});
```

#### Resolve Incident

```javascript
const { data, error } = await supabase
  .from("incidents")
  .update({
    is_resolved: true,
    resolved_at: new Date().toISOString(),
    resolution_notes: "Traffic cleared, resuming route",
  })
  .eq("id", "incident-uuid");
```

### Messages

#### Send Message

```javascript
const { data, error } = await supabase.from("messages").insert({
  order_id: "order-uuid",
  sender_id: "user-uuid",
  recipient_id: "recipient-uuid",
  message_text: "Arrived at loading point",
  is_template: false,
});
```

#### Get Conversation

```javascript
const { data, error } = await supabase
  .from("messages")
  .select(
    `
    *,
    sender:users!messages_sender_id_fkey(id, full_name),
    recipient:users!messages_recipient_id_fkey(id, full_name)
  `
  )
  .eq("order_id", "order-uuid")
  .order("created_at", { ascending: true });
```

### Notifications

#### Get User Notifications

```javascript
const { data, error } = await supabase
  .from("notifications")
  .select("*")
  .eq("user_id", "user-uuid")
  .eq("is_read", false)
  .order("created_at", { ascending: false })
  .limit(50);
```

#### Mark Notification as Read

```javascript
const { data, error } = await supabase
  .from("notifications")
  .update({
    is_read: true,
    read_at: new Date().toISOString(),
  })
  .eq("id", "notification-uuid");
```

## Real-Time Subscriptions

### Subscribe to Order Updates

```javascript
const channel = supabase
  .channel("order-updates")
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "orders",
      filter: `id=eq.${orderId}`,
    },
    (payload) => {
      console.log("Order updated:", payload.new);
    }
  )
  .subscribe();
```

### Subscribe to Location Updates

```javascript
const channel = supabase
  .channel("location-updates")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "location_updates",
      filter: `order_id=eq.${orderId}`,
    },
    (payload) => {
      console.log("New location:", payload.new);
    }
  )
  .subscribe();
```

### Subscribe to Status Changes

```javascript
const channel = supabase
  .channel("status-updates")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "status_updates",
    },
    (payload) => {
      console.log("Status updated:", payload.new);
    }
  )
  .subscribe();
```

### Subscribe to New Messages

```javascript
const channel = supabase
  .channel("messages")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `recipient_id=eq.${userId}`,
    },
    (payload) => {
      console.log("New message:", payload.new);
    }
  )
  .subscribe();
```

## File Upload (Photos/Videos)

### Upload Incident Photo

```javascript
const file = /* File from camera/gallery */;
const fileName = `${Date.now()}-${file.name}`;
const filePath = `incidents/${orderId}/${fileName}`;

const { data, error } = await supabase.storage
  .from('incident-photos')
  .upload(filePath, file);

if (data) {
  const { data: { publicUrl } } = supabase.storage
    .from('incident-photos')
    .getPublicUrl(filePath);

  // Save publicUrl to incident record
}
```

## Error Handling

All API responses follow standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

**Error Response Format:**

```json
{
  "error": "Error message description",
  "details": "Additional error details"
}
```

## Rate Limiting

- Edge Functions: 100 requests/minute per user
- Database API: 500 requests/minute per user
- Real-time subscriptions: 100 concurrent connections per user

## Best Practices

1. **Batch Location Updates**: Instead of sending every location change, batch updates every 30 seconds
2. **Use Realtime Sparingly**: Subscribe only to data you need
3. **Implement Retry Logic**: Add exponential backoff for failed requests
4. **Cache Data**: Cache order details locally to reduce API calls
5. **Handle Offline**: Queue updates when offline and sync when connected
6. **Optimize Queries**: Use `select()` to only fetch needed columns
7. **Clean Up Subscriptions**: Always unsubscribe when component unmounts

## Example: Complete Order Flow

```javascript
// 1. Create order (Dashboard)
const { data: order } = await supabase
  .from("orders")
  .insert({
    /* order data */
  })
  .select()
  .single();

// 2. Generate QR code (Dashboard)
const qrCode = await generateQRCode(order.id);

// 3. Scan QR code (Mobile)
const result = await validateQRCode(qrCodeData);

// 4. Start tracking (Mobile)
await LocationService.startTracking(order.id);

// 5. Subscribe to updates (Dashboard)
const channel = supabase
  .channel(`order:${order.id}`)
  .on(
    "postgres_changes",
    {
      /* config */
    },
    handleUpdate
  )
  .subscribe();

// 6. Update status (Mobile)
await supabase
  .from("status_updates")
  .insert({ order_id: order.id, status: "in_transit" });

// 7. Complete delivery (Mobile)
await supabase
  .from("orders")
  .update({ status: "completed", actual_end_time: new Date() })
  .eq("id", order.id);
```

## Support

For API questions or issues:

- Check Supabase logs in dashboard
- Review Row Level Security policies
- Test with Postman or similar tool
- Contact support team
