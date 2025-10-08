// utils/qrCodeGenerator.ts
import QRCode from "qrcode";
import { supabase } from "../lib/supabase";

// Interface for complex QR code payload
interface ComplexQRPayload {
  orderId: string;
  timestamp: number;
  signature: string;
  tenantId?: string;
  orderNumber?: string;
}

// Interface for QR generation options
interface QRGenerationOptions {
  width?: number;
  height?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Generate a simple QR code containing just an order ID or identifier
 */
export const generateSimpleQRCode = async (
  orderId: string,
  options: QRGenerationOptions = {}
): Promise<string> => {
  try {
    const defaultOptions = {
      width: 256,
      height: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M" as const,
      ...options,
    };

    // Generate QR code with the order ID
    const qrCodeDataURL = await QRCode.toDataURL(orderId, defaultOptions);

    console.log("Simple QR code generated for order:", orderId);
    return qrCodeDataURL;
  } catch (error) {
    console.error("Error generating simple QR code:", error);
    throw new Error("Failed to generate QR code");
  }
};

/**
 * Generate a complex QR code with encrypted payload
 * Updated to accept a pre-created payload with timestamp for consistency
 */
export const generateComplexQRCode = async (
  orderId: string,
  tenantId?: string,
  orderNumber?: string,
  options: QRGenerationOptions = {},
  preCreatedPayload?: ComplexQRPayload
): Promise<string> => {
  try {
    let fullPayload: ComplexQRPayload;

    if (preCreatedPayload) {
      // Use the pre-created payload to ensure timestamp consistency
      fullPayload = preCreatedPayload;
    } else {
      // Create new payload (fallback for backward compatibility)
      const timestamp = Date.now();
      const payload: Omit<ComplexQRPayload, "signature"> = {
        orderId,
        timestamp,
        tenantId,
        orderNumber,
      };
      const signature = await createSignature(payload);
      fullPayload = { ...payload, signature };
    }

    // Encode payload as base64
    const payloadString = JSON.stringify(fullPayload);
    const base64Payload = btoa(payloadString);

    const defaultOptions = {
      width: 256,
      height: 256,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H" as const, // Higher error correction for complex data
      ...options,
    };

    // Generate QR code with the base64 payload
    const qrCodeDataURL = await QRCode.toDataURL(base64Payload, defaultOptions);

    console.log("Complex QR code generated for order:", orderId);
    return qrCodeDataURL;
  } catch (error) {
    console.error("Error generating complex QR code:", error);
    throw new Error("Failed to generate complex QR code");
  }
};

/**
 * Create signature for QR code payload
 * This should match the signature verification in your edge function
 */
async function createSignature(
  payload: Omit<ComplexQRPayload, "signature">
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "create-qr-signature",
      {
        body: {
          orderId: payload.orderId,
          timestamp: payload.timestamp,
          tenantId: payload.tenantId,
        },
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    return data.signature;
  } catch (error) {
    console.error("Error creating signature:", error);
    throw new Error("Failed to create signature");
  }
}

/**
 * Generate QR code and save to order record
 * FIXED: Ensures timestamp consistency between QR generation and database storage
 */
export const generateAndSaveQRCode = async (
  orderId: string,
  type: "simple" | "complex" = "simple",
  options: QRGenerationOptions = {}
): Promise<{ qrCodeUrl: string; qrCodeData: string }> => {
  try {
    // Fetch order details
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      throw new Error("Order not found");
    }

    let qrCodeUrl: string;
    let qrCodeData: string;

    if (type === "complex") {
      // FIXED: Use consistent timestamp for both QR generation and storage
      const timestamp = Date.now();

      // Create payload with the consistent timestamp
      const payload = {
        orderId,
        timestamp,
        tenantId: order.tenant_id,
        orderNumber: order.order_number,
      };

      // Get signature for this payload
      const signature = await createSignature(payload);
      const fullPayload = { ...payload, signature };

      // Generate QR code using the same payload
      qrCodeUrl = await generateComplexQRCode(
        orderId,
        order.tenant_id,
        order.order_number,
        options,
        fullPayload // Pass the full payload to ensure consistency
      );

      // Store the same payload data
      qrCodeData = btoa(JSON.stringify(fullPayload));
    } else {
      // For simple QR, use a unique identifier
      qrCodeData = `ORDER_${orderId}_${Date.now()}`;
      qrCodeUrl = await generateSimpleQRCode(qrCodeData, options);
    }

    // Update order with QR code data
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        qr_code_data: qrCodeData,
        qr_code_type: type,
        qr_code_generated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error("Failed to save QR code data");
    }

    console.log(`${type} QR code generated and saved for order:`, orderId);

    return {
      qrCodeUrl,
      qrCodeData,
    };
  } catch (error) {
    console.error("Error generating and saving QR code:", error);
    throw error;
  }
};

/**
 * Batch generate QR codes for multiple orders
 */
export const batchGenerateQRCodes = async (
  orderIds: string[],
  type: "simple" | "complex" = "simple",
  options: QRGenerationOptions = {}
): Promise<
  Array<{
    orderId: string;
    qrCodeUrl: string;
    qrCodeData: string;
    error?: string;
  }>
> => {
  const results = [];

  for (const orderId of orderIds) {
    try {
      const result = await generateAndSaveQRCode(orderId, type, options);
      results.push({
        orderId,
        ...result,
      });
    } catch (error) {
      results.push({
        orderId,
        qrCodeUrl: "",
        qrCodeData: "",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
};

/**
 * Validate QR code format
 */
export const validateQRCodeFormat = (
  qrData: string
): { isValid: boolean; type: "simple" | "complex" | "unknown" } => {
  try {
    // Try to decode as base64 JSON (complex QR)
    const decodedString = atob(qrData);
    const parsed = JSON.parse(decodedString);

    // Check if it has the expected complex QR structure
    if (parsed.orderId && parsed.timestamp && parsed.signature) {
      return { isValid: true, type: "complex" };
    }

    return { isValid: false, type: "unknown" };
  } catch (error) {
    // Not a complex QR, check if it's a simple format
    if (qrData && typeof qrData === "string" && qrData.length > 0) {
      return { isValid: true, type: "simple" };
    }

    return { isValid: false, type: "unknown" };
  }
};
