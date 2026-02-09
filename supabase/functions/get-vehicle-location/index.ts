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
    console.log("=== Get Vehicle Location Request Started ===");
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const driverNumber = url.searchParams.get("driver_number");

    console.log("Driver number:", driverNumber);

    if (!driverNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "driver_number parameter is required"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: config, error: configError } = await supabase
      .from("freight_tiger_config")
      .select("api_token, prod_url")
      .eq("is_active", true)
      .maybeSingle();

    if (configError) {
      console.error("Error fetching config:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error fetching FreightTiger configuration",
          details: configError.message
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

    if (!config) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "FreightTiger configuration not found. Please configure FreightTiger settings first."
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const ftApiUrl = `${config.prod_url}/saas/trip/driver/${driverNumber}`;

    console.log(`Fetching trip for driver: ${driverNumber}`);
    console.log(`API URL: ${ftApiUrl}`);

    const ftResponse = await fetch(ftApiUrl, {
      method: "GET",
      headers: {
        "Authorization": config.api_token,
        "Content-Type": "application/json",
      },
    });

    console.log(`FreightTiger API response status: ${ftResponse.status}`);

    if (!ftResponse.ok) {
      const errorText = await ftResponse.text();
      console.error("FreightTiger API error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch data from FreightTiger",
          details: errorText
        }),
        {
          status: ftResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const tripData = await ftResponse.json();

    if (tripData && tripData.data) {
      const trips = Array.isArray(tripData.data) ? tripData.data : [tripData.data];

      for (const trip of trips) {
        await supabase
          .from("freight_tiger_trips")
          .upsert({
            trip_id: trip.trip_id || trip.id,
            driver_number: driverNumber,
            vehicle_number: trip.vehicle?.registration_number || trip.vehicle_number,
            trip_data: trip,
            status: trip.status || "active",
          }, {
            onConflict: "trip_id"
          });

        if (trip.latest_location || trip.location) {
          const location = trip.latest_location || trip.location;
          await supabase
            .from("vehicle_locations")
            .insert({
              trip_id: trip.trip_id || trip.id,
              driver_number: driverNumber,
              vehicle_number: trip.vehicle?.registration_number || trip.vehicle_number,
              latitude: location.latitude || location.lat,
              longitude: location.longitude || location.lng || location.lon,
              location_time: location.timestamp || location.time || new Date().toISOString(),
              speed: location.speed,
              location_data: location,
            });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: tripData
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error fetching vehicle location:", error);
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
