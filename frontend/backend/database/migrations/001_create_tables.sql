-- ============================================
-- Sistem Presensi DPMPTSP Kota Jambi
-- Database Migration: Create Tables
-- ============================================

-- Tabel pegawai (data pegawai existing)
CREATE TABLE IF NOT EXISTS pegawai (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  nip VARCHAR(50) UNIQUE NOT NULL,
  departemen VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'pegawai' CHECK (role IN ('pegawai', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel attendance (record presensi harian)
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  pegawai_id INT NOT NULL REFERENCES pegawai(id),
  date DATE NOT NULL,
  
  -- Check-in data
  checkin_time TIMESTAMP,
  checkin_latitude DECIMAL(10, 8),
  checkin_longitude DECIMAL(11, 8),
  checkin_distance_from_office DECIMAL(8, 2), -- meters
  checkin_photo_path VARCHAR(500),
  checkin_status VARCHAR(20) CHECK (checkin_status IN ('success', 'out_of_radius', 'late', 'failed')),
  
  -- Check-out data
  checkout_time TIMESTAMP,
  checkout_latitude DECIMAL(10, 8),
  checkout_longitude DECIMAL(11, 8),
  checkout_distance_from_office DECIMAL(8, 2),
  checkout_photo_path VARCHAR(500),
  checkout_status VARCHAR(20) CHECK (checkout_status IN ('success', 'out_of_radius', 'failed')),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Satu record per pegawai per hari
  UNIQUE(pegawai_id, date)
);

-- Tabel audit log (semua attempt, success & failed)
CREATE TABLE IF NOT EXISTS attendance_attempt_log (
  id SERIAL PRIMARY KEY,
  pegawai_id INT NOT NULL REFERENCES pegawai(id),
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  attempt_type VARCHAR(10) CHECK (attempt_type IN ('checkin', 'checkout')),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_from_office DECIMAL(8, 2),
  status VARCHAR(20) CHECK (status IN ('success', 'out_of_radius', 'duplicate', 'outside_hours', 'failed', 'late')),
  error_message TEXT
);

-- Indexes untuk performa query
CREATE INDEX IF NOT EXISTS idx_attendance_pegawai_date ON attendance(pegawai_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attempt_log_pegawai ON attendance_attempt_log(pegawai_id);
CREATE INDEX IF NOT EXISTS idx_attempt_log_time ON attendance_attempt_log(attempt_time);
