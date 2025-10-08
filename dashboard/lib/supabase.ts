import { createClient } from "@supabase/supabase-js";
import { handleApiError } from "./utils/api-helpers";
import { 
  QRCodeResult, 
  ValidationResult, 
  TaskResult, 
  SwiftActionResult, 
  MapsServiceResult,
  Location,
  HandlerResult,
  TaskConfig
} from "./types/supabase";

// Type safety for environment variables
interface EnvironmentVariables {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
const callEdgeFunction = async <T = any>(
  functionName: string,
  payload?: any,
  method: string = "POST"
): Promise<T> => {
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

    // Handle different response types
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || `Failed to call ${functionName}`);
    }

    return result;
  } catch (error) {
    handleApiError(error, `Error calling ${functionName}`);
    throw error;
  }
};

// Function with retry logic for critical operations
const callEdgeFunctionWithRetry = async <T = any>(
  functionName: string,
  payload?: any,
  method: string = "POST",
  maxRetries: number = 3
): Promise<T> => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callEdgeFunction<T>(functionName, payload, method);
    } catch (error) {
      lastError = error;
      
      // Don't retry on authentication errors
      if (error instanceof Error && error.message === "Not authenticated") {
        throw error;
      }
      
      if (attempt === maxRetries) break;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw lastError;
};

// 1. Generate QR Code
export const generateQRCode = async (orderId: string): Promise<QRCodeResult> => {
  const result = await callEdgeFunctionWithRetry<{ qrCode: QRCodeResult }>(
    "generate-qr-code", 
    { orderId }
  );
  return result.qrCode;
};

// 2. Validate QR Code
export const validateQRCode = async (qrCodeData: string): Promise<ValidationResult> => {
  const result = await callEdgeFunction<{ validation: ValidationResult }>(
    "validate-qr-code", 
    { qrCodeData }
  );
  return result.validation;
};

// 3. Rapid Task - For quick order processing tasks
export const executeRapidTask = async (taskData: {
  taskType: string;
  orderId?: string;
  data?: any;
}): Promise<TaskResult> => {
  const result = await callEdgeFunction<{ task: TaskResult }>(
    "rapid-task", 
    taskData
  );
  return result.task;
};

// 4. Swift API - General purpose API for fast operations
export const callSwiftApi = async <T = any>(apiData: {
  action: string;
  payload?: any;
}): Promise<T> => {
  const result = await callEdgeFunction<{ data: T }>(
    "swift-api", 
    apiData
  );
  return result.data;
};

// 5. Smooth Handler - For handling order events and state changes
export const processSmoothHandler = async (handlerData: {
  event: string;
  orderId: string;
  data?: any;
}): Promise<HandlerResult> => {
  const result = await callEdgeFunctionWithRetry<{ handler: HandlerResult }>(
    "smooth-handler", 
    handlerData
  );
  return result.handler;
};

// 6. Swift Function - For executing quick functions
export const executeSwiftFunction = async <T = any>(functionData: {
  functionName: string;
  parameters?: any;
}): Promise<T> => {
  const result = await callEdgeFunction<{ execution: T }>(
    "swift-function", 
    functionData
  );
  return result.execution;
};

// 7. Maps Service - For location and mapping operations
export const callMapsService = async (mapsData: {
  action: "geocode" | "route" | "nearby" | "distance";
  origin?: Location;
  destination?: Location;
  address?: string;
  radius?: number;
}): Promise<MapsServiceResult> => {
  const result = await callEdgeFunction<{ maps: MapsServiceResult }>(
    "maps-service", 
    mapsData
  );
  return result.maps;
};

// 8. Swift Action - For executing quick actions on orders
export const executeSwiftAction = async (actionData: {
  action: string;
  orderId: string;
  parameters?: any;
}): Promise<SwiftActionResult> => {
  const result = await callEdgeFunction<{ action: SwiftActionResult }>(
    "swift-action", 
    actionData
  );
  return result.action;
};

// 9. Swift Task - For task management and execution
export const manageSwiftTask = async (taskData: {
  operation: "create" | "update" | "delete" | "execute";
  taskId?: string;
  taskConfig?: TaskConfig;
}): Promise<TaskResult> => {
  const result = await callEdgeFunction<{ task: TaskResult }>(
    "swift-task", 
    taskData
  );
  return result.task;
};

// Convenience functions for common operations
export const trackOrderLocation = async (
  orderId: string,
  location: Location
): Promise<SwiftActionResult> => {
  return await executeSwiftAction({
    action: "update_location",
    orderId,
    parameters: { location },
  });
};

export const updateOrderStatus = async (
  orderId: string, 
  status: string
): Promise<HandlerResult> => {
  return await processSmoothHandler({
    event: "status_change",
    orderId,
    data: { status },
  });
};

export const calculateDeliveryRoute = async (
  origin: Location,
  destination: Location
): Promise<MapsServiceResult> => {
  return await callMapsService({
    action: "route",
    origin,
    destination,
  });
};

export const findNearbyOrders = async (
  location: Location,
  radius: number = 5
): Promise<MapsServiceResult> => {
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
): Promise<TaskResult> => {
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
