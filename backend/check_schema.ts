import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres.teqrpyhgfxlnxbhbctxt:Makura20605@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

async function check() {
  try {
    // Check ALL distinct roles and user_types
    const roles = await pool.query("SELECT DISTINCT role, user_type, sub_type FROM pegawai ORDER BY role");
    console.log('=== All distinct role/user_type combos ===');
    console.table(roles.rows);

    // Check constraint on role column
    const constraints = await pool.query(
      "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'pegawai'::regclass AND contype = 'c'"
    );
    console.log('\n=== CHECK constraints on pegawai ===');
    constraints.rows.forEach((r: any) => console.log(`  ${r.conname}: ${r.def}`));

    // Count all pegawai
    const count = await pool.query("SELECT COUNT(*) as total FROM pegawai");
    console.log('\n=== Total pegawai ===', count.rows[0].total);

    // Check if there are any admin/superadmin users
    const admins = await pool.query("SELECT id, nama, username, role, user_type FROM pegawai WHERE role IN ('admin', 'superadmin')");
    console.log('\n=== Admin/Superadmin users ===');
    console.log(admins.rows);

    // Check a known user for login test
    const testUser = await pool.query("SELECT id, nama, username, role, user_type, is_active, password_hash FROM pegawai LIMIT 1");
    console.log('\n=== First user (for login test) ===');
    const u = testUser.rows[0];
    console.log({ id: u.id, nama: u.nama, username: u.username, role: u.role, user_type: u.user_type, is_active: u.is_active, has_password: !!u.password_hash });

  } catch (err: any) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

check();
