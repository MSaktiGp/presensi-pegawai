import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { CONFIG } from '../config/constants';
import { loginSchema } from '../validators/auth.validator';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      sendError(res, validation.error.issues[0].message);
      return;
    }

    const { username, password } = validation.data;

    // Find pegawai by username (case-insensitive)
    const result = await query(
      `SELECT p.id, p.nama, p.username, p.nip, p.departemen, p.password_hash,
              p.role, p.user_type, p.sub_type, p.gerai_id, p.is_active,
              g.kode_gerai, g.nama_gerai
       FROM pegawai p
       LEFT JOIN gerai g ON p.gerai_id = g.id
       WHERE LOWER(p.username) = LOWER($1)`,
      [username]
    );

    if (result.rows.length === 0) {
      logger.warn('Login attempt with unknown username', { username });
      sendError(res, 'Username atau password salah.', 401);
      return;
    }

    const pegawai = result.rows[0];

    // Check if account is active
    if (!pegawai.is_active) {
      logger.warn('Login attempt on inactive account', { username });
      sendError(res, 'Akun Anda sudah dinonaktifkan. Hubungi administrator.', 403);
      return;
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, pegawai.password_hash);
    if (!isPasswordValid) {
      logger.warn('Login attempt with wrong password', { username });
      sendError(res, 'Username atau password salah.', 401);
      return;
    }

    // Get active shift assignment (for non-admin users)
    let shiftInfo = null;
    if (['pegawai_gerai', 'satpam', 'cs'].includes(pegawai.user_type)) {
      const shiftResult = await query(
        `SELECT sc.id as shift_config_id, sc.nama_shift, sc.jam_masuk, sc.jam_keluar,
                sc.is_cross_midnight, sc.late_threshold_minutes
         FROM pegawai_shift_assignment psa
         JOIN shift_config sc ON psa.shift_config_id = sc.id
         WHERE psa.pegawai_id = $1 AND psa.is_active = TRUE
         ORDER BY psa.created_at DESC
         LIMIT 1`,
        [pegawai.id]
      );

      if (shiftResult.rows.length > 0) {
        const s = shiftResult.rows[0];
        shiftInfo = {
          id: s.shift_config_id,
          nama: s.nama_shift,
          jam_masuk: s.jam_masuk,
          jam_keluar: s.jam_keluar,
          is_cross_midnight: s.is_cross_midnight,
          late_threshold_minutes: s.late_threshold_minutes,
        };
      }
    }

    // Generate JWT
    const tokenPayload = {
      id: pegawai.id,
      username: pegawai.username,
      nama: pegawai.nama,
      nip: pegawai.nip,
      departemen: pegawai.departemen,
      role: pegawai.role,
      user_type: pegawai.user_type,
      sub_type: pegawai.sub_type || null,
      gerai_id: pegawai.gerai_id || null,
    };

    const token = jwt.sign(tokenPayload, CONFIG.JWT_SECRET, {
      expiresIn: CONFIG.JWT_EXPIRY as any,
    });

    logger.info('Login successful', { username, pegawaiId: pegawai.id, role: pegawai.role });

    sendSuccess(res, {
      token,
      user: {
        id: pegawai.id,
        nama: pegawai.nama,
        username: pegawai.username,
        nip: pegawai.nip,
        departemen: pegawai.departemen,
        role: pegawai.role,
        user_type: pegawai.user_type,
        sub_type: pegawai.sub_type || null,
        gerai: pegawai.gerai_id ? {
          id: pegawai.gerai_id,
          kode: pegawai.kode_gerai,
          nama: pegawai.nama_gerai,
        } : null,
        shift: shiftInfo,
      },
    }, 'Login berhasil.');
  } catch (error) {
    logger.error('Login error', { error });
    sendError(res, 'Terjadi kesalahan saat login. Silakan coba lagi.', 500);
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  // JWT is stateless - client handles removal
  sendSuccess(res, null, 'Logout berhasil.');
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Tidak terautentikasi.', 401);
      return;
    }

    const result = await query(
      `SELECT p.id, p.nama, p.username, p.nip, p.departemen, p.email,
              p.role, p.user_type, p.sub_type, p.gerai_id, p.is_active,
              g.kode_gerai, g.nama_gerai
       FROM pegawai p
       LEFT JOIN gerai g ON p.gerai_id = g.id
       WHERE p.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Data pegawai tidak ditemukan.', 404);
      return;
    }

    const pegawai = result.rows[0];

    // Get active shift
    let shiftInfo = null;
    const shiftResult = await query(
      `SELECT sc.id as shift_config_id, sc.nama_shift, sc.jam_masuk, sc.jam_keluar,
              sc.is_cross_midnight, sc.late_threshold_minutes
       FROM pegawai_shift_assignment psa
       JOIN shift_config sc ON psa.shift_config_id = sc.id
       WHERE psa.pegawai_id = $1 AND psa.is_active = TRUE
       ORDER BY psa.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (shiftResult.rows.length > 0) {
      const s = shiftResult.rows[0];
      shiftInfo = {
        id: s.shift_config_id,
        nama: s.nama_shift,
        jam_masuk: s.jam_masuk,
        jam_keluar: s.jam_keluar,
        is_cross_midnight: s.is_cross_midnight,
        late_threshold_minutes: s.late_threshold_minutes,
      };
    }

    sendSuccess(res, {
      ...pegawai,
      gerai: pegawai.gerai_id ? {
        id: pegawai.gerai_id,
        kode: pegawai.kode_gerai,
        nama: pegawai.nama_gerai,
      } : null,
      shift: shiftInfo,
    });
  } catch (error) {
    logger.error('Get profile error', { error });
    sendError(res, 'Gagal mengambil data profil.', 500);
  }
};
