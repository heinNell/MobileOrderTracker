// /functions/maps/index.ts
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};
function validateCoordinates(lng, lat) {
  if (Number.isNaN(lng) || Number.isNaN(lat)) {
    throw new Error("Invalid coordinate values");
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new Error("Coordinates out of valid range");
  }
}
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization") || "",
          },
        },
        auth: {
          persistSession: false,
        },
      }
    );
    // -------- GET GEOFENCES --------
    if (path === "get-geofences") {
      const tenantId = url.searchParams.get("tenantId");
      let query = supabase
        .from("geofences_api") // Use the corrected view
        .select("*")
        .order("name", {
          ascending: true,
        });
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) throw error;
      const cleaned = (data ?? []).map((g) => ({
        ...g,
        latitude: g.latitude === null ? 0 : Number(g.latitude),
        longitude: g.longitude === null ? 0 : Number(g.longitude),
      }));
      return new Response(
        JSON.stringify({
          success: true,
          data: cleaned,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    // -------- CREATE GEOFENCE --------
    if (path === "create-geofence") {
      const body = await req.json();
      const {
        tenant_id,
        name,
        latitude,
        longitude,
        radius_meters = 100,
        is_active = true,
      } = body ?? {};
      if (!tenant_id) throw new Error("tenant_id is required");
      if (!name) throw new Error("name is required");
      const lat = Number(latitude);
      const lng = Number(longitude);
      validateCoordinates(lng, lat);
      // Insert into base table (trigger will set location)
      const { data, error } = await supabase
        .from("geofences")
        .insert([
          {
            tenant_id,
            name,
            latitude: lat,
            longitude: lng,
            radius_meters,
            is_active,
          },
        ])
        .select("id")
        .single();
      if (error) throw error;
      // Fetch from view to get location_text
      const { data: fullData, error: fetchError } = await supabase
        .from("geofences_api")
        .select("*")
        .eq("id", data.id)
        .single();
      if (fetchError) throw fetchError;
      return new Response(
        JSON.stringify({
          success: true,
          data: fullData,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    // -------- UPDATE GEOFENCE --------
    if (path === "update-geofence") {
      const { id, ...rest } = await req.json();
      if (!id) throw new Error("Geofence ID is required");
      const updateData = {};
      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.is_active !== undefined) updateData.is_active = !!rest.is_active;
      if (rest.radius_meters !== undefined)
        updateData.radius_meters = Number(rest.radius_meters);
      if (rest.latitude !== undefined && rest.longitude !== undefined) {
        const lat = Number(rest.latitude);
        const lng = Number(rest.longitude);
        validateCoordinates(lng, lat);
        updateData.latitude = lat;
        updateData.longitude = lng;
      }
      const { error } = await supabase
        .from("geofences")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
      // Fetch from view
      const { data: fullData, error: fetchError } = await supabase
        .from("geofences_api")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;
      return new Response(
        JSON.stringify({
          success: true,
          data: fullData,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    // -------- DELETE GEOFENCE --------
    if (path === "delete-geofence") {
      const { id } = await req.json();
      if (!id) throw new Error("Geofence ID is required");
      const { data, error } = await supabase
        .from("geofences")
        .delete()
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
      return new Response(
        JSON.stringify({
          success: true,
          data,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    return new Response(
      JSON.stringify({
        error: "Endpoint not found",
      }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in edge function:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
