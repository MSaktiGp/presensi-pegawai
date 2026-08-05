import { Request, Response } from 'express';
import { query } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export const getAttendanceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, pegawai_id, departemen } = req.query;
    const reportDate = date ? String(date) : new Date().toISOString().split('T')[0];

    let sql = `
      SELECT 
        p.id as pegawai_id,
        p.nama,
        p.nip,
        p.departemen,
        a.checkin_time,
        a.checkin_status,
        a.checkin_distance_from_office,
        a.checkin_photo_path,
        a.checkout_time,
        a.checkout_status,
        a.checkout_distance_from_office,
        a.checkout_photo_path
      FROM pegawai p
      LEFT JOIN attendance a ON p.id = a.pegawai_id AND a.date = $1
      WHERE p.role != 'admin'
    `;
    const params: any[] = [reportDate];

    if (pegawai_id) {
      params.push(Number(pegawai_id));
      sql += ` AND p.id = $${params.length}`;
    }

    if (departemen) {
      params.push(String(departemen));
      sql += ` AND p.departemen = $${params.length}`;
    }

    sql += ' ORDER BY p.nama ASC';

    const result = await query(sql, params);

    const report = result.rows.map((row: Record<string, any>) => ({
      pegawai_id: row.pegawai_id,
      nama: row.nama,
      nip: row.nip,
      departemen: row.departemen,
      checkin: row.checkin_time
        ? {
            time: row.checkin_time,
            status: row.checkin_status,
            distance: row.checkin_distance_from_office,
            photo: row.checkin_photo_path,
          }
        : null,
      checkout: row.checkout_time
        ? {
            time: row.checkout_time,
            status: row.checkout_status,
            distance: row.checkout_distance_from_office,
            photo: row.checkout_photo_path,
          }
        : null,
    }));

    // Summary stats
    const totalPegawai = report.length;
    const hadirCount = report.filter((r: any) => r.checkin !== null).length;
    const tidakHadirCount = totalPegawai - hadirCount;
    const terlambatCount = report.filter((r: any) => r.checkin?.status === 'late').length;
    const sudahPulangCount = report.filter((r: any) => r.checkout !== null).length;

    sendSuccess(res, {
      date: reportDate,
      summary: {
        total_pegawai: totalPegawai,
        hadir: hadirCount,
        tidak_hadir: tidakHadirCount,
        terlambat: terlambatCount,
        sudah_pulang: sudahPulangCount,
      },
      report,
    });
  } catch (error) {
    logger.error('Get attendance report error', { error });
    sendError(res, 'Gagal mengambil laporan presensi.', 500);
  }
};

export const getAttemptLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, pegawai_id } = req.query;
    const reportDate = date ? String(date) : new Date().toISOString().split('T')[0];

    let sql = `
      SELECT 
        al.id,
        al.pegawai_id,
        p.nama,
        p.nip,
        al.attempt_time,
        al.attempt_type,
        al.latitude,
        al.longitude,
        al.distance_from_office,
        al.status,
        al.error_message
      FROM attendance_attempt_log al
      JOIN pegawai p ON al.pegawai_id = p.id
      WHERE DATE(al.attempt_time) = $1
    `;
    const params: any[] = [reportDate];

    if (pegawai_id) {
      params.push(Number(pegawai_id));
      sql += ` AND al.pegawai_id = $${params.length}`;
    }

    sql += ' ORDER BY al.attempt_time DESC';

    const result = await query(sql, params);

    sendSuccess(res, {
      date: reportDate,
      total: result.rows.length,
      logs: result.rows,
    });
  } catch (error) {
    logger.error('Get attempt logs error', { error });
    sendError(res, 'Gagal mengambil log presensi.', 500);
  }
};
