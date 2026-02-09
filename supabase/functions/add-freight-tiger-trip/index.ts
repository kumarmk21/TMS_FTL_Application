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

    const { data: lr } = await supabase
      .from("booking_lr")
      .select(`
        *,
        origin:city_master!booking_lr_origin_id_fkey(*),
        destination:city_master!booking_lr_destination_id_fkey(*)
      `)
      .eq("tran_id", payload.lr_id)
      .single();

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

    const { data: config } = await supabase
      .from("freight_tiger_config")
      .select("api_token, integration_url, prod_url")
      .eq("is_active", true)
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "FreightTiger configuration not found"
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

    const useProduction = payload.use_production !== false;
    const ftApiUrl = `${useProduction ? config.prod_url : config.integration_url}/saas/trip/add?token=${config.api_token}`;

    const tripPayload = {
      trip_id: payload.trip_id || lr.manual_lr_no,
      driver_number: lr.driver_number,
      vehicle_number: lr.vehicle_number,
      origin: lr.origin?.city_name || lr.from_city,
      destination: lr.destination?.city_name || lr.to_city,
      start_date: lr.loading_date || lr.lr_date,
      expected_delivery_date: lr.est_del_date,
      customer_name: lr.billing_party_name,
      consignor: lr.consignor,
      consignee: lr.consignee,
      no_of_packages: lr.no_of_pkgs,
      weight: lr.act_wt,
      invoice_number: lr.invoice_number,
      invoice_value: lr.invoice_value,
      eway_bill: lr.eway_bill_number,
      ...payload.additional_data
    };

    const ftResponse = await fetch(ftApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tripPayload),
    });

    if (!ftResponse.ok) {
      const errorText = await ftResponse.text();
      console.error("FreightTiger API error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to add trip to FreightTiger",
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

    const result = await ftResponse.json();

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
