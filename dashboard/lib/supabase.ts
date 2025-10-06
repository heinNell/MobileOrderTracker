// Supabase client for dashboard
import { createClient } from "@supabase/supabase-js";
import { handleApiError, handleSuccess } from "./utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Validation for required environment variables
if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Base function to call Edge Functions with authentication
const callEdgeFunction = async (
  functionName: string,
  payload?: any,
  method: string = "POST"
): Promise<any> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Failed to call ${functionName}`);
    }

    return result;
  } catch (error) {
    handleApiError(error, `Error calling ${functionName}`);
    throw error;
  }
};

// 1. Generate QR Code (your existing function)
export const generateQRCode = async (
  orderId: string
): Promise<{
  data: string;
  image: string;
  expiresAt: string;
}> => {
  const result = await callEdgeFunction("generate-qr-code", { orderId });
  return result.qrCode;
};

// 2. Validate QR Code
export const validateQRCode = async (
  qrCodeData: string
): Promise<{
  valid: boolean;
  orderId?: string;
  orderData?: any;
}> => {
  const result = await callEdgeFunction("validate-qr-code", { qrCodeData });
  return result.validation;
};

// 3. Rapid Task - For quick order processing tasks
export const executeRapidTask = async (taskData: {
  taskType: string;
  orderId?: string;
  data?: any;
}): Promise<{
  taskId: string;
  status: string;
  result?: any;
}> => {
  const result = await callEdgeFunction("rapid-task", taskData);
  return result.task;
};

// 4. Swift API - General purpose API for fast operations
export const callSwiftApi = async (apiData: {
  action: string;
  payload?: any;
}): Promise<any> => {
  const result = await callEdgeFunction("swift-api", apiData);
  return result.data;
};

// 5. Smooth Handler - For handling order events and state changes
export const processSmoothHandler = async (handlerData: {
  event: string;
  orderId: string;
  data?: any;
}): Promise<{
  processed: boolean;
  newState?: string;
  message?: string;
}> => {
  const result = await callEdgeFunction("smooth-handler", handlerData);
  return result.handler;
};

// 6. Swift Function - For executing quick functions
export const executeSwiftFunction = async (functionData: {
  functionName: string;
  parameters?: any;
}): Promise<any> => {
  const result = await callEdgeFunction("swift-function", functionData);
  return result.execution;
};

// 7. Maps Service - For location and mapping operations
export const callMapsService = async (mapsData: {
  action: "geocode" | "route" | "nearby" | "distance";
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  address?: string;
  radius?: number;
}): Promise<{
  success: boolean;
  data: any;
}> => {
  const result = await callEdgeFunction("maps-service", mapsData);
  return result.maps;
};

// 8. Swift Action - For executing quick actions on orders
export const executeSwiftAction = async (actionData: {
  action: string;
  orderId: string;
  parameters?: any;
}): Promise<{
  executed: boolean;
  result?: any;
  message?: string;
}> => {
  const result = await callEdgeFunction("swift-action", actionData);
  return result.action;
};

// 9. Swift Task - For task management and execution
export const manageSwiftTask = async (taskData: {
  operation: "create" | "update" | "delete" | "execute";
  taskId?: string;
  taskConfig?: any;
}): Promise<{
  taskId: string;
  status: string;
  result?: any;
}> => {
  const result = await callEdgeFunction("swift-task", taskData);
  return result.task;
};

// Convenience functions for common operations
export const trackOrderLocation = async (
  orderId: string,
  location: { lat: number; lng: number }
) => {
  return await executeSwiftAction({
    action: "update_location",
    orderId,
    parameters: { location },
  });
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  return await processSmoothHandler({
    event: "status_change",
    orderId,
    data: { status },
  });
};

export const calculateDeliveryRoute = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) => {
  return await callMapsService({
    action: "route",
    origin,
    destination,
  });
};

export const findNearbyOrders = async (
  location: { lat: number; lng: number },
  radius: number = 5
) => {
  return await callMapsService({
    action: "nearby",
    origin: location,
    radius,
  });
};

// Batch operations
export const batchProcessOrders = async (
  orderIds: string[],
  action: string
) => {
  const tasks = orderIds.map((orderId) => ({
    taskType: "batch_process",
    orderId,
    data: { action },
  }));

  return await executeRapidTask({
    taskType: "batch",
    data: { tasks },
  });
};
