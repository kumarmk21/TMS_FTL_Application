import fs from 'fs';

// Read CSV
const csvContent = fs.readFileSync('src/data/customer_master.csv', 'utf8');
const lines = csvContent.split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

const sqlStatements = [];

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

  // Escape single quotes for SQL
  const escape = (str) => str ? str.replace(/'/g, "''") : null;

  const customerId = escape(record.Customer_ID?.trim());
  const customerName = escape(record.Customer_Name?.trim());
  const isActive = record.Customer_Active?.trim().toLowerCase() === 'active';
  const groupId = escape(record.Group_ID?.trim()) || null;
  const salesPerson = escape(record.Sales_Person?.trim()) || null;
  const gstin = escape(record.GSTIN?.trim()) || null;
  const address = escape(record.Customer_Address?.trim()) || null;
  const city = escape(record.Customer_City?.trim()) || null;
  const state = escape(record.Customer_State?.trim()) || null;
  const phone = escape(record.Customer_Phone?.trim()) || null;
  const email = escape(record.Customer_Email?.trim()) || null;
  const lrMailId = escape(record.lrmailid?.trim()) || null;
  const contact = escape(record.Customer_Contact?.trim()) || null;
  const contractType = escape(record.Customer_Contract_Type?.trim()) || null;
  const creditDays = parseInt(record.Customer_Credit_Days) || 0;
  const dateAdded = escape(record.Date_Added?.trim()) || null;
  const createdBy = escape(record.Createdby?.trim()) || null;

  const sql = `INSERT INTO customer_master (customer_id, customer_name, is_active, group_id, sales_person, gstin, customer_address, customer_city, customer_state, customer_phone, customer_email, lr_mail_id, customer_contact, contract_type, credit_days, date_added, created_by) VALUES ('${customerId}', '${customerName}', ${isActive}, ${groupId ? `'${groupId}'` : 'NULL'}, ${salesPerson ? `'${salesPerson}'` : 'NULL'}, ${gstin ? `'${gstin}'` : 'NULL'}, ${address ? `'${address}'` : 'NULL'}, ${city ? `'${city}'` : 'NULL'}, ${state ? `'${state}'` : 'NULL'}, ${phone ? `'${phone}'` : 'NULL'}, ${email ? `'${email}'` : 'NULL'}, ${lrMailId ? `'${lrMailId}'` : 'NULL'}, ${contact ? `'${contact}'` : 'NULL'}, ${contractType ? `'${contractType}'` : 'NULL'}, ${creditDays}, ${dateAdded ? `'${dateAdded}'` : 'NULL'}, ${createdBy ? `'${createdBy}'` : 'NULL'});`;

  sqlStatements.push(sql);
}

// Write all SQL to a file
fs.writeFileSync('customer_import.sql', sqlStatements.join('\n'));
console.log(`Generated SQL file with ${sqlStatements.length} INSERT statements`);
