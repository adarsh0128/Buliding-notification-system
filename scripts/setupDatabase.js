const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '..', 'backend', '.env')
});

async function setupDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Set it in backend/.env.');
  }

  const schemaPath = path.resolve(__dirname, '..', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();
  await client.query(schemaSql);
  await client.end();

  console.log('Database schema applied successfully.');
}

setupDatabase().catch((error) => {
  console.error('Failed to apply database schema:');
  console.error(error.stack || error.message || error);
  process.exit(1);
});
