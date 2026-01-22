import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BillEmailRequest {
  billId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured. Please set up Resend API key in your environment variables.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { billId }: BillEmailRequest = await req.json();

    if (!billId) {
      return new Response(
        JSON.stringify({ error: 'Bill ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const [companyResult, billResult] = await Promise.all([
      supabase.from('company_master').select('*').limit(1).maybeSingle(),
      supabase
        .from('lr_bill')
        .select('*')
        .eq('bill_id', billId)
        .maybeSingle()
    ]);

    if (companyResult.error) throw companyResult.error;
    if (billResult.error) throw billResult.error;

    if (!billResult.data) {
      return new Response(
        JSON.stringify({ error: 'Bill not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const company = companyResult.data;
    const bill = billResult.data;

    const customerResult = await supabase
      .from('customer_master')
      .select('customer_email, customer_name')
      .eq('customer_id', bill.billing_party_code)
      .maybeSingle();

    if (customerResult.error) throw customerResult.error;

    if (!customerResult.data?.customer_email) {
      return new Response(
        JSON.stringify({ error: 'Customer email not found. Please update customer master with email address.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let lrDetails = null;
    if (bill.lr_bill_number) {
      const lrResult = await supabase
        .from('booking_lr')
        .select('manual_lr_no, lr_date, act_del_date, from_city, to_city, vehicle_type, vehicle_number, invoice_number, invoice_date, invoice_value, eway_bill_number')
        .eq('bill_no', bill.lr_bill_number)
        .maybeSingle();

      if (!lrResult.error) {
        lrDetails = lrResult.data;
      }
    }

    const formatDate = (dateString: string | null) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('en-IN');
    };

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; border-bottom: 3px solid #dee2e6; margin-bottom: 30px; }
    .company-name { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
    .tagline { font-size: 14px; color: #6b7280; font-style: italic; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .info-item { margin-bottom: 8px; }
    .label { font-weight: 600; color: #4b5563; }
    .value { color: #1f2937; }
    .bill-amount { background-color: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .amount { font-size: 28px; font-weight: bold; color: #059669; }
    .lr-details { background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .lr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .bank-details { background-color: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fde68a; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-name">${company?.company_name || 'DLS Logistics'}</div>
      ${company?.company_tagline ? `<div class="tagline">${company.company_tagline}</div>` : ''}
      <div style="margin-top: 10px; font-size: 14px; color: #4b5563;">
        ${company?.company_address || ''}<br>
        ${company?.contact_number ? `Phone: ${company.contact_number}` : ''} |
        ${company?.email ? `Email: ${company.email}` : ''}
      </div>
    </div>

    <h1 style="text-align: center; color: #1f2937; margin-bottom: 30px;">TAX INVOICE</h1>

    <div class="section">
      <div class="info-grid">
        <div>
          <div class="info-item">
            <span class="label">Bill Number:</span>
            <span class="value">${bill.lr_bill_number || '-'}</span>
          </div>
          <div class="info-item">
            <span class="label">Bill Date:</span>
            <span class="value">${formatDate(bill.lr_bill_date)}</span>
          </div>
          <div class="info-item">
            <span class="label">Due Date:</span>
            <span class="value">${formatDate(bill.lr_bill_due_date)}</span>
          </div>
        </div>
        <div>
          <div class="info-item">
            <span class="label">Billed To:</span>
            <div class="value" style="font-weight: 600;">${bill.billing_party_name || '-'}</div>
          </div>
          <div class="info-item">
            <span class="label">Address:</span>
            <span class="value">${bill.bill_to_address || '-'}</span>
          </div>
          <div class="info-item">
            <span class="label">GSTIN:</span>
            <span class="value">${bill.bill_to_gstin || '-'}</span>
          </div>
        </div>
      </div>
    </div>

    ${lrDetails ? `
    <div class="section">
      <div class="section-title">LR Details</div>
      <div class="lr-details">
        <div class="lr-grid">
          <div class="info-item">
            <div class="label">LR No:</div>
            <div class="value">${lrDetails.manual_lr_no || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">LR Date:</div>
            <div class="value">${formatDate(lrDetails.lr_date)}</div>
          </div>
          <div class="info-item">
            <div class="label">Delivery Date:</div>
            <div class="value">${formatDate(lrDetails.act_del_date)}</div>
          </div>
          <div class="info-item">
            <div class="label">From:</div>
            <div class="value">${lrDetails.from_city || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">To:</div>
            <div class="value">${lrDetails.to_city || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Vehicle Type:</div>
            <div class="value">${lrDetails.vehicle_type || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Vehicle No:</div>
            <div class="value">${lrDetails.vehicle_number || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">Invoice No:</div>
            <div class="value">${lrDetails.invoice_number || '-'}</div>
          </div>
          <div class="info-item">
            <div class="label">E-Way Bill:</div>
            <div class="value">${lrDetails.eway_bill_number || '-'}</div>
          </div>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">Service Details</div>
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background-color: #f9fafb;">
            <tr>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Description</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">SAC Code</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${bill.sac_description || 'Transportation Charges'}</td>
              <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">${bill.sac_code || '-'}</td>
              <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">${(bill.sub_total || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="bill-amount">
      <div style="color: #065f46; font-size: 16px; font-weight: 600; margin-bottom: 8px;">Total Amount</div>
      <div class="amount">₹${(bill.bill_amount || 0).toFixed(2)}</div>
    </div>

    ${company?.bank_name ? `
    <div class="bank-details">
      <div class="section-title" style="color: #92400e; margin-bottom: 12px; border-color: #fde68a;">Bank Details for Payment</div>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">Bank Name:</span>
          <span class="value">${company.bank_name}</span>
        </div>
        <div class="info-item">
          <span class="label">Account Number:</span>
          <span class="value">${company.account_number || '-'}</span>
        </div>
        <div class="info-item">
          <span class="label">IFSC Code:</span>
          <span class="value">${company.ifsc_code || '-'}</span>
        </div>
        <div class="info-item">
          <span class="label">Branch:</span>
          <span class="value">${company.bank_branch || '-'}</span>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <p><strong>Note:</strong> This is a system-generated email. Please do not reply to this email.</p>
      <p>For any queries, please contact us at ${company?.email || 'info@dlslogistics.in'} or call ${company?.contact_number || '-'}</p>
      <p style="margin-top: 15px;">Thank you for your business!</p>
      <p style="margin-top: 15px; font-weight: 600;">For ${company?.company_name || 'DLS Logistics'}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Use verified sender email
    const fromEmail = Deno.env.get('SENDER_EMAIL') || 'info@dlslogistics.in';

    const emailData = {
      from: fromEmail,
      to: customerResult.data.customer_email,
      subject: `Tax Invoice - ${bill.lr_bill_number} from ${company?.company_name || 'DLS Logistics'}`,
      html: emailHtml,
    };

    console.log('Sending email from:', fromEmail, 'to:', customerResult.data.customer_email);

    console.log('Attempting to send email...');
    console.log('From:', fromEmail);
    console.log('To:', customerResult.data.customer_email);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const responseText = await emailResponse.text();
    console.log('Resend API status:', emailResponse.status);
    console.log('Resend API response:', responseText);

    if (!emailResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }
      const errorMsg = `Resend API error (${emailResponse.status}): ${JSON.stringify(errorData)}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { id: 'unknown' };
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bill sent successfully to ${customerResult.data.customer_email}`,
        emailId: result.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending bill email:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send email',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
