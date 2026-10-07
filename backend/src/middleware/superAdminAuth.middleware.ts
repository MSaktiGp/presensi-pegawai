import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ROLES } from '../config/constants';
import { logger } from '../utils/logger';

export const superAdminAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    return;
  }

  if (req.user.role !== ROLES.SUPERADMIN) {
    logger.warn('Non-superadmin user attempted to access superadmin route', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });
    res.status(403).json({ success: false, message: 'Hanya Super Admin yang dapat mengakses fitur ini.' });
    return;
  }

  next();
};
