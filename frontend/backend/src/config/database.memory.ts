/**
 * In-Memory Database for Development (tanpa PostgreSQL).
 * 
 * Simulates the PostgreSQL database using in-memory arrays.
 * Data will reset setiap kali server restart.
 * 
 * Gunakan ini untuk development/demo. Untuk production, gunakan PostgreSQL.
 */
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

// ============================================
// Types
// ============================================
interface Pegawai {
  id: number;
  nama: string;
  nip: string;
  departemen: string;
  email: string;
  password_hash: string;
  role: string;
}

interface Attendance {
  id: number;
  pegawai_id: number;
  date: string;
  checkin_time: string | null;
  checkin_latitude: number | null;
  checkin_longitude: number | null;
  checkin_distance_from_office: number | null;
  checkin_photo_path: string | null;
  checkin_status: string | null;
  checkout_time: string | null;
  checkout_latitude: number | null;
  checkout_longitude: number | null;
  checkout_distance_from_office: number | null;
  checkout_photo_path: string | null;
  checkout_status: string | null;
  created_at: string;
  updated_at: string;
}

interface AttemptLog {
  id: number;
  pegawai_id: number;
  attempt_time: string;
  attempt_type: string;
  latitude: number;
  longitude: number;
  distance_from_office: number;
  status: string;
  error_message: string | null;
}

// ============================================
// In-Memory Storage
// ============================================
let pegawaiData: Pegawai[] = [];
let attendanceData: Attendance[] = [];
let attemptLogData: AttemptLog[] = [];
let attendanceIdCounter = 1;
let attemptLogIdCounter = 1;

// ============================================
// Initialize seed data
// ============================================
const initSeedData = async () => {
  const hash = await bcrypt.hash('password123', 10);

  pegawaiData = [
    { id: 1, nama: 'Administrator', nip: '100001', departemen: 'IT', email: 'admin@dpmptsp-jambi.go.id', password_hash: hash, role: 'admin' },
    { id: 2, nama: 'Ahmad Fauzi', nip: '200001', departemen: 'Perizinan', email: 'ahmad.fauzi@dpmptsp-jambi.go.id', password_hash: hash, role: 'pegawai' },
    { id: 3, nama: 'Siti Nurhaliza', nip: '200002', departemen: 'Perizinan', email: 'siti.nurhaliza@dpmptsp-jambi.go.id', password_hash: hash, role: 'pegawai' },
    { id: 4, nama: 'Budi Santoso', nip: '200003', departemen: 'Pelayanan', email: 'budi.santoso@dpmptsp-jambi.go.id', password_hash: hash, role: 'pegawai' },
    { id: 5, nama: 'Dewi Lestari', nip: '200004', departemen: 'Pelayanan', email: 'dewi.lestari@dpmptsp-jambi.go.id', password_hash: hash, role: 'pegawai' },
    { id: 6, nama: 'Rudi Hartono', nip: '200005', departemen: 'TU', email: 'rudi.hartono@dpmptsp-jambi.go.id', password_hash: hash, role: 'pegawai' },
    { id: 7, nama: 'Maya Anggraini', nip: '200006', departemen: 'TU', email: 'maya.anggraini@dpmptsp-jambi.go.id', password_hash: hash, role: 'pegawai' },
    { id: 8, nama: 'Eko Prasetyo', nip: '200007', departemen: 'IT', email: 'eko.prasetyo@dpmptsp-jambi.go.id', password_hash: hash, role: 'pegawai' },
    { id: 9, nama: 'Rina Wati', nip: '200008', departemen: 'Perizinan', email: 'rina.wati@dpmptsp-jambi.go.id', password_hash: hash, role: 'pegawai' },
    { id: 10, nama: 'Hendra Gunawan', nip: '200009', departemen: 'Pelayanan', email: 'hendra.gunawan@dpmptsp-jambi.go.id', password_hash: hash, role: 'pegawai' },
    { id: 11, nama: 'Lina Mariana', nip: '200010', departemen: 'TU', email: 'lina.mariana@dpmptsp-jambi.go.id', password_hash: hash, role: 'pegawai' },
  ];

  logger.info(`📦 In-memory DB initialized with ${pegawaiData.length} pegawai (password: password123)`);
};

// Initialize on import
const initPromise = initSeedData();

// ============================================
// Query simulator — mimics pg.Pool.query()
// ============================================
interface QueryResult {
  rows: any[];
  rowCount: number;
}

export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  await initPromise; // Ensure seed data is ready

  const sql = text.trim().toUpperCase();

  // ---- SELECT from pegawai ----
  if (sql.startsWith('SELECT') && sql.includes('FROM PEGAWAI')) {
    if (sql.includes('WHERE NIP')) {
      const nip = params?.[0];
      const rows = pegawaiData.filter(p => p.nip === nip);
      return { rows, rowCount: rows.length };
    }
    if (sql.includes('WHERE ID') || sql.includes('WHERE P.ID')) {
      const id = params?.[0];
      const rows = pegawaiData.filter(p => p.id === Number(id));
      return { rows, rowCount: rows.length };
    }
    return { rows: pegawaiData, rowCount: pegawaiData.length };
  }

  // ---- SELECT from attendance (today-status) ----
  if (sql.startsWith('SELECT') && sql.includes('FROM ATTENDANCE') && !sql.includes('JOIN')) {
    const pegawai_id = params?.[0];
    const date = params?.[1];
    const rows = attendanceData.filter(a => a.pegawai_id === Number(pegawai_id) && a.date === date);
    return { rows, rowCount: rows.length };
  }

  // ---- INSERT INTO attendance_attempt_log ----
  if (sql.includes('INSERT INTO ATTENDANCE_ATTEMPT_LOG')) {
    const log: AttemptLog = {
      id: attemptLogIdCounter++,
      pegawai_id: params?.[0],
      attempt_time: new Date().toISOString(),
      attempt_type: params?.[1],
      latitude: params?.[2],
      longitude: params?.[3],
      distance_from_office: params?.[4],
      status: params?.[5],
      error_message: params?.[6] || null,
    };
    attemptLogData.push(log);
    return { rows: [log], rowCount: 1 };
  }

  // ---- INSERT INTO attendance (with ON CONFLICT / upsert) ----
  if (sql.includes('INSERT INTO ATTENDANCE')) {
    const pegawai_id = Number(params?.[0]);
    const date = String(params?.[1]);
    const isCheckin = sql.includes('CHECKIN_TIME');
    
    let existing = attendanceData.find(a => a.pegawai_id === pegawai_id && a.date === date);
    
    if (existing) {
      // UPDATE existing
      if (isCheckin) {
        existing.checkin_time = new Date().toISOString();
        existing.checkin_latitude = params?.[2];
        existing.checkin_longitude = params?.[3];
        existing.checkin_distance_from_office = params?.[4];
        existing.checkin_photo_path = params?.[5];
        existing.checkin_status = params?.[6];
      } else {
        existing.checkout_time = new Date().toISOString();
        existing.checkout_latitude = params?.[2];
        existing.checkout_longitude = params?.[3];
        existing.checkout_distance_from_office = params?.[4];
        existing.checkout_photo_path = params?.[5];
        existing.checkout_status = params?.[6];
      }
      existing.updated_at = new Date().toISOString();
      return { rows: [existing], rowCount: 1 };
    } else {
      // INSERT new
      const now = new Date().toISOString();
      const newRecord: Attendance = {
        id: attendanceIdCounter++,
        pegawai_id,
        date,
        checkin_time: isCheckin ? now : null,
        checkin_latitude: isCheckin ? params?.[2] : null,
        checkin_longitude: isCheckin ? params?.[3] : null,
        checkin_distance_from_office: isCheckin ? params?.[4] : null,
        checkin_photo_path: isCheckin ? params?.[5] : null,
        checkin_status: isCheckin ? params?.[6] : null,
        checkout_time: !isCheckin ? now : null,
        checkout_latitude: !isCheckin ? params?.[2] : null,
        checkout_longitude: !isCheckin ? params?.[3] : null,
        checkout_distance_from_office: !isCheckin ? params?.[4] : null,
        checkout_photo_path: !isCheckin ? params?.[5] : null,
        checkout_status: !isCheckin ? params?.[6] : null,
        created_at: now,
        updated_at: now,
      };
      attendanceData.push(newRecord);
      return { rows: [newRecord], rowCount: 1 };
    }
  }

  // ---- Admin: SELECT with JOIN (attendance report) ----
  if (sql.includes('FROM PEGAWAI P') && sql.includes('LEFT JOIN ATTENDANCE')) {
    const reportDate = params?.[0];
    const pegawai_id_filter = params?.[1] ? Number(params[1]) : null;
    const dept_filter = params?.[2] ? String(params[2]) : null;

    let filteredPegawai = pegawaiData.filter(p => p.role !== 'admin');
    
    if (pegawai_id_filter) {
      filteredPegawai = filteredPegawai.filter(p => p.id === pegawai_id_filter);
    }
    if (dept_filter) {
      filteredPegawai = filteredPegawai.filter(p => p.departemen === dept_filter);
    }

    const rows = filteredPegawai.map(p => {
      const att = attendanceData.find(a => a.pegawai_id === p.id && a.date === reportDate);
      return {
        pegawai_id: p.id,
        nama: p.nama,
        nip: p.nip,
        departemen: p.departemen,
        checkin_time: att?.checkin_time || null,
        checkin_status: att?.checkin_status || null,
        checkin_distance_from_office: att?.checkin_distance_from_office || null,
        checkin_photo_path: att?.checkin_photo_path || null,
        checkout_time: att?.checkout_time || null,
        checkout_status: att?.checkout_status || null,
        checkout_distance_from_office: att?.checkout_distance_from_office || null,
        checkout_photo_path: att?.checkout_photo_path || null,
      };
    });

    return { rows, rowCount: rows.length };
  }

  // ---- Admin: Attempt logs ----
  if (sql.includes('FROM ATTENDANCE_ATTEMPT_LOG')) {
    const reportDate = params?.[0];
    const pegawai_id_filter = params?.[1] ? Number(params[1]) : null;

    let logs = attemptLogData.filter(l => l.attempt_time.startsWith(reportDate));
    
    if (pegawai_id_filter) {
      logs = logs.filter(l => l.pegawai_id === pegawai_id_filter);
    }

    const rows = logs.map(l => {
      const p = pegawaiData.find(pg => pg.id === l.pegawai_id);
      return {
        ...l,
        nama: p?.nama || 'Unknown',
        nip: p?.nip || '',
      };
    });

    return { rows, rowCount: rows.length };
  }

  // Fallback
  logger.warn('Unhandled in-memory query', { sql: text.substring(0, 100) });
  return { rows: [], rowCount: 0 };
};

export const getClient = async () => {
  return { query, release: () => {} };
};

export default { query, connect: getClient };
