import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { Pool } from 'pg';

dotenv.config();

let pool: any;

if (process.env.DATABASE_URL) {
  logger.info('🏢 Connecting to PostgreSQL via DATABASE_URL (Supabase)');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
} else {
  logger.info('🏢 Connecting to local PostgreSQL');
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

// Startup check: turn cryptic pg errors into an actionable message.
pool.query('SELECT 1').catch((err: any) => {
  const hints: Record<string, string> = {
    ENOTFOUND: 'Host DB tidak bisa di-resolve. Host "db.<ref>.supabase.co" hanya IPv6 — pakai URL Session Pooler (aws-x-<region>.pooler.supabase.com).',
    '28P01': 'Username/password salah. Untuk pooler, user harus "postgres.<project-ref>" dan karakter spesial di password wajib di-URL-encode (@=%40, #=%23, !=%21).',
    ETIMEDOUT: 'Koneksi timeout. Cek internet/firewall atau project Supabase sedang paused.',
  };
  logger.error(`❌ Gagal konek database [${err.code}]: ${hints[err.code] ?? err.message}`);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
