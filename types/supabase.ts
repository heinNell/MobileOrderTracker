// Supabase client for dashboard
import { createClient } from "@supabase/supabase-js";
import { handleApiError } from "./utils";

// Log environment variables to debug
console.log("Debugging Supabase Environment Variables:");
console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set");
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Key is set (value hidden for security)" : "Key is NOT set");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase configuration missing. URL or Anon Key not provided.");
  throw new Error("Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Base function to call Edge Functions with authentication (rest of the code remains the same)
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
    console.log(`Calling Edge Function: ${functionName}`);
    console.log("Payload:", payload);
    console.log("Using URL:", `${supabaseUrl}/functions/v1/${functionName}`);

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    console.log("Response Status:", response.status);
    const result = await response.json();
    console.log("Response Data:", result);

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Failed to call ${functionName}`);
    }

    return result;
  } catch (error) {
    console.error("Error details:", error);
    handleApiError(error, `Error calling ${functionName}`);
    throw error;
  }
};

// Generate QR Code
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
