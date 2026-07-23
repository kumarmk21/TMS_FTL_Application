import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function getValidAccessToken(): Promise<{ accessToken: string; apiDomain: string }> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('zoho_oauth_tokens')
    .select('access_token, refresh_token, expires_at, api_domain, client_id, client_secret')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Zoho Books not connected. Please authorize the connection first.');

  const now = new Date();
  const expiresAt = data.expires_at ? new Date(data.expires_at) : new Date(0);
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return { accessToken: data.access_token, apiDomain: data.api_domain || 'https://www.zohoapis.in' };
  }

  const clientId = data.client_id || Deno.env.get('ZOHO_CLIENT_ID') || '';
  const clientSecret = data.client_secret || Deno.env.get('ZOHO_CLIENT_SECRET') || '';

  const refreshUrl = new URL('https://accounts.zoho.in/oauth/v2/token');
  refreshUrl.searchParams.set('grant_type', 'refresh_token');
  refreshUrl.searchParams.set('client_id', clientId);
  refreshUrl.searchParams.set('client_secret', clientSecret);
  refreshUrl.searchParams.set('refresh_token', data.refresh_token);

  const refreshRes = await fetch(refreshUrl.toString(), { method: 'POST' });
  const refreshData = await refreshRes.json();

  if (refreshData.error) {
    throw new Error(`Token refresh failed: ${refreshData.error}`);
  }

  const newExpiresAt = new Date(Date.now() + (refreshData.expires_in_sec || refreshData.expires_in || 3600) * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('zoho_oauth_tokens')
    .update({
      access_token: refreshData.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (updateError) throw updateError;

  return {
    accessToken: refreshData.access_token,
    apiDomain: data.api_domain || 'https://www.zohoapis.in',
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { accessToken, apiDomain } = await getValidAccessToken();

    const body = await req.json().catch(() => ({}));
    const { method, path, query, body: requestBody } = body as {
      method: string;
      path: string;
      query?: Record<string, string>;
      body?: any;
    };

    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing "path" in request body' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = new URL(`${apiDomain}${path}`);
    if (query) {
      Object.entries(query).forEach(([k, v]) => targetUrl.searchParams.set(k, v));
    }

    const headers: Record<string, string> = {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
    };
    if (method && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    const apiRes = await fetch(targetUrl.toString(), {
      method: method || 'GET',
      headers,
      body: method && method !== 'GET' ? JSON.stringify(requestBody || {}) : undefined,
    });

    const apiData = await apiRes.json();

    return new Response(JSON.stringify(apiData), {
      status: apiRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Zoho API proxy error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
