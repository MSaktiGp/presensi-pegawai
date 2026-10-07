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

// CORS — manual headers agar tidak konflik dengan middleware lain
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight
  if (_req.method === 'OPTIONS') {
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

// Health check — diagnose DB and env issues
app.get('/api/health', async (_req, res) => {
  const checks: Record<string, any> = {
    api: true,
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      NODE_ENV: process.env.NODE_ENV || 'not set',
      VERCEL: process.env.VERCEL || 'not set',
    },
  };

  // Test database connectivity
  try {
    const { query: dbQuery } = require('./config/database');
    const result = await dbQuery('SELECT COUNT(*) as count FROM pegawai');
    checks.database = { connected: true, pegawai_count: result.rows[0]?.count };
  } catch (err: any) {
    checks.database = { connected: false, error: err.message };
  }

  const allOk = checks.api && checks.database?.connected && checks.env.DATABASE_URL;
  res.status(allOk ? 200 : 503).json({
    success: allOk,
    message: allOk
      ? 'Sistem Presensi DPMPTSP Kota Jambi — All systems operational'
      : 'Some checks failed — see details',
    data: checks,
  });
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
    logger.info(`📍 Kantor DPMPTSP: ${CONFIG.OFFICE_LAT}, ${CONFIG.OFFICE_LNG}`);
    logger.info(`📏 Radius maksimal: ${CONFIG.MAX_RADIUS_METERS}m`);
    logger.info(`🕐 Jam masuk: tanpa batasan waktu`);
    const monThuStart = `${String(CONFIG.CHECKOUT_START_HOUR).padStart(2, '0')}:${String(CONFIG.CHECKOUT_START_MINUTE).padStart(2, '0')}`;
    const friStart = `${String(CONFIG.FRIDAY_CHECKOUT_START_HOUR).padStart(2, '0')}:${String(CONFIG.FRIDAY_CHECKOUT_START_MINUTE).padStart(2, '0')}`;
    logger.info(`🕐 Jam keluar: mulai ${monThuStart} (Jumat: ${friStart})`);
  });
}

export default app;
