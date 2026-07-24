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

      // ── Helper: push a single invoice to Zoho ──
      async function pushInvoice(
        bill: Record<string, any>,
        type: 'lr' | 'warehouse',
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

        if (lrError) {
          return new Response(JSON.stringify({ error: `LR bill fetch error: ${lrError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        for (const bill of lrBills || []) {
          result.total++;
          const amount = parseFloat(bill.bill_amount || bill.sub_total || '0');

          const pushResult = await pushInvoice(bill, 'lr');

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

          const pushResult = await pushInvoice(bill, 'warehouse');

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
