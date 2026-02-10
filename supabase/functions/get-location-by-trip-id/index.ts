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
    console.log("=== Get Location By Trip ID Request Started ===");
    console.log("Request URL:", req.url);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authorization header is required"
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired authentication token"
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Authenticated user:", user.id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const lrId = url.searchParams.get("lr_id");

    console.log("LR ID:", lrId);

    if (!lrId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "lr_id parameter is required"
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

    const { data: thcData, error: thcError } = await supabase
      .from("thc_details")
      .select("ft_trip_id, lr_no, vehicle_number, driver_number")
      .eq("lr_no", lrId)
      .maybeSingle();

    if (thcError) {
      console.error("Error fetching THC data:", thcError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error fetching THC data",
          details: thcError.message
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

    if (!thcData || !thcData.ft_trip_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No FreightTiger Trip ID found for this LR. Please generate THC first."
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

    console.log("Found ft_trip_id:", thcData.ft_trip_id);

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

    const ftApiUrl = `${config.prod_url}/saas/trips?trip_id=${thcData.ft_trip_id}&page=1&size=100`;

    console.log(`Fetching trip data for ft_trip_id: ${thcData.ft_trip_id}`);
    console.log(`API URL: ${ftApiUrl}`);

    const authToken = config.api_token.startsWith('Bearer ')
      ? config.api_token
      : `Bearer ${config.api_token}`;

    const ftResponse = await fetch(ftApiUrl, {
      method: "GET",
      headers: {
        "Authorization": authToken,
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
          details: errorText,
          status_code: ftResponse.status
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
    console.log("FreightTiger API Response:", JSON.stringify(tripData, null, 2));

    if (tripData && tripData.data && Array.isArray(tripData.data) && tripData.data.length > 0) {
      const trips = tripData.data;
      console.log(`Found ${trips.length} trips`);

      let savedTrips = 0;
      let savedLocations = 0;
      const errors: any[] = [];

      for (const trip of trips) {
        console.log("Processing trip:", JSON.stringify(trip, null, 2));

        const extractedTripId = trip.trip_id || trip.id || trip.feed_unique_id;
        console.log("Extracted trip_id:", extractedTripId);

        if (!extractedTripId) {
          const error = "No trip_id found in trip data";
          console.error(error);
          errors.push({ error, trip_keys: Object.keys(trip) });
          continue;
        }

        const tripRecord: any = {
          trip_id: extractedTripId,
          driver_number: thcData.driver_number || trip.driver?.phone || trip.driver_number,
          vehicle_number: thcData.vehicle_number || trip.vehicle?.registration_number || trip.vehicle_number,
          trip_data: trip,
          status: trip.status || "active",
          lr_id: lrId,
        };

        console.log("Trip record to save:", JSON.stringify(tripRecord, null, 2));

        const { error: tripError } = await supabase
          .from("freight_tiger_trips")
          .upsert(tripRecord, {
            onConflict: "trip_id"
          });

        if (tripError) {
          console.error("Error saving trip:", tripError);
          errors.push({ error: tripError.message, code: tripError.code });
        } else {
          savedTrips++;
          console.log("Trip saved successfully");
        }

        if (trip.latest_location || trip.location) {
          const location = trip.latest_location || trip.location;
          console.log("Processing location:", JSON.stringify(location, null, 2));

          const locationRecord = {
            trip_id: extractedTripId,
            driver_number: thcData.driver_number || trip.driver?.phone || trip.driver_number,
            vehicle_number: thcData.vehicle_number || trip.vehicle?.registration_number || trip.vehicle_number,
            latitude: location.latitude || location.lat,
            longitude: location.longitude || location.lng || location.lon,
            location_time: location.timestamp || location.time || new Date().toISOString(),
            speed: location.speed || 0,
            location_data: location,
          };

          const { error: locError } = await supabase
            .from("vehicle_locations")
            .insert(locationRecord);

          if (locError) {
            console.error("Error saving location:", locError);
            errors.push({ error: locError.message, code: locError.code });
          } else {
            savedLocations++;
            console.log("Location saved successfully");
          }
        } else {
          console.log("No location data found in trip");
        }
      }

      console.log(`Summary: ${savedTrips} trips saved, ${savedLocations} locations saved`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Location data processed successfully",
          ft_trip_id: thcData.ft_trip_id,
          trips_found: trips.length,
          trips_saved: savedTrips,
          locations_saved: savedLocations,
          errors: errors.length > 0 ? errors : undefined,
          raw_data: tripData
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      console.log("No trip data in response");
      return new Response(
        JSON.stringify({
          success: false,
          message: "No trip data found for this FreightTiger Trip ID",
          ft_trip_id: thcData.ft_trip_id,
          raw_response: tripData
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

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
