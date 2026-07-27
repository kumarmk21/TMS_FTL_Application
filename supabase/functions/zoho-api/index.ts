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
  const bufferMs = 2 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return {
      accessToken: row.access_token,
      apiDomain: row.api_domain || 'https://www.zohoapis.in',
      organizationId: row.organization_id,
    };
  }

  // Refresh the token
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
    throw new Error(`Token refresh failed: ${refreshData.error}. Please reconnect Zoho Books.`);
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
    throw new Error('No Zoho Books organization found.');
  }

  const activeOrg = orgData.organizations.find((o: any) =>
    o.is_org_active !== false && !o.is_trial_expired
  );
  const orgId = (activeOrg || orgData.organizations[0]).organization_id;

  await supabase
    .from('zoho_oauth_tokens')
    .update({ organization_id: orgId })
    .eq('id', 1);

  return orgId;
}

// Extract GSTIN from a Zoho contact — field name varies by API version
function extractGstin(c: Record<string, any>): string {
  return (c.gst_no || c.gstin || c.gst_identification_number || '').trim().toUpperCase();
}

interface CustomerRecord {
  id?: string;
  customer_id: string;
  customer_name: string;
  gstin?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_city?: string | null;
  customer_state?: string | null;
  customer_address?: string | null;
  zoho_customer_id?: string | null;
}

interface EnsureResult {
  zohoId: string;
  action: 'active' | 'reactivated' | 'relinked' | 'created';
  detail: string;
}

/**
 * Validates that a Zoho contact ID is active before pushing an invoice.
 * - If active: returns as-is.
 * - If inactive: reactivates via POST /contacts/{id}/active.
 * - If not found: searches active contacts by GSTIN then name; if found, relinks.
 * - If still not found: creates a new contact and links it.
 */
async function ensureValidCustomer(
  accessToken: string,
  apiDomain: string,
  orgId: string,
  supabase: ReturnType<typeof createClient>,
  zohoId: string,
  customer: CustomerRecord,
): Promise<EnsureResult> {
  // Step 1: Verify the stored contact ID exists and is active
  const checkUrl = new URL(`${apiDomain}/books/v3/contacts/${zohoId}`);
  checkUrl.searchParams.set('organization_id', orgId);

  const checkRes = await fetch(checkUrl.toString(), {
    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
  });
  const checkData = await checkRes.json();

  if (checkData.code === 0 && checkData.contact) {
    const contact = checkData.contact;
    const status = (contact.status || '').toLowerCase();

    if (status === 'active' || status === '') {
      return { zohoId, action: 'active', detail: '' };
    }

    if (status === 'inactive') {
      // Step 2: Reactivate the inactive contact
      const activateUrl = new URL(`${apiDomain}/books/v3/contacts/${zohoId}/active`);
      activateUrl.searchParams.set('organization_id', orgId);

      const activateRes = await fetch(activateUrl.toString(), {
        method: 'POST',
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
      });
      const activateData = await activateRes.json();

      if (activateData.code === 0) {
        return { zohoId, action: 'reactivated', detail: 'Contact was inactive — reactivated automatically.' };
      }

      console.error('[Zoho] Reactivate failed:', JSON.stringify(activateData));
      // Fall through to re-lookup
    }
  }

  // Step 3: Stored ID is invalid — search active contacts by GSTIN then name
  const localGstin = (customer.gstin || '').trim().toUpperCase();
  const localName = (customer.customer_name || '').toLowerCase().trim();

  let searchResult: Record<string, any> | null = null;

  if (localGstin) {
    const gstinSearchUrl = new URL(`${apiDomain}/books/v3/contacts`);
    gstinSearchUrl.searchParams.set('organization_id', orgId);
    gstinSearchUrl.searchParams.set('status', 'active');
    gstinSearchUrl.searchParams.set('contact_type', 'customer');
    gstinSearchUrl.searchParams.set('gst_number', localGstin);

    const gstinRes = await fetch(gstinSearchUrl.toString(), {
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
    });
    const gstinData = await gstinRes.json();

    if (gstinData.code === 0 && gstinData.contacts?.length > 0) {
      searchResult = gstinData.contacts[0];
    }
  }

  if (!searchResult && localName) {
    const nameSearchUrl = new URL(`${apiDomain}/books/v3/contacts`);
    nameSearchUrl.searchParams.set('organization_id', orgId);
    nameSearchUrl.searchParams.set('status', 'active');
    nameSearchUrl.searchParams.set('contact_type', 'customer');
    nameSearchUrl.searchParams.set('contact_name', localName);

    const nameRes = await fetch(nameSearchUrl.toString(), {
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
    });
    const nameData = await nameRes.json();

    if (nameData.code === 0 && nameData.contacts?.length > 0) {
      // Find exact name match (case-insensitive)
      searchResult = nameData.contacts.find(
        (c: any) => (c.contact_name || '').toLowerCase().trim() === localName,
      ) || nameData.contacts[0];
    }
  }

  if (searchResult) {
    const newZohoId = searchResult.contact_id as string;

    // Update the stored link in customer_master
    if (customer.id) {
      await supabase
        .from('customer_master')
        .update({ zoho_customer_id: newZohoId })
        .eq('id', customer.id);
    }

    return {
      zohoId: newZohoId,
      action: 'relinked',
      detail: `Old Zoho ID ${zohoId} was invalid — relinked to active contact ${newZohoId}.`,
    };
  }

  // Step 4: No active match found — create a new contact
  const createUrl = new URL(`${apiDomain}/books/v3/contacts`);
  createUrl.searchParams.set('organization_id', orgId);

  const contactPayload: Record<string, any> = {
    contact_name: customer.customer_name,
    contact_type: 'customer',
    gst_treatment: customer.gstin ? 'business_gst' : 'consumer',
    gst_no: customer.gstin || '',
    billing_address: {
      address: customer.customer_address || '',
      city: customer.customer_city || '',
      state: customer.customer_state || '',
      country: 'India',
    },
  };
  if (customer.customer_email) contactPayload.email = customer.customer_email;
  if (customer.customer_phone) contactPayload.phone = customer.customer_phone;

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
    const newZohoId = createData.contact.contact_id;

    if (customer.id) {
      await supabase
        .from('customer_master')
        .update({ zoho_customer_id: newZohoId })
        .eq('id', customer.id);
    }

    return {
      zohoId: newZohoId,
      action: 'created',
      detail: `Customer not found in Zoho — created new contact ${newZohoId}.`,
    };
  }

  console.error('[Zoho] Create contact failed:', JSON.stringify(createData));
  throw new Error(`Customer not found and creation failed: ${createData.message || 'unknown error'}`);
}



/**
 * Look up a Zoho Books account ID by its name from the Chart of Accounts.
 * Returns the account_id string or null if not found.
 */
async function getZohoAccountIdByName(
  accessToken: string,
  apiDomain: string,
  orgId: string,
  accountName: string,
): Promise<string | null> {
  const url = new URL(`${apiDomain}/books/v3/chartofaccounts`);
  url.searchParams.set('organization_id', orgId);
  url.searchParams.set('filter_by', 'AccountType.Expense');

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
  });
  const data = await res.json();

  if (data.code !== 0) {
    console.error('[Zoho] Chart of accounts error:', JSON.stringify(data));
    return null;
  }

  const accounts: Record<string, any>[] = data.chartofaccounts || [];
  const nameLower = accountName.toLowerCase().trim();
  const match = accounts.find(
    (a) => (a.account_name || '').toLowerCase().trim() === nameLower,
  );
  return match ? (match.account_id as string) : null;
}

/** Fetch all active customer contacts from Zoho Books (paginated). */
async function fetchActiveZohoContacts(
  accessToken: string,
  apiDomain: string,
  orgId: string,
): Promise<Record<string, any>[]> {
  let allContacts: Record<string, any>[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const contactsUrl = new URL(`${apiDomain}/books/v3/contacts`);
    contactsUrl.searchParams.set('organization_id', orgId);
    contactsUrl.searchParams.set('status', 'active');
    contactsUrl.searchParams.set('page', String(page));
    contactsUrl.searchParams.set('per_page', '200');

    const res = await fetch(contactsUrl.toString(), {
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
    });
    const data = await res.json();

    if (data.code !== undefined && data.code !== 0) {
      throw new Error(`Zoho API error (code ${data.code}): ${data.message || 'Unknown error'}`);
    }

    const contacts = (data.contacts || []) as Record<string, any>[];
    // Keep only customers, and only active ones (double-guard in case API ignores status param)
    const customers = contacts.filter((c: Record<string, any>) =>
      (!c.contact_type || c.contact_type === 'customer') &&
      (!c.status || c.status.toLowerCase() === 'active'),
    );
    allContacts = allContacts.concat(customers);
    hasMore = !!(data.page_context?.has_more_page || data.page_context?.has_more);
    page++;
    if (page > 50) break;
  }

  return allContacts;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'proxy';

    const { accessToken, apiDomain } = await getValidAccessToken();

    // ── Debug: see raw Zoho contacts response ──
    if (action === 'debug-contacts') {
      const orgId = await getOrganizationId(accessToken, apiDomain);
      const debugUrl = new URL(`${apiDomain}/books/v3/contacts`);
      debugUrl.searchParams.set('organization_id', orgId);
      debugUrl.searchParams.set('page', '1');
      debugUrl.searchParams.set('per_page', '5');

      const res = await fetch(debugUrl.toString(), {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
      });
      const raw = await res.json();

      const filteredUrl = new URL(`${apiDomain}/books/v3/contacts`);
      filteredUrl.searchParams.set('organization_id', orgId);
      filteredUrl.searchParams.set('contact_type', 'customer');
      filteredUrl.searchParams.set('status', 'active');
      filteredUrl.searchParams.set('page', '1');
      filteredUrl.searchParams.set('per_page', '5');

      const filteredRes = await fetch(filteredUrl.toString(), {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
      });
      const filtered = await filteredRes.json();

      return new Response(JSON.stringify({
        orgId,
        apiDomain,
        allContacts: {
          code: raw.code,
          message: raw.message,
          count: raw.contacts?.length || 0,
          sample: (raw.contacts || []).slice(0, 3).map((c: any) => ({
            contact_id: c.contact_id,
            contact_name: c.contact_name,
            contact_type: c.contact_type,
            status: c.status,
            gst_no: c.gst_no,
            gstin: c.gstin,
          })),
          page_context: raw.page_context,
        },
        customerContacts: {
          code: filtered.code,
          message: filtered.message,
          count: filtered.contacts?.length || 0,
          sample: (filtered.contacts || []).slice(0, 3).map((c: any) => ({
            contact_id: c.contact_id,
            contact_name: c.contact_name,
            contact_type: c.contact_type,
            status: c.status,
            gst_no: c.gst_no,
            gstin: c.gstin,
          })),
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    // ── Sync customers ──
    if (action === 'sync-customers') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const orgId = await getOrganizationId(accessToken, apiDomain);

      // Fetch only ACTIVE customer contacts
      const allZohoCustomers = await fetchActiveZohoContacts(accessToken, apiDomain, orgId);

      // Fetch all local active customers
      const { data: localCustomers, error: localError } = await supabase
        .from('customer_master')
        .select('id, customer_id, customer_name, gstin, customer_email, customer_phone, customer_city, customer_state, customer_address, zoho_customer_id')
        .eq('is_active', true);

      if (localError) throw localError;

      // Build lookup maps — GSTIN primary, name fallback (active contacts only)
      const zohoByGstin = new Map<string, Record<string, any>>();
      const zohoByName = new Map<string, Record<string, any>>();
      for (const zc of allZohoCustomers) {
        const gstin = extractGstin(zc);
        if (gstin) zohoByGstin.set(gstin, zc);
        zohoByName.set((zc.contact_name as string).toLowerCase().trim(), zc);
      }

      const result = {
        zohoCount: allZohoCustomers.length,
        localCount: localCustomers?.length || 0,
        matched: 0,
        unmatched: 0,
        pushed: 0,
        errors: 0,
        details: [] as Array<{
          customer_id: string;
          customer_name: string;
          action: string;
          zoho_id?: string;
          status: string;
        }>,
      };

      for (const local of localCustomers || []) {
        const localGstin = (local.gstin || '').trim().toUpperCase();
        const matchByGstin = localGstin ? zohoByGstin.get(localGstin) : null;
        const matchByName = zohoByName.get(local.customer_name.toLowerCase().trim());
        const zohoMatch = matchByGstin || matchByName;

        if (zohoMatch) {
          const zohoContactId = zohoMatch.contact_id as string;
          if (local.zoho_customer_id !== zohoContactId) {
            const { error: updateErr } = await supabase
              .from('customer_master')
              .update({ zoho_customer_id: zohoContactId })
              .eq('id', local.id);

            if (updateErr) {
              result.errors++;
              result.details.push({
                customer_id: local.customer_id,
                customer_name: local.customer_name,
                action: 'link',
                zoho_id: zohoContactId,
                status: `error: ${updateErr.message}`,
              });
            } else {
              result.matched++;
              result.details.push({
                customer_id: local.customer_id,
                customer_name: local.customer_name,
                action: 'link',
                zoho_id: zohoContactId,
                status: local.zoho_customer_id ? 'relinked (was stale)' : 'linked',
              });
            }
          } else {
            result.matched++;
            result.details.push({
              customer_id: local.customer_id,
              customer_name: local.customer_name,
              action: 'link',
              zoho_id: zohoContactId,
              status: 'already linked',
            });
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
          gst_treatment: local.gstin ? 'business_gst' : 'consumer',
          gst_no: local.gstin || '',
          billing_address: {
            address: local.customer_address || '',
            city: local.customer_city || '',
            state: local.customer_state || '',
            country: 'India',
          },
        };
        if (local.customer_email) contactPayload.email = local.customer_email;
        if (local.customer_phone) contactPayload.phone = local.customer_phone;

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
          const newZohoId = createData.contact.contact_id;
          await supabase
            .from('customer_master')
            .update({ zoho_customer_id: newZohoId })
            .eq('id', local.id);

          result.pushed++;
          item.status = 'pushed';
          item.zoho_id = newZohoId;
        } else {
          result.errors++;
          item.status = `push error: ${createData.message || 'unknown'}`;
          console.error('[Zoho] Sync create contact failed:', JSON.stringify(createData));
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch Zoho customers only (preview, no changes) ──
    if (action === 'fetch-zoho-customers') {
      const orgId = await getOrganizationId(accessToken, apiDomain);
      const allCustomers = await fetchActiveZohoContacts(accessToken, apiDomain, orgId);

      return new Response(JSON.stringify({
        count: allCustomers.length,
        customers: allCustomers.map(c => ({
          contact_id: c.contact_id,
          contact_name: c.contact_name,
          email: c.email || '',
          phone: c.phone || '',
          gst_no: c.gst_no || c.gstin || '',
          status: c.status || 'active',
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Fix customer links: re-validate every stored zoho_customer_id ──
    if (action === 'fix-customer-links') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const orgId = await getOrganizationId(accessToken, apiDomain);

      const { data: linkedCustomers, error } = await supabase
        .from('customer_master')
        .select('id, customer_id, customer_name, gstin, customer_email, customer_phone, customer_city, customer_state, customer_address, zoho_customer_id')
        .not('zoho_customer_id', 'is', null);

      if (error) throw error;

      const result = {
        total: 0,
        valid: 0,
        reactivated: 0,
        relinked: 0,
        created: 0,
        cleared: 0,
        errors: 0,
        details: [] as Array<{
          customer_id: string;
          customer_name: string;
          old_zoho_id: string;
          new_zoho_id?: string;
          action: string;
          status: string;
        }>,
      };

      for (const customer of (linkedCustomers || []) as CustomerRecord[]) {
        result.total++;
        const oldZohoId = customer.zoho_customer_id!;

        try {
          const ensureResult = await ensureValidCustomer(
            accessToken, apiDomain, orgId, supabase, oldZohoId, customer,
          );

          if (ensureResult.action === 'active') {
            result.valid++;
            result.details.push({
              customer_id: customer.customer_id,
              customer_name: customer.customer_name,
              old_zoho_id: oldZohoId,
              new_zoho_id: ensureResult.zohoId,
              action: 'valid',
              status: 'OK',
            });
          } else if (ensureResult.action === 'reactivated') {
            result.reactivated++;
            result.details.push({
              customer_id: customer.customer_id,
              customer_name: customer.customer_name,
              old_zoho_id: oldZohoId,
              new_zoho_id: ensureResult.zohoId,
              action: 'reactivated',
              status: ensureResult.detail,
            });
          } else if (ensureResult.action === 'relinked') {
            result.relinked++;
            result.details.push({
              customer_id: customer.customer_id,
              customer_name: customer.customer_name,
              old_zoho_id: oldZohoId,
              new_zoho_id: ensureResult.zohoId,
              action: 'relinked',
              status: ensureResult.detail,
            });
          } else if (ensureResult.action === 'created') {
            result.created++;
            result.details.push({
              customer_id: customer.customer_id,
              customer_name: customer.customer_name,
              old_zoho_id: oldZohoId,
              new_zoho_id: ensureResult.zohoId,
              action: 'created',
              status: ensureResult.detail,
            });
          }
        } catch (err) {
          result.errors++;
          result.details.push({
            customer_id: customer.customer_id,
            customer_name: customer.customer_name,
            old_zoho_id: oldZohoId,
            action: 'error',
            status: (err as Error).message,
          });
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Push invoices to Zoho Books ──
    if (action === 'push-invoices') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const orgId = await getOrganizationId(accessToken, apiDomain);

      const body = await req.json().catch(() => ({}));
      const billType = (body as { bill_type?: string }).bill_type || 'lr';
      const dryRun = (body as { dry_run?: boolean }).dry_run || false;
      const billIds = (body as { bill_ids?: string[] }).bill_ids;

      const result = {
        total: 0,
        pushed: 0,
        skipped: 0,
        errors: 0,
        dryRun,
        details: [] as Array<{
          bill_id: string;
          bill_number: string;
          bill_type: string;
          customer_name: string;
          amount: number;
          zoho_invoice_id?: string;
          zoho_invoice_number?: string;
          status: string;
          detail?: string;
        }>,
      };

      // Build customer lookup with full customer record for fallback create
      const { data: customers } = await supabase
        .from('customer_master')
        .select('id, customer_id, zoho_customer_id, customer_name, gstin, customer_email, customer_phone, customer_city, customer_state, customer_address')
        .not('zoho_customer_id', 'is', null);

      const customerMap = new Map<string, CustomerRecord>();
      for (const c of (customers || []) as CustomerRecord[]) {
        customerMap.set(c.customer_id, c);
      }

      // Fetch company info (seller)
      const { data: company } = await supabase
        .from('company_master')
        .select('company_name, gstin, company_address, city, state, pin_code')
        .limit(1)
        .maybeSingle();

      // Booking data lookup map (populated when LR bills are fetched)
      const bookingMap = new Map<string, Record<string, any>>();

      // ── Helper: push a single invoice to Zoho ──
      async function pushInvoice(
        bill: Record<string, any>,
        type: 'lr' | 'warehouse',
        bookings: Map<string, Record<string, any>>,
      ): Promise<{ zoho_invoice_id?: string; zoho_invoice_number?: string; status: string; detail?: string }> {
        const customer = customerMap.get(bill.billing_party_code);
        if (!customer || !customer.zoho_customer_id) {
          return {
            status: 'skipped',
            detail: `Customer "${bill.billing_party_code}" is not linked to any Zoho contact. Run Customer Sync first.`,
          };
        }

        // Pre-push validation: ensure the Zoho contact is valid and active
        let validatedZohoId = customer.zoho_customer_id!;
        let validationDetail = '';

        if (!dryRun) {
          try {
            const ensureResult = await ensureValidCustomer(
              accessToken, apiDomain, orgId, supabase, customer.zoho_customer_id!, customer,
            );
            validatedZohoId = ensureResult.zohoId;
            validationDetail = ensureResult.detail;

            // Update the map so subsequent bills for the same customer skip re-validation
            customer.zoho_customer_id = validatedZohoId;
          } catch (err) {
            const msg = (err as Error).message;
            console.error(`[Zoho] Customer validation failed for ${bill.billing_party_code}:`, msg);
            if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('auth')) {
              return { status: 'auth-error', detail: msg };
            }
            return { status: 'customer-not-found', detail: msg };
          }
        }

        const billDate = bill.lr_bill_date || bill.bill_date;
        const dueDate = bill.lr_bill_due_date || bill.bill_due_date;
        const billNumber = bill.lr_bill_number || bill.bill_number;
        const sacCode = bill.sac_code || '';
        const sacDesc = bill.sac_description || '';
        const subTotal = parseFloat(bill.sub_total || bill.bill_amount || '0');

        // Build line items
        const lineItems: Record<string, any>[] = [];

        if (type === 'lr') {
          lineItems.push({
            name: sacDesc || 'Goods Transport Agency (GTA) Services',
            description: sacDesc || 'Freight charges',
            rate: subTotal,
            quantity: 1,
            item_order: 1,
            ...(sacCode ? { sac_code: sacCode } : {}),
          });
        } else {
          if (parseFloat(bill.warehouse_charges || '0') > 0) {
            lineItems.push({
              name: bill.service_type || 'Warehousing Services',
              description: bill.service_type || sacDesc || 'Warehouse charges',
              rate: parseFloat(bill.warehouse_charges),
              quantity: 1,
              item_order: 1,
              ...(sacCode ? { sac_code: sacCode } : {}),
            });
          }
          if (parseFloat(bill.other_charges || '0') > 0) {
            lineItems.push({
              name: 'Other Charges',
              description: 'Other charges',
              rate: parseFloat(bill.other_charges),
              quantity: 1,
              item_order: 2,
            });
          }
          if (lineItems.length === 0) {
            lineItems.push({
              name: sacDesc || 'Warehousing Services',
              description: sacDesc || 'Service charges',
              rate: subTotal,
              quantity: 1,
              item_order: 1,
              ...(sacCode ? { sac_code: sacCode } : {}),
            });
          }
        }

        // Determine GST treatment
        const billToGstin = (bill.bill_to_gstin || '').trim();
        const isInterState = bill.bill_to_state && company?.state &&
          bill.bill_to_state.toUpperCase() !== company.state.toUpperCase();

        let gstTreatment = 'business_gst';
        if (!billToGstin) gstTreatment = 'consumer';

        const gstChargeType = bill.gst_charge_type || '';
        const isRCM = gstChargeType.toLowerCase().includes('rcm');
        const gstRate = parseFloat(bill.gst_percentage || '0');

        const invoicePayload: Record<string, any> = {
          customer_id: validatedZohoId,
          date: billDate ? new Date(billDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          ...(dueDate ? { due_date: new Date(dueDate).toISOString().split('T')[0] } : {}),
          invoice_number: billNumber,
          reference_number: billNumber,
          is_inclusive_tax: false,
          line_items: lineItems,
        };

        // LR bills: attach custom fields (Origin, Destination, LRN, Vehicle Number, LR Date) and reverse charge
        if (type === 'lr') {
          const booking = bill.tran_id ? bookings.get(bill.tran_id) : null;
          const lrn = booking?.manual_lr_no || billNumber || '';
          const origin = booking?.from_city || '';
          const destination = booking?.to_city || '';
          const vehicleNumber = booking?.vehicle_number || '';
          const lrDate = booking?.lr_date
            ? new Date(booking.lr_date).toISOString().split('T')[0]
            : (billDate ? new Date(billDate).toISOString().split('T')[0] : '');

          const customFields: Array<{ label: string; value: string }> = [];
          const addField = (label: string, value: string) => {
            if (value) customFields.push({ label, value });
          };
          addField('Origin', origin);
          addField('Destination', destination);
          addField('LRN', lrn);
          addField('Vehicle Number', vehicleNumber);
          addField('LR Date', lrDate);

          if (customFields.length > 0) {
            invoicePayload.custom_fields = customFields;
          }
          invoicePayload.is_reverse_charge_applied = true;
        }

        if (!isRCM && gstRate > 0) {
          if (isInterState) {
            invoicePayload.tax_id = '';
          }
        }

        if (dryRun) {
          return { status: 'dry run - would push', detail: validationDetail || undefined };
        }

        const createUrl = new URL(`${apiDomain}/books/v3/invoices`);
        createUrl.searchParams.set('organization_id', orgId);

        const createRes = await fetch(createUrl.toString(), {
          method: 'POST',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `JSONString=${encodeURIComponent(JSON.stringify(invoicePayload))}`,
        });

        const createData = await createRes.json();

        if (createData.code === 0 && createData.invoice) {
          return {
            zoho_invoice_id: createData.invoice.invoice_id,
            zoho_invoice_number: createData.invoice.invoice_number,
            status: 'pushed',
            detail: validationDetail || undefined,
          };
        }

        // Categorize the error
        console.error('[Zoho] Invoice push failed:', JSON.stringify(createData));
        const zohoMsg = createData.message || 'unknown error';
        const msgLower = zohoMsg.toLowerCase();

        if (msgLower.includes('customer') && (msgLower.includes('inactive') || msgLower.includes('not found'))) {
          return { status: 'customer-inactive', detail: zohoMsg };
        }
        if (msgLower.includes('duplicate') || msgLower.includes('already exists')) {
          return { status: 'invoice-duplicate', detail: zohoMsg };
        }
        if (msgLower.includes('auth') || msgLower.includes('token') || msgLower.includes('unauthorized')) {
          return { status: 'auth-error', detail: zohoMsg };
        }
        return { status: 'api-error', detail: zohoMsg };
      }

      // ── Process LR Bills ──
      if (billType === 'lr' || billType === 'both') {
        let lrQuery = supabase
          .from('lr_bill')
          .select('bill_id, tran_id, lr_bill_number, lr_bill_date, lr_bill_due_date, billing_party_code, billing_party_name, bill_to_gstin, bill_to_state, sub_total, bill_amount, sac_code, sac_description, bill_status, credit_days, zoho_invoice_id')
          .eq('bill_status', 'Active')
          .is('zoho_invoice_id', null)
          .order('lr_bill_date', { ascending: false })
          .limit(50);

        if (billIds && billIds.length > 0) {
          lrQuery = lrQuery.in('bill_id', billIds);
        }

        const { data: lrBills, error: lrError } = await lrQuery;

        // Batch-fetch booking data for all LR bills (origin, destination, vehicle, LR number, LR date)
        const tranIds = (lrBills || []).map((b: Record<string, any>) => b.tran_id).filter(Boolean);
        if (tranIds.length > 0) {
          const { data: bookings } = await supabase
            .from('booking_lr')
            .select('tran_id, manual_lr_no, vehicle_number, lr_date, from_city, to_city')
            .in('tran_id', tranIds);
          for (const bk of (bookings || []) as Record<string, any>[]) {
            bookingMap.set(bk.tran_id, bk);
          }
        }

        if (lrError) {
          return new Response(JSON.stringify({ error: `LR bill fetch error: ${lrError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        for (const bill of lrBills || []) {
          result.total++;
          const amount = parseFloat(bill.bill_amount || bill.sub_total || '0');

          const pushResult = await pushInvoice(bill, 'lr', bookingMap);

          if (pushResult.status === 'pushed') {
            result.pushed++;
            await supabase
              .from('lr_bill')
              .update({
                zoho_invoice_id: pushResult.zoho_invoice_id,
                zoho_invoice_number: pushResult.zoho_invoice_number,
                zoho_synced_at: new Date().toISOString(),
              })
              .eq('bill_id', bill.bill_id);
          } else if (pushResult.status.startsWith('skipped')) {
            result.skipped++;
          } else {
            result.errors++;
          }

          result.details.push({
            bill_id: bill.bill_id,
            bill_number: bill.lr_bill_number || '',
            bill_type: 'LR',
            customer_name: bill.billing_party_name || '',
            amount,
            zoho_invoice_id: pushResult.zoho_invoice_id,
            zoho_invoice_number: pushResult.zoho_invoice_number,
            status: pushResult.status,
            detail: pushResult.detail,
          });
        }
      }

      // ── Process Warehouse Bills ──
      if (billType === 'warehouse' || billType === 'both') {
        let whQuery = supabase
          .from('warehouse_bill')
          .select('bill_id, bill_number, bill_date, bill_due_date, billing_party_code, billing_party_name, bill_to_gstin, bill_to_state, warehouse_charges, other_charges, sub_total, gst_percentage, igst_amount, cgst_amount, sgst_amount, total_amount, sac_code, sac_description, bill_status, service_type, gst_charge_type, zoho_invoice_id')
          .is('zoho_invoice_id', null)
          .order('bill_date', { ascending: false })
          .limit(50);

        if (billIds && billIds.length > 0) {
          whQuery = whQuery.in('bill_id', billIds);
        }

        const { data: whBills, error: whError } = await whQuery;

        if (whError) {
          return new Response(JSON.stringify({ error: `Warehouse bill fetch error: ${whError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        for (const bill of whBills || []) {
          result.total++;
          const amount = parseFloat(bill.total_amount || bill.sub_total || '0');

          const pushResult = await pushInvoice(bill, 'warehouse', bookingMap);

          if (pushResult.status === 'pushed') {
            result.pushed++;
            await supabase
              .from('warehouse_bill')
              .update({
                zoho_invoice_id: pushResult.zoho_invoice_id,
                zoho_invoice_number: pushResult.zoho_invoice_number,
                zoho_synced_at: new Date().toISOString(),
              })
              .eq('bill_id', bill.bill_id);
          } else if (pushResult.status.startsWith('skipped')) {
            result.skipped++;
          } else {
            result.errors++;
          }

          result.details.push({
            bill_id: bill.bill_id,
            bill_number: bill.bill_number || '',
            bill_type: 'WH',
            customer_name: bill.billing_party_name || '',
            amount,
            zoho_invoice_id: pushResult.zoho_invoice_id,
            zoho_invoice_number: pushResult.zoho_invoice_number,
            status: pushResult.status,
            detail: pushResult.detail,
          });
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch invoice sync stats ──
    if (action === 'invoice-sync-stats') {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { count: lrTotal } = await supabase
        .from('lr_bill')
        .select('*', { count: 'exact', head: true })
        .eq('bill_status', 'Active');

      const { count: lrSynced } = await supabase
        .from('lr_bill')
        .select('*', { count: 'exact', head: true })
        .eq('bill_status', 'Active')
        .not('zoho_invoice_id', 'is', null);

      const { count: whTotal } = await supabase
        .from('warehouse_bill')
        .select('*', { count: 'exact', head: true });

      const { count: whSynced } = await supabase
        .from('warehouse_bill')
        .select('*', { count: 'exact', head: true })
        .not('zoho_invoice_id', 'is', null);

      return new Response(JSON.stringify({
        lr: {
          total: lrTotal || 0,
          synced: lrSynced || 0,
          pending: (lrTotal || 0) - (lrSynced || 0),
        },
        warehouse: {
          total: whTotal || 0,
          synced: whSynced || 0,
          pending: (whTotal || 0) - (whSynced || 0),
        },
        total: (lrTotal || 0) + (whTotal || 0),
        synced: (lrSynced || 0) + (whSynced || 0),
        pending: (lrTotal || 0) - (lrSynced || 0) + (whTotal || 0) - (whSynced || 0),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Sync vendors with Zoho Books vendor contacts ──
    if (action === 'sync-vendors') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const orgId = await getOrganizationId(accessToken, apiDomain);

      // Fetch all active vendor contacts from Zoho (paginated)
      let allZohoVendors: Record<string, any>[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const vUrl = new URL(`${apiDomain}/books/v3/contacts`);
        vUrl.searchParams.set('organization_id', orgId);
        vUrl.searchParams.set('status', 'active');
        vUrl.searchParams.set('contact_type', 'vendor');
        vUrl.searchParams.set('page', String(page));
        vUrl.searchParams.set('per_page', '200');

        const vRes = await fetch(vUrl.toString(), {
          headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
        });
        const vData = await vRes.json();
        if (vData.code !== undefined && vData.code !== 0) {
          throw new Error(`Zoho API error (code ${vData.code}): ${vData.message || 'Unknown error'}`);
        }
        const vendors = (vData.contacts || []) as Record<string, any>[];
        allZohoVendors = allZohoVendors.concat(vendors);
        hasMore = !!(vData.page_context?.has_more_page || vData.page_context?.has_more);
        page++;
        if (page > 50) break;
      }

      // Fetch all local active vendors
      const { data: localVendors, error: localError } = await supabase
        .from('vendor_master')
        .select('id, vendor_code, vendor_name, vendor_address, vendor_phone, email_id, pan, zoho_vendor_id')
        .eq('is_active', true);

      if (localError) throw localError;

      // Build lookup map by name (vendor_master has no GSTIN column)
      const zohoByName = new Map<string, Record<string, any>>();
      for (const zv of allZohoVendors) {
        zohoByName.set((zv.contact_name as string).toLowerCase().trim(), zv);
      }

      const result = {
        zohoCount: allZohoVendors.length,
        localCount: localVendors?.length || 0,
        matched: 0,
        unmatched: 0,
        pushed: 0,
        errors: 0,
        details: [] as Array<{
          vendor_code: string;
          vendor_name: string;
          action: string;
          zoho_id?: string;
          status: string;
        }>,
      };

      for (const local of localVendors || []) {
        const localName = (local.vendor_name || '').toLowerCase().trim();
        const zohoMatch = localName ? zohoByName.get(localName) : null;

        if (zohoMatch) {
          const zohoContactId = zohoMatch.contact_id as string;
          if (local.zoho_vendor_id !== zohoContactId) {
            const { error: updateErr } = await supabase
              .from('vendor_master')
              .update({ zoho_vendor_id: zohoContactId })
              .eq('id', local.id);

            if (updateErr) {
              result.errors++;
              result.details.push({
                vendor_code: local.vendor_code,
                vendor_name: local.vendor_name,
                action: 'link',
                zoho_id: zohoContactId,
                status: `error: ${updateErr.message}`,
              });
            } else {
              result.matched++;
              result.details.push({
                vendor_code: local.vendor_code,
                vendor_name: local.vendor_name,
                action: 'link',
                zoho_id: zohoContactId,
                status: local.zoho_vendor_id ? 'relinked (was stale)' : 'linked',
              });
            }
          } else {
            result.matched++;
            result.details.push({
              vendor_code: local.vendor_code,
              vendor_name: local.vendor_name,
              action: 'link',
              zoho_id: zohoContactId,
              status: 'already linked',
            });
          }
        } else {
          result.unmatched++;
          result.details.push({
            vendor_code: local.vendor_code,
            vendor_name: local.vendor_name,
            action: 'push',
            status: 'not in Zoho',
          });
        }
      }

      // Push unmatched local vendors to Zoho as new vendor contacts
      const toPush = result.details.filter(d => d.action === 'push' && d.status === 'not in Zoho');
      for (const item of toPush) {
        const local = (localVendors || []).find((v: any) => v.vendor_code === item.vendor_code);
        if (!local) continue;

        const createUrl = new URL(`${apiDomain}/books/v3/contacts`);
        createUrl.searchParams.set('organization_id', orgId);

        const contactPayload: Record<string, any> = {
          contact_name: local.vendor_name,
          contact_type: 'vendor',
        };
        if (local.vendor_address) {
          contactPayload.billing_address = {
            address: local.vendor_address,
            country: 'India',
          };
        }
        if (local.email_id) contactPayload.email = local.email_id;
        if (local.vendor_phone) contactPayload.phone = local.vendor_phone;
        if (local.pan) contactPayload.pan = local.pan;

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
          const newZohoId = createData.contact.contact_id;
          await supabase
            .from('vendor_master')
            .update({ zoho_vendor_id: newZohoId })
            .eq('id', local.id);
          result.pushed++;
          item.status = 'pushed';
          item.zoho_id = newZohoId;
        } else {
          result.errors++;
          item.status = `push error: ${createData.message || 'unknown'}`;
          console.error('[Zoho] Sync create vendor failed:', JSON.stringify(createData));
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Push THC purchases to Zoho Books as Bills ──
    if (action === 'push-purchases') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const orgId = await getOrganizationId(accessToken, apiDomain);

      // Resolve the "Vehicle Hire Charges" account ID from Zoho Chart of Accounts
      const vehicleHireAccountId = await getZohoAccountIdByName(
        accessToken, apiDomain, orgId, 'Vehicle Hire Charges',
      );
      if (!vehicleHireAccountId) {
        return new Response(JSON.stringify({
          error: 'Could not find "Vehicle Hire Charges" account in your Zoho Books Chart of Accounts. Please ensure the account exists under Expenses.',
        }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const body = await req.json().catch(() => ({}));
      const thcIds = (body as { thc_ids?: string[] }).thc_ids;
      const dryRun = (body as { dry_run?: boolean }).dry_run || false;

      if (!thcIds || thcIds.length === 0) {
        return new Response(JSON.stringify({ error: 'No THC IDs provided' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch THC records
      const { data: thcRecords, error: thcError } = await supabase
        .from('thc_details')
        .select(`
          thc_id, thc_number, thc_id_number, thc_date, thc_vendor,
          thc_gross_amount, thc_amount, thc_loading_charges, thc_unloading_charges,
          thc_detention_charges, thc_other_charges, thc_munshiyana_amount,
          thc_deduction_delay, thc_deduction_damage, thc_tds_amount,
          thc_net_payable_amount, thc_advance_amount, thc_balance_amount,
          zoho_books_id, zoho_sync_status,
          lr_number,
          vendor_master:thc_vendor (vendor_code, vendor_name, zoho_vendor_id)
        `)
        .in('thc_id', thcIds);

      if (thcError) throw thcError;

      // Build vendor lookup
      const vendorCodes = (thcRecords || [])
        .map((r: any) => r.vendor_master?.vendor_code)
        .filter(Boolean);
      let vendorMap = new Map<string, any>();
      if (vendorCodes.length > 0) {
        const { data: vendors } = await supabase
          .from('vendor_master')
          .select('id, vendor_code, vendor_name, zoho_vendor_id, vendor_address, vendor_phone, email_id, pan')
          .in('vendor_code', vendorCodes);
        for (const v of (vendors || []) as any[]) {
          vendorMap.set(v.vendor_code, v);
        }
      }

      const result = {
        total: 0,
        pushed: 0,
        skipped: 0,
        errors: 0,
        dryRun,
        details: [] as Array<{
          thc_id: string;
          thc_number: string;
          vendor_name: string;
          amount: number;
          zoho_bill_id?: string;
          zoho_bill_number?: string;
          status: string;
          detail?: string;
        }>,
      };

      for (const thc of (thcRecords || []) as any[]) {
        result.total++;
        const amount = parseFloat(thc.thc_gross_amount || thc.thc_amount || '0');

        const vendor = thc.vendor_master
          ? vendorMap.get(thc.vendor_master.vendor_code) || thc.vendor_master
          : null;

        if (!vendor || !vendor.zoho_vendor_id) {
          result.skipped++;
          result.details.push({
            thc_id: thc.thc_id,
            thc_number: thc.thc_number || '',
            vendor_name: vendor?.vendor_name || '',
            amount,
            status: 'skipped',
            detail: `Vendor "${vendor?.vendor_name || thc.thc_vendor}" is not linked to any Zoho contact. Run Vendor Sync first.`,
          });
          continue;
        }

        // Use the customer-provided LR number as the Zoho Bill Number
        const lrNumber = thc.lr_number || null;
        if (!lrNumber) {
          result.errors++;
          result.details.push({
            thc_id: thc.thc_id,
            thc_number: thc.thc_number || '',
            vendor_name: vendor.vendor_name || '',
            amount,
            status: 'error',
            detail: 'No LR Number found for this THC. Push blocked — please enter the customer LR number in the LR Entry before pushing to Zoho Books.',
          });
          continue;
        }

        // Skip already-synced THCs
        if (thc.zoho_books_id) {
          result.skipped++;
          result.details.push({
            thc_id: thc.thc_id,
            thc_number: thc.thc_number || '',
            vendor_name: vendor.vendor_name || '',
            amount,
            zoho_bill_id: thc.zoho_books_id,
            status: 'skipped',
            detail: 'Already synced to Zoho Books.',
          });
          continue;
        }

        // Build line items from THC charges
        const lineItems: Record<string, any>[] = [];
        const grossAmount = parseFloat(thc.thc_gross_amount || thc.thc_amount || '0');
        if (grossAmount > 0) {
          lineItems.push({
            name: 'Freight Charges',
            description: `THC freight for ${thc.thc_number || thc.thc_id_number || ''}`,
            rate: grossAmount,
            quantity: 1,
            item_order: 1,
            account_id: vehicleHireAccountId,
          });
        }
        const loadingCharges = parseFloat(thc.thc_loading_charges || '0');
        if (loadingCharges > 0) {
          lineItems.push({
            name: 'Loading Charges',
            description: 'Loading charges',
            rate: loadingCharges,
            quantity: 1,
            item_order: 2,
            account_id: vehicleHireAccountId,
          });
        }
        const unloadingCharges = parseFloat(thc.thc_unloading_charges || '0');
        if (unloadingCharges > 0) {
          lineItems.push({
            name: 'Unloading Charges',
            description: 'Unloading charges',
            rate: unloadingCharges,
            quantity: 1,
            item_order: 3,
            account_id: vehicleHireAccountId,
          });
        }
        const detentionCharges = parseFloat(thc.thc_detention_charges || '0');
        if (detentionCharges > 0) {
          lineItems.push({
            name: 'Detention Charges',
            description: 'Detention charges',
            rate: detentionCharges,
            quantity: 1,
            item_order: 4,
            account_id: vehicleHireAccountId,
          });
        }
        const otherCharges = parseFloat(thc.thc_other_charges || '0');
        if (otherCharges > 0) {
          lineItems.push({
            name: 'Other Charges',
            description: 'Other charges',
            rate: otherCharges,
            quantity: 1,
            item_order: 5,
            account_id: vehicleHireAccountId,
          });
        }
        const munshiyana = parseFloat(thc.thc_munshiyana_amount || '0');
        if (munshiyana > 0) {
          lineItems.push({
            name: 'Munshiyana',
            description: 'Munshiyana amount',
            rate: munshiyana,
            quantity: 1,
            item_order: 6,
            account_id: vehicleHireAccountId,
          });
        }

        // Fallback: if no line items have amounts, use gross as single line
        if (lineItems.length === 0) {
          lineItems.push({
            name: 'Transportation Charges',
            description: `THC ${thc.thc_number || thc.thc_id_number || ''}`,
            rate: amount,
            quantity: 1,
            item_order: 1,
            account_id: vehicleHireAccountId,
          });
        }

        const billDate = thc.thc_date
          ? new Date(thc.thc_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        const billPayload: Record<string, any> = {
          vendor_id: vendor.zoho_vendor_id,
          bill_number: lrNumber,
          date: billDate,
          is_inclusive_tax: false,
          line_items: lineItems,
        };

        // Add reference to THC number
        if (thc.thc_number) {
          billPayload.reference_number = thc.thc_number;
        }

        if (dryRun) {
          result.details.push({
            thc_id: thc.thc_id,
            thc_number: thc.thc_number || '',
            vendor_name: vendor.vendor_name || '',
            amount,
            status: 'dry run - would push',
          });
          continue;
        }

        const createUrl = new URL(`${apiDomain}/books/v3/bills`);
        createUrl.searchParams.set('organization_id', orgId);

        const createRes = await fetch(createUrl.toString(), {
          method: 'POST',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `JSONString=${encodeURIComponent(JSON.stringify(billPayload))}`,
        });
        const createData = await createRes.json();

        if (createData.code === 0 && createData.bill) {
          const zohoBillId = createData.bill.bill_id;
          const zohoBillNumber = createData.bill.bill_number;
          await supabase
            .from('thc_details')
            .update({
              zoho_books_id: zohoBillId,
              zoho_sync_status: 'synced',
              zoho_synced_at: new Date().toISOString(),
            })
            .eq('thc_id', thc.thc_id);

          result.pushed++;
          result.details.push({
            thc_id: thc.thc_id,
            thc_number: thc.thc_number || '',
            vendor_name: vendor.vendor_name || '',
            amount,
            zoho_bill_id: zohoBillId,
            zoho_bill_number: zohoBillNumber,
            status: 'pushed',
          });
        } else {
          console.error('[Zoho] Bill push failed:', JSON.stringify(createData));
          const zohoMsg = createData.message || 'unknown error';

          // Mark as failed in the database
          await supabase
            .from('thc_details')
            .update({ zoho_sync_status: 'failed' })
            .eq('thc_id', thc.thc_id);

          result.errors++;
          result.details.push({
            thc_id: thc.thc_id,
            thc_number: thc.thc_number || '',
            vendor_name: vendor.vendor_name || '',
            amount,
            status: 'api-error',
            detail: zohoMsg,
          });
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch purchase (THC) sync stats ──
    if (action === 'purchase-sync-stats') {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { count: total } = await supabase
        .from('thc_details')
        .select('*', { count: 'exact', head: true })
        .not('thc_id_number', 'is', null);

      const { count: synced } = await supabase
        .from('thc_details')
        .select('*', { count: 'exact', head: true })
        .not('thc_id_number', 'is', null)
        .eq('zoho_sync_status', 'synced');

      const { count: failed } = await supabase
        .from('thc_details')
        .select('*', { count: 'exact', head: true })
        .not('thc_id_number', 'is', null)
        .eq('zoho_sync_status', 'failed');

      const { count: vendorLinked } = await supabase
        .from('vendor_master')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('zoho_vendor_id', 'is', null);

      const { count: vendorTotal } = await supabase
        .from('vendor_master')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      return new Response(JSON.stringify({
        thc: {
          total: total || 0,
          synced: synced || 0,
          pending: (total || 0) - (synced || 0),
          failed: failed || 0,
        },
        vendors: {
          total: vendorTotal || 0,
          linked: vendorLinked || 0,
          unlinked: (vendorTotal || 0) - (vendorLinked || 0),
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Fetch active vendor contacts from Zoho Books ──
    if (action === 'fetch-vendors') {
      const orgId = await getOrganizationId(accessToken, apiDomain);
      let allVendors: Record<string, any>[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const vUrl = new URL(`${apiDomain}/books/v3/contacts`);
        vUrl.searchParams.set('organization_id', orgId);
        vUrl.searchParams.set('contact_type', 'vendor');
        vUrl.searchParams.set('status', 'active');
        vUrl.searchParams.set('page', String(page));
        vUrl.searchParams.set('per_page', '200');

        const vRes = await fetch(vUrl.toString(), {
          headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
        });
        const vData = await vRes.json();

        if (vData.code !== undefined && vData.code !== 0) {
          throw new Error(`Zoho API error (code ${vData.code}): ${vData.message || 'Unknown error'}`);
        }

        const vendors = (vData.contacts || []) as Record<string, any>[];
        allVendors = allVendors.concat(vendors);
        hasMore = !!(vData.page_context?.has_more_page || vData.page_context?.has_more);
        page++;
        if (page > 50) break;
      }

      return new Response(JSON.stringify({
        count: allVendors.length,
        vendors: allVendors.map((v) => ({
          contact_id: v.contact_id,
          contact_name: v.contact_name,
          email: v.email || '',
          phone: v.phone || '',
          company_name: v.company_name || '',
          status: v.status || 'active',
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Fetch open bills for a vendor from Zoho Books ──
    if (action === 'fetch-bills') {
      const orgId = await getOrganizationId(accessToken, apiDomain);
      const body = await req.json().catch(() => ({}));
      const vendorId = (body as { vendor_id?: string }).vendor_id;

      if (!vendorId) {
        return new Response(JSON.stringify({ error: 'Missing vendor_id' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const billsUrl = new URL(`${apiDomain}/books/v3/bills`);
      billsUrl.searchParams.set('organization_id', orgId);
      billsUrl.searchParams.set('vendor_id', vendorId);
      billsUrl.searchParams.set('status', 'open');

      const billsRes = await fetch(billsUrl.toString(), {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
      });
      const billsData = await billsRes.json();

      if (billsData.code !== undefined && billsData.code !== 0) {
        return new Response(JSON.stringify({ error: billsData.message || 'Failed to fetch bills' }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bills = (billsData.bills || []) as Record<string, any>[];
      return new Response(JSON.stringify({
        count: bills.length,
        bills: bills.map((b) => ({
          bill_id: b.bill_id,
          bill_number: b.bill_number,
          date: b.date || b.bill_date || '',
          due_date: b.due_date || '',
          total: parseFloat(b.total || b.balance || '0'),
          balance: parseFloat(b.balance || b.total || '0'),
          status: b.status || 'open',
          vendor_name: b.vendor_name || '',
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Fetch bank accounts from Zoho Books ──
    if (action === 'fetch-bank-accounts') {
      const orgId = await getOrganizationId(accessToken, apiDomain);

      const bankUrl = new URL(`${apiDomain}/books/v3/bankaccounts`);
      bankUrl.searchParams.set('organization_id', orgId);

      const bankRes = await fetch(bankUrl.toString(), {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
      });
      const bankData = await bankRes.json();

      if (bankData.code !== undefined && bankData.code !== 0) {
        return new Response(JSON.stringify({ error: bankData.message || 'Failed to fetch bank accounts' }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accounts = (bankData.bankaccounts || []) as Record<string, any>[];
      return new Response(JSON.stringify({
        count: accounts.length,
        bank_accounts: accounts.map((a) => ({
          account_id: a.account_id,
          account_name: a.account_name,
          account_number: a.account_number || '',
          bank_name: a.bank_name || '',
          currency_code: a.currency_code || 'INR',
          is_active: a.is_active ?? true,
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Create a vendor payment in Zoho Books (ATH or BTH) ──
    if (action === 'create-vendor-payment') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const orgId = await getOrganizationId(accessToken, apiDomain);

      const body = await req.json().catch(() => ({}));
      const {
        vendor_id,
        vendor_name,
        amount,
        payment_date,
        payment_type,
        reference_number,
        notes,
        bill_id,
        bank_account_name,
      } = body as {
        vendor_id: string;
        vendor_name: string;
        amount: number;
        payment_date: string;
        payment_type: 'ATH' | 'BTH';
        reference_number: string;
        notes?: string;
        bill_id?: string;
        bank_account_name: string;
      };

      if (!vendor_id || !amount || !payment_date || !payment_type) {
        return new Response(JSON.stringify({ error: 'Missing required fields: vendor_id, amount, payment_date, payment_type' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (payment_type === 'BTH' && !bill_id) {
        return new Response(JSON.stringify({ error: 'BTH payments require a bill_id to link the payment to a bill' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resolve bank account ID by name
      const bankName = bank_account_name || 'HDFC Bank CA';
      const bankUrl = new URL(`${apiDomain}/books/v3/bankaccounts`);
      bankUrl.searchParams.set('organization_id', orgId);

      const bankRes = await fetch(bankUrl.toString(), {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
      });
      const bankData = await bankRes.json();

      if (bankData.code !== undefined && bankData.code !== 0) {
        return new Response(JSON.stringify({ error: `Failed to fetch bank accounts: ${bankData.message}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bankAccounts = (bankData.bankaccounts || []) as Record<string, any>[];
      const bankNameLower = bankName.toLowerCase().trim();
      const bankAccount = bankAccounts.find(
        (a) => (a.account_name || '').toLowerCase().trim() === bankNameLower,
      );

      if (!bankAccount) {
        return new Response(JSON.stringify({
          error: `Could not find bank account "${bankName}" in Zoho Books. Available: ${bankAccounts.map((a) => a.account_name).join(', ')}`,
        }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const accountId = bankAccount.account_id as string;

      // Build payment payload
      const paymentPayload: Record<string, any> = {
        vendor_id,
        payment_mode: 'banktransfer',
        amount,
        date: payment_date,
        paid_through_account_id: accountId,
        reference_number,
        description: payment_type === 'ATH'
          ? `Advance Payment (ATH)${notes ? ' — ' + notes : ''}`
          : `Post-Delivery Payment (BTH)${notes ? ' — ' + notes : ''}`,
      };

      // BTH: link to specific bill
      if (payment_type === 'BTH' && bill_id) {
        paymentPayload.bills = [{ bill_id, amount_applied: amount }];
      }

      const payUrl = new URL(`${apiDomain}/books/v3/vendorpayments`);
      payUrl.searchParams.set('organization_id', orgId);

      const payRes = await fetch(payUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `JSONString=${encodeURIComponent(JSON.stringify(paymentPayload))}`,
      });
      const payData = await payRes.json();

      const vpayment = payData.vendorpayment || payData.payment;
      if (payData.code === 0 && vpayment) {
        return new Response(JSON.stringify({
          success: true,
          zoho_payment_id: vpayment.payment_id,
          zoho_payment_number: vpayment.payment_number || '',
          reference_number,
          amount,
          vendor_name,
          payment_type,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      console.error('[Zoho] Vendor payment failed:', JSON.stringify(payData));
      return new Response(JSON.stringify({
        success: false,
        error: payData.message || 'Failed to create vendor payment in Zoho Books',
        zoho_error: payData,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Push a single ATH payment to Zoho Books ──
    if (action === 'push-ath-payment') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const orgId = await getOrganizationId(accessToken, apiDomain);

      const body = await req.json().catch(() => ({}));
      const thcId = (body as { thc_id?: string }).thc_id;

      if (!thcId) {
        return new Response(JSON.stringify({ error: 'Missing thc_id' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the THC record
      const { data: thc, error: thcError } = await supabase
        .from('thc_details')
        .select(`
          thc_id, thc_id_number, thc_number, thc_vendor,
          thc_advance_amount, ath_date,
          ven_act_name, ven_act_number, ven_act_ifsc, ven_act_bank,
          vendor_master:thc_vendor (vendor_code, vendor_name, zoho_vendor_id)
        `)
        .eq('thc_id', thcId)
        .maybeSingle();

      if (thcError) throw thcError;
      if (!thc) {
        return new Response(JSON.stringify({ error: `THC record ${thcId} not found` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const vendor = (thc as any).vendor_master;
      if (!vendor?.zoho_vendor_id) {
        return new Response(JSON.stringify({
          error: `Vendor "${vendor?.vendor_name || 'Unknown'}" is not linked to Zoho Books. Run Vendor Sync first.`,
        }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const advanceAmount = parseFloat((thc as any).thc_advance_amount || '0');
      if (advanceAmount <= 0) {
        return new Response(JSON.stringify({ error: 'Advance amount is zero — nothing to pay.' }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resolve bank account from Zoho
      const bankUrl = new URL(`${apiDomain}/books/v3/bankaccounts`);
      bankUrl.searchParams.set('organization_id', orgId);
      const bankRes = await fetch(bankUrl.toString(), {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
      });
      const bankData = await bankRes.json();

      if (bankData.code !== undefined && bankData.code !== 0) {
        return new Response(JSON.stringify({ error: `Failed to fetch bank accounts: ${bankData.message}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bankAccounts = (bankData.bankaccounts || []) as Record<string, any>[];
      // Prefer "HDFC Bank CA" as default; fall back to first active account
      const bankAccount = bankAccounts.find(
        (a) => (a.account_name || '').toLowerCase().includes('hdfc')
      ) || bankAccounts[0];

      if (!bankAccount) {
        return new Response(JSON.stringify({ error: 'No bank accounts found in Zoho Books.' }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paymentDate = (thc as any).ath_date
        ? new Date((thc as any).ath_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      const refNumber = (thc as any).thc_id_number || (thc as any).thc_number || thcId;

      const paymentPayload: Record<string, any> = {
        vendor_id: vendor.zoho_vendor_id,
        payment_mode: 'banktransfer',
        amount: advanceAmount,
        date: paymentDate,
        paid_through_account_id: bankAccount.account_id,
        reference_number: refNumber,
        description: `Advance Payment (ATH) — ${refNumber}`,
      };

      const payUrl = new URL(`${apiDomain}/books/v3/vendorpayments`);
      payUrl.searchParams.set('organization_id', orgId);

      const payRes = await fetch(payUrl.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `JSONString=${encodeURIComponent(JSON.stringify(paymentPayload))}`,
      });
      const payData = await payRes.json();

      const athPayment = payData.vendorpayment || payData.payment;
      if (payData.code === 0 && athPayment) {
        await supabase
          .from('thc_details')
          .update({
            zoho_books_id: athPayment.payment_id,
            zoho_sync_status: 'synced',
            zoho_synced_at: new Date().toISOString(),
          } as any)
          .eq('thc_id', thcId);

        return new Response(JSON.stringify({
          success: true,
          zoho_payment_id: athPayment.payment_id,
          zoho_payment_number: athPayment.payment_number || '',
          thc_id: thcId,
          thc_number: refNumber,
          vendor_name: vendor.vendor_name,
          amount: advanceAmount,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Mark as failed in DB so UI can reflect it
      await supabase
        .from('thc_details')
        .update({ zoho_sync_status: 'failed' } as any)
        .eq('thc_id', thcId);

      console.error('[Zoho] ATH payment push failed:', JSON.stringify(payData));
      return new Response(JSON.stringify({
        error: payData.message || 'Failed to create ATH payment in Zoho Books',
        zoho_error: payData,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Zoho API error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
