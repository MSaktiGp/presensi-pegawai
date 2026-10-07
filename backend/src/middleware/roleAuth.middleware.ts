import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { Role } from '../config/constants';
import { logger } from '../utils/logger';

/**
 * Factory middleware — accepts an array of allowed roles.
 * Usage: roleAuth([ROLES.ADMIN, ROLES.SUPERADMIN])
 */
export const roleAuth = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        requiredRoles: allowedRoles,
      });
      res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke fitur ini.' });
      return;
    }

    next();
  };
};
