import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ckndwezfhmgnrjlbwdzz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrbmR3ZXpmaG1nbnJqbGJ3ZHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MjQxMjQsImV4cCI6MjA4MjQwMDEyNH0.mdP5LmTu6yx26RM8ATubBXXz-zFTW4YFQcqvrorUr88';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

async function importCustomers() {
  try {
    const csvContent = fs.readFileSync('./src/data/customer_master_new.csv', 'utf-8');
    const lines = parseCSV(csvContent);
    const headers = parseCSVLine(lines[0]);

    console.log(`Total customers to import: ${lines.length - 1}\n`);

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length < headers.length) {
        console.log(`Skipping row ${i + 1}: insufficient columns`);
        continue;
      }

      const customer = {
        customer_id: values[0],
        customer_name: values[4] || null,
        is_active: values[1]?.toUpperCase() === 'ACTIVE',
        group_id: values[2] || null,
        sales_person: values[5] || null,
        gstin: values[6] || null,
        customer_address: values[7] || null,
        customer_city: values[8] || null,
        customer_state: values[9] || null,
        customer_phone: values[10] || null,
        customer_email: values[11] || null,
        lr_mail_id: values[12] || null,
        contract_type: values[13] || null,
        credit_days: values[14] ? parseInt(values[14]) : null
      };

      try {
        const { error } = await supabase
          .from('customer_master')
          .insert([customer]);

        if (error) {
          if (error.message.includes('duplicate key') || error.code === '23505') {
            duplicateCount++;
            console.log(`Duplicate: ${customer.customer_id} (already exists)`);
          } else {
            throw error;
          }
        } else {
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`✓ Imported ${successCount} customers...`);
          }
        }
      } catch (error) {
        errorCount++;
        errors.push({
          row: i + 1,
          customer_id: customer.customer_id,
          error: error.message
        });
        console.error(`✗ Error importing ${customer.customer_id}: ${error.message}`);
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`✓ Successfully imported: ${successCount} customers`);
    console.log(`⊘ Duplicates skipped: ${duplicateCount} customers`);
    console.log(`✗ Errors: ${errorCount}`);
    console.log(`Total processed: ${successCount + duplicateCount + errorCount}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\nError details:');
      errors.forEach(e => {
        console.log(`  Row ${e.row} (${e.customer_id}): ${e.error}`);
      });
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

importCustomers();
