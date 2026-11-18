import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

// Ensure env vars are loaded early (critical for Vercel serverless)
dotenv.config();
import { CONFIG } from './config/constants';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import authRoutes from './routes/auth.routes';
import attendanceRoutes from './routes/attendance.routes';
import adminRoutes from './routes/admin.routes';
import superadminRoutes from './routes/superadmin.routes';
import { logger } from './utils/logger';

const app = express();

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS — whitelist trusted origins with Vercel preview support
const ALLOWED_ORIGINS = [
  CONFIG.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    const isAllowed =
      ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production';

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Body parser — increase limit for base64 photo uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for Vercel/Railway
app.set('trust proxy', 1);

// Rate limiting
app.use('/api/', apiRateLimiter);

// Serve uploaded photos statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superadminRoutes);

// Health check — safe operational check without leaking internal reconnaissance data
app.get('/api/health', async (_req, res) => {
  try {
    const { query: dbQuery } = require('./config/database');
    await dbQuery('SELECT 1');
    res.status(200).json({
      success: true,
      message: 'Sistem Presensi MPP Kota Jambi — All systems operational',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('Health check failed', { error: err.message });
    res.status(503).json({
      success: false,
      message: 'Layanan basis data tidak tersedia.',
    });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan.',
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal server.',
    // Include error detail in non-production for debugging
    ...(process.env.NODE_ENV !== 'production' && { debug: err.message }),
  });
});

// Start server (only if not in Vercel/serverless environment)
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(CONFIG.PORT, () => {
    logger.info(`🚀 Server berjalan di http://localhost:${CONFIG.PORT}`);
    logger.info(`📍 Lokasi MPP: ${CONFIG.OFFICE_LAT}, ${CONFIG.OFFICE_LNG}`);
    logger.info(`📏 Radius maksimal: ${CONFIG.MAX_RADIUS_METERS}m`);
    logger.info(`🕐 Jam kerja: shift_config DB (Reguler pulang ${String(CONFIG.CHECKOUT_START_HOUR).padStart(2, '0')}:${String(CONFIG.CHECKOUT_START_MINUTE).padStart(2, '0')}, Jumat: ${String(CONFIG.FRIDAY_CHECKOUT_START_HOUR).padStart(2, '0')}:${String(CONFIG.FRIDAY_CHECKOUT_START_MINUTE).padStart(2, '0')})`);
  });
}

export default app;
