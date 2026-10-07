import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ADMIN_ROLES } from '../config/constants';
import { logger } from '../utils/logger';

export const adminAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    return;
  }

  if (!ADMIN_ROLES.includes(req.user.role as any)) {
    logger.warn('Non-admin user attempted to access admin route', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });
    res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke halaman ini.' });
    return;
  }

  next();
};

