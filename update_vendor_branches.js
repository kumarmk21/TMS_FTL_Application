import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const vendorCodeIndex = headers.findIndex(h =>
    h.toLowerCase().includes('vendor') && h.toLowerCase().includes('code')
  );
  const branchIndex = headers.findIndex(h =>
    h.toLowerCase().includes('booking') && h.toLowerCase().includes('branch') ||
    h.toLowerCase().includes('branch')
  );

  if (vendorCodeIndex === -1 || branchIndex === -1) {
    console.error('Error: Could not find required columns');
    console.error('Expected columns: Vendor Code, Booking Branch (or similar)');
    console.error('Found headers:', headers);
    process.exit(1);
  }

  const updates = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(',').map(v => v.trim());
    const vendorCode = values[vendorCodeIndex];
    const branchCode = values[branchIndex];

    if (vendorCode && branchCode) {
      updates.push({ vendorCode, branchCode });
    }
  }

  return updates;
}

async function updateVendorBranches(csvFilePath) {
  try {
    console.log('Reading CSV file...');
    const csvContent = readFileSync(csvFilePath, 'utf-8');
    const updates = parseCSV(csvContent);

    console.log(`Found ${updates.length} vendor updates to process\n`);

    // Validate all branch codes exist first
    console.log('Validating branch codes...');
    const uniqueBranches = [...new Set(updates.map(u => u.branchCode))];
    const { data: branches, error: branchError } = await supabase
      .from('branch_master')
      .select('branch_code')
      .in('branch_code', uniqueBranches);

    if (branchError) {
      console.error('Error validating branches:', branchError);
      process.exit(1);
    }

    const validBranches = new Set(branches.map(b => b.branch_code));
    const invalidBranches = uniqueBranches.filter(b => !validBranches.has(b));

    if (invalidBranches.length > 0) {
      console.error('Error: The following branch codes do not exist:');
      invalidBranches.forEach(b => console.error(`  - ${b}`));
      console.error('\nPlease check your CSV file and ensure all branch codes exist in Branch Master.');
      process.exit(1);
    }

    console.log('All branch codes validated successfully!\n');

    // Process updates
    let successful = 0;
    let failed = 0;
    let notFound = 0;

    for (const { vendorCode, branchCode } of updates) {
      const { data, error } = await supabase
        .from('vendor_master')
        .update({ ven_bk_branch: branchCode })
        .eq('ven_code', vendorCode)
        .select();

      if (error) {
        console.error(`❌ Failed to update ${vendorCode}:`, error.message);
        failed++;
      } else if (!data || data.length === 0) {
        console.log(`⚠️  Vendor ${vendorCode} not found in database`);
        notFound++;
      } else {
        console.log(`✓ Updated ${vendorCode} → Branch: ${branchCode}`);
        successful++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Update Summary:');
    console.log('='.repeat(50));
    console.log(`✓ Successfully updated: ${successful}`);
    if (notFound > 0) console.log(`⚠️  Vendors not found: ${notFound}`);
    if (failed > 0) console.log(`❌ Failed updates: ${failed}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('Usage: node update_vendor_branches.js <csv_file_path>');
  console.error('\nExample: node update_vendor_branches.js vendor_branches.csv');
  console.error('\nCSV Format:');
  console.error('Vendor Code,Booking Branch');
  console.error('V0000001,BR001');
  console.error('V0000002,BR002');
  process.exit(1);
}

updateVendorBranches(csvFilePath);
