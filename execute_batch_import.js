import fs from 'fs';

const sqlContent = fs.readFileSync('./active_customers_import.sql', 'utf-8');

// Split by double newline to get individual INSERT statements
const statements = sqlContent.split('\n\n').filter(s => s.trim().startsWith('INSERT'));

console.log(`Total INSERT statements: ${statements.length}`);
console.log('\nCombining all statements into single transaction...\n');

// Combine all statements into one big SQL block
const combinedSQL = statements.join(';\n\n') + ';';

fs.writeFileSync('./combined_import.sql', combinedSQL);
console.log('Generated combined_import.sql');
console.log('Execute this file using: mcp__supabase__execute_sql');
