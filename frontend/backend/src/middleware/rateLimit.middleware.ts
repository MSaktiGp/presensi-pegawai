import rateLimit from 'express-rate-limit';
import { CONFIG } from '../config/constants';

export const apiRateLimiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW_MS,
  max: CONFIG.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan. Silakan coba lagi dalam 1 menit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default IP-based key generator; user-based limiting
  // is handled by JWT middleware already being per-user.
  validate: { xForwardedForHeader: false },
});
