import fs from 'fs';

const sql = fs.readFileSync('./active_customers_import.sql', 'utf-8');

// Output for manual execution
console.log('=== SQL TO EXECUTE ===');
console.log('Total length:', sql.length, 'characters');
console.log('\nFirst 500 chars:');
console.log(sql.substring(0, 500));
console.log('\n... (truncated) ...\n');

// Save to a single-line version for easier execution
const singleLine = sql.replace(/\n/g, ' ').replace(/\s+/g, ' ');
fs.writeFileSync('./import_oneline.sql', singleLine);
console.log('Saved to import_oneline.sql');
