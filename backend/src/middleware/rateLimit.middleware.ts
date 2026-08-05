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
  // Vercel uses proxy — extract IP from X-Forwarded-For header
  keyGenerator: (req) => {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown'
    );
  },
  validate: { xForwardedForHeader: false, forwardedHeader: false },
});

