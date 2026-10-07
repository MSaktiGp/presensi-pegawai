-- ============================================
-- Sistem Presensi DPMPTSP Kota Jambi
-- Seed Data: Multi-role system
-- ============================================
-- Password untuk semua user: "password123"
-- BCrypt hash: $2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC

-- Clear existing data (jika re-seed)
DELETE FROM pegawai_shift_assignment;
DELETE FROM attendance_attempt_log;
DELETE FROM attendance;
DELETE FROM pegawai;
DELETE FROM gerai;
DELETE FROM shift_config;

-- Reset sequences
ALTER SEQUENCE pegawai_id_seq RESTART WITH 1;
ALTER SEQUENCE gerai_id_seq RESTART WITH 1;
ALTER SEQUENCE shift_config_id_seq RESTART WITH 1;
ALTER SEQUENCE pegawai_shift_assignment_id_seq RESTART WITH 1;

-- ============================================
-- 1. Seed Gerai
-- ============================================
INSERT INTO gerai (kode_gerai, nama_gerai, is_active) VALUES
  ('40B', 'Gerai 40B', TRUE),
  ('61A', 'Gerai 61A', TRUE),
  ('62A', 'Gerai 62A', TRUE),
  ('63A', 'Gerai 63A', TRUE),
  ('64A', 'Gerai 64A', TRUE);

-- ============================================
-- 2. Seed Shift Config
-- ============================================
INSERT INTO shift_config (nama_shift, user_type, jam_masuk, jam_keluar, is_cross_midnight, late_threshold_minutes) VALUES
  ('reguler', 'pegawai_gerai', '07:30', '16:30', FALSE, 90),
  ('reguler', 'cs', '07:30', '16:30', FALSE, 90),
  ('pagi', 'satpam', '07:00', '15:00', FALSE, 60),
  ('siang', 'satpam', '15:00', '23:00', FALSE, 60),
  ('malam', 'satpam', '23:00', '07:00', TRUE, 60);

-- ============================================
-- 3. Seed Super Admin (1 account)
-- ============================================
INSERT INTO pegawai (nama, username, departemen, email, password_hash, role, user_type, is_active) VALUES
  ('Super Administrator', 'superadmin', 'IT', 'superadmin@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'superadmin', 'superadmin', TRUE);

-- ============================================
-- 4. Seed Admin (1 account)
-- ============================================
INSERT INTO pegawai (nama, username, departemen, email, password_hash, role, user_type, is_active) VALUES
  ('Administrator', 'admin', 'IT', 'admin@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'admin', 'admin', TRUE);

-- ============================================
-- 5. Seed Pegawai Gerai (username = kode gerai)
-- ============================================
INSERT INTO pegawai (nama, username, departemen, email, password_hash, role, user_type, gerai_id, is_active) VALUES
  ('Petugas Gerai PT PLN', '40B', 'Pelayanan', 'gerai40b@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai_gerai', 'pegawai_gerai',
   (SELECT id FROM gerai WHERE kode_gerai = '40B'), TRUE),

  ('Petugas Gerai BPJS Kesehatan', '61A', 'Pelayanan', 'gerai61a@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai_gerai', 'pegawai_gerai',
   (SELECT id FROM gerai WHERE kode_gerai = '61A'), TRUE),

  ('Petugas Gerai DJP', '62A', 'Pelayanan', 'gerai62a@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai_gerai', 'pegawai_gerai',
   (SELECT id FROM gerai WHERE kode_gerai = '62A'), TRUE),

  ('Petugas Gerai PT Pos Indonesia', '63A', 'Pelayanan', 'gerai63a@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai_gerai', 'pegawai_gerai',
   (SELECT id FROM gerai WHERE kode_gerai = '63A'), TRUE),

  ('Petugas Gerai PERUMDAM', '64A', 'Pelayanan', 'gerai64a@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai_gerai', 'pegawai_gerai',
   (SELECT id FROM gerai WHERE kode_gerai = '64A'), TRUE);

-- ============================================
-- 6. Seed Satpam (username = nama lengkap)
-- ============================================
INSERT INTO pegawai (nama, username, departemen, email, password_hash, role, user_type, is_active) VALUES
  ('Budi Santoso', 'budisantoso', 'Keamanan', 'budi.santoso@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'satpam', 'satpam', TRUE),

  ('Andi Wijaya', 'andiwijaya', 'Keamanan', 'andi.wijaya@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'satpam', 'satpam', TRUE),

  ('Hendra Gunawan', 'hendragunawan', 'Keamanan', 'hendra.gunawan@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'satpam', 'satpam', TRUE);

-- ============================================
-- 7. Seed CS (username = nama lengkap)
-- ============================================
INSERT INTO pegawai (nama, username, departemen, email, password_hash, role, user_type, sub_type, is_active) VALUES
  ('Rina Wati', 'rinawati', 'Pelayanan', 'rina.wati@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'cs', 'cs', 'resepsionis', TRUE),

  ('Siti Nurhaliza', 'sitinurhaliza', 'Pelayanan', 'siti.nurhaliza@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'cs', 'cs', 'resepsionis', TRUE),

  ('Maya Anggraini', 'mayaanggraini', 'Kebersihan', 'maya.anggraini@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'cs', 'cs', 'cleaning_service', TRUE),

  ('Dewi Lestari', 'dewilestari', 'Kebersihan', 'dewi.lestari@dpmptsp-jambi.go.id',
   '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'cs', 'cs', 'cleaning_service', TRUE);

-- ============================================
-- 8. Assign Shift ke Satpam
-- ============================================
INSERT INTO pegawai_shift_assignment (pegawai_id, shift_config_id, tanggal_mulai, is_active) VALUES
  -- Budi Santoso → Shift Pagi
  ((SELECT id FROM pegawai WHERE username = 'budisantoso'),
   (SELECT id FROM shift_config WHERE nama_shift = 'pagi' AND user_type = 'satpam'),
   '2026-10-01', TRUE),

  -- Andi Wijaya → Shift Siang
  ((SELECT id FROM pegawai WHERE username = 'andiwijaya'),
   (SELECT id FROM shift_config WHERE nama_shift = 'siang' AND user_type = 'satpam'),
   '2026-10-01', TRUE),

  -- Hendra Gunawan → Shift Malam
  ((SELECT id FROM pegawai WHERE username = 'hendragunawan'),
   (SELECT id FROM shift_config WHERE nama_shift = 'malam' AND user_type = 'satpam'),
   '2026-10-01', TRUE);

-- ============================================
-- 9. Assign Shift ke CS
-- ============================================
INSERT INTO pegawai_shift_assignment (pegawai_id, shift_config_id, tanggal_mulai, is_active) VALUES
  ((SELECT id FROM pegawai WHERE username = 'rinawati'),
   (SELECT id FROM shift_config WHERE nama_shift = 'reguler' AND user_type = 'cs'),
   '2026-10-01', TRUE),

  ((SELECT id FROM pegawai WHERE username = 'sitinurhaliza'),
   (SELECT id FROM shift_config WHERE nama_shift = 'reguler' AND user_type = 'cs'),
   '2026-10-01', TRUE),

  ((SELECT id FROM pegawai WHERE username = 'mayaanggraini'),
   (SELECT id FROM shift_config WHERE nama_shift = 'reguler' AND user_type = 'cs'),
   '2026-10-01', TRUE),

  ((SELECT id FROM pegawai WHERE username = 'dewilestari'),
   (SELECT id FROM shift_config WHERE nama_shift = 'reguler' AND user_type = 'cs'),
   '2026-10-01', TRUE);

-- ============================================
-- 10. Assign Shift ke Pegawai Gerai
-- ============================================
INSERT INTO pegawai_shift_assignment (pegawai_id, shift_config_id, tanggal_mulai, is_active) VALUES
  ((SELECT id FROM pegawai WHERE username = '40B'),
   (SELECT id FROM shift_config WHERE nama_shift = 'reguler' AND user_type = 'pegawai_gerai'),
   '2026-10-01', TRUE),

  ((SELECT id FROM pegawai WHERE username = '61A'),
   (SELECT id FROM shift_config WHERE nama_shift = 'reguler' AND user_type = 'pegawai_gerai'),
   '2026-10-01', TRUE),

  ((SELECT id FROM pegawai WHERE username = '62A'),
   (SELECT id FROM shift_config WHERE nama_shift = 'reguler' AND user_type = 'pegawai_gerai'),
   '2026-10-01', TRUE),

  ((SELECT id FROM pegawai WHERE username = '63A'),
   (SELECT id FROM shift_config WHERE nama_shift = 'reguler' AND user_type = 'pegawai_gerai'),
   '2026-10-01', TRUE),

  ((SELECT id FROM pegawai WHERE username = '64A'),
   (SELECT id FROM shift_config WHERE nama_shift = 'reguler' AND user_type = 'pegawai_gerai'),
   '2026-10-01', TRUE);

-- ============================================
-- Verifikasi
-- ============================================
SELECT id, nama, username, user_type, sub_type, role, gerai_id, is_active FROM pegawai ORDER BY id;
SELECT * FROM gerai ORDER BY id;
SELECT * FROM shift_config ORDER BY id;
SELECT psa.id, p.nama, p.user_type, sc.nama_shift, psa.tanggal_mulai, psa.is_active
  FROM pegawai_shift_assignment psa
  JOIN pegawai p ON psa.pegawai_id = p.id
  JOIN shift_config sc ON psa.shift_config_id = sc.id
  ORDER BY p.user_type, p.nama;
