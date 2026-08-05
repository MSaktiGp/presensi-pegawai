import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { attendanceSchema } from '../validators/attendance.validator';
import { processAttendance, getTodayStatus } from '../services/attendance.service';
import { CONFIG } from '../config/constants';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export const checkin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Tidak terautentikasi.', 401);
      return;
    }

    // Validate input
    const validation = attendanceSchema.safeParse(req.body);
    if (!validation.success) {
      sendError(res, validation.error.issues[0].message);
      return;
    }

    const { latitude, longitude, photo } = validation.data;

    const result = await processAttendance(
      req.user.id,
      latitude,
      longitude,
      photo,
      'checkin'
    );

    if (result.success) {
      sendSuccess(res, result, result.message);
    } else {
      sendError(res, result.message);
    }
  } catch (error) {
    logger.error('Checkin controller error', { error });
    sendError(res, 'Terjadi kesalahan saat proses presensi masuk.', 500);
  }
};

export const checkout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Tidak terautentikasi.', 401);
      return;
    }

    // Validate input
    const validation = attendanceSchema.safeParse(req.body);
    if (!validation.success) {
      sendError(res, validation.error.issues[0].message);
      return;
    }

    const { latitude, longitude, photo } = validation.data;

    const result = await processAttendance(
      req.user.id,
      latitude,
      longitude,
      photo,
      'checkout'
    );

    if (result.success) {
      sendSuccess(res, result, result.message);
    } else {
      sendError(res, result.message);
    }
  } catch (error) {
    logger.error('Checkout controller error', { error });
    sendError(res, 'Terjadi kesalahan saat proses presensi keluar.', 500);
  }
};

export const getUserData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Tidak terautentikasi.', 401);
      return;
    }

    sendSuccess(res, {
      nama: req.user.nama,
      nip: req.user.nip,
      departemen: req.user.departemen,
      office_location: {
        latitude: CONFIG.OFFICE_LAT,
        longitude: CONFIG.OFFICE_LNG,
        max_radius: CONFIG.MAX_RADIUS_METERS,
      },
    });
  } catch (error) {
    logger.error('Get user data error', { error });
    sendError(res, 'Gagal mengambil data pengguna.', 500);
  }
};

export const todayStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Tidak terautentikasi.', 401);
      return;
    }

    const status = await getTodayStatus(req.user.id);
    sendSuccess(res, status);
  } catch (error) {
    logger.error('Today status error', { error });
    sendError(res, 'Gagal mengambil status presensi hari ini.', 500);
  }
};
