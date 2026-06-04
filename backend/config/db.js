const { Pool, Client } = require('pg');
const config = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('connect', () => {
  logger.info('Connected to PostgreSQL');
});

pool.on('error', (error) => {
  logger.error('Unexpected PostgreSQL pool error', error);
});

function createNotificationClient() {
  return new Client({
    connectionString: config.databaseUrl
  });
}

async function query(sql, params = []) {
  return pool.query(sql, params);
}

async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  createNotificationClient,
  closePool
};
