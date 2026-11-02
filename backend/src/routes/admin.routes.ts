import { Router } from 'express';
import { getAttendanceReport, getMonthlyAttendanceReport, getAttemptLogs, getMonthlyChart } from '../controllers/admin.controller';
import { authMiddleware, roleGuard } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication + admin role
router.use(authMiddleware, roleGuard('admin', 'superadmin'));

router.get('/attendance-report', getAttendanceReport);
router.get('/monthly-attendance-report', getMonthlyAttendanceReport);
router.get('/monthly-chart', getMonthlyChart);
router.get('/attempt-logs', getAttemptLogs);

export default router;

