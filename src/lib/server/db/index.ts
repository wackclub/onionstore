import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DATABASE_URL } from '$env/static/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL not defined.');

const requireSSL = DATABASE_URL.includes('sslmode=require');

const pool = new Pool({
	connectionString: DATABASE_URL,
	ssl: requireSSL ? { rejectUnauthorized: false } : undefined
});

export const db = drizzle(pool, { schema });

export * from './schema';

export { pool };
