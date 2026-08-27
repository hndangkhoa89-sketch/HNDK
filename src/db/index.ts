import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Create a pool from the project's PostgreSQL environment variables.
// Keep SQL_* fallbacks for older local configurations.
export const createPool = () => {
  const sslMode = process.env.PGSSLMODE ?? process.env.SQL_SSL_MODE;
  const ssl = sslMode && sslMode !== 'disable' ? { rejectUnauthorized: false } : undefined;

  return new Pool({
    host: process.env.PGHOST ?? process.env.SQL_HOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER ?? process.env.SQL_USER,
    password: process.env.PGPASSWORD ?? process.env.SQL_PASSWORD,
    database: process.env.PGDATABASE ?? process.env.SQL_DB_NAME,
    ssl,
    connectionTimeoutMillis: 15000,
  });
};

// Create a pool instance.
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
