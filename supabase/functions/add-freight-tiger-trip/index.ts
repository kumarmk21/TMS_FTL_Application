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

    if (!payload.lr_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "lr_id is required"
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

    const { data: lr, error: lrError } = await supabase
      .from("booking_lr")
      .select("*")
      .eq("tran_id", payload.lr_id)
      .maybeSingle();

    if (lrError) {
      console.error("Error fetching LR:", lrError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error fetching LR data",
          details: lrError.message
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

    if (!lr) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "LR not found"
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

    const { data: config, error: configError } = await supabase
      .from("freight_tiger_config")
      .select("api_token, integration_url, prod_url")
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

    if (!lr.driver_number || !lr.vehicle_number || !lr.from_city || !lr.to_city) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields for FreightTiger",
          details: "Driver number, vehicle number, origin city, and destination city are required"
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

    const useProduction = payload.use_production !== false;
    const ftApiUrl = `${useProduction ? config.prod_url : config.integration_url}/saas/trip/add?token=${config.api_token}`;

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      } catch (e) {
        return dateStr;
      }
    };

    const tripPayload: any = {
      feed_unique_id: payload.trip_id || lr.manual_lr_no,
      driver_number: lr.driver_number,
      vehicle_number: lr.vehicle_number,
      origin_city: lr.from_city,
      destination_city: lr.to_city,
    };

    const startDate = lr.loading_date || lr.lr_date;
    if (startDate) {
      tripPayload.start_date = formatDate(startDate);
    }

    if (lr.est_del_date) {
      tripPayload.expected_delivery_date = formatDate(lr.est_del_date);
    }

    if (lr.billing_party_name) {
      tripPayload.customer_name = lr.billing_party_name;
    }

    if (lr.consignor) {
      tripPayload.consignor_name = lr.consignor;
    }

    if (lr.consignee) {
      tripPayload.consignee_name = lr.consignee;
    }

    if (lr.no_of_pkgs && lr.no_of_pkgs > 0) {
      tripPayload.package_count = lr.no_of_pkgs;
    }

    if (lr.act_wt && parseFloat(lr.act_wt) > 0) {
      tripPayload.weight = parseFloat(lr.act_wt);
    }

    if (lr.invoice_number && lr.invoice_number !== "0") {
      tripPayload.invoice_number = lr.invoice_number;
    }

    if (lr.invoice_value && parseFloat(lr.invoice_value) > 0) {
      tripPayload.invoice_value = parseFloat(lr.invoice_value);
    }

    if (lr.eway_bill_number && lr.eway_bill_number !== "0") {
      tripPayload.eway_bill_number = lr.eway_bill_number;
    }

    if (lr.manual_lr_no) {
      tripPayload.lr_number = lr.manual_lr_no;
    }

    if (payload.additional_data) {
      Object.assign(tripPayload, payload.additional_data);
    }

    console.log("Sending trip payload to FreightTiger:", JSON.stringify(tripPayload));

    const urlWithoutToken = ftApiUrl.replace(/token=[^&]+/, 'token=***');
    console.log("Calling FreightTiger API:", urlWithoutToken);
    console.log("Trip payload:", JSON.stringify(tripPayload, null, 2));

    let ftResponse;
    let responseText;

    try {
      ftResponse = await fetch(ftApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tripPayload),
      });

      console.log("FreightTiger API response status:", ftResponse.status);
      console.log("FreightTiger API response headers:", JSON.stringify(Object.fromEntries(ftResponse.headers.entries())));

      responseText = await ftResponse.text();
      console.log("FreightTiger API raw response:", responseText);

    } catch (fetchError: any) {
      console.error("Fetch error:", fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Network error connecting to FreightTiger",
          details: `${fetchError.message}. Please check if FreightTiger API is accessible.`,
          network_error: true
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

    if (!ftResponse.ok) {
      let errorDetails = responseText;
      let parsedError: any = null;

      try {
        parsedError = JSON.parse(responseText);
        errorDetails = parsedError.message || parsedError.error || parsedError.data?.message || responseText;
      } catch (e) {
        errorDetails = responseText || `HTTP ${ftResponse.status}: ${ftResponse.statusText}`;
      }

      console.error("FreightTiger API error - Status:", ftResponse.status);
      console.error("FreightTiger API error - Details:", errorDetails);
      console.error("FreightTiger API error - Full response:", responseText);

      return new Response(
        JSON.stringify({
          success: false,
          error: `FreightTiger API Error (${ftResponse.status})`,
          details: errorDetails,
          status_code: ftResponse.status,
          raw_response: responseText.substring(0, 500)
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

    let result;
    try {
      result = JSON.parse(responseText);
      console.log("FreightTiger API success response:", JSON.stringify(result, null, 2));
    } catch (e) {
      console.error("Failed to parse FreightTiger response:", responseText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid response from FreightTiger",
          details: "Received non-JSON response from FreightTiger API",
          raw_response: responseText.substring(0, 500)
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

    await supabase
      .from("freight_tiger_trips")
      .insert({
        trip_id: result.trip_id || payload.trip_id || lr.manual_lr_no,
        lr_id: lr.tran_id,
        driver_number: lr.driver_number,
        vehicle_number: lr.vehicle_number,
        trip_data: result,
        status: "active",
      });

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        message: "Trip added successfully to FreightTiger"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error adding trip:", error);
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
