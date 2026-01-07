import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file manually
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read CSV
const csvContent = fs.readFileSync('src/data/customer_master.csv', 'utf8');
const lines = csvContent.split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
const records = [];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;

  // Simple CSV parsing (handles quoted values)
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let char of lines[i]) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  const record = {};
  headers.forEach((header, idx) => {
    record[header] = values[idx] || '';
  });
  records.push(record);
}

console.log(`Found ${records.length} customers to import`);

// Transform and insert in batches
async function importData() {
  const batchSize = 50;
  let imported = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const customers = batch.map(row => ({
      customer_id: row.Customer_ID?.trim(),
      customer_name: row.Customer_Name?.trim(),
      is_active: row.Customer_Active?.trim().toLowerCase() === 'active',
      group_id: row.Group_ID?.trim() || null,
      sales_person: row.Sales_Person?.trim() || null,
      gstin: row.GSTIN?.trim() || null,
      customer_address: row.Customer_Address?.trim() || null,
      customer_city: row.Customer_City?.trim() || null,
      customer_state: row.Customer_State?.trim() || null,
      customer_phone: row.Customer_Phone?.trim() || null,
      customer_email: row.Customer_Email?.trim() || null,
      lr_mail_id: row.lrmailid?.trim() || null,
      customer_contact: row.Customer_Contact?.trim() || null,
      contract_type: row.Customer_Contract_Type?.trim() || null,
      credit_days: parseInt(row.Customer_Credit_Days) || 0,
      date_added: row.Date_Added?.trim() || null,
      created_by: row.Createdby?.trim() || null
    }));

    const { data, error } = await supabase
      .from('customer_master')
      .insert(customers);

    if (error) {
      console.error(`Error importing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    } else {
      imported += customers.length;
      console.log(`Imported batch ${Math.floor(i / batchSize) + 1}: ${customers.length} customers (Total: ${imported})`);
    }
  }

  console.log(`\nImport complete: ${imported}/${records.length} customers imported successfully`);
}

importData().catch(err => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
