import { Request, Response } from 'express';
import { query } from '../config/database';
import { CONFIG } from '../config/constants';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/** Get today's date string (YYYY-MM-DD) in WIB timezone. */
const getWIBDateString = (): string => {
  const now = new Date();
  const wib = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
  const year = wib.getFullYear();
  const month = String(wib.getMonth() + 1).padStart(2, '0');
  const day = String(wib.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getAttendanceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, pegawai_id, departemen, user_type } = req.query;
    const reportDate = date ? String(date) : getWIBDateString();

    let sql = `
      SELECT 
        p.id as pegawai_id,
        p.nama,
        p.username,
        p.nip,
        p.departemen,
        p.user_type,
        p.sub_type,
        g.kode_gerai,
        sc.nama_shift,
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
      LEFT JOIN gerai g ON p.gerai_id = g.id
      LEFT JOIN pegawai_shift_assignment psa ON p.id = psa.pegawai_id AND psa.is_active = TRUE
      LEFT JOIN shift_config sc ON psa.shift_config_id = sc.id
      WHERE p.is_active = TRUE
        AND p.role NOT IN ('admin', 'superadmin')
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

    if (user_type && user_type !== 'all') {
      params.push(String(user_type));
      sql += ` AND p.user_type = $${params.length}`;
    }

    sql += ' ORDER BY p.user_type, p.nama ASC';

    const result = await query(sql, params);

    const report = result.rows.map((row: Record<string, any>) => ({
      pegawai_id: row.pegawai_id,
      nama: row.nama,
      username: row.username,
      nip: row.nip,
      departemen: row.departemen,
      user_type: row.user_type,
      sub_type: row.sub_type,
      kode_gerai: row.kode_gerai,
      nama_shift: row.nama_shift,
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

    // Summary stats per user_type
    const summaryByType = (type: string) => {
      const filtered = report.filter((r: any) => r.user_type === type);
      return {
        total: filtered.length,
        hadir: filtered.filter((r: any) => r.checkin !== null).length,
        tidak_hadir: filtered.filter((r: any) => r.checkin === null).length,
        terlambat: filtered.filter((r: any) => r.checkin?.status === 'late').length,
        sudah_pulang: filtered.filter((r: any) => r.checkout !== null).length,
      };
    };

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
      summary_by_type: {
        pegawai_gerai: summaryByType('pegawai_gerai'),
        satpam: summaryByType('satpam'),
        cs: summaryByType('cs'),
      },
      report,
    });
  } catch (error) {
    logger.error('Get attendance report error', { error });
    sendError(res, 'Gagal mengambil laporan presensi.', 500);
  }
};

/**
 * Monthly attendance chart data — aggregated by day for a given month.
 * Returns daily counts of hadir, terlambat, tidak_hadir per user_type.
 */
export const getMonthlyChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year, user_type } = req.query;

    const now = new Date();
    const wib = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    const targetMonth = month ? Number(month) : wib.getMonth() + 1;
    const targetYear = year ? Number(year) : wib.getFullYear();

    // Get number of days in the target month
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    // Build user_type filter
    let typeFilter = '';
    const params: any[] = [targetYear, targetMonth];

    if (user_type && user_type !== 'all') {
      params.push(String(user_type));
      typeFilter = `AND p.user_type = $${params.length}`;
    }

    // Count total active employees (for calculating tidak_hadir)
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM pegawai p 
       WHERE p.is_active = TRUE AND p.role NOT IN ('admin', 'superadmin')
       ${typeFilter}`,
      user_type && user_type !== 'all' ? [user_type] : []
    );
    const totalPegawai = parseInt(totalResult.rows[0].total);

    // Get daily attendance counts
    const chartResult = await query(
      `SELECT 
        EXTRACT(DAY FROM a.date) as day,
        COUNT(CASE WHEN a.checkin_status = 'success' THEN 1 END) as hadir,
        COUNT(CASE WHEN a.checkin_status = 'late' THEN 1 END) as terlambat,
        COUNT(CASE WHEN a.checkin_status IS NOT NULL THEN 1 END) as total_checkin
       FROM attendance a
       JOIN pegawai p ON a.pegawai_id = p.id
       WHERE EXTRACT(YEAR FROM a.date) = $1
         AND EXTRACT(MONTH FROM a.date) = $2
         AND p.is_active = TRUE
         AND p.role NOT IN ('admin', 'superadmin')
         ${typeFilter}
       GROUP BY EXTRACT(DAY FROM a.date)
       ORDER BY day`,
      params
    );

    // Build chart data for all days in month
    const chartData = [];
    const attendanceMap = new Map<number, any>(
      chartResult.rows.map((row: any) => [parseInt(row.day), row])
    );

    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = attendanceMap.get(day);
      const hadir = dayData ? parseInt(dayData.hadir) : 0;
      const terlambat = dayData ? parseInt(dayData.terlambat) : 0;
      const tidakHadir = totalPegawai - (hadir + terlambat);

      chartData.push({
        day,
        date: `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        hadir,
        terlambat,
        tidak_hadir: Math.max(0, tidakHadir),
      });
    }

    sendSuccess(res, {
      month: targetMonth,
      year: targetYear,
      total_pegawai: totalPegawai,
      chart: chartData,
    });
  } catch (error) {
    logger.error('Monthly chart error', { error });
    sendError(res, 'Gagal mengambil data grafik bulanan.', 500);
  }
};

export const getAttemptLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, pegawai_id } = req.query;
    const reportDate = date ? String(date) : getWIBDateString();

    let sql = `
      SELECT 
        al.id,
        al.pegawai_id,
        p.nama,
        p.username,
        p.nip,
        p.user_type,
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
