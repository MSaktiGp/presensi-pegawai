import { Router } from 'express';
import { getAttendanceReport, getAttemptLogs, getMonthlyChart } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(adminAuthMiddleware);

router.get('/attendance-report', getAttendanceReport);
router.get('/monthly-chart', getMonthlyChart);
router.get('/attempt-logs', getAttemptLogs);

export default router;

