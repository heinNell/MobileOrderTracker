# QR Code Processing API Documentation

## Overview
The QR code processing system provides secure and efficient QR code generation, scanning, and validation. It integrates with Supabase for robust data management and security.

## Endpoints

### 1. Process QR Code
**POST /process-qr**

Processes a QR code scan, validates it, and stores the scan data.

**Request Body:**
```json
{
  "qrData": "string" // The QR code data to process
}
```

**Response:**
```json
{
  "success": boolean, // Indicates if the QR code was processed successfully
  "data": object,    // Scan data including timestamp and metadata
  "message": string // Processing message
}
```

**Error Responses:**
- **400 Bad Request:** Invalid QR data or missing required fields
- **401 Unauthorized:** Missing or invalid authentication
- **500 Internal Server Error:** Server-side error during processing

## Security Features

1. **JWT Verification:** All QR codes are signed with a secure JWT token to prevent tampering.
2. **Role-Based Access:** Only authorized users can process QR codes.
3. **Data Encryption:** All communications are encrypted using TLS 1.2+.

## Database Schema

### QR Scans Table
```sql
CREATE TABLE qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_data TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### QR Codes Table
```sql
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_payload TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked BOOLEAN DEFAULT FALSE,
  scan_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling
The system provides detailed error messages and status codes to help with debugging and troubleshooting.

## Best Practices
1. Always validate QR codes on the server side after scanning.
2. Use secure JWT secrets and keep them confidential.
3. Implement proper error handling and logging for production use.

## Future Enhancements
- Add support for additional barcode formats
- Implement rate limiting for API requests
- Add real-time analytics and reporting
