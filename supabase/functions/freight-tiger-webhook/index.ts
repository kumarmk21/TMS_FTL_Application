import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const eventType = payload.event_type || payload.eventType;

    console.log("Received webhook:", eventType, payload);

    if (eventType === "tripevent.created") {
      const tripData = payload.data || payload;

      const { error: tripError } = await supabase
        .from("freight_tiger_trips")
        .upsert({
          trip_id: tripData.trip_id || tripData.tripId,
          driver_number: tripData.driver_number || tripData.driverNumber || tripData.driver?.phone,
          vehicle_number: tripData.vehicle_number || tripData.vehicleNumber || tripData.vehicle?.registration_number,
          trip_data: tripData,
          status: tripData.status || "active",
        }, {
          onConflict: "trip_id"
        });

      if (tripError) {
        console.error("Error storing trip:", tripError);
        throw tripError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Trip event stored successfully",
          event_type: eventType
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (eventType === "trip.location_updated") {
      const locationData = payload.data || payload;

      const { error: locationError } = await supabase
        .from("vehicle_locations")
        .insert({
          trip_id: locationData.trip_id || locationData.tripId,
          driver_number: locationData.driver_number || locationData.driverNumber,
          vehicle_number: locationData.vehicle_number || locationData.vehicleNumber || locationData.vehicle?.registration_number,
          latitude: locationData.latitude || locationData.lat,
          longitude: locationData.longitude || locationData.lng || locationData.lon,
          location_time: locationData.location_time || locationData.locationTime || locationData.timestamp || new Date().toISOString(),
          speed: locationData.speed,
          location_data: locationData,
        });

      if (locationError) {
        console.error("Error storing location:", locationError);
        throw locationError;
      }

      if (locationData.trip_id || locationData.tripId) {
        await supabase
          .from("freight_tiger_trips")
          .update({
            trip_data: locationData,
            updated_at: new Date().toISOString(),
          })
          .eq("trip_id", locationData.trip_id || locationData.tripId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Location updated successfully",
          event_type: eventType
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
        success: true,
        message: "Webhook received",
        event_type: eventType
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
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
