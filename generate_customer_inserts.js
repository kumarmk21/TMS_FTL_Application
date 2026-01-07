import fs from 'fs';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
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
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return lines;
}

function escapeSQLString(str) {
  if (!str || str === '') return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

const csvContent = fs.readFileSync('./src/data/customer_master_new.csv', 'utf-8');
const lines = parseCSV(csvContent);
const headers = parseCSVLine(lines[0]);

console.log(`Total customers to import: ${lines.length - 1}\n`);

const sqlStatements = [];

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);

  if (values.length < headers.length) {
    console.log(`Skipping row ${i + 1}: insufficient columns`);
    continue;
  }

  const customerId = values[0];
  const isActive = values[1]?.toUpperCase() === 'ACTIVE';
  const groupId = values[2] || null;
  const customerName = values[4] || null;
  const salesPerson = values[5] || null;
  const gstin = values[6] || null;
  const customerAddress = values[7] || null;
  const customerCity = values[8] || null;
  const customerState = values[9] || null;
  const customerPhone = values[10] || null;
  const customerEmail = values[11] || null;
  const lrMailId = values[12] || null;
  const contractType = values[13] || null;
  const creditDays = values[14] ? parseInt(values[14]) : null;

  const sql = `INSERT INTO customer_master (
    customer_id, customer_name, is_active, group_id, sales_person,
    gstin, customer_address, customer_city, customer_state,
    customer_phone, customer_email, lr_mail_id, contract_type, credit_days
  ) VALUES (
    ${escapeSQLString(customerId)},
    ${escapeSQLString(customerName)},
    ${isActive},
    ${escapeSQLString(groupId)},
    ${escapeSQLString(salesPerson)},
    ${escapeSQLString(gstin)},
    ${escapeSQLString(customerAddress)},
    ${escapeSQLString(customerCity)},
    ${escapeSQLString(customerState)},
    ${escapeSQLString(customerPhone)},
    ${escapeSQLString(customerEmail)},
    ${escapeSQLString(lrMailId)},
    ${escapeSQLString(contractType)},
    ${creditDays || 'NULL'}
  ) ON CONFLICT (customer_id) DO NOTHING;`;

  sqlStatements.push(sql);
}

const batchedSQL = sqlStatements.join('\n\n');
fs.writeFileSync('./active_customers_import.sql', batchedSQL);

console.log(`\nGenerated SQL file: active_customers_import.sql`);
console.log(`Total SQL statements: ${sqlStatements.length}`);
