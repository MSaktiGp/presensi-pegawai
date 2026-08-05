import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('✅ Koneksi ke Supabase berhasil!\n');

    // Run migration
    console.log('📦 Menjalankan migration (create tables)...');
    const migrationSQL = readFileSync(
      path.join(__dirname, '..', 'database', 'migrations', '001_create_tables.sql'),
      'utf-8'
    );
    await client.query(migrationSQL);
    console.log('✅ Tabel berhasil dibuat!\n');

    // Run seed
    console.log('🌱 Menjalankan seed (data pegawai)...');
    const seedSQL = readFileSync(
      path.join(__dirname, '..', 'database', 'seeds', 'seed_pegawai.sql'),
      'utf-8'
    );
    await client.query(seedSQL);
    console.log('✅ Data pegawai berhasil di-seed!\n');

    // Verify
    const result = await client.query('SELECT id, nama, nip, departemen, role FROM pegawai ORDER BY id');
    console.log(`📋 Total pegawai: ${result.rows.length}`);
    result.rows.forEach((row: any) => {
      console.log(`   ${row.id}. ${row.nama} (${row.nip}) - ${row.departemen} [${row.role}]`);
    });

    console.log('\n🎉 Supabase database siap digunakan!');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
