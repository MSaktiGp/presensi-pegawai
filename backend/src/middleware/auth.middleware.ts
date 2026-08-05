import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/constants';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    nip: string;
    nama: string;
    departemen: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Token tidak ditemukan. Silakan login terlebih dahulu.', 401);
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as {
      id: number;
      nip: string;
      nama: string;
      departemen: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid JWT token attempt', { error });
    sendError(res, 'Token tidak valid atau sudah expired. Silakan login kembali.', 401);
    return;
  }
};
