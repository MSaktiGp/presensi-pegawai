import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { CONFIG } from './config/constants';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import authRoutes from './routes/auth.routes';
import attendanceRoutes from './routes/attendance.routes';
import adminRoutes from './routes/admin.routes';
import { logger } from './utils/logger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
}));

// Body parser — increase limit for base64 photo uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', apiRateLimiter);

// Serve uploaded photos statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Sistem Presensi DPMPTSP Kota Jambi — API is running',
    timestamp: new Date().toISOString(),
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
  });
});

// Start server (only if not in Vercel/serverless environment)
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(CONFIG.PORT, () => {
    logger.info(`🚀 Server berjalan di http://localhost:${CONFIG.PORT}`);
    logger.info(`📍 Kantor DPMPTSP: ${CONFIG.OFFICE_LAT}, ${CONFIG.OFFICE_LNG}`);
    logger.info(`📏 Radius maksimal: ${CONFIG.MAX_RADIUS_METERS}m`);
    logger.info(`🕐 Jam masuk: ${CONFIG.CHECKIN_START}:00-${CONFIG.CHECKIN_END}:00`);
    logger.info(`🕐 Jam keluar: ${CONFIG.CHECKOUT_START}:00-${CONFIG.CHECKOUT_END}:00`);
  });
}

export default app;
