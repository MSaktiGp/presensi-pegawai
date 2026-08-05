import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export const adminAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 'Autentikasi diperlukan.', 401);
    return;
  }

  if (req.user.role !== 'admin') {
    logger.warn('Non-admin user attempted to access admin route', {
      userId: req.user.id,
      nip: req.user.nip,
    });
    sendError(res, 'Anda tidak memiliki akses ke halaman ini.', 403);
    return;
  }

  next();
};
