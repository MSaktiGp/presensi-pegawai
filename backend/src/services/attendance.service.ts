import { query } from '../config/database';
import { CONFIG } from '../config/constants';
import { isWithinRadius } from './geolocation.service';
import { savePhoto } from './photo.service';
import { logger } from '../utils/logger';

/**
 * Get current date/time in WIB (Asia/Jakarta, UTC+7).
 */
const getWIBDate = (): Date => {
  const now = new Date();
  // Create a date string in WIB timezone and parse it back
  const wibString = now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE });
  return new Date(wibString);
};

/**
 * Get today's date string (YYYY-MM-DD) in WIB timezone.
 */
const getWIBDateString = (): string => {
  const wib = getWIBDate();
  const year = wib.getFullYear();
  const month = String(wib.getMonth() + 1).padStart(2, '0');
  const day = String(wib.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface AttendanceResult {
  success: boolean;
  message: string;
  distance_from_office: number;
  server_timestamp: string;
  status?: string;
}

/**
 * Log every attendance attempt (success or failure) for audit trail.
 */
const logAttempt = async (
  pegawaiId: number,
  type: 'checkin' | 'checkout',
  latitude: number,
  longitude: number,
  distance: number,
  status: string,
  errorMessage?: string
): Promise<void> => {
  try {
    await query(
      `INSERT INTO attendance_attempt_log 
       (pegawai_id, attempt_time, attempt_type, latitude, longitude, distance_from_office, status, error_message)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)`,
      [pegawaiId, type, latitude, longitude, distance, status, errorMessage || null]
    );
  } catch (error) {
    logger.error('Failed to log attendance attempt', { error, pegawaiId, type });
  }
};

/**
 * Check if current time is within allowed hours for checkin/checkout.
 */
const isWithinWorkingHours = (type: 'checkin' | 'checkout'): { allowed: boolean; message: string } => {
  const now = getWIBDate();
  const currentHour = now.getHours();

  if (type === 'checkin') {
    if (currentHour >= CONFIG.CHECKIN_START && currentHour < CONFIG.CHECKIN_END) {
      return { allowed: true, message: '' };
    }
    return {
      allowed: false,
      message: `Presensi masuk hanya tersedia jam ${String(CONFIG.CHECKIN_START).padStart(2, '0')}:00 - ${String(CONFIG.CHECKIN_END).padStart(2, '0')}:00. Saat ini jam ${String(currentHour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}.`,
    };
  }

  if (currentHour >= CONFIG.CHECKOUT_START && currentHour < CONFIG.CHECKOUT_END) {
    return { allowed: true, message: '' };
  }
  return {
    allowed: false,
    message: `Presensi keluar hanya tersedia jam ${String(CONFIG.CHECKOUT_START).padStart(2, '0')}:00 - ${String(CONFIG.CHECKOUT_END).padStart(2, '0')}:00. Saat ini jam ${String(currentHour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}.`,
  };
};

/**
 * Check if there's a duplicate attendance within the time window.
 */
const checkDuplicate = async (
  pegawaiId: number,
  type: 'checkin' | 'checkout'
): Promise<{ isDuplicate: boolean; lastTime?: string }> => {
  const today = getWIBDateString();

  const result = await query(
    `SELECT ${type}_time FROM attendance 
     WHERE pegawai_id = $1 AND date = $2 AND ${type}_time IS NOT NULL`,
    [pegawaiId, today]
  );

  if (result.rows.length > 0) {
    const lastTime = result.rows[0][`${type}_time`];
    const timeDiff = (Date.now() - new Date(lastTime).getTime()) / (1000 * 60);

    if (timeDiff < CONFIG.DUPLICATE_WINDOW_MINUTES) {
      return {
        isDuplicate: true,
        lastTime: new Date(lastTime).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: CONFIG.TIMEZONE,
        }),
      };
    }
  }

  return { isDuplicate: false };
};

/**
 * Process attendance (checkin or checkout).
 * This is the main business logic function.
 */
export const processAttendance = async (
  pegawaiId: number,
  latitude: number,
  longitude: number,
  photoBase64: string,
  type: 'checkin' | 'checkout'
): Promise<AttendanceResult> => {
  const now = new Date();
  const wibNow = getWIBDate();
  const today = getWIBDateString();

  // 1. Validate working hours
  const hoursCheck = isWithinWorkingHours(type);
  if (!hoursCheck.allowed) {
    const { distance } = isWithinRadius(latitude, longitude);
    await logAttempt(pegawaiId, type, latitude, longitude, distance, 'outside_hours', hoursCheck.message);
    return {
      success: false,
      message: hoursCheck.message,
      distance_from_office: distance,
      server_timestamp: now.toISOString(),
      status: 'outside_hours',
    };
  }

  // 2. Server-side recalculate distance (CRITICAL - never trust client)
  const { within, distance } = isWithinRadius(latitude, longitude);
  if (!within) {
    await logAttempt(pegawaiId, type, latitude, longitude, distance, 'out_of_radius');
    return {
      success: false,
      message: `Lokasi Anda di luar radius kantor. Jarak saat ini: ${Math.round(distance)} meter. Radius maksimal: ${CONFIG.MAX_RADIUS_METERS} meter. Silakan masuk area kantor terlebih dahulu.`,
      distance_from_office: distance,
      server_timestamp: now.toISOString(),
      status: 'out_of_radius',
    };
  }

  // 3. Check duplicate within time window
  const duplicateCheck = await checkDuplicate(pegawaiId, type);
  if (duplicateCheck.isDuplicate) {
    await logAttempt(pegawaiId, type, latitude, longitude, distance, 'duplicate');
    return {
      success: false,
      message: `Anda sudah melakukan presensi ${type === 'checkin' ? 'masuk' : 'keluar'} pada ${duplicateCheck.lastTime}. Presensi berikutnya dapat dilakukan setelah ${CONFIG.DUPLICATE_WINDOW_MINUTES} menit.`,
      distance_from_office: distance,
      server_timestamp: now.toISOString(),
      status: 'duplicate',
    };
  }

  // 4. Save photo
  let photoPath: string;
  try {
    photoPath = await savePhoto(photoBase64, pegawaiId, type);
  } catch {
    await logAttempt(pegawaiId, type, latitude, longitude, distance, 'failed', 'Photo save failed');
    return {
      success: false,
      message: 'Gagal menyimpan foto presensi. Silakan coba lagi atau hubungi admin.',
      distance_from_office: distance,
      server_timestamp: now.toISOString(),
      status: 'failed',
    };
  }

  // 5. Determine status
  let status = 'success';
  if (type === 'checkin') {
    const currentHour = wibNow.getHours();
    // Late if after 9 AM for checkin
    if (currentHour >= 9) {
      status = 'late';
    }
  }

  // 6. Upsert attendance record
  try {
    if (type === 'checkin') {
      await query(
        `INSERT INTO attendance (pegawai_id, date, checkin_time, checkin_latitude, checkin_longitude, checkin_distance_from_office, checkin_photo_path, checkin_status)
         VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7)
         ON CONFLICT (pegawai_id, date)
         DO UPDATE SET checkin_time = NOW(), checkin_latitude = $3, checkin_longitude = $4, checkin_distance_from_office = $5, checkin_photo_path = $6, checkin_status = $7, updated_at = NOW()`,
        [pegawaiId, today, latitude, longitude, distance, photoPath, status]
      );
    } else {
      await query(
        `INSERT INTO attendance (pegawai_id, date, checkout_time, checkout_latitude, checkout_longitude, checkout_distance_from_office, checkout_photo_path, checkout_status)
         VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7)
         ON CONFLICT (pegawai_id, date)
         DO UPDATE SET checkout_time = NOW(), checkout_latitude = $3, checkout_longitude = $4, checkout_distance_from_office = $5, checkout_photo_path = $6, checkout_status = $7, updated_at = NOW()`,
        [pegawaiId, today, latitude, longitude, distance, photoPath, status]
      );
    }

    // Log successful attempt
    await logAttempt(pegawaiId, type, latitude, longitude, distance, status);

    const statusMessage = status === 'late' ? ' (Terlambat)' : '';
    const greeting = type === 'checkin' ? 'Terima kasih, selamat bekerja!' : 'Terima kasih, hati-hati di jalan!';

    logger.info(`Attendance ${type} recorded`, {
      pegawaiId,
      distance,
      status,
      time: now.toISOString(),
    });

    return {
      success: true,
      message: `Presensi ${type === 'checkin' ? 'masuk' : 'keluar'} berhasil dicatat${statusMessage}. ${greeting}`,
      distance_from_office: distance,
      server_timestamp: now.toISOString(),
      status,
    };
  } catch (error) {
    logger.error('Failed to save attendance record', { error, pegawaiId, type });
    await logAttempt(pegawaiId, type, latitude, longitude, distance, 'failed', 'Database error');
    return {
      success: false,
      message: 'Terjadi kesalahan saat menyimpan presensi. Silakan coba lagi.',
      distance_from_office: distance,
      server_timestamp: now.toISOString(),
      status: 'failed',
    };
  }
};

/**
 * Get today's attendance status for a pegawai.
 */
export const getTodayStatus = async (pegawaiId: number) => {
  const today = getWIBDateString();

  const result = await query(
    `SELECT checkin_time, checkin_status, checkin_distance_from_office,
            checkout_time, checkout_status, checkout_distance_from_office
     FROM attendance
     WHERE pegawai_id = $1 AND date = $2`,
    [pegawaiId, today]
  );

  if (result.rows.length === 0) {
    return { checkin: null, checkout: null };
  }

  const row = result.rows[0];
  return {
    checkin: row.checkin_time
      ? {
          time: row.checkin_time,
          status: row.checkin_status,
          distance: row.checkin_distance_from_office,
        }
      : null,
    checkout: row.checkout_time
      ? {
          time: row.checkout_time,
          status: row.checkout_status,
          distance: row.checkout_distance_from_office,
        }
      : null,
  };
};
