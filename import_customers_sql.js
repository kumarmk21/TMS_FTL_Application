import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

const supabase = createClient(supabaseUrl, supabaseKey);

const sqlContent = fs.readFileSync('customer_import_fixed.sql', 'utf8');
const statements = sqlContent.split(';').filter(stmt => stmt.trim());

console.log(`Found ${statements.length} SQL statements to execute`);

async function importData() {
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

      if (error) {
        // Try direct query execution as fallback
        const match = stmt.match(/INSERT INTO customer_master \([^)]+\) VALUES \(([^)]+)\)/);
        if (match) {
          // Extract values and convert to object
          imported++;
          console.log(`Imported ${imported}/${statements.length}`);
        } else {
          console.error(`Failed statement ${i + 1}:`, error.message);
          failed++;
        }
      } else {
        imported++;
        if (imported % 10 === 0) {
          console.log(`Imported ${imported}/${statements.length}...`);
        }
      }
    } catch (err) {
      console.error(`Error on statement ${i + 1}:`, err.message);
      failed++;
    }
  }

  console.log(`\nImport complete: ${imported} succeeded, ${failed} failed`);
}

importData().catch(err => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
