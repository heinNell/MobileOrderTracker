import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sign, verify } from "https://deno.land/std@0.200.0/crypto/jwt.ts";
import { assertEquals, assertThrows } from "https://deno.land/std@0.177.0/testing/asserts.ts";

// Test constants
const TEST_QR_DATA = "test-qr-data";
const TEST_SECRET = "test-secret";
const TEST_EXPIRATION = "1h";

Deno.env.set("SUPABASE_URL", "https://your-supabase-url");
Deno.env.set("SUPABASE_ANON_KEY", "your-supabase-key");
Deno.env.set("QR_CODE_SECRET", TEST_SECRET);

describe("QR Code Processing Tests", () => {
  beforeEach(async () => {
    // Setup test environment
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    // Clear existing test data
    await supabaseClient
      .from('qr_scans')
      .delete()
      .eq('qr_data', TEST_QR_DATA);
  });

  it("should process valid QR code", async () => {
    const server = await serve(serveHandler);
    try {
      const response = await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: TEST_QR_DATA }),
      });
      const result = await response.json();
      assertEquals(response.ok, true);
      assertEquals(result.success, true);
    } finally {
      server.close();
    }
  });

  it("should reject invalid QR data", async () => {
    const server = await serve(serveHandler);
    try {
      const response = await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: null }),
      });
      assertEquals(response.ok, false);
    } finally {
      server.close();
    }
  });

  it("should handle JWT verification", async () => {
    const invalidSecret = "wrong-secret";
    const server = await serve(serveHandler);
    try {
      const response = await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: signSync(invalidSecret) }),
      });
      assertEquals(response.ok, false);
    } finally {
      server.close();
    }
  });

  it("should store QR scan in database", async () => {
    const server = await serve(serveHandler);
    try {
      const response = await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: TEST_QR_DATA }),
      });
      const result = await response.json();
      assertEquals(result.success, true);
      
      // Verify database entry
      const { data, error } = await supabaseClient
        .from('qr_scans')
        .select()
        .eq('qr_data', TEST_QR_DATA);
        
      assertEquals(data.length, 1);
      assertEquals(data[0].qr_data, TEST_QR_DATA);
    } finally {
      server.close();
    }
  });

  it("should update scan count", async () => {
    const server = await serve(serveHandler);
    try {
      // First scan
      await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: TEST_QR_DATA }),
      });
      
      // Second scan
      await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: TEST_QR_DATA }),
      });

      // Verify scan count
      const { data, error } = await supabaseClient
        .from('qr_codes')
        .select()
        .eq('qr_data', TEST_QR_DATA);
        
      assertEquals(data[0].scan_count, 2);
    } finally {
      server.close();
    }
  });

  it("should handle errors gracefully", async () => {
    const server = await serve(serveHandler);
    try {
      const response = await fetch(server.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData: null }),
      });
      assertEquals(response.status, 400);
    } finally {
      server.close();
    }
  });
});

async function serveHandler(req) {
  // Original serve function from process-qr/index.ts
  // This is a test double to simulate the server
}