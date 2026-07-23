import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  api_domain: string | null;
  client_id: string | null;
  client_secret: string | null;
  organization_id: string | null;
}

async function getValidAccessToken(): Promise<{ accessToken: string; apiDomain: string; organizationId: string | null }> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('zoho_oauth_tokens')
    .select('access_token, refresh_token, expires_at, api_domain, client_id, client_secret, organization_id')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Zoho Books not connected. Please authorize the connection first.');
  const row = data as TokenRow;

  const now = new Date();
  const expiresAt = row.expires_at ? new Date(row.expires_at) : new Date(0);
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return {
      accessToken: row.access_token,
      apiDomain: row.api_domain || 'https://www.zohoapis.in',
      organizationId: row.organization_id,
    };
  }

  const clientId = row.client_id || Deno.env.get('ZOHO_CLIENT_ID') || '';
  const clientSecret = row.client_secret || Deno.env.get('ZOHO_CLIENT_SECRET') || '';

  const refreshUrl = new URL('https://accounts.zoho.in/oauth/v2/token');
  refreshUrl.searchParams.set('grant_type', 'refresh_token');
  refreshUrl.searchParams.set('client_id', clientId);
  refreshUrl.searchParams.set('client_secret', clientSecret);
  refreshUrl.searchParams.set('refresh_token', row.refresh_token);

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
    apiDomain: row.api_domain || 'https://www.zohoapis.in',
    organizationId: row.organization_id,
  };
}

async function getOrganizationId(accessToken: string, apiDomain: string): Promise<string> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from('zoho_oauth_tokens')
    .select('organization_id')
    .eq('id', 1)
    .maybeSingle();

  if (data?.organization_id) return data.organization_id;

  const res = await fetch(`${apiDomain}/books/v3/organizations`, {
    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
  });
  const orgData = await res.json();

  if (!orgData.organizations || orgData.organizations.length === 0) {
    throw new Error('No Zoho Books organization found. Please create an organization in Zoho Books first.');
  }

  const orgId = orgData.organizations[0].organization_id;

  await supabase
    .from('zoho_oauth_tokens')
    .update({ organization_id: orgId })
    .eq('id', 1);

  return orgId;
}

interface ZohoCustomer {
  contact_id: string;
  contact_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  gst_treatment?: string;
  gstin?: string;
  billing_address?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'proxy';

    const { accessToken, apiDomain } = await getValidAccessToken();

    // ── Generic proxy ──
    if (action === 'proxy') {
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

      const orgId = await getOrganizationId(accessToken, apiDomain);
      const targetUrl = new URL(`${apiDomain}${path}`);
      targetUrl.searchParams.set('organization_id', orgId);
      if (query) {
        Object.entries(query).forEach(([k, v]) => targetUrl.searchParams.set(k, v));
      }

      const headers: Record<string, string> = {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      };
      if (method && method !== 'GET') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
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
    }

    // ── Sync: fetch all Zoho customers ──
    if (action === 'sync-customers') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const orgId = await getOrganizationId(accessToken, apiDomain);

      // Fetch all contacts from Zoho (paginated)
      let allZohoCustomers: ZohoCustomer[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const contactsUrl = new URL(`${apiDomain}/books/v3/contacts`);
        contactsUrl.searchParams.set('organization_id', orgId);
        contactsUrl.searchParams.set('contact_type', 'customer');
        contactsUrl.searchParams.set('page', String(page));
        contactsUrl.searchParams.set('per_page', '200');

        const res = await fetch(contactsUrl.toString(), {
          headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
        });
        const data = await res.json();

        if (data.code && data.code !== 0) {
          throw new Error(`Zoho API error: ${data.message || data.code}`);
        }

        const contacts = data.contacts || [];
        allZohoCustomers = allZohoCustomers.concat(contacts);
        hasMore = data.page_context && data.page_context.has_more;
        page++;
      }

      // Fetch all local customers
      const { data: localCustomers, error: localError } = await supabase
        .from('customer_master')
        .select('id, customer_id, customer_name, gstin, customer_email, customer_phone, customer_city, customer_state, customer_address, zoho_customer_id')
        .eq('is_active', true);

      if (localError) throw localError;

      // Build GSTIN lookup from Zoho
      const zohoByGstin = new Map<string, ZohoCustomer>();
      const zohoByName = new Map<string, ZohoCustomer>();
      for (const zc of allZohoCustomers) {
        if (zc.gstin) zohoByGstin.set(zc.gstin.toUpperCase(), zc);
        zohoByName.set(zc.contact_name.toLowerCase().trim(), zc);
      }

      const result = {
        zohoCount: allZohoCustomers.length,
        localCount: localCustomers?.length || 0,
        matched: 0,
        unmatched: 0,
        pushed: 0,
        details: [] as Array<{ customer_id: string; customer_name: string; action: string; zoho_id?: string; status: string }>,
      };

      // Match local customers to Zoho contacts
      for (const local of localCustomers || []) {
        const matchByGstin = local.gstin ? zohoByGstin.get(local.gstin.toUpperCase()) : null;
        const matchByName = zohoByName.get(local.customer_name.toLowerCase().trim());
        const zohoMatch = matchByGstin || matchByName;

        if (zohoMatch) {
          if (local.zoho_customer_id !== zohoMatch.contact_id) {
            const { error: updateErr } = await supabase
              .from('customer_master')
              .update({ zoho_customer_id: zohoMatch.contact_id })
              .eq('id', local.id);

            if (updateErr) {
              result.details.push({
                customer_id: local.customer_id,
                customer_name: local.customer_name,
                action: 'link',
                zoho_id: zohoMatch.contact_id,
                status: `error: ${updateErr.message}`,
              });
            } else {
              result.matched++;
              result.details.push({
                customer_id: local.customer_id,
                customer_name: local.customer_name,
                action: 'link',
                zoho_id: zohoMatch.contact_id,
                status: 'linked',
              });
            }
          } else {
            result.matched++;
          }
        } else {
          result.unmatched++;
          result.details.push({
            customer_id: local.customer_id,
            customer_name: local.customer_name,
            action: 'push',
            status: 'not in Zoho',
          });
        }
      }

      // Push unmatched local customers to Zoho
      const toPush = result.details.filter(d => d.action === 'push' && d.status === 'not in Zoho');

      for (const item of toPush) {
        const local = (localCustomers || []).find(c => c.customer_id === item.customer_id);
        if (!local) continue;

        const createUrl = new URL(`${apiDomain}/books/v3/contacts`);
        createUrl.searchParams.set('organization_id', orgId);

        const contactPayload: Record<string, any> = {
          contact_name: local.customer_name,
          contact_type: 'customer',
          gstin: local.gstin || '',
          email: local.customer_email || '',
          phone: local.customer_phone || '',
          billing_address: {
            address: local.customer_address || '',
            city: local.customer_city || '',
            state: local.customer_state || '',
            country: 'India',
          },
        };

        const createRes = await fetch(createUrl.toString(), {
          method: 'POST',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `JSONString=${encodeURIComponent(JSON.stringify(contactPayload))}`,
        });

        const createData = await createRes.json();

        if (createData.code === 0 && createData.contact) {
          await supabase
            .from('customer_master')
            .update({ zoho_customer_id: createData.contact.contact_id })
            .eq('id', local.id);

          result.pushed++;
          item.status = 'pushed';
          item.zoho_id = createData.contact.contact_id;
        } else {
          item.status = `push error: ${createData.message || 'unknown'}`;
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Sync: fetch Zoho customers only (no push) ──
    if (action === 'fetch-zoho-customers') {
      const orgId = await getOrganizationId(accessToken, apiDomain);

      let allZohoCustomers: ZohoCustomer[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const contactsUrl = new URL(`${apiDomain}/books/v3/contacts`);
        contactsUrl.searchParams.set('organization_id', orgId);
        contactsUrl.searchParams.set('contact_type', 'customer');
        contactsUrl.searchParams.set('page', String(page));
        contactsUrl.searchParams.set('per_page', '200');

        const res = await fetch(contactsUrl.toString(), {
          headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
        });
        const data = await res.json();

        if (data.code && data.code !== 0) {
          throw new Error(`Zoho API error: ${data.message || data.code}`);
        }

        const contacts = data.contacts || [];
        allZohoCustomers = allZohoCustomers.concat(contacts);
        hasMore = data.page_context && data.page_context.has_more;
        page++;
      }

      return new Response(JSON.stringify({
        count: allZohoCustomers.length,
        customers: allZohoCustomers.map(c => ({
          contact_id: c.contact_id,
          contact_name: c.contact_name,
          email: c.email || '',
          phone: c.phone || '',
          gstin: c.gstin || '',
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
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
