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

    const { nip, password } = validation.data;

    // Find pegawai by NIP
    const result = await query(
      'SELECT id, nama, nip, departemen, password_hash, role FROM pegawai WHERE nip = $1',
      [nip]
    );

    if (result.rows.length === 0) {
      logger.warn('Login attempt with unknown NIP', { nip });
      sendError(res, 'NIP atau password salah.', 401);
      return;
    }

    const pegawai = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, pegawai.password_hash);
    if (!isPasswordValid) {
      logger.warn('Login attempt with wrong password', { nip });
      sendError(res, 'NIP atau password salah.', 401);
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: pegawai.id,
        nip: pegawai.nip,
        nama: pegawai.nama,
        departemen: pegawai.departemen,
        role: pegawai.role || 'pegawai',
      },
      CONFIG.JWT_SECRET,
      { expiresIn: CONFIG.JWT_EXPIRY as any }
    );

    logger.info('Login successful', { nip, pegawaiId: pegawai.id });

    sendSuccess(res, {
      token,
      user: {
        id: pegawai.id,
        nama: pegawai.nama,
        nip: pegawai.nip,
        departemen: pegawai.departemen,
        role: pegawai.role || 'pegawai',
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
      'SELECT id, nama, nip, departemen, email, role FROM pegawai WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      sendError(res, 'Data pegawai tidak ditemukan.', 404);
      return;
    }

    sendSuccess(res, result.rows[0]);
  } catch (error) {
    logger.error('Get profile error', { error });
    sendError(res, 'Gagal mengambil data profil.', 500);
  }
};
