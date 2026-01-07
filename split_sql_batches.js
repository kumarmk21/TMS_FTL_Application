import fs from 'fs';

const sqlContent = fs.readFileSync('./active_customers_import.sql', 'utf-8');

// Split by INSERT statements
const statements = sqlContent.split(/(?=INSERT INTO customer_master)/).filter(s => s.trim().length > 0);

console.log(`Total statements: ${statements.length}`);

// Split into 5 batches
const batchSize = Math.ceil(statements.length / 5);
console.log(`Batch size: ${batchSize} statements each\n`);

for (let i = 0; i < 5; i++) {
  const start = i * batchSize;
  const end = Math.min(start + batchSize, statements.length);
  const batch = statements.slice(start, end);

  const batchSQL = batch.join('\n');
  const filename = `./import_batch_${i + 1}.sql`;

  fs.writeFileSync(filename, batchSQL);
  console.log(`Batch ${i + 1}: ${batch.length} statements -> ${filename}`);
}

console.log('\nAll batches created!');
