import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { attendanceSchema } from '../validators/attendance.validator';
import { processAttendance, getTodayStatus } from '../services/attendance.service';
import { CONFIG } from '../config/constants';
import { logger } from '../utils/logger';

export const checkin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
      return;
    }

    // Validate input
    const validation = attendanceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: validation.error.issues[0].message });
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
      res.json({ success: true, message: result.message, data: result });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('Checkin controller error', { error });
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat proses presensi masuk.' });
  }
};

export const checkout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
      return;
    }

    // Validate input
    const validation = attendanceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ success: false, message: validation.error.issues[0].message });
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
      res.json({ success: true, message: result.message, data: result });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('Checkout controller error', { error });
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat proses presensi keluar.' });
  }
};

export const getUserData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
      return;
    }

    res.json({ success: true, message: "Success", data: {
      nama: req.user.nama,
      username: req.user.username,
      departemen: req.user.departemen,
      user_type: req.user.user_type,
      sub_type: req.user.sub_type,
      gerai_id: req.user.gerai_id,
      office_location: {
        latitude: CONFIG.OFFICE_LAT,
        longitude: CONFIG.OFFICE_LNG,
        max_radius: CONFIG.MAX_RADIUS_METERS,
      },
    } });
  } catch (error) {
    logger.error('Get user data error', { error });
    res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna.' });
  }
};

export const todayStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
      return;
    }

    const status = await getTodayStatus(req.user.id);
    res.json({ success: true, message: "Success", data: status });
  } catch (error) {
    logger.error('Today status error', { error });
    res.status(500).json({ success: false, message: 'Gagal mengambil status presensi hari ini.' });
  }
};

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
      return;
    }
    const limit = parseInt(req.query.limit as string) || 5;
    const history = await require('../services/attendance.service').getAttendanceHistory(req.user.id, limit);
    res.json({ success: true, message: 'Success', data: history });
  } catch (error) {
    logger.error('Get history error', { error });
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat presensi.' });
  }
};
