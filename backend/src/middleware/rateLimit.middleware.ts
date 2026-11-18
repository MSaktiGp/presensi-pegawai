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
  validate: false, // Disable validations (like IPv6 key check)
});

export const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 attempts per 5 min per IP
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam beberapa menit.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

