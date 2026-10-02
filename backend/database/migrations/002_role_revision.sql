-- ============================================
-- Sistem Presensi DPMPTSP Kota Jambi
-- Migration 002: Role Revision
-- Multi-role system (pegawai_gerai, satpam, cs, admin, superadmin)
-- ============================================

-- ============================================
-- 1. Tabel gerai
-- ============================================
CREATE TABLE IF NOT EXISTS gerai (
  id SERIAL PRIMARY KEY,
  kode_gerai VARCHAR(20) UNIQUE NOT NULL,
  nama_gerai VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. Tabel shift_config
-- ============================================
CREATE TABLE IF NOT EXISTS shift_config (
  id SERIAL PRIMARY KEY,
  nama_shift VARCHAR(50) NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  jam_masuk TIME NOT NULL,
  jam_keluar TIME NOT NULL,
  is_cross_midnight BOOLEAN DEFAULT FALSE,
  late_threshold_minutes INT DEFAULT 60,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. Alter tabel pegawai
-- ============================================

-- Tambah kolom username (sementara nullable untuk migrasi)
ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- Tambah kolom user_type
ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'pegawai_gerai';

-- Tambah kolom sub_type (untuk CS: resepsionis / cleaning_service)
ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS sub_type VARCHAR(50);

-- Tambah kolom is_active
ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Tambah kolom gerai_id (FK ke gerai)
ALTER TABLE pegawai ADD COLUMN IF NOT EXISTS gerai_id INT;

-- ============================================
-- 4. Drop constraint role lama SEBELUM migrasi data
--    (constraint lama hanya izinkan 'pegawai','admin')
-- ============================================
ALTER TABLE pegawai DROP CONSTRAINT IF EXISTS pegawai_role_check;

-- ============================================
-- 5. Migrasi data existing
-- ============================================

-- Set username dari NIP untuk pegawai existing
UPDATE pegawai SET username = nip WHERE username IS NULL;

-- Set role + user_type untuk pegawai existing
-- (role lama 'pegawai' tidak valid di constraint baru, harus jadi 'pegawai_gerai')
UPDATE pegawai SET role = 'pegawai_gerai', user_type = 'pegawai_gerai' WHERE role = 'pegawai' OR role IS NULL;

-- Upgrade admin existing ke superadmin
UPDATE pegawai SET role = 'superadmin', user_type = 'superadmin' WHERE role = 'admin';

-- ============================================
-- 6. Set constraints setelah migrasi
-- ============================================

-- Buat username NOT NULL dan UNIQUE setelah data diisi
ALTER TABLE pegawai ALTER COLUMN username SET NOT NULL;

-- Tambah unique constraint pada username (jika belum ada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pegawai_username_key'
  ) THEN
    ALTER TABLE pegawai ADD CONSTRAINT pegawai_username_key UNIQUE (username);
  END IF;
END $$;

-- Buat constraint role baru (lama sudah di-drop di step 4)
ALTER TABLE pegawai ADD CONSTRAINT pegawai_role_check
  CHECK (role IN ('pegawai_gerai', 'satpam', 'cs', 'admin', 'superadmin'));

-- Tambah check constraint untuk user_type
ALTER TABLE pegawai DROP CONSTRAINT IF EXISTS pegawai_user_type_check;
ALTER TABLE pegawai ADD CONSTRAINT pegawai_user_type_check
  CHECK (user_type IN ('pegawai_gerai', 'satpam', 'cs', 'admin', 'superadmin'));

-- Tambah FK gerai_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pegawai_gerai_id_fkey'
  ) THEN
    ALTER TABLE pegawai ADD CONSTRAINT pegawai_gerai_id_fkey
      FOREIGN KEY (gerai_id) REFERENCES gerai(id);
  END IF;
END $$;

-- ============================================
-- 6. Tabel pegawai_shift_assignment
-- ============================================
CREATE TABLE IF NOT EXISTS pegawai_shift_assignment (
  id SERIAL PRIMARY KEY,
  pegawai_id INT NOT NULL REFERENCES pegawai(id),
  shift_config_id INT NOT NULL REFERENCES shift_config(id),
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. Seed shift_config
-- ============================================
INSERT INTO shift_config (nama_shift, user_type, jam_masuk, jam_keluar, is_cross_midnight, late_threshold_minutes) VALUES
  ('reguler', 'pegawai_gerai', '07:30', '16:30', FALSE, 90),
  ('reguler', 'cs', '07:30', '16:30', FALSE, 90),
  ('pagi', 'satpam', '07:00', '15:00', FALSE, 60),
  ('siang', 'satpam', '15:00', '23:00', FALSE, 60),
  ('malam', 'satpam', '23:00', '07:00', TRUE, 60)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pegawai_username ON pegawai(username);
CREATE INDEX IF NOT EXISTS idx_pegawai_user_type ON pegawai(user_type);
CREATE INDEX IF NOT EXISTS idx_pegawai_gerai ON pegawai(gerai_id);
CREATE INDEX IF NOT EXISTS idx_pegawai_active ON pegawai(is_active);
CREATE INDEX IF NOT EXISTS idx_gerai_active ON gerai(is_active);
CREATE INDEX IF NOT EXISTS idx_shift_assignment_pegawai ON pegawai_shift_assignment(pegawai_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignment_active ON pegawai_shift_assignment(is_active);
