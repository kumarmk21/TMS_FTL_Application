import fs from 'fs';

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
    } else if (char === '\r') {
      // Skip carriage return
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return lines;
}

const csvContent = fs.readFileSync('src/data/customer_master.csv', 'utf8');
const lines = parseCSV(csvContent);
const headers = parseCSVLine(lines[0]);

console.log(`Found ${lines.length - 1} customer records`);
console.log(`Headers: ${headers.join(', ')}`);

const records = [];

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  const record = {};

  headers.forEach((header, idx) => {
    record[header] = values[idx] || '';
  });

  records.push(record);
}

// Escape single quotes for SQL
const escape = (str) => {
  if (!str || str === 'null' || str.trim() === '') return null;
  return str.replace(/'/g, "''").replace(/\n/g, ' ').replace(/\r/g, '').trim();
};

const sqlStatements = [];

records.forEach(record => {
  const customerId = escape(record.Customer_ID);
  const customerName = escape(record.Customer_Name);
  const isActive = record.Customer_Active?.trim().toLowerCase() === 'active';
  const groupId = escape(record.Group_ID);
  const salesPerson = escape(record.Sales_Person);
  const gstin = escape(record.GSTIN);
  const address = escape(record.Customer_Address);
  const city = escape(record.Customer_City);
  const state = escape(record.Customer_State);
  const phone = escape(record.Customer_Phone);
  const email = escape(record.Customer_Email);
  const lrMailId = escape(record.lrmailid);
  const contact = escape(record.Customer_Contact);
  const contractType = escape(record.Customer_Contract_Type);
  const creditDays = parseInt(record.Customer_Credit_Days) || 0;
  const dateAdded = escape(record.Date_Added);
  const createdBy = escape(record.Createdby);

  if (!customerId || !customerName) {
    console.log(`Skipping invalid record: ${JSON.stringify(record).substring(0, 100)}`);
    return;
  }

  const sql = `INSERT INTO customer_master (customer_id, customer_name, is_active, group_id, sales_person, gstin, customer_address, customer_city, customer_state, customer_phone, customer_email, lr_mail_id, customer_contact, contract_type, credit_days, date_added, created_by) VALUES ('${customerId}', '${customerName}', ${isActive}, ${groupId ? `'${groupId}'` : 'NULL'}, ${salesPerson ? `'${salesPerson}'` : 'NULL'}, ${gstin ? `'${gstin}'` : 'NULL'}, ${address ? `'${address}'` : 'NULL'}, ${city ? `'${city}'` : 'NULL'}, ${state ? `'${state}'` : 'NULL'}, ${phone ? `'${phone}'` : 'NULL'}, ${email ? `'${email}'` : 'NULL'}, ${lrMailId ? `'${lrMailId}'` : 'NULL'}, ${contact ? `'${contact}'` : 'NULL'}, ${contractType ? `'${contractType}'` : 'NULL'}, ${creditDays}, ${dateAdded ? `'${dateAdded}'` : 'NULL'}, ${createdBy ? `'${createdBy}'` : 'NULL'});`;

  sqlStatements.push(sql);
});

fs.writeFileSync('customer_import_fixed.sql', sqlStatements.join('\n'));
console.log(`Generated ${sqlStatements.length} valid SQL INSERT statements`);
