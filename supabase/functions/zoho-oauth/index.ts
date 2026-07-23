import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ZohoConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

async function getConfig(): Promise<ZohoConfig> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from('zoho_oauth_tokens')
    .select('client_id, client_secret, redirect_uri')
    .eq('id', 1)
    .maybeSingle();

  return {
    client_id: data?.client_id || Deno.env.get('ZOHO_CLIENT_ID') || '',
    client_secret: data?.client_secret || Deno.env.get('ZOHO_CLIENT_SECRET') || '',
    redirect_uri: data?.redirect_uri || Deno.env.get('ZOHO_REDIRECT_URI') || 'https://tms.dlslogistics.in',
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'status';

  try {
    const config = await getConfig();

    // GET ?action=authorize — return Zoho consent URL
    if (action === 'authorize') {
      const authUrl = new URL('https://accounts.zoho.in/oauth/v2/auth');
      authUrl.searchParams.set('scope', 'ZohoBooks.fullaccess.all');
      authUrl.searchParams.set('client_id', config.client_id);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', config.redirect_uri);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST ?action=exchange — SPA sends the code received from Zoho redirect
    if (action === 'exchange') {
      const { code } = await req.json();
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenUrl = new URL('https://accounts.zoho.in/oauth/v2/token');
      tokenUrl.searchParams.set('grant_type', 'authorization_code');
      tokenUrl.searchParams.set('client_id', config.client_id);
      tokenUrl.searchParams.set('client_secret', config.client_secret);
      tokenUrl.searchParams.set('redirect_uri', config.redirect_uri);
      tokenUrl.searchParams.set('code', code);

      const tokenRes = await fetch(tokenUrl.toString(), { method: 'POST' });
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(JSON.stringify({ error: tokenData.error, details: tokenData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const expiresIn = tokenData.expires_in_sec || tokenData.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      const { error } = await supabase
        .from('zoho_oauth_tokens')
        .upsert({
          id: 1,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          api_domain: tokenData.api_domain || null,
          location: tokenData.location || null,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          client_id: config.client_id,
          client_secret: config.client_secret,
          redirect_uri: config.redirect_uri,
        }, { onConflict: 'id' });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET ?action=status
    if (action === 'status') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('zoho_oauth_tokens')
        .select('connected_at, expires_at, api_domain, location, access_token')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      if (!data || !data.access_token) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        connected: true,
        connected_at: data.connected_at,
        expires_at: data.expires_at,
        api_domain: data.api_domain,
        location: data.location,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET ?action=disconnect
    if (action === 'disconnect') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase
        .from('zoho_oauth_tokens')
        .update({
          access_token: null,
          refresh_token: null,
          expires_at: null,
          api_domain: null,
          location: null,
          connected_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error('Zoho OAuth error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
