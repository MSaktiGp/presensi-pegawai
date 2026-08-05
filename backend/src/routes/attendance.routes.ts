import { Router } from 'express';
import { checkin, checkout, getUserData, todayStatus } from '../controllers/attendance.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All attendance routes require authentication
router.use(authMiddleware);

router.get('/user-data', getUserData);
router.get('/today-status', todayStatus);
router.post('/checkin', checkin);
router.post('/checkout', checkout);

export default router;
