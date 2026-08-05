-- ============================================
-- Sistem Presensi DPMPTSP Kota Jambi
-- Seed Data: Pegawai Dummy
-- ============================================
-- Password untuk semua pegawai: "password123"
-- BCrypt hash: $2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC

-- Clear existing data (jika re-seed)
DELETE FROM attendance_attempt_log;
DELETE FROM attendance;
DELETE FROM pegawai;

-- Reset sequence
ALTER SEQUENCE pegawai_id_seq RESTART WITH 1;

-- Insert Admin (1 account)
INSERT INTO pegawai (nama, nip, departemen, email, password_hash, role) VALUES
('Administrator', '100001', 'IT', 'admin@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'admin');

-- Insert Pegawai (10 pegawai)
INSERT INTO pegawai (nama, nip, departemen, email, password_hash, role) VALUES
('Ahmad Fauzi', '200001', 'Perizinan', 'ahmad.fauzi@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai'),
('Siti Nurhaliza', '200002', 'Perizinan', 'siti.nurhaliza@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai'),
('Budi Santoso', '200003', 'Pelayanan', 'budi.santoso@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai'),
('Dewi Lestari', '200004', 'Pelayanan', 'dewi.lestari@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai'),
('Rudi Hartono', '200005', 'TU', 'rudi.hartono@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai'),
('Maya Anggraini', '200006', 'TU', 'maya.anggraini@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai'),
('Eko Prasetyo', '200007', 'IT', 'eko.prasetyo@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai'),
('Rina Wati', '200008', 'Perizinan', 'rina.wati@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai'),
('Hendra Gunawan', '200009', 'Pelayanan', 'hendra.gunawan@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai'),
('Lina Mariana', '200010', 'TU', 'lina.mariana@dpmptsp-jambi.go.id', '$2b$10$7ZKYQMCdBEciNV4PF9Ed7ubbSKxuGPOUOrPonePrHVQp58ZpocVuC', 'pegawai');

-- Verifikasi
SELECT id, nama, nip, departemen, role FROM pegawai ORDER BY id;
