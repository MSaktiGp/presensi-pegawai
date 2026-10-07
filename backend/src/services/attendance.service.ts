import { query } from '../config/database';
import { CONFIG } from '../config/constants';
import { isWithinRadius } from './geolocation.service';
import { savePhoto } from './photo.service';
import { logger } from '../utils/logger';

/**
 * Get current date/time parts in WIB (Asia/Jakarta, UTC+7).
 */
const getWIBParts = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  const hour = parseInt(parts.hour === '24' ? '0' : parts.hour, 10);
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour,
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
    dateString: `${parts.year}-${parts.month}-${parts.day}`,
  };
};

/**
 * Get today's date string (YYYY-MM-DD) in WIB timezone.
 */
const getWIBDateString = (): string => {
  return getWIBParts().dateString;
};

export interface ShiftInfo {
  id: number;
  nama_shift: string;
  jam_masuk: string;      // "HH:MM:SS" or "HH:MM"
  jam_keluar: string;
  is_cross_midnight: boolean;
  late_threshold_minutes: number;
  allowed_days: string;
}

export interface AttendanceResult {
  success: boolean;
  message: string;
  distance_from_office: number;
  server_timestamp: string;
  status?: string;
}

/**
 * Get the active shift for a pegawai from the database.
 */
const getActiveShift = async (pegawaiId: number): Promise<ShiftInfo | null> => {
  const result = await query(
    `SELECT sc.id, sc.nama_shift, sc.jam_masuk, sc.jam_keluar,
            sc.is_cross_midnight, sc.late_threshold_minutes, sc.allowed_days
     FROM pegawai_shift_assignment psa
     JOIN shift_config sc ON psa.shift_config_id = sc.id
     WHERE psa.pegawai_id = $1 AND psa.is_active = TRUE
     ORDER BY psa.created_at DESC
     LIMIT 1`,
    [pegawaiId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    nama_shift: row.nama_shift,
    jam_masuk: row.jam_masuk,
    jam_keluar: row.jam_keluar,
    is_cross_midnight: row.is_cross_midnight,
    late_threshold_minutes: row.late_threshold_minutes,
    allowed_days: row.allowed_days || '0,1,2,3,4,5,6',
  };
};

/**
 * Parse a time string ("HH:MM" or "HH:MM:SS") into total minutes since midnight.
 */
const parseTimeToMinutes = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  return parts[0] * 60 + parts[1];
};

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
 * Check if current time is within allowed hours based on shift assignment.
 *
 * Logic:
 * - Checkin: no time restriction (allowed any time) — same as before.
 * - Checkout: must be after jam_keluar of the assigned shift.
 *   - For cross-midnight shifts (e.g. 23:00 → 07:00), checkout is allowed
 *     after 07:00 the NEXT day.
 *   - For regular shifts, checkout is simply after jam_keluar.
 *
 * Note: We also apply a Friday rule — on Fridays, if the user's shift is
 * the "reguler" type, checkout starts at 11:00 instead.
 */
const isWithinWorkingHours = (
  type: 'checkin' | 'checkout',
  shift: ShiftInfo | null
): { allowed: boolean; message: string } => {
  // Checkin validation
  if (type === 'checkin') {
    const wib = getWIBParts();
    const currentTotalMinutes = wib.hour * 60 + wib.minute;

    if (!shift) {
      // Legacy behavior
      const defaultCheckinMinutes = CONFIG.DEFAULT_CHECKIN_HOUR * 60 + CONFIG.DEFAULT_CHECKIN_MINUTE;
      const allowedStartMinutes = defaultCheckinMinutes - CONFIG.CHECKIN_EARLY_MINUTES;
      if (currentTotalMinutes < allowedStartMinutes) {
        const h = Math.floor(allowedStartMinutes / 60);
        const m = allowedStartMinutes % 60;
        const formattedStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const formattedCurrent = `${String(wib.hour).padStart(2, '0')}:${String(wib.minute).padStart(2, '0')}`;
        return {
          allowed: false,
          message: `Presensi masuk tersedia mulai jam ${formattedStart}. Saat ini jam ${formattedCurrent}.`,
        };
      }
      return { allowed: true, message: '' };
    }

    const checkinMinutes = parseTimeToMinutes(shift.jam_masuk);
    let allowedStartMinutes = checkinMinutes - CONFIG.CHECKIN_EARLY_MINUTES;

    if (shift.is_cross_midnight) {
      if (allowedStartMinutes < 0) {
        allowedStartMinutes += 24 * 60;
      }
      // For cross-midnight, early is before allowedStart AND after some midday threshold (e.g. 12:00 PM)
      // to not accidentally block people checking in late at 01:00 AM.
      if (currentTotalMinutes < allowedStartMinutes && currentTotalMinutes > 12 * 60) {
        const h = Math.floor(allowedStartMinutes / 60);
        const m = allowedStartMinutes % 60;
        const formattedStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const formattedCurrent = `${String(wib.hour).padStart(2, '0')}:${String(wib.minute).padStart(2, '0')}`;
        return {
          allowed: false,
          message: `Shift ${shift.nama_shift}: presensi masuk tersedia mulai jam ${formattedStart}. Saat ini jam ${formattedCurrent}.`,
        };
      }
    } else {
      if (currentTotalMinutes < allowedStartMinutes) {
        const h = Math.floor(allowedStartMinutes / 60);
        const m = allowedStartMinutes % 60;
        const formattedStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const formattedCurrent = `${String(wib.hour).padStart(2, '0')}:${String(wib.minute).padStart(2, '0')}`;
        return {
          allowed: false,
          message: `Shift ${shift.nama_shift}: presensi masuk tersedia mulai jam ${formattedStart}. Saat ini jam ${formattedCurrent}.`,
        };
      }
    }
    
    return { allowed: true, message: '' };
  }

  // Checkout validation
  const wib = getWIBParts();
  const currentTotalMinutes = wib.hour * 60 + wib.minute;

  // If no shift found, use legacy defaults
  if (!shift) {
    const dayName = new Intl.DateTimeFormat('en-US', {
      timeZone: CONFIG.TIMEZONE,
      weekday: 'short',
    }).format(new Date());
    const isFriday = dayName === 'Fri';

    const startHour = isFriday ? CONFIG.FRIDAY_CHECKOUT_START_HOUR : CONFIG.CHECKOUT_START_HOUR;
    const startMinute = isFriday ? CONFIG.FRIDAY_CHECKOUT_START_MINUTE : CONFIG.CHECKOUT_START_MINUTE;
    const startTotalMinutes = startHour * 60 + startMinute;

    if (currentTotalMinutes < startTotalMinutes) {
      const label = isFriday ? 'Hari Jumat, presensi' : 'Presensi';
      const formattedStart = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
      const formattedCurrent = `${String(wib.hour).padStart(2, '0')}:${String(wib.minute).padStart(2, '0')}`;
      return {
        allowed: false,
        message: `${label} keluar tersedia mulai jam ${formattedStart}. Saat ini jam ${formattedCurrent}.`,
      };
    }

    return { allowed: true, message: '' };
  }

  // Shift-based checkout validation
  const checkoutMinutes = parseTimeToMinutes(shift.jam_keluar);

  if (shift.is_cross_midnight) {
    // Cross-midnight shift (e.g. malam 23:00 → 07:00)
    // Checkout is allowed after jam_keluar (which is in the AM next day)
    // If current time is between 00:00 and jam_keluar, it's too early
    if (currentTotalMinutes < checkoutMinutes) {
      const formattedKeluar = shift.jam_keluar.substring(0, 5);
      const formattedCurrent = `${String(wib.hour).padStart(2, '0')}:${String(wib.minute).padStart(2, '0')}`;
      return {
        allowed: false,
        message: `Shift ${shift.nama_shift}: presensi keluar tersedia mulai jam ${formattedKeluar}. Saat ini jam ${formattedCurrent}.`,
      };
    }
  } else {
    // Regular shift — checkout after jam_keluar
    // Apply Friday exception for 'reguler' shifts
    let effectiveCheckout = checkoutMinutes;

    if (shift.nama_shift === 'reguler') {
      const dayName = new Intl.DateTimeFormat('en-US', {
        timeZone: CONFIG.TIMEZONE,
        weekday: 'short',
      }).format(new Date());

      if (dayName === 'Fri') {
        effectiveCheckout = CONFIG.FRIDAY_CHECKOUT_START_HOUR * 60 + CONFIG.FRIDAY_CHECKOUT_START_MINUTE;
      }
    }

    if (currentTotalMinutes < effectiveCheckout) {
      const h = Math.floor(effectiveCheckout / 60);
      const m = effectiveCheckout % 60;
      const formattedKeluar = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const formattedCurrent = `${String(wib.hour).padStart(2, '0')}:${String(wib.minute).padStart(2, '0')}`;
      return {
        allowed: false,
        message: `Shift ${shift.nama_shift}: presensi keluar tersedia mulai jam ${formattedKeluar}. Saat ini jam ${formattedCurrent}.`,
      };
    }
  }

  return { allowed: true, message: '' };
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
 * Determine if checkin is late based on shift's late threshold.
 */
const isCheckinLate = (shift: ShiftInfo | null): boolean => {
  const wib = getWIBParts();
  const currentTotalMinutes = wib.hour * 60 + wib.minute;

  if (!shift) {
    // Legacy fallback
    const lateThresholdMinutes = CONFIG.CHECKIN_LATE_HOUR * 60 + CONFIG.CHECKIN_LATE_MINUTE;
    return currentTotalMinutes > lateThresholdMinutes;
  }

  const shiftStartMinutes = parseTimeToMinutes(shift.jam_masuk);
  const lateAfterMinutes = shiftStartMinutes + shift.late_threshold_minutes;

  if (shift.is_cross_midnight) {
    // Cross-midnight shift: late if checked in after (jam_masuk + threshold)
    // Since jam_masuk is 23:00 and threshold is 60, late after 00:00
    // We need to handle wrap-around
    if (lateAfterMinutes >= 24 * 60) {
      const wrappedLate = lateAfterMinutes - 24 * 60;
      // If current time is between 00:00 and wrappedLate, not late
      // If current time is after wrappedLate and before jam_masuk, late
      return currentTotalMinutes > wrappedLate && currentTotalMinutes < shiftStartMinutes;
    }
    return currentTotalMinutes > lateAfterMinutes;
  }

  return currentTotalMinutes > lateAfterMinutes;
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
  const today = getWIBDateString();

  // 0. Get active shift for this pegawai
  const shift = await getActiveShift(pegawaiId);

  // 0.5 Check allowed days for checkin
  if (type === 'checkin' && shift && shift.allowed_days) {
    const currentDay = now.getDay().toString();
    const allowedDaysArr = shift.allowed_days.split(',');
    if (!allowedDaysArr.includes(currentDay)) {
      const { distance } = isWithinRadius(latitude, longitude);
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const allowedNames = allowedDaysArr.map(d => dayNames[parseInt(d)]).join(', ');
      const message = `Shift ${shift.nama_shift} hanya tersedia pada hari: ${allowedNames}.`;
      await logAttempt(pegawaiId, type, latitude, longitude, distance, 'outside_hours', message);
      
      return {
        success: false,
        message,
        distance_from_office: distance,
        server_timestamp: now.toISOString(),
        status: 'outside_hours',
      };
    }
  }

  // 1. Validate working hours (shift-aware)
  const hoursCheck = isWithinWorkingHours(type, shift);
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

  // 5. Determine status (shift-aware late check)
  let status = 'success';
  if (type === 'checkin' && isCheckinLate(shift)) {
    status = 'late';
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
      shift: shift?.nama_shift || 'default',
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
export const getAttendanceHistory = async (pegawaiId: number, limit: number = 5) => {
  const result = await query('SELECT date, checkin_time, checkout_time FROM attendance WHERE pegawai_id = $1 ORDER BY date DESC LIMIT $2', [pegawaiId, limit]);
  return result.rows;
};
