import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Signer } from '@aws-sdk/rds-signer';
import { awsCredentialsProvider } from '@vercel/functions/oidc';
import { attachDatabasePool } from '@vercel/functions';
import * as schema from './schema.ts';

const PORT = Number(process.env.PGPORT || 5432);

/**
 * Tạo pool kết nối tới Amazon Aurora PostgreSQL bằng IAM auth (OIDC).
 * Không có mật khẩu tĩnh: token được sinh lại cho mỗi kết nối.
 */
export const createPool = () => {
  const signer = new Signer({
    credentials: awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
      clientConfig: { region: process.env.AWS_REGION },
    }),
    region: process.env.AWS_REGION,
    hostname: process.env.PGHOST!,
    username: process.env.PGUSER || 'postgres',
    port: PORT,
  });

  return new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE || 'postgres',
    port: PORT,
    user: process.env.PGUSER || 'postgres',
    password: () => signer.getAuthToken(),
    ssl: { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 15000,
  });
};

const pool = createPool();
attachDatabasePool(pool);

// Tránh lỗi ở tầng pool làm sập ứng dụng
pool.on('error', (err) => {
  console.error('Lỗi không mong đợi từ pool Postgres:', err);
});

export const db = drizzle(pool, { schema });
