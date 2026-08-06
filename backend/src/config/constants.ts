import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  // Office Location - DPMPTSP Kota Jambi
  OFFICE_LAT: parseFloat(process.env.OFFICE_LATITUDE || '-1.6281460837700956'),
  OFFICE_LNG: parseFloat(process.env.OFFICE_LONGITUDE || '103.60584106967069'),
  MAX_RADIUS_METERS: parseInt(process.env.MAX_RADIUS_METERS || '100'),

  // Working Hours
  CHECKIN_START: 6,   // 06:00
  CHECKIN_END: 11,    // 11:00
  CHECKOUT_START: 15, // 15:00
  CHECKOUT_END: 19,   // 19:00

  // Duplicate Prevention
  DUPLICATE_WINDOW_MINUTES: 30,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dpmptsp-jambi-secret',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',

  // Photo
  PHOTO_QUALITY: 60,
  PHOTO_MAX_WIDTH: 800,
  UPLOAD_DIR: 'uploads/attendance',

  // Server
  PORT: parseInt(process.env.PORT || '5000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Rate Limit
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX: 10, // 10 requests per minute
};
