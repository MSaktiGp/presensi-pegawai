import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  // Office Location - DPMPTSP Kota Jambi
  OFFICE_LAT: parseFloat(process.env.OFFICE_LATITUDE || '-1.6281460837700956'),
  OFFICE_LNG: parseFloat(process.env.OFFICE_LONGITUDE || '103.60584106967069'),
  // MAX_RADIUS_METERS: parseInt(process.env.MAX_RADIUS_METERS || '40'), // Radius sebenarnya (40 meter)
  MAX_RADIUS_METERS: parseInt(process.env.MAX_RADIUS_METERS || '10000'), // Radius pengetesan (10 km)

  // Timezone WIB (UTC+7)
  TIMEZONE: 'Asia/Jakarta',

  // Default office hours (07:30 - 16:30 WIB)
  // Note: Actual shift hours are now driven by shift_config table in DB.
  // These constants serve as fallback defaults only.
  DEFAULT_CHECKIN_HOUR: 7,
  DEFAULT_CHECKIN_MINUTE: 30,
  DEFAULT_CHECKOUT_HOUR: 16,
  DEFAULT_CHECKOUT_MINUTE: 30,

  // Checkin time window
  CHECKIN_EARLY_MINUTES: 60,

  // Checkin late threshold (legacy fallback — now per-shift via DB)
  CHECKIN_LATE_HOUR: 9,
  CHECKIN_LATE_MINUTE: 0,

  // Checkout restrictions (legacy fallback — now per-shift via DB)
  CHECKOUT_START_HOUR: 16,
  CHECKOUT_START_MINUTE: 30,
  FRIDAY_CHECKOUT_START_HOUR: 11,
  FRIDAY_CHECKOUT_START_MINUTE: 0,

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

// Role constants
export const ROLES = {
  PEGAWAI_GERAI: 'pegawai_gerai',
  SATPAM: 'satpam',
  CS: 'cs',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// User type constants (same values as roles for normal users)
export const USER_TYPES = {
  PEGAWAI_GERAI: 'pegawai_gerai',
  SATPAM: 'satpam',
  CS: 'cs',
} as const;

export type UserType = typeof USER_TYPES[keyof typeof USER_TYPES];

// CS sub-types
export const CS_SUB_TYPES = {
  RESEPSIONIS: 'resepsionis',
  CLEANING_SERVICE: 'cleaning_service',
} as const;

// Roles that can perform attendance
export const ATTENDANCE_ROLES: Role[] = [ROLES.PEGAWAI_GERAI, ROLES.SATPAM, ROLES.CS];

// Roles that can access admin dashboard
export const ADMIN_ROLES: Role[] = [ROLES.ADMIN, ROLES.SUPERADMIN];
