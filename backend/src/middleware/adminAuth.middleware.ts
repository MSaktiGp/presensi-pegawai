import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { logger } from '../utils/logger';

/**
 * Factory: middleware that allows only the specified roles.
 * Usage: router.use(roleGuard('admin', 'superadmin'))
 */
export const roleGuard = (...allowed: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
      return;
    }

    if (!allowed.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        allowed,
      });
      res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke halaman ini.' });
      return;
    }

    next();
  };

// Backward-compat named exports
export const adminAuthMiddleware = roleGuard('admin', 'superadmin');
