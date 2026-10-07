import { query } from './src/config/database';

async function run() {
  try {
    await query(`ALTER TABLE pegawai DROP CONSTRAINT IF EXISTS pegawai_role_check`);
    await query(`ALTER TABLE pegawai ADD CONSTRAINT pegawai_role_check CHECK (role IN ('pegawai_gerai', 'satpam', 'cs', 'resepsionis', 'admin', 'superadmin'))`);
    
    await query(`ALTER TABLE pegawai DROP CONSTRAINT IF EXISTS pegawai_user_type_check`);
    await query(`ALTER TABLE pegawai ADD CONSTRAINT pegawai_user_type_check CHECK (user_type IN ('pegawai_gerai', 'satpam', 'cs', 'resepsionis', 'admin', 'superadmin'))`);
    
    await query(`UPDATE pegawai SET user_type = 'resepsionis', role = 'resepsionis', sub_type = NULL WHERE user_type = 'cs' AND LOWER(sub_type) = 'resepsionis'`);
    
    await query(`UPDATE shift_config SET user_type = 'resepsionis' WHERE user_type = 'cs' AND nama_shift = 'resepsionis'`);
    // Wait, shift config might just need an insert if not exists
    const res = await query(`SELECT * FROM shift_config WHERE user_type = 'resepsionis'`);
    if(res.rows.length === 0) {
      await query(`INSERT INTO shift_config (nama_shift, user_type, jam_masuk, jam_keluar, is_cross_midnight, late_threshold_minutes) VALUES ('reguler', 'resepsionis', '07:30', '16:30', FALSE, 90)`);
    }

    await query(`ALTER TABLE shift_config ADD COLUMN IF NOT EXISTS allowed_days VARCHAR(50) DEFAULT '0,1,2,3,4,5,6'`);
    console.log('DB Updated');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
