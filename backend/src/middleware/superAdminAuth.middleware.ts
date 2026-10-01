import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ROLES } from '../config/constants';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

export const superAdminAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendError(res, 'Autentikasi diperlukan.', 401);
    return;
  }

  if (req.user.role !== ROLES.SUPERADMIN) {
    logger.warn('Non-superadmin user attempted to access superadmin route', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });
    sendError(res, 'Hanya Super Admin yang dapat mengakses fitur ini.', 403);
    return;
  }

  next();
};
