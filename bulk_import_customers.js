import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read environment variables
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

// Create Supabase client with service role (for bypassing RLS)
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY; // This won't work for inserts due to RLS

const supabase = createClient(supabaseUrl, supabaseKey);

// Read and parse CSV
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(field => field.trim());
}

function parseCSV(content) {
  const lines = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else if (char !== '\r') {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }
  return lines;
}

async function importCustomers() {
  const csvContent = fs.readFileSync('src/data/customer_master.csv', 'utf8');
  const lines = parseCSV(csvContent);
  const headers = parseCSVLine(lines[0]);

  console.log(`Found ${lines.length - 1} customer records to import`);

  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || null;
    });

    const customerId = record.Customer_ID?.trim();
    const customerName = record.Customer_Name?.trim();

    if (!customerId || !customerName) continue;

    records.push({
      customer_id: customerId,
      customer_name: customerName.toUpperCase(),
      is_active: record.Customer_Active?.trim().toLowerCase() === 'active',
      group_id: record.Group_ID?.trim() || null,
      sales_person: record.Sales_Person?.trim() || null,
      gstin: record.GSTIN?.trim()?.toUpperCase() || null,
      customer_address: record.Customer_Address?.trim()?.replace(/\n/g, ' ') || null,
      customer_city: record.Customer_City?.trim() || null,
      customer_state: record.Customer_State?.trim() || null,
      customer_phone: record.Customer_Phone?.trim() || null,
      customer_email: record.Customer_Email?.trim() || null,
      lr_mail_id: record.lrmailid?.trim() || null,
      customer_contact: record.Customer_Contact?.trim() || null,
      contract_type: record.Customer_Contract_Type?.trim() || null,
      credit_days: parseInt(record.Customer_Credit_Days) || 0,
      date_added: record.Date_Added?.trim() || null,
      created_by: record.Createdby?.trim() || null,
    });
  }

  console.log(`Prepared ${records.length} records for import`);

  // Import in batches of 100
  const batchSize = 100;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    try {
      const { data, error } = await supabase
        .from('customer_master')
        .insert(batch);

      if (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`Imported batch ${Math.floor(i / batchSize) + 1}: ${imported}/${records.length} total`);
      }
    } catch (err) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} exception:`, err.message);
      errors += batch.length;
    }
  }

  console.log(`\nImport complete: ${imported} succeeded, ${errors} failed`);
}

importCustomers().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
