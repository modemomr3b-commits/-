import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
