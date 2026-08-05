import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const USE_MEMORY_DB =
  process.env.USE_MEMORY_DB === 'true' ||
  (!process.env.DATABASE_URL && !process.env.DB_HOST);

let queryFn: (text: string, params?: any[]) => Promise<any>;
let getClientFn: () => Promise<any>;

if (USE_MEMORY_DB) {
  // Use in-memory database (no PostgreSQL required)
  logger.info('🗃️  Using IN-MEMORY database (development mode)');
  const memDb = require('./database.memory');
  queryFn = memDb.query;
  getClientFn = memDb.getClient;
} else {
  // Use real PostgreSQL (Supabase or local)
  const { Pool } = require('pg');

  let pool: any;

  if (process.env.DATABASE_URL) {
    // Supabase / cloud PostgreSQL via connection string
    logger.info('🐘 Connecting to PostgreSQL via DATABASE_URL (Supabase)');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  } else {
    // Local PostgreSQL via individual env vars
    logger.info('🐘 Connecting to local PostgreSQL');
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'presensi_dpmptsp',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  pool.on('connect', () => {
    logger.info('✅ Connected to PostgreSQL database');
  });

  pool.on('error', (err: Error) => {
    logger.error('Unexpected error on idle client', err);
  });

  queryFn = (text: string, params?: any[]) => pool.query(text, params);
  getClientFn = () => pool.connect();
}

export const query = queryFn;
export const getClient = getClientFn;

